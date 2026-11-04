import { render, type ComponentChildren } from 'preact';
import { signal } from '@preact/signals';
import { ArtworkImage } from '../artwork.js';
import type { ArtworkSelection } from '../../artwork-selection.js';
import type { WikidataSearchHit } from '../../wikimedia-art.service.js';
import type { SearchModule, SearchOptions } from './contracts.js';
import '../../dialog.css';
import { CLOSE_ICON_PATH } from '../../dialog-icon.js';

const message = (error: unknown) => (error instanceof Error ? error.message : String(error));
function Result({
  title,
  sub,
  imageUrl,
  choose,
}: {
  title: string;
  sub: string;
  imageUrl?: string | null;
  choose(): void;
}) {
  return (
    <button class="result" type="button" onClick={choose}>
      {imageUrl && <ArtworkImage key={imageUrl} url={imageUrl} title={title} />}
      <span>
        <strong>{title}</strong>
        <small>{sub}</small>
      </span>
    </button>
  );
}
export function mountWikimediaSearch(
  root: HTMLDialogElement,
  { service: art, onSelect }: SearchOptions,
): SearchModule {
  root.classList.add('app-dialog', 'search-dialog');
  const query = signal('');
  const results = signal<ComponentChildren>(
    <div class="tiny">Search by artist name or painting title.</div>,
  );
  const artistWorks = signal<ComponentChildren>(null);
  const lifetime = new AbortController();
  let input: HTMLInputElement | null = null;
  let disposed = false;
  let request: AbortController | null = null;
  let timer: number | undefined;
  function cancelPending() {
    clearTimeout(timer);
    request?.abort();
  }
  function beginRequest() {
    cancelPending();
    request = new AbortController();
    if (disposed) request.abort();
    return request.signal;
  }
  function close() {
    cancelPending();
    root.close();
  }
  function open() {
    if (disposed) return;
    if (!root.open) root.showModal();
    input?.focus();
  }
  function choose(item: ArtworkSelection) {
    if (disposed || !root.open) return;
    close();
    onSelect(item);
  }
  async function openArtist(name: string, preferredQid?: string) {
    open();
    const signal = beginRequest();
    query.value = name;
    artistWorks.value = <div class="tiny">Loading paintings by {name}…</div>;
    try {
      let qid = preferredQid;
      if (!qid) {
        const matches = await art.searchEntities(name, { limit: 12, signal });
        if (signal.aborted) return;
        qid =
          matches.find(
            (x) => x.label.toLowerCase() === name.toLowerCase() && x.kindHint === 'artist',
          )?.id || matches.find((x) => x.kindHint === 'artist')?.id;
      }
      if (!qid) throw new Error('Artist not found in Wikidata');
      const [artist, works] = await Promise.all([
        art.getEntity(qid, { signal }),
        art.getArtistPaintings(qid, { limit: 12, onlyWithImage: true, signal }),
      ]);
      if (signal.aborted) return;
      artistWorks.value = (
        <>
          <div class="eyebrow">Paintings by {artist?.label || name}</div>
          {artist?.description && <p class="tiny">{artist.description}</p>}
          {!works.length && (
            <p class="tiny">No illustrated paintings found in this Wikidata query.</p>
          )}
          {works.map((work) => (
            <Result
              key={work.id}
              title={work.title}
              sub={String(work.year || 'Painting')}
              imageUrl={work.imageUrl}
              choose={() =>
                choose({
                  title: work.title,
                  artist: artist?.label || name,
                  date: work.year ? String(work.year) : '',
                  qid: work.id,
                  filename: work.imageFilename || undefined,
                })
              }
            />
          ))}
        </>
      );
    } catch (error) {
      if (!signal.aborted)
        artistWorks.value = <p class="alert">Unable to load artist paintings: {message(error)}</p>;
    }
  }
  async function openHit(hit: WikidataSearchHit) {
    if (hit.kindHint === 'artist') {
      await openArtist(hit.label, hit.id);
      return;
    }
    const signal = beginRequest();
    try {
      const entity = await art.getEntity(hit.id, { signal });
      if (signal.aborted) return;
      if (entity?.kind === 'artist') {
        await openArtist(entity.label, entity.id);
        return;
      }
      choose(
        entity?.imageFilename
          ? {
              title: entity.label,
              artist: 'Wikidata artwork',
              date: entity.createdYear ? String(entity.createdYear) : '',
              qid: entity.id,
              filename: entity.imageFilename,
            }
          : { title: hit.label, artist: 'Wikimedia collection', date: '', qid: hit.id },
      );
    } catch (error) {
      if (!signal.aborted) console.warn(`Could not open ${hit.label}`, error);
    }
  }
  async function search(value: string) {
    const signal = beginRequest();
    results.value = <div class="tiny">Searching for “{value}”…</div>;
    artistWorks.value = null;
    try {
      const result = await art.searchAll(value, { signal });
      if (signal.aborted) return;
      const hits = result.entities.filter((hit) => hit.kindHint !== 'other');
      results.value = (
        <>
          <div class="eyebrow">Wikidata · {hits.length} matching artists / artworks</div>
          {hits.map((hit) => (
            <Result
              key={hit.id}
              title={hit.label}
              sub={hit.description || hit.id}
              choose={() => void openHit(hit)}
            />
          ))}
          <div class="eyebrow">Commons images · {result.images.length}</div>
          {result.images.map((image) => {
            const title = image.fileTitle
              .replace(/^File:/, '')
              .replace(/\.[^.]+$/, '')
              .replace(/_/g, ' ');
            return (
              <Result
                key={image.fileTitle}
                title={title}
                sub={image.license || 'Check license'}
                imageUrl={image.thumbnailUrl}
                choose={() =>
                  choose({ title, artist: 'Wikimedia Commons', date: '', commons: image })
                }
              />
            );
          })}
          {!hits.length && !result.images.length && (
            <p class="tiny">No results found. Try another artist or painting title.</p>
          )}
          {!!result.errors.length && (
            <p class="alert">
              {result.errors.map((error) => `${error.source}: ${error.message}`).join('; ')}
            </p>
          )}
        </>
      );
    } catch (error) {
      if (!signal.aborted) results.value = <p class="alert">Search failed: {message(error)}</p>;
    }
  }
  function Search() {
    return (
      <>
        <header class="dialog-header">
          <h2 id="searchTitle">Search Wikimedia</h2>
          <button
            class="dialog-close"
            id="closeSearch"
            type="button"
            aria-label="Close search"
            onClick={close}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
            >
              <path d={CLOSE_ICON_PATH} />
            </svg>
          </button>
        </header>
        <div id="searchView" class="search-view">
          <form
            class="searchbox"
            id="searchForm"
            onSubmit={(event) => {
              event.preventDefault();
              cancelPending();
              const value = query.value.trim();
              if (value) void search(value);
            }}
          >
            <input
              id="searchQuery"
              ref={(element) => {
                input = element;
              }}
              aria-label="Search artist or painting"
              placeholder="Van Gogh, The Starry Night…"
              required
              value={query.value}
              onInput={(event) => {
                cancelPending();
                query.value = event.currentTarget.value;
                const value = query.value.trim();
                if (value.length >= 3) timer = window.setTimeout(() => void search(value), 500);
              }}
            />
            <button class="btn primary">Find</button>
          </form>
          <div class="dialog-body search-body">
            <div id="searchResults" class="searchResults">
              {results.value}
            </div>
            <div
              class={`workspanel${artistWorks.value === null ? ' hidden' : ''}`}
              id="artistWorks"
            >
              {artistWorks.value}
            </div>
          </div>
        </div>
      </>
    );
  }
  root.addEventListener(
    'close',
    () => {
      if (!root.open) cancelPending();
    },
    { signal: lifetime.signal },
  );
  root.addEventListener('cancel', cancelPending, { signal: lifetime.signal });
  render(<Search />, root);
  return {
    open,
    close,
    dispose() {
      if (disposed) return;
      disposed = true;
      close();
      lifetime.abort();
      render(null, root);
    },
  };
}

import { render } from 'preact';
import { signal } from '@preact/signals';
import { ArtworkImage } from '../artwork.js';
import type { ArtworkSelection } from '../../artwork-selection.js';
import type { WikidataSearchHit, CommonsContinuation } from '../../wikimedia-art.service.js';
import type { SearchModule, SearchOptions } from './contracts.js';
import '../../dialog.css';
import './search.css';
import { CLOSE_ICON_PATH } from '../../dialog-icon.js';

const message = (error: unknown) => (error instanceof Error ? error.message : String(error));
interface Card {
  item: ArtworkSelection;
  subtitle: string;
  thumbnail?: string | null;
}

// Check displayability before closing; pixel extraction remains the application's responsibility.
function loadImage(url: string, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const finish = (error?: Error) => {
      clearTimeout(timeout);
      image.onload = image.onerror = null;
      signal.removeEventListener('abort', abort);
      if (error) {
        image.src = '';
        reject(error);
      } else resolve();
    };
    const abort = () => finish(new DOMException('Aborted', 'AbortError'));
    const timeout = window.setTimeout(
      () => finish(new Error('Image loading timed out. Try again.')),
      15000,
    );
    image.onload = () => finish();
    image.onerror = () =>
      finish(new Error('This image could not be loaded. Try another painting.'));
    signal.addEventListener('abort', abort, { once: true });
    if (signal.aborted) abort();
    else image.src = url;
  });
}

export function mountWikimediaSearch(
  root: HTMLDialogElement,
  { service: art, onSelect }: SearchOptions,
): SearchModule {
  root.classList.add('app-dialog', 'search-dialog');
  root.setAttribute('aria-labelledby', 'searchTitle');
  const query = signal('');
  const suggestions = signal<WikidataSearchHit[]>([]);
  const expanded = signal(false);
  const active = signal(-1);
  const hintStatus = signal('');
  const cards = signal<Card[]>([]);
  const heading = signal('');
  const continuation = signal<CommonsContinuation | null>(null);
  const pageFailed = signal(false);
  const galleryQuery = signal('');
  const busy = signal('');
  const error = signal('');
  const lifetime = new AbortController();
  let input: HTMLInputElement | null = null;
  let body: HTMLDivElement | null = null;
  let disposed = false;
  let hintRequest: AbortController | null = null;
  let request: AbortController | null = null;
  let timer: number | undefined;
  function dismissHints() {
    clearTimeout(timer);
    hintRequest?.abort();
    expanded.value = false;
    active.value = -1;
  }
  function cancelPending() {
    dismissHints();
    request?.abort();
    busy.value = '';
  }
  function beginRequest() {
    cancelPending();
    error.value = '';
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
  async function hints(value: string) {
    hintRequest = new AbortController();
    const signal = hintRequest.signal;
    expanded.value = true;
    hintStatus.value = 'Finding suggestions…';
    try {
      const hits = await art.searchEntities(value, { limit: 15, signal });
      if (signal.aborted) return;
      const unique = [
        ...new Map(
          hits.filter((hit) => hit.kindHint !== 'other').map((hit) => [hit.id, hit]),
        ).values(),
      ].slice(0, 8);
      suggestions.value = [
        ...unique.filter((hit) => hit.kindHint === 'artist'),
        ...unique.filter((hit) => hit.kindHint === 'painting'),
      ];
      hintStatus.value = unique.length
        ? `${unique.length} suggestions available. Use arrow keys to choose.`
        : 'No suggestions. Press Find to search artworks.';
    } catch (e) {
      if (!signal.aborted)
        hintStatus.value = `Suggestions unavailable: ${message(e)}. You can still try Find.`;
    }
  }
  async function select(item: ArtworkSelection) {
    const signal = beginRequest();
    busy.value = `Loading ${item.title}…`;
    try {
      const url = item.commons?.thumbnailUrl || item.commons?.originalUrl;
      if (!url) throw new Error('No usable image was found. Try another painting.');
      await loadImage(url, signal);
      if (signal.aborted || disposed || !root.open) return;
      close();
      onSelect({ ...item, imageUrl: url });
    } catch (e) {
      if (!signal.aborted) error.value = `Unable to open artwork: ${message(e)}`;
    } finally {
      if (!signal.aborted) busy.value = '';
    }
  }
  function chooseHint(hit: WikidataSearchHit) {
    query.value = hit.label;
    void search(hit.label);
  }
  async function search(value: string, append = false) {
    if (append && (busy.value || !continuation.value)) return;
    const next = append ? continuation.value : null;
    const signal = beginRequest();
    pageFailed.value = false;
    if (!append) {
      cards.value = [];
      continuation.value = null;
      heading.value = `Images for “${value}”`;
      galleryQuery.value = value;
      if (body) body.scrollTop = 0;
    }
    busy.value = append ? 'Loading more images…' : `Searching for “${value}”…`;
    try {
      const page = await art.searchCommonsImagesPage(value, {
        limit: 24,
        signal,
        ...(next ? { continuation: next } : {}),
      });
      if (signal.aborted) return;
      const additions: Card[] = page.images.map((image) => ({
        item: {
          title: image.fileTitle
            .replace(/^File:/, '')
            .replace(/\.[^.]+$/, '')
            .replace(/_/g, ' '),
          artist: 'Wikimedia Commons',
          date: '',
          commons: image,
        },
        subtitle: image.license || 'Check license',
        thumbnail: image.thumbnailUrl || image.originalUrl,
      }));
      cards.value = [
        ...new Map(
          [...(append ? cards.value : []), ...additions].map((card) => [
            card.item.commons!.fileTitle,
            card,
          ]),
        ).values(),
      ];
      continuation.value = page.continuation;
    } catch (e) {
      if (!signal.aborted) {
        pageFailed.value = true;
        error.value = `${append ? 'Unable to load more images' : 'Search failed'}: ${message(e)}`;
      }
    } finally {
      if (!signal.aborted) busy.value = '';
    }
  }
  function moveSuggestion(delta: number) {
    if (!suggestions.value.length) return;
    expanded.value = true;
    active.value =
      active.value < 0
        ? delta > 0
          ? 0
          : suggestions.value.length - 1
        : (active.value + delta + suggestions.value.length) % suggestions.value.length;
    requestAnimationFrame(() =>
      root.querySelector(`#wiki-option-${active.value}`)?.scrollIntoView({ block: 'nearest' }),
    );
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
              const value = query.value.trim();
              if (value) void search(value);
            }}
          >
            <div
              class="search-autocomplete"
              onFocusOut={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget as Node | null))
                  dismissHints();
              }}
            >
              <input
                id="searchQuery"
                ref={(element) => {
                  input = element;
                }}
                role="combobox"
                aria-label="Search artist or painting"
                aria-autocomplete="list"
                aria-expanded={expanded.value}
                aria-controls="wiki-suggestions"
                aria-activedescendant={
                  expanded.value && active.value >= 0 ? `wiki-option-${active.value}` : undefined
                }
                autocomplete="off"
                placeholder="Search artists or paintings…"
                required
                value={query.value}
                onInput={(event) => {
                  cancelPending();
                  query.value = event.currentTarget.value;
                  suggestions.value = [];
                  active.value = -1;
                  const value = query.value.trim();
                  if (value.length >= 3) {
                    expanded.value = true;
                    hintStatus.value = 'Finding suggestions…';
                    timer = window.setTimeout(() => void hints(value), 350);
                  }
                }}
                onKeyDown={(event) => {
                  if (event.isComposing) return;
                  if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
                    event.preventDefault();
                    moveSuggestion(event.key === 'ArrowDown' ? 1 : -1);
                  } else if (event.key === 'Enter' && expanded.value && active.value >= 0) {
                    event.preventDefault();
                    chooseHint(suggestions.value[active.value]);
                  } else if (event.key === 'Escape' && expanded.value) {
                    event.preventDefault();
                    event.stopPropagation();
                    dismissHints();
                  }
                }}
              />
              <div class="search-suggestions" hidden={!expanded.value}>
                <div id="wiki-suggestions" role="listbox" aria-label="Artists and paintings">
                  {(['artist', 'painting'] as const).map((kind) => {
                    const group = suggestions.value.filter((hit) => hit.kindHint === kind);
                    return group.length ? (
                      <div
                        role="group"
                        aria-label={kind === 'artist' ? 'Artists' : 'Paintings'}
                        key={kind}
                      >
                        <div class="suggestion-heading" aria-hidden="true">
                          {kind === 'artist' ? 'Artists' : 'Paintings'}
                        </div>
                        {group.map((hit) => {
                          const index = suggestions.value.indexOf(hit);
                          return (
                            <div
                              id={`wiki-option-${index}`}
                              key={hit.id}
                              role="option"
                              aria-selected={active.value === index}
                              class="search-suggestion"
                              onPointerDown={(event) => event.preventDefault()}
                              onClick={() => chooseHint(hit)}
                            >
                              <strong>{hit.label}</strong>
                              <small>
                                {hit.description || (kind === 'artist' ? 'Artist' : 'Painting')}
                              </small>
                            </div>
                          );
                        })}
                      </div>
                    ) : null;
                  })}
                </div>
                <p class="suggestion-status" role="status">
                  {hintStatus.value}
                </p>
              </div>
            </div>
            <button class="btn primary">Find</button>
          </form>
          <div
            class="dialog-body search-body"
            ref={(element) => {
              body = element;
            }}
          >
            {heading.value && <h3 class="search-gallery-title">{heading.value}</h3>}
            <p class="search-status" role="status">
              {busy.value ||
                (!heading.value
                  ? 'Choose an artist to browse their paintings, or search for an artwork.'
                  : !cards.value.length && !error.value
                    ? 'No images found. Try another artist or artwork title.'
                    : `${cards.value.length} images`)}
            </p>
            {error.value && (
              <p class="alert" role="alert">
                {error.value}
              </p>
            )}
            {heading.value && (
              <p class="tiny">
                Image results from Wikimedia Commons may include photographs and other media.
              </p>
            )}
            <div id="searchResults" class="search-gallery" aria-busy={!!busy.value}>
              {cards.value.map((card) => (
                <button
                  type="button"
                  class="result artwork-result"
                  key={card.item.qid || card.item.commons?.fileTitle}
                  onClick={() => void select(card.item)}
                >
                  {card.thumbnail ? (
                    <ArtworkImage
                      key={card.thumbnail}
                      url={card.thumbnail}
                      title={card.item.title}
                    />
                  ) : (
                    <span class="search-image-placeholder">Image unavailable</span>
                  )}
                  <span>
                    <strong>{card.item.title}</strong>
                    <small>{card.subtitle}</small>
                  </span>
                </button>
              ))}
            </div>
            {(continuation.value || pageFailed.value) && (
              <button
                type="button"
                class="btn search-load-more"
                disabled={!!busy.value}
                onClick={() => void search(galleryQuery.value, !!continuation.value)}
              >
                {busy.value ? 'Loading…' : pageFailed.value ? 'Try again' : 'Load more'}
              </button>
            )}
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
  root.addEventListener(
    'cancel',
    (event) => {
      if (expanded.value) {
        event.preventDefault();
        dismissHints();
      } else cancelPending();
    },
    { signal: lifetime.signal },
  );
  root.addEventListener(
    'pointerdown',
    (event) => {
      if (!(event.target instanceof Element) || !event.target.closest('.search-autocomplete'))
        dismissHints();
    },
    { signal: lifetime.signal },
  );
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

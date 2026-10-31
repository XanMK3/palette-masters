import markup from './view.html?raw';
import { scopedGet, node, message } from '../dom.js';
import { imgElement } from '../../artwork-image.js';
import type { ArtworkSelection } from '../../artwork-selection.js';
import type { WikidataSearchHit } from '../../wikimedia-art.service.js';
import type { SearchModule, SearchOptions } from './contracts.js';

export function mountWikimediaSearch(
  root: HTMLDialogElement,
  { service: art, onSelect }: SearchOptions,
): SearchModule {
  root.innerHTML = markup;
  const get = scopedGet(root);
  const lifetime = new AbortController();
  let disposed = false;
  let searchController: AbortController | null = null;
  let searchTimer: number | undefined;
  function cancelPending() {
    clearTimeout(searchTimer);
    searchController?.abort();
  }
  function beginRequest() {
    cancelPending();
    searchController = new AbortController();
    if (disposed) searchController.abort();
    return searchController.signal;
  }
  function close() {
    cancelPending();
    root.close();
  }
  function openSearch(): void {
    if (disposed) return;
    const dialog = root;
    if (!dialog.open) dialog.showModal();
    get<HTMLInputElement>('searchQuery').focus();
  }
  function chooseSearchPainting(item: ArtworkSelection): void {
    if (disposed || !root.open) return;
    close();
    onSelect(item);
  }
  function makeResultButton(
    title: string,
    sub: string,
    imageUrl: string | null,
    onClick: () => void,
  ): HTMLButtonElement {
    const b = node('button', 'result') as HTMLButtonElement;
    if (imageUrl) {
      const image = imgElement(imageUrl, title);
      b.append(image);
    }
    const wrap = node('span');
    wrap.append(node('strong', '', title), node('small', '', sub));
    b.append(wrap);
    b.addEventListener('click', onClick, { signal: lifetime.signal });
    return b;
  }
  async function openArtist(name: string, preferredQid?: string): Promise<void> {
    openSearch();
    const signal = beginRequest();
    get<HTMLInputElement>('searchQuery').value = name;
    const container = get('artistWorks');
    container.classList.remove('hidden');
    container.replaceChildren(node('div', 'tiny', `Loading paintings by ${name}…`));
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
      container.replaceChildren(node('div', 'eyebrow', `Paintings by ${artist?.label || name}`));
      if (artist?.description) container.append(node('p', 'tiny', artist.description));
      if (!works.length)
        container.append(
          node('p', 'tiny', 'No illustrated paintings found in this Wikidata query.'),
        );
      works.forEach((w) => {
        const b = makeResultButton(w.title, String(w.year || 'Painting'), w.imageUrl, () =>
          chooseSearchPainting({
            title: w.title,
            artist: artist?.label || name,
            date: w.year ? String(w.year) : '',
            qid: w.id,
            filename: w.imageFilename || undefined,
          }),
        );
        container.append(b);
      });
    } catch (error) {
      if (signal.aborted) return;
      container.replaceChildren(
        node('p', 'alert', `Unable to load artist paintings: ${message(error)}`),
      );
    }
  }
  async function openSearchHit(hit: WikidataSearchHit): Promise<void> {
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
      if (entity?.imageFilename) {
        chooseSearchPainting({
          title: entity.label,
          artist: 'Wikidata artwork',
          date: entity.createdYear ? String(entity.createdYear) : '',
          qid: entity.id,
          filename: entity.imageFilename,
        });
        return;
      }
      chooseSearchPainting({
        title: hit.label,
        artist: 'Wikimedia collection',
        date: '',
        qid: hit.id,
      });
    } catch (error) {
      if (signal.aborted) return;
      console.warn(`Could not open ${hit.label}`, error);
    }
  }
  async function search(query: string): Promise<void> {
    const signal = beginRequest();
    const target = get('searchResults');
    target.replaceChildren(node('div', 'tiny', `Searching for “${query}”…`));
    get('artistWorks').classList.add('hidden');
    try {
      const result = await art.searchAll(query, { signal });
      if (signal.aborted) return;
      target.replaceChildren();
      const hits = result.entities.filter((x) => x.kindHint !== 'other');
      target.append(
        node('div', 'eyebrow', `Wikidata · ${hits.length} matching artists / artworks`),
      );
      hits.forEach((x) =>
        target.append(
          makeResultButton(x.label, x.description || x.id, null, () => void openSearchHit(x)),
        ),
      );
      target.append(node('div', 'eyebrow', `Commons images · ${result.images.length}`));
      result.images.forEach((x) => {
        const title = x.fileTitle
          .replace(/^File:/, '')
          .replace(/\.[^.]+$/, '')
          .replace(/_/g, ' ');
        target.append(
          makeResultButton(title, x.license || 'Check license', x.thumbnailUrl, () =>
            chooseSearchPainting({ title, artist: 'Wikimedia Commons', date: '', commons: x }),
          ),
        );
      });
      if (!hits.length && !result.images.length)
        target.append(node('p', 'tiny', 'No results found. Try another artist or painting title.'));
      if (result.errors.length)
        target.append(
          node('p', 'alert', result.errors.map((x) => `${x.source}: ${x.message}`).join('; ')),
        );
    } catch (error) {
      if (!signal.aborted)
        target.replaceChildren(node('p', 'alert', `Search failed: ${message(error)}`));
    }
  }
  get('searchForm').addEventListener(
    'submit',
    (e) => {
      e.preventDefault();
      cancelPending();
      const q = get<HTMLInputElement>('searchQuery').value.trim();
      if (q) void search(q);
    },
    { signal: lifetime.signal },
  );
  get<HTMLInputElement>('searchQuery').addEventListener(
    'input',
    (e) => {
      cancelPending();
      let q = (e.target as HTMLInputElement).value.trim();
      if (q.length >= 3) searchTimer = window.setTimeout(() => void search(q), 500);
    },
    { signal: lifetime.signal },
  );

  get('closeSearch').addEventListener('click', close, { signal: lifetime.signal });
  root.addEventListener(
    'close',
    () => {
      if (!root.open) cancelPending();
    },
    { signal: lifetime.signal },
  );
  root.addEventListener('cancel', cancelPending, { signal: lifetime.signal });
  return {
    open: openSearch,
    close,
    dispose() {
      if (disposed) return;
      disposed = true;
      close();
      lifetime.abort();
      root.replaceChildren();
    },
  };
}

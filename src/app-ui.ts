import { exportTailwindTheme } from './theme/export.js';
import { imageError, imgElement } from './artwork-image.js';
import { createTemplatePreview } from './templates/bridge.js';
import { PipelineViewer } from './pipeline-viewer/index.js';
import { buildPaletteTheme } from './theme/pipeline.js';
import { mountAdvancedControls } from './extraction/advanced-ui.js';
import { DEFAULT_PRESET } from './extraction/presets.js';
import { createRunManager, rasterFingerprint } from './extraction/run.js';
import { TEMPLATE_USAGE } from './theme/validation.js';
import type { PipelineConfig } from './extraction/types.js';
import { PREHISTORIC_IMAGES } from './prehistoric-images.js';
import type { ArtworkSelection } from './artwork-selection.js';
import type { ArtworkSources } from './artwork-sources.js';
import type { createImageSelection, SelectionView } from './image-selection.js';
import { WikimediaArtService, type WikidataSearchHit } from './wikimedia-art.service.js';
import { DEFAULT_PAINTINGS, FEATURED_MOVEMENTS } from './featured-collections.js';
import { extractPalette, type PaletteMethod, type PaletteResult } from './palette.service.js';
import {
  ROLE_KEYS,
  reassignRole,
  shuffleAssignments,
  type RoleAssignments,
  DEFAULT_THEME,
} from './theme.service.js';

export function createAppUI(
  art: WikimediaArtService,
  sources: ArtworkSources,
  actions: Pick<ReturnType<typeof createImageSelection>, 'selectPainting'>,
) {
  const { selectPainting } = actions;
  const preview = createTemplatePreview(
    document.getElementById('templatePreview') as HTMLIFrameElement,
  );
  const { featuredDirectImage, resolveFeatured } = sources;
  const get = <T extends HTMLElement = HTMLElement>(id: string): T => {
    const el = document.getElementById(id);
    if (!el) throw new Error(`Missing element #${id}`);
    return el as T;
  };
  const node = (name: string, className?: string, text?: string): HTMLElement => {
    const element = document.createElement(name);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
  };
  let activeMovement: number | null = null;
  let selection: ArtworkSelection | null = null;
  let searchController: AbortController | null = null,
    searchTimer: number | undefined;
  let imageData: ImageData | null = null;
  let dismissPainting: (() => void) | null = null;

  function expandPainting(button: HTMLButtonElement, artist: string): void {
    const image = button.querySelector('img');
    if (!image?.complete || !image.naturalWidth || dismissPainting) return;
    const gallery = get('paintings');
    const overlay = node('div', 'painting-overlay');
    const enlarged = image.cloneNode() as HTMLImageElement;
    const close = node('button', 'painting-close') as HTMLButtonElement;
    close.type = 'button';
    close.style.visibility = 'hidden';
    close.setAttribute('aria-label', 'Close expanded painting');
    close.innerHTML =
      '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>';
    const title = node('div', 'painting-title', image.alt);
    title.style.visibility = 'hidden';
    title.append(node('span', 'painting-artist', artist));
    overlay.append(enlarged, title, close);
    gallery.append(overlay);
    const cards = Array.from(gallery.querySelectorAll<HTMLButtonElement>('.work'));
    cards.forEach((card) => (card.inert = true));
    image.style.visibility = 'hidden';
    let animation: Animation | null = null;
    let closing = false;
    const bounds = (element: HTMLElement) => {
      const rect = element.getBoundingClientRect();
      const origin = gallery.getBoundingClientRect();
      return {
        left: `${rect.left - origin.left}px`,
        top: `${rect.top - origin.top}px`,
        width: `${rect.width}px`,
        height: `${rect.height}px`,
      };
    };
    const fullBounds = () => ({
      left: '0px',
      top: '0px',
      width: `${gallery.clientWidth}px`,
      height: `${gallery.clientHeight}px`,
    });
    const cleanup = () => {
      animation?.cancel();
      observer.disconnect();
      overlay.remove();
      image.style.visibility = '';
      cards.forEach((card) => (card.inert = false));
      dismissPainting = null;
    };
    const animate = (from: Keyframe, to: Keyframe, done?: () => void) => {
      animation?.cancel();
      animation = overlay.animate([from, to], {
        duration: matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 300,
        easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
      });
      animation.onfinish = () => done?.();
    };
    const finishOpening = () => {
      title.style.visibility = '';
      close.style.visibility = '';
      close.focus({ preventScroll: true });
    };
    const closePainting = () => {
      if (closing) return;
      closing = true;
      const from = bounds(overlay);
      close.style.visibility = 'hidden';
      title.style.visibility = 'hidden';
      animate(from, bounds(image), () => {
        cleanup();
        button.focus({ preventScroll: true });
      });
    };
    close.onclick = closePainting;
    enlarged.onclick = closePainting;
    enlarged.style.cursor = 'zoom-out';
    const observer = new ResizeObserver(() => {
      if (closing) {
        const from = bounds(overlay);
        animate(from, bounds(image), () => {
          cleanup();
          button.focus({ preventScroll: true });
        });
      } else if (animation?.playState === 'running') {
        animate(bounds(overlay), fullBounds(), finishOpening);
      }
    });
    dismissPainting = cleanup;
    animate(bounds(image), fullBounds(), finishOpening);
    observer.observe(gallery);
  }

  let palette: PaletteResult | null = null;
  let appliedThemeTokens: Record<string, string> | null = null;
  let assignments: RoleAssignments | null = null;
  const paletteSize = 5;
  let method: PaletteMethod = DEFAULT_PRESET;
  let template: 'landing' | 'magazine' | 'poster' = 'landing';
  let userMapping = false;
  let customConfiguration: PipelineConfig | undefined;
  const runs = createRunManager('app');
  const pipelineViewer = new PipelineViewer();
  const advancedHost = document.createElement('div');
  advancedHost.id = 'advanced-controls';
  const advanced = mountAdvancedControls(advancedHost, (config) => {
    customConfiguration = config;
    const chapter = pipelineViewer.chapter;
    const refresh = pipelineViewer.isOpen;
    const focused = document.activeElement as HTMLElement | null;
    updatePalette(refresh);
    if (refresh) {
      openPipeline(chapter);
      if (focused?.isConnected) focused.focus({ preventScroll: true });
      else
        document.querySelector<HTMLElement>('.pv-selection select')?.focus({ preventScroll: true });
    }
  });

  function setImage(url: string | null, title: string, key?: string): void {
    preview.update({ image: { url, title, key } });
  }
  function updatePreviewLabels(item: ArtworkSelection): void {
    const pinned = item.wikipediaTitle && PREHISTORIC_IMAGES[item.wikipediaTitle];
    if (pinned) {
      const link = node('a', '', pinned.credit);
      link.setAttribute('href', pinned.source);
      link.setAttribute('target', '_blank');
      link.setAttribute('rel', 'noopener noreferrer');
    }
    preview.update({
      title: item.title,
      artist: [item.artist, item.date].filter(Boolean).join(' / '),
    });
  }
  function resetColors(): void {
    get('palette-error').textContent = '';
    pipelineViewer.dispose();
    runs.cancel();
    userMapping = false;
    assignments = null;
    palette = null;
    appliedThemeTokens = null;
    get<HTMLButtonElement>('download-theme').disabled = true;
    imageData = null;
    preview.update({ tokens: DEFAULT_THEME });
    renderSwatches();
  }
  function renderSwatches(): void {
    const wrapper = get('swatches');
    wrapper.replaceChildren();
    wrapper.style.setProperty('--swatch-count', String(palette?.colors.length || paletteSize));
    get<HTMLButtonElement>('btn-shuffle').disabled = !palette;
    get<HTMLButtonElement>('view-pipeline').disabled = !palette;
    if (!palette) {
      for (let i = 0; i < paletteSize; i++) {
        let b = node('div', 'swatch');
        b.append(node('div', 'pigment'));
        const column = node('div', 'swatch-column');
        const select = document.createElement('select');
        select.disabled = true;
        select.setAttribute('aria-label', `Role for color ${i + 1}`);
        const option = document.createElement('option');
        option.textContent = '—';
        select.append(option);
        column.append(b, select);
        wrapper.append(column);
      }
      return;
    }
    const indices = palette.colors.map((_, i) => i);
    indices.forEach((i) => {
      const hex = palette!.colors[i];
      const b = node('button', 'swatch') as HTMLButtonElement;
      b.type = 'button';
      b.title = `Copy ${hex}`;
      b.setAttribute('aria-label', `Copy palette color ${i + 1}, ${hex}`);
      const pigment = node('div', 'pigment');
      pigment.style.background = hex;
      pigment.append(node('code', '', hex));
      b.append(pigment);
      b.addEventListener('click', () => void copyText(hex));
      const column = node('div', 'swatch-column');
      const select = document.createElement('select');
      select.dataset.swatchIndex = String(i);
      select.setAttribute('aria-label', `Role for color ${i + 1}, ${hex}`);
      const roles = ROLE_KEYS.slice(0, paletteSize);
      const active = roles.find((role) => assignments?.[role] === i) ?? 'bg';
      select.dataset.role = active;
      for (const role of roles) {
        const option = document.createElement('option');
        option.value = role;
        option.textContent = role === 'bg' ? 'BG' : role[0].toUpperCase() + role.slice(1);
        select.append(option);
      }
      select.value = active;
      select.title = `${hex} · ${active}`;
      select.onchange = () => {
        if (!palette || !assignments) return;
        userMapping = true;
        assignments = reassignRole(
          assignments,
          select.value as typeof active,
          i,
          palette.colors.length,
        );
        updateMapping();
      };
      const swatch = palette!.swatches[i];
      column.dataset.swatchId = swatch.id;
      column.append(b, select);
      wrapper.append(column);
    });
    if (palette.colors.length < paletteSize) {
      const note = node('span', 'tiny', `${palette.colors.length} distinct colors found`);
      wrapper.append(note);
    }
  }
  function updateMapping(keepViewer = false): void {
    if (!keepViewer) pipelineViewer.dispose();
    if (!palette) return;
    const { theme } = buildPaletteTheme(
      palette,
      TEMPLATE_USAGE[template],
      {},
      userMapping && assignments ? assignments : undefined,
    );
    assignments = theme.assignments;
    appliedThemeTokens = theme.tokens;
    get<HTMLButtonElement>('download-theme').disabled = false;
    preview.update({ tokens: theme.tokens });
    renderSwatches();
  }
  function updatePalette(keepViewer = false): void {
    get('palette-error').textContent = '';
    if (!imageData) return;
    try {
      const run = runs.start({
        inputFingerprint: rasterFingerprint(imageData),
        algorithmVersion: 'pipeline-v1',
      });
      const next = extractPalette(
        imageData,
        { method, count: paletteSize, configuration: customConfiguration },
        { ...run, captureVisuals: true },
      );
      run.assertCurrent();
      palette = next;
      userMapping = false;
      assignments = null;
      updateMapping(keepViewer);
      preview.update({
        algorithmLabel: customConfiguration
          ? 'Custom'
          : (get<HTMLSelectElement>('method').selectedOptions[0].textContent ?? ''),
      });
    } catch (error) {
      get('palette-error').textContent = `Extraction failed: ${message(error)}`;
      console.warn('Palette extraction failed', error);
    }
  }
  function message(e: unknown): string {
    return e instanceof Error ? e.message : String(e);
  }
  function setMovement(index: number | null): void {
    dismissPainting?.();
    activeMovement = index;
    const movement = index === null ? null : FEATURED_MOVEMENTS[index];
    const paintings = movement?.paintings ?? DEFAULT_PAINTINGS;
    const picker = get<HTMLSelectElement>('movementPicker');
    picker.value = index === null ? '' : String(index);
    const gallery = get('paintings');
    gallery.replaceChildren();
    if (index === null) {
      gallery.classList.add('cols-4');
      gallery.classList.remove('cols-3');
    } else {
      gallery.classList.add('cols-3');
      gallery.classList.remove('cols-4');
    }
    paintings.forEach((work) => {
      const button = node('button', 'work') as HTMLButtonElement;
      button.dataset.wikipediaTitle = work.wikipediaTitle;
      button.title = `Select ${work.title}, ${work.artist}`;
      button.setAttribute('aria-label', button.title);
      const selected = selection?.wikipediaTitle === work.wikipediaTitle;
      button.classList.toggle('selected', selected);
      button.setAttribute('aria-pressed', String(selected));
      const direct = featuredDirectImage(work);
      const frame = direct
        ? imgElement(direct, work.title, work.wikipediaTitle)
        : node('div', 'noimage', 'Checking Wikimedia…');
      button.append(frame, node('span', '', work.title));
      button.onclick = () => {
        void selectPainting({
          ...work,
          movement:
            movement?.name ??
            DEFAULT_PAINTINGS.find((entry) => entry.wikipediaTitle === work.wikipediaTitle)
              ?.movement,
        });
        expandPainting(button, work.artist);
      };
      gallery.append(button);
      if (!direct) {
        // API lookup is only needed when an image was not curated. A blocked API
        // will never hide the other paintings that already have <img src> URLs.
        void resolveFeatured(work)
          .then((image) => {
            if (!button.isConnected || !frame.isConnected) return;
            const url = image?.thumbnailUrl || image?.originalUrl;
            if (!url) {
              frame.replaceWith(imageError('not available for this artwork', work.wikipediaTitle));
              return;
            }
            frame.replaceWith(imgElement(url, work.title, work.wikipediaTitle));
          })
          .catch(() => {
            if (frame.isConnected)
              frame.replaceWith(imageError('Wikimedia API blocked', work.wikipediaTitle));
          });
      }
    });
  }
  function openSearch(): void {
    const dialog = get<HTMLDialogElement>('searchDialog');
    if (!dialog.open) dialog.showModal();
    get<HTMLInputElement>('searchQuery').focus();
  }
  function chooseSearchPainting(item: ArtworkSelection): void {
    get<HTMLDialogElement>('searchDialog').close();
    void selectPainting(item);
    setMovement(activeMovement);
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
    b.addEventListener('click', onClick);
    return b;
  }
  async function openArtist(name: string, preferredQid?: string): Promise<void> {
    openSearch();
    get<HTMLInputElement>('searchQuery').value = name;
    const container = get('artistWorks');
    container.classList.remove('hidden');
    container.replaceChildren(node('div', 'tiny', `Loading paintings by ${name}…`));
    try {
      let qid = preferredQid;
      if (!qid) {
        const matches = await art.searchEntities(name, { limit: 12 });
        qid =
          matches.find(
            (x) => x.label.toLowerCase() === name.toLowerCase() && x.kindHint === 'artist',
          )?.id || matches.find((x) => x.kindHint === 'artist')?.id;
      }
      if (!qid) throw new Error('Artist not found in Wikidata');
      const [artist, works] = await Promise.all([
        art.getEntity(qid),
        art.getArtistPaintings(qid, { limit: 12, onlyWithImage: true }),
      ]);
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
    try {
      const entity = await art.getEntity(hit.id);
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
      console.warn(`Could not open ${hit.label}`, error);
    }
  }
  async function search(query: string): Promise<void> {
    searchController?.abort();
    searchController = new AbortController();
    const signal = searchController.signal;
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
  function setTemplate(next: 'landing' | 'magazine' | 'poster'): void {
    const requirementsChanged =
      JSON.stringify(TEMPLATE_USAGE[template].requirements) !==
      JSON.stringify(TEMPLATE_USAGE[next].requirements);
    template = next;
    if (palette && (userMapping || requirementsChanged)) updateMapping();
    preview.update({ template });
    for (const value of ['landing', 'magazine', 'poster']) {
      const tab = document.querySelector<HTMLButtonElement>(`[data-template="${value}"]`);
      tab?.classList.toggle('active', value === next);
    }
  }
  async function copyText(value: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      console.warn('Clipboard access blocked');
    }
  }
  document.addEventListener('securitypolicyviolation', (event) => {
    const blocked = event.blockedURI || '';
    if (!/wikimedia\.org|wikipedia\.org/.test(blocked)) return;
    if (event.effectiveDirective === 'img-src') {
      get('networkNotice').textContent =
        'This preview blocks Wikimedia images. Real painting thumbnails require locally bundled image bytes. Build with npm run cache:art.';
    } else if (event.effectiveDirective === 'connect-src') {
      get('networkNotice').textContent =
        'This preview blocks live Wikimedia API calls. Curated images can still display if img-src permits them; otherwise use locally bundled images.';
    }
  });
  get('openSearch').onclick = openSearch;
  get('closeSearch').onclick = () => get<HTMLDialogElement>('searchDialog').close();
  get('searchDialog').addEventListener('close', () => {
    clearTimeout(searchTimer);
    searchController?.abort();
  });
  get<HTMLSelectElement>('method').onchange = (e) => {
    method = (e.currentTarget as HTMLSelectElement).value as PaletteMethod;
    customConfiguration = undefined;
    advanced.preset(method);
    if (imageData) updatePalette();
  };
  get('btn-shuffle').onclick = () => {
    if (assignments && palette) {
      userMapping = true;
      assignments = shuffleAssignments(assignments, palette.colors.length);
      updateMapping();
    }
  };
  function openPipeline(chapter: typeof pipelineViewer.chapter = 'sample') {
    if (!palette || !imageData) return;
    try {
      const { result: theme } = buildPaletteTheme(
        palette,
        TEMPLATE_USAGE[template],
        {},
        userMapping && assignments ? assignments : undefined,
      );
      advanced.populate(palette.configuration.effective, !pipelineViewer.isOpen);
      pipelineViewer.open(
        { result: palette, theme },
        imageData,
        {
          advanced: advancedHost,
          select: (kind) => advanced.select(kind),
        },
        chapter,
      );
    } catch (error) {
      get('palette-error').textContent = `Cannot show pipeline: ${message(error)}`;
    }
  }
  get('view-pipeline').onclick = () => openPipeline();
  get('searchForm').addEventListener('submit', (e) => {
    e.preventDefault();
    clearTimeout(searchTimer);
    const q = get<HTMLInputElement>('searchQuery').value.trim();
    if (q) void search(q);
  });
  get<HTMLInputElement>('searchQuery').addEventListener('input', (e) => {
    clearTimeout(searchTimer);
    let q = (e.target as HTMLInputElement).value.trim();
    if (q.length >= 3) searchTimer = window.setTimeout(() => void search(q), 500);
  });
  document
    .querySelectorAll<HTMLButtonElement>('[data-template]')
    .forEach((b) => (b.onclick = () => setTemplate(b.dataset.template as typeof template)));
  get<HTMLButtonElement>('download-theme').onclick = () => {
    if (!appliedThemeTokens) return;
    const url = URL.createObjectURL(
      new Blob([exportTailwindTheme(appliedThemeTokens)], { type: 'text/css;charset=utf-8' }),
    );
    const link = document.createElement('a');
    link.href = url;
    link.download = 'theme.css';
    document.body.append(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  resetColors();
  const movementPicker = get<HTMLSelectElement>('movementPicker');
  movementPicker.add(new Option('Iconic Paintings · all times', ''));
  FEATURED_MOVEMENTS.forEach((movement, index) => {
    movementPicker.add(new Option(`${movement.name} · ${movement.dates}`, String(index)));
  });
  movementPicker.addEventListener('change', () =>
    setMovement(movementPicker.value === '' ? null : Number(movementPicker.value)),
  );
  setMovement(null);
  setTemplate('landing');
  return {
    selectionStarted(item: ArtworkSelection) {
      selection = item;
      get('paintings')
        .querySelectorAll<HTMLButtonElement>('.work')
        .forEach((button) => {
          const selected = button.dataset.wikipediaTitle === item.wikipediaTitle;
          button.classList.toggle('selected', selected);
          button.setAttribute('aria-pressed', String(selected));
        });
      resetColors();
      updatePreviewLabels(item);
    },
    showImage: setImage,
    pixelsReady(pixels: ImageData) {
      imageData = pixels;
      updatePalette();
    },
  } satisfies SelectionView;
}

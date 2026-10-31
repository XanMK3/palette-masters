import markup from './view.html?raw';
import { scopedGet, node } from '../dom.js';
import { imageError, imgElement } from '../../artwork-image.js';
import { DEFAULT_PAINTINGS, FEATURED_MOVEMENTS } from '../../featured-collections.js';
import { DEFAULT_PRESET } from '../../extraction/presets.js';
import { ROLE_KEYS } from '../../theme.service.js';
import type { SidebarModule, SidebarOptions, SidebarState } from './contracts.js';

export function mountSidebar(
  root: HTMLElement,
  { sources, actions }: SidebarOptions,
): SidebarModule {
  root.innerHTML = markup;
  const get = scopedGet(root);
  const lifetime = new AbortController();
  let disposed = false;
  let galleryGeneration = 0;
  const { featuredDirectImage, resolveFeatured } = sources;
  const selectPainting = actions.selectPainting;
  let activeMovement: number | null = null;
  let dismissPainting: (() => void) | null = null;
  let selection: SidebarState['selection'] = null;
  let palette: SidebarState['palette'] = null;
  let assignments: SidebarState['assignments'] = null;
  const paletteSize = 5;
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
      b.addEventListener('click', () => void copyText(hex), { signal: lifetime.signal });
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
        if (disposed || !palette || !assignments) return;
        actions.assignRole(select.value as typeof active, i);
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
  function setMovement(index: number | null): void {
    const generation = ++galleryGeneration;
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
        if (disposed) return;
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
            if (
              disposed ||
              generation !== galleryGeneration ||
              !button.isConnected ||
              !frame.isConnected
            )
              return;
            const url = image?.thumbnailUrl || image?.originalUrl;
            if (!url) {
              frame.replaceWith(imageError('not available for this artwork', work.wikipediaTitle));
              return;
            }
            frame.replaceWith(imgElement(url, work.title, work.wikipediaTitle));
          })
          .catch(() => {
            if (!disposed && generation === galleryGeneration && frame.isConnected)
              frame.replaceWith(imageError('Wikimedia API blocked', work.wikipediaTitle));
          });
      }
    });
  }
  async function copyText(value: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      console.warn('Clipboard access blocked');
    }
  }
  const movementPicker = get<HTMLSelectElement>('movementPicker');
  movementPicker.add(new Option('Iconic Paintings · all times', ''));
  FEATURED_MOVEMENTS.forEach((movement, index) => {
    movementPicker.add(new Option(`${movement.name} · ${movement.dates}`, String(index)));
  });
  movementPicker.addEventListener(
    'change',
    () => setMovement(movementPicker.value === '' ? null : Number(movementPicker.value)),
    { signal: lifetime.signal },
  );
  setMovement(null);

  get<HTMLSelectElement>('method').value = DEFAULT_PRESET;
  get('method').addEventListener(
    'change',
    () => {
      const select = get<HTMLSelectElement>('method');
      actions.changeMethod(
        select.value as SidebarState['method'],
        select.selectedOptions[0].textContent ?? '',
      );
    },
    { signal: lifetime.signal },
  );
  get('btn-shuffle').addEventListener('click', actions.shuffle, { signal: lifetime.signal });
  get('view-pipeline').addEventListener('click', actions.openPipeline, { signal: lifetime.signal });
  renderSwatches();
  return {
    update(state) {
      if (disposed) return;
      selection = state.selection;
      palette = state.palette;
      assignments = state.assignments;
      get<HTMLSelectElement>('method').value = state.method;
      get('palette-error').textContent = state.error;
      get('paintings')
        .querySelectorAll<HTMLButtonElement>('.work')
        .forEach((button) => {
          const selected =
            !!selection?.wikipediaTitle &&
            button.dataset.wikipediaTitle === selection.wikipediaTitle;
          button.classList.toggle('selected', selected);
          button.setAttribute('aria-pressed', String(selected));
        });
      renderSwatches();
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      lifetime.abort();
      dismissPainting?.();
      root.replaceChildren();
    },
  };
}

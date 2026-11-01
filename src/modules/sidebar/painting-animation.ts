import { node } from '../dom.js';

/** The empty overlay host is reserved for Web Animations and cloned image DOM. */
export function createPaintingAnimation(gallery: HTMLElement, host: HTMLElement) {
  let dismissPainting: (() => void) | null = null;
  function expandPainting(button: HTMLButtonElement, artist: string): void {
    const image = button.querySelector('img');
    if (!image?.complete || !image.naturalWidth || dismissPainting) return;
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
    host.append(overlay);
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

  return { expand: expandPainting, dispose: () => dismissPainting?.() };
}

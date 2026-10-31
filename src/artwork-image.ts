import {
  FEATURED_FILE_PAGES,
  FEATURED_UPLOAD_IMAGES,
  FEATURED_DIRECT_IMAGES,
} from './featured-images.js';
import { EMBEDDED_ART_IMAGES } from './embedded-art.js';
const node = (name: string, className?: string, text?: string): HTMLElement => {
  const element = document.createElement(name);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
};
/**
 * Never fetch to find the first display URL: native image loading works under
 * a different CSP directive (img-src) than API fetch (connect-src).
 * Try both official Wikimedia file hosts, then show a useful source link.
 */
export function imageError(label: string, key?: string): HTMLElement {
  const wrapper = node('div', 'placeholder missing-art');
  wrapper.setAttribute('role', 'img');
  wrapper.setAttribute('aria-label', 'Painting image unavailable');
  const glyph = node('strong', 'missing-glyph', '▧');
  const detail = node('small', '', 'Artwork image unavailable');
  const reason = node('small', 'missing-reason', label);
  wrapper.append(glyph, detail, reason);
  if (key && FEATURED_FILE_PAGES[key]) {
    const link = node('a', '', 'View on Commons ↗');
    link.setAttribute('href', FEATURED_FILE_PAGES[key]);
    link.setAttribute('target', '_blank');
    link.setAttribute('rel', 'noopener noreferrer');
    wrapper.append(link);
  }
  return wrapper;
}
export function imgElement(url: string, alt: string, key?: string): HTMLElement {
  const holder = node('div', 'image-holder');
  const waiting = node('div', 'loading-art', `Loading ${alt}…`);
  holder.append(waiting);
  const image = document.createElement('img');
  image.alt = alt;
  image.decoding = 'async'; // eager: don't leave gallery cards pending offscreen
  image.loading = 'eager';
  image.onload = () => {
    image.classList.add('loaded');
    waiting.hidden = true;
  };
  const urls = [url];
  if (key) {
    for (const candidate of [
      EMBEDDED_ART_IMAGES[key],
      FEATURED_UPLOAD_IMAGES[key],
      FEATURED_DIRECT_IMAGES[key],
    ]) {
      if (candidate && !urls.includes(candidate)) urls.push(candidate);
    }
  }
  let index = 0;
  image.onerror = () => {
    index++;
    if (index < urls.length) {
      image.src = urls[index];
      return;
    }
    image.remove();
    waiting.textContent = `Image unavailable: ${alt}`;
    waiting.classList.add('unavailable-art');
    if (key && FEATURED_FILE_PAGES[key]) {
      const link = node('a', '', 'Commons source ↗');
      link.setAttribute('href', FEATURED_FILE_PAGES[key]);
      link.setAttribute('target', '_blank');
      link.setAttribute('rel', 'noopener noreferrer');
      waiting.append(link);
    }
  };
  holder.append(image);
  image.src = urls[index];
  return holder;
}

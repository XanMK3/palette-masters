import type { WikimediaArtService } from './wikimedia-art.service.js';
import type { ArtworkSelection } from './artwork-selection.js';
import type { ArtworkSources } from './artwork-sources.js';
import { FEATURED_UPLOAD_IMAGES } from './featured-images.js';

export interface SelectionView {
  selectionStarted(item: ArtworkSelection): void;
  showImage(url: string | null, title: string, key?: string): void;
  pixelsReady(pixels: ImageData): void;
}
type ImageService = Pick<
  WikimediaArtService,
  'resolveArtworkImage' | 'readImagePixelsViaImageTag' | 'fetchArtworkImage'
>;
const message = (error: unknown) => (error instanceof Error ? error.message : String(error));

/** Owns asynchronous selection, cancellation, and object URL lifetime. No DOM access. */
export function createImageSelection(
  art: ImageService,
  sources: ArtworkSources,
  view: SelectionView,
) {
  let selectionNumber = 0;
  let selectionController: AbortController | null = null;
  let releaseDisplayedImage: (() => void) | null = null;
  async function selectPainting(item: ArtworkSelection): Promise<void> {
    const selectionIndex = ++selectionNumber;
    selectionController?.abort();
    selectionController = new AbortController();
    const signal = selectionController.signal;
    releaseDisplayedImage?.();
    releaseDisplayedImage = null;
    view.selectionStarted(item);
    const stillCurrent = () => selectionIndex === selectionNumber && !signal.aborted;
    // This MUST happen synchronously. The image is an <img>, not a fetch() response.
    // It remains visible when connect-src blocks Commons API or image pixel requests.
    let image = item.commons || null;
    let imageUrl =
      item.imageUrl ||
      image?.thumbnailUrl ||
      image?.originalUrl ||
      sources.featuredDirectImage(item);
    view.showImage(imageUrl || null, item.title, item.wikipediaTitle);
    if (!imageUrl) {
      try {
        image = item.wikipediaTitle
          ? await sources.resolveFeatured({ ...item, wikipediaTitle: item.wikipediaTitle })
          : await art.resolveArtworkImage(
              { title: item.title, artist: item.artist, filename: item.filename, qid: item.qid },
              { signal, thumbnailWidth: 700 },
            );
        if (!stillCurrent()) return;
        imageUrl = image?.thumbnailUrl || image?.originalUrl || null;
        if (imageUrl) view.showImage(imageUrl, item.title, item.wikipediaTitle);
      } catch (error) {
        if (stillCurrent())
          console.warn(
            `No direct image is known for this work, and Commons lookup failed: ${message(error)}`,
          );
        return;
      }
    }
    if (!stillCurrent()) return;
    if (!imageUrl) {
      console.warn('No Wikimedia image found for this artwork.');
      return;
    }

    let elementError: unknown;
    try {
      // CSP may permit img-src but forbid connect-src. A CORS-enabled <img>
      // can still be sampled through Canvas when Wikimedia sends ACAO headers.
      const pixels = await art.readImagePixelsViaImageTag(imageUrl, { signal, maxDimension: 260 });
      if (!stillCurrent()) return;
      view.pixelsReady(pixels);
      return;
    } catch (error) {
      if (!stillCurrent()) return;
      elementError = error;
      // The display <img> may have fallen back from thumb.wikimedia.org to
      // upload.wikimedia.org. Sample the SAME working fallback before trying
      // a fetch() request (which is often forbidden by embedded CSP).
      const alternate = item.wikipediaTitle && FEATURED_UPLOAD_IMAGES[item.wikipediaTitle];
      if (alternate && alternate !== imageUrl) {
        try {
          const pixels = await art.readImagePixelsViaImageTag(alternate, {
            signal,
            maxDimension: 260,
          });
          if (!stillCurrent()) return;
          view.pixelsReady(pixels);
          return;
        } catch (secondError) {
          if (!stillCurrent()) return;
          elementError = secondError;
        }
      }
    }
    try {
      // Some deployments permit fetch even when the CORS-enabled <img> path fails.
      const loaded = await art.fetchArtworkImage(imageUrl, { signal, maxDimension: 260 });
      if (!stillCurrent()) {
        loaded.dispose();
        return;
      }
      releaseDisplayedImage = loaded.dispose;
      view.showImage(loaded.displayUrl, item.title, item.wikipediaTitle);
      view.pixelsReady(loaded.imageData);
    } catch (error) {
      if (!stillCurrent()) return;
      console.warn(
        `Artwork remains visible where permitted, but its pixels could not be read for palette extraction (CORS/CSP/network): ${message(elementError)}; ${message(error)}`,
      );
    }
  }

  function dispose(): void {
    selectionNumber++;
    selectionController?.abort();
    releaseDisplayedImage?.();
    releaseDisplayedImage = null;
  }
  return { selectPainting, dispose };
}

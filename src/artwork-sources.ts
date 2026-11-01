import type { WikimediaArtService, CommonsImage } from './wikimedia-art.service.js';
import type { ArtworkSelection } from './artwork-selection.js';
import { FEATURED_IMAGE_FILENAMES, FEATURED_DIRECT_IMAGES } from './featured-images.js';
import { EMBEDDED_ART_IMAGES } from './embedded-art.js';

export type ArtworkSources = ReturnType<typeof createArtworkSources>;
export function createArtworkSources(art: Pick<WikimediaArtService, 'resolveArtworkImage'>) {
  /** Direct <img> URLs deliberately do not depend on API calls (CSP connect-src). */
  const featuredDirectImage = (item: { wikipediaTitle?: string }) =>
    item.wikipediaTitle
      ? EMBEDDED_ART_IMAGES[item.wikipediaTitle] ||
        FEATURED_DIRECT_IMAGES[item.wikipediaTitle] ||
        null
      : null;
  const featuredImages = new Map<string, Promise<CommonsImage | null>>();
  /** Resolve each editorial artwork once, and reuse the verified Commons response in the gallery and detail. */
  function resolveFeatured(
    item: ArtworkSelection & { wikipediaTitle: string },
  ): Promise<CommonsImage | null> {
    const key = item.wikipediaTitle;
    const existing = featuredImages.get(key);
    if (existing) return existing;
    const request = art.resolveArtworkImage(
      {
        title: item.title,
        artist: item.artist,
        filename: FEATURED_IMAGE_FILENAMES[key],
      },
      { thumbnailWidth: 700 },
    );
    featuredImages.set(key, request);
    void request.catch(() => {
      if (featuredImages.get(key) === request) featuredImages.delete(key);
    });
    return request;
  }

  return {
    featuredDirectImage,
    resolveFeatured,
  };
}

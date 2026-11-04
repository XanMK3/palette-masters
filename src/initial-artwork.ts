import { DEFAULT_PAINTINGS } from './featured-collections.js';
import { FEATURED_IMAGE_FILENAMES, FEATURED_DIRECT_IMAGES } from './featured-images.js';
import { EMBEDDED_ART_IMAGES } from './embedded-art.js';

const work = DEFAULT_PAINTINGS.find((item) => item.wikipediaTitle === 'Girl_with_a_Pearl_Earring');
if (!work) throw new Error('Initial artwork must belong to the default collection');

/** Shared by application startup and Vite's initial-document resource hints. */
export const INITIAL_ARTWORK = {
  ...work,
  source: 'curated' as const,
  filename: FEATURED_IMAGE_FILENAMES[work.wikipediaTitle],
  imageUrl: EMBEDDED_ART_IMAGES[work.wikipediaTitle] || FEATURED_DIRECT_IMAGES[work.wikipediaTitle],
};

import type { CommonsImage } from './wikimedia-art.service.js';

export interface ArtworkSelection {
  source?: 'curated' | 'wikimedia';
  title: string;
  artist: string;
  date: string;
  movement?: string;
  filename?: string;
  wikipediaTitle?: string;
  qid?: string;
  commons?: CommonsImage;
  imageUrl?: string;
}

/** Identity for UI choices; excludes transient image URLs and object identity. */
export function artworkId(item: ArtworkSelection): string {
  if (item.qid) return `wikidata:${item.qid}`;
  if (item.wikipediaTitle) return `wikipedia:${item.wikipediaTitle.replace(/_/g, ' ')}`;
  const file = item.commons?.fileTitle || item.filename;
  if (file) return `commons:${file.replace(/^File:/, '').replace(/_/g, ' ')}`;
  return `artwork:${JSON.stringify([item.artist, item.title, item.date])}`;
}

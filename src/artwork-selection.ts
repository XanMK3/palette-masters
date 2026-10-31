import type { CommonsImage } from './wikimedia-art.service.js';

export interface ArtworkSelection {
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

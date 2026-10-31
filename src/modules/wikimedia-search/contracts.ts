import type { ArtworkSelection } from '../../artwork-selection.js';
import type { WikimediaArtService } from '../../wikimedia-art.service.js';
export type SearchService = Pick<
  WikimediaArtService,
  'searchAll' | 'searchEntities' | 'getEntity' | 'getArtistPaintings'
>;
export interface SearchOptions {
  service: SearchService;
  onSelect(item: ArtworkSelection): void;
}
export interface SearchModule {
  open(): void;
  close(): void;
  dispose(): void;
}

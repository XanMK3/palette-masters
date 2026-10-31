import type { ArtworkSelection } from '../artwork-selection.js';
import type { SelectionView } from '../image-selection.js';

export interface AppActions {
  selectPainting(item: ArtworkSelection): void | Promise<void>;
}
/** Image workflow output port plus shell lifetime. */
export interface AppShell extends SelectionView {
  dispose(): void;
}

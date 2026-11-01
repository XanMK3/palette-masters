import type { ArtworkSelection } from '../../artwork-selection.js';
import type { ArtworkSources } from '../../artwork-sources.js';
import type { PaletteMethod } from '../../palette.service.js';
import type { RoleAssignments, ThemeRoleKey } from '../../theme.service.js';

/** Read-only view data; extraction provenance stays in the workflow/viewer. */
export interface SidebarPalette {
  readonly colors: readonly string[];
  readonly swatches: readonly { readonly id: string }[];
}
export interface SidebarState {
  readonly selection: Readonly<ArtworkSelection> | null;
  readonly palette: SidebarPalette | null;
  readonly assignments: Readonly<RoleAssignments> | null;
  readonly method: PaletteMethod;
  readonly error: string;
}
export interface SidebarActions {
  selectPainting(item: ArtworkSelection): void;
  changeMethod(method: PaletteMethod, label: string): void;
  assignRole(role: ThemeRoleKey, index: number): void;
  shuffle(): void;
  openPipeline(): void;
}
export interface SidebarOptions {
  sources: ArtworkSources;
  actions: SidebarActions;
}
export interface SidebarModule {
  update(state: SidebarState): void;
  dispose(): void;
}

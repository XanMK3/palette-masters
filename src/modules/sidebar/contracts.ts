import type { ArtworkSelection } from '../../artwork-selection.js';
import type { ArtworkSources } from '../../artwork-sources.js';
import type { PaletteMethod, PaletteResult } from '../../palette.service.js';
import type { RoleAssignments, ThemeRoleKey } from '../../theme.service.js';

export interface SidebarState {
  selection: ArtworkSelection | null;
  palette: PaletteResult | null;
  assignments: RoleAssignments | null;
  method: PaletteMethod;
  error: string;
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

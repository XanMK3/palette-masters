import type { SidebarState } from '../modules/sidebar/index.js';
import type { PreviewState, TemplateId } from '../templates/bridge.js';
import type { PresetId } from '../extraction/presets.js';
import type { PipelineViewData, Chapter } from '../pipeline-viewer';

export interface ShellState {
  readonly template: TemplateId;
  readonly canExport: boolean;
}
/** Workflow dependencies describe capabilities, not concrete UI implementations. */
export interface ControllerPorts {
  updateSidebar(state: SidebarState): void;
  updateShell(state: ShellState): void;
  preview: { update(state: Partial<PreviewState>): void };
  pipeline: {
    readonly chapter: Chapter;
    readonly isOpen: boolean;
    preset(id: PresetId): void;
    open(data: PipelineViewData, image: ImageData, chapter: Chapter): void;
    dispose(): void;
  };
  download(filename: string, content: string, type: string): void;
}

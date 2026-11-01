import type { SidebarState } from '../modules/sidebar/index.js';
import type { createTemplatePreview } from '../templates/bridge.js';
import type { TemplateId } from '../templates/state.js';
import type { createPipelineAdapter } from './pipeline-adapter.js';

export interface ShellState {
  template: TemplateId;
  canExport: boolean;
}
export interface ControllerPorts {
  updateSidebar(state: SidebarState): void;
  updateShell(state: ShellState): void;
  preview: Pick<ReturnType<typeof createTemplatePreview>, 'update'>;
  pipeline: ReturnType<typeof createPipelineAdapter>;
}

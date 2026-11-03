import { PipelineViewer, type PipelineViewData } from '../pipeline-viewer';
import { mountAdvancedControls } from '../extraction/advanced-ui.js';
import type { PipelineConfig } from '../extraction/types.js';
import type { PresetId } from '../extraction/presets.js';

/** Owns the imperative viewer and its controls; Preact never renders their DOM. */
export function createPipelineAdapter(onConfiguration: (config: PipelineConfig) => void) {
  const viewer = new PipelineViewer();
  const host = document.createElement('div');
  host.id = 'advanced-controls';
  const controls = mountAdvancedControls(host, (config) => {
    const focused = document.activeElement as HTMLElement | null;
    onConfiguration(config);
    if (viewer.isOpen) {
      if (focused?.isConnected) focused.focus({ preventScroll: true });
      else
        document.querySelector<HTMLElement>('.pv-selection select')?.focus({ preventScroll: true });
    }
  });
  return {
    get chapter() {
      return viewer.chapter;
    },
    get isOpen() {
      return viewer.isOpen;
    },
    preset: (id: PresetId) => controls.preset(id),
    open(data: PipelineViewData, image: ImageData, chapter: typeof viewer.chapter) {
      const focused = viewer.isOpen ? (document.activeElement as HTMLElement | null) : null;
      const restoreFocus = !!focused?.closest('.pipeline-viewer');
      controls.populate(data.result.configuration.effective, !viewer.isOpen);
      viewer.open(
        data,
        image,
        { advanced: host, select: (kind) => controls.select(kind) },
        chapter,
      );
      if (restoreFocus && focused && !focused.isConnected) {
        const replacement = focused.id ? document.getElementById(focused.id) : null;
        (replacement ?? document.querySelector<HTMLElement>('.pv-selection select'))?.focus({
          preventScroll: true,
        });
      }
    },
    dispose() {
      viewer.dispose();
    },
    destroy() {
      viewer.dispose();
      host.replaceChildren();
    },
  };
}

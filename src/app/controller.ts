import type { ControllerPorts } from './ports.js';
import type { SidebarActions } from '../modules/sidebar/index.js';
import { exportTailwindTheme } from '../theme/export.js';
import { buildPaletteTheme } from '../theme/pipeline.js';
import { DEFAULT_PRESET, PRESET_LABELS } from '../extraction/presets.js';
import { createRunManager, rasterFingerprint } from '../extraction/run.js';
import { TEMPLATE_USAGE } from '../theme/validation.js';
import type { PipelineConfig } from '../extraction/types.js';
import type { ArtworkSelection } from '../artwork-selection.js';
import type { AppActions } from './contracts.js';
import { extractPalette, type PaletteMethod, type PaletteResult } from '../palette.service.js';
import {
  reassignRole,
  shuffleAssignments,
  type RoleAssignments,
  DEFAULT_THEME,
} from '../theme.service.js';

export function createController(ports: ControllerPorts, actions: AppActions) {
  const { selectPainting } = actions;
  const { preview, pipeline: pipelineViewer } = ports;
  const lifetime = new AbortController();
  let selection: ArtworkSelection | null = null;
  let imageData: ImageData | null = null;
  let error = '';
  let methodLabel: string = PRESET_LABELS[DEFAULT_PRESET];
  let palette: PaletteResult | null = null;
  let appliedThemeTokens: Record<string, string> | null = null;
  let assignments: RoleAssignments | null = null;
  const paletteSize = 5;
  let method: PaletteMethod = DEFAULT_PRESET;
  let template: 'landing' | 'magazine' | 'poster' = 'landing';
  let userMapping = false;
  let customConfiguration: PipelineConfig | undefined;
  const runs = createRunManager('app');
  function setImage(url: string | null, title: string, key?: string): void {
    preview.update({ image: { url, title, key } });
  }
  function updatePreviewLabels(item: ArtworkSelection): void {
    preview.update({
      title: item.title,
      artist: [item.artist, item.date].filter(Boolean).join(' / '),
    });
  }
  function resetColors(): void {
    error = '';
    pipelineViewer.dispose();
    runs.cancel();
    userMapping = false;
    assignments = null;
    palette = null;
    appliedThemeTokens = null;
    publishShell();
    imageData = null;
    preview.update({ tokens: DEFAULT_THEME });
    renderSidebar();
  }
  function renderSidebar(): void {
    ports.updateSidebar({ selection, palette, assignments, method, error });
  }
  function updateMapping(keepViewer = false): void {
    if (!keepViewer) pipelineViewer.dispose();
    if (!palette) return;
    const { theme } = buildPaletteTheme(
      palette,
      TEMPLATE_USAGE[template],
      {},
      userMapping && assignments ? assignments : undefined,
    );
    assignments = theme.assignments;
    appliedThemeTokens = theme.tokens;
    publishShell();
    preview.update({ tokens: theme.tokens });
    renderSidebar();
  }
  function updatePalette(keepViewer = false): void {
    error = '';
    if (!imageData) return;
    try {
      const run = runs.start({
        inputFingerprint: rasterFingerprint(imageData),
        algorithmVersion: 'pipeline-v1',
      });
      const next = extractPalette(
        imageData,
        { method, count: paletteSize, configuration: customConfiguration },
        { ...run, captureVisuals: true },
      );
      run.assertCurrent();
      palette = next;
      userMapping = false;
      assignments = null;
      updateMapping(keepViewer);
      preview.update({
        algorithmLabel: customConfiguration ? 'Custom' : methodLabel,
      });
    } catch (error) {
      setError(`Extraction failed: ${message(error)}`);
      console.warn('Palette extraction failed', error);
    }
  }
  function message(e: unknown): string {
    return e instanceof Error ? e.message : String(e);
  }
  function setTemplate(next: 'landing' | 'magazine' | 'poster'): void {
    const requirementsChanged =
      JSON.stringify(TEMPLATE_USAGE[template].requirements) !==
      JSON.stringify(TEMPLATE_USAGE[next].requirements);
    template = next;
    if (palette && (userMapping || requirementsChanged)) updateMapping();
    preview.update({ template });
    publishShell();
  }
  function publishShell() {
    ports.updateShell({ template, canExport: appliedThemeTokens !== null });
  }
  function changeConfiguration(config: PipelineConfig) {
    customConfiguration = config;
    const chapter = pipelineViewer.chapter;
    const refresh = pipelineViewer.isOpen;
    updatePalette(refresh);
    if (refresh) openPipeline(chapter);
  }

  function openPipeline(chapter: typeof pipelineViewer.chapter = 'sample') {
    if (!palette || !imageData) return;
    try {
      const { result: theme } = buildPaletteTheme(
        palette,
        TEMPLATE_USAGE[template],
        {},
        userMapping && assignments ? assignments : undefined,
      );
      pipelineViewer.open({ result: palette, theme }, imageData, chapter);
    } catch (error) {
      setError(`Cannot show pipeline: ${message(error)}`);
    }
  }
  function downloadTheme() {
    if (!appliedThemeTokens) return;
    const url = URL.createObjectURL(
      new Blob([exportTailwindTheme(appliedThemeTokens)], { type: 'text/css;charset=utf-8' }),
    );
    const link = document.createElement('a');
    link.href = url;
    link.download = 'theme.css';
    document.body.append(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  const sidebarActions: SidebarActions = {
    selectPainting: (item) => {
      void selectPainting(item);
    },
    changeMethod(next, label) {
      method = next;
      methodLabel = label;
      customConfiguration = undefined;
      pipelineViewer.preset(method);
      if (imageData) updatePalette();
    },
    assignRole(role, index) {
      if (!assignments || !palette) return;
      userMapping = true;
      assignments = reassignRole(assignments, role, index, palette.colors.length);
      updateMapping();
    },
    shuffle() {
      if (!assignments || !palette) return;
      userMapping = true;
      assignments = shuffleAssignments(assignments, palette.colors.length);
      updateMapping();
    },
    openPipeline: () => openPipeline(),
  };
  function setError(next: string) {
    error = next;
    renderSidebar();
  }
  resetColors();
  setTemplate('landing');
  return {
    sidebarActions,
    setTemplate,
    downloadTheme,
    changeConfiguration,
    selectionStarted(item: ArtworkSelection) {
      if (lifetime.signal.aborted) return;
      selection = item;
      resetColors();
      updatePreviewLabels(item);
    },
    showImage: setImage,
    pixelsReady(pixels: ImageData) {
      if (lifetime.signal.aborted) return;
      imageData = pixels;
      updatePalette();
    },
    dispose() {
      lifetime.abort();
      runs.cancel();
    },
  };
}

import type { ControllerPorts } from './ports.js';
import type { SidebarActions } from '../modules/sidebar/index.js';
import { exportCssVariables, exportTailwindTheme } from '../theme/export.js';
import type { ComputationInput } from '../computation/contracts.js';
import type { ThemeResult } from '../extraction/types.js';
import { DEFAULT_PRESET, PRESET_LABELS } from '../extraction/presets.js';
import { TEMPLATE_USAGE } from '../theme/validation.js';
import type { PipelineConfig } from '../extraction/types.js';
import type { ArtworkSelection } from '../artwork-selection.js';
import type { AppActions } from './contracts.js';
import type { PaletteMethod, PaletteResult } from '../palette.service.js';
import {
  reassignRole,
  shuffleAssignments,
  type RoleAssignments,
  DEFAULT_THEME,
} from '../theme.service.js';

export function createController(ports: ControllerPorts, actions: AppActions) {
  const { selectPainting } = actions;
  const { preview, pipeline: pipelineViewer, computation } = ports;
  const lifetime = new AbortController();
  let selection: ArtworkSelection | null = null;
  let searchedArtwork: { item: ArtworkSelection; url: string | null } | undefined;
  let imageData: ImageData | null = null;
  let error = '';
  let palettePending = false;
  let methodLabel: string = PRESET_LABELS[DEFAULT_PRESET];
  let palette: PaletteResult | null = null;
  let appliedThemeTokens: Record<string, string> | null = null;
  let assignments: RoleAssignments | null = null;
  const paletteSize = 5;
  let method: PaletteMethod = DEFAULT_PRESET;
  let template: 'landing' | 'magazine' | 'poster' = 'landing';
  let userMapping = false;
  let customConfiguration: PipelineConfig | undefined;
  let revision = 0;
  let resultReady = false;
  let themeResult: ThemeResult | null = null;
  function setImage(url: string | null, title: string, key?: string): void {
    if (lifetime.signal.aborted) return;
    preview.update({ image: { url, title, key } });
    if (selection?.source === 'wikimedia' && searchedArtwork) {
      // Keep a durable source: the selection workflow releases blob URLs on replacement.
      if (!url?.startsWith('blob:')) searchedArtwork = { item: selection, url };
      renderSidebar();
    }
  }
  function updatePreviewLabels(item: ArtworkSelection): void {
    preview.update({
      title: item.title,
      artist: [item.artist, item.date].filter(Boolean).join(' / '),
    });
  }
  function beginSelection(): void {
    error = '';
    pipelineViewer.dispose();
    revision++;
    computation.cancel();
    resultReady = false;
    palettePending = true;
    imageData = null;
    publishShell();
    renderSidebar();
  }
  function renderSidebar(): void {
    ports.updateSidebar({
      selection,
      searchedArtwork,
      palette,
      assignments,
      method,
      error,
      palettePending: palettePending || !resultReady,
    });
  }
  async function compute(
    input: ComputationInput,
    keepViewer = false,
    requestedUserMapping = false,
  ): Promise<void> {
    const current = ++revision;
    if (!keepViewer) pipelineViewer.dispose();
    const raster = imageData;
    palettePending = true;
    resultReady = false;
    error = '';
    publishShell();
    renderSidebar();
    try {
      let requestedTemplate = input.template;
      let result = await computation.run(input);
      const nextPalette = result.palette ?? palette;
      if (!nextPalette) throw new Error('No palette available');
      // Template switches during extraction do not restart the expensive pixel work.
      while (!lifetime.signal.aborted && current === revision && requestedTemplate !== template) {
        requestedTemplate = template;
        result = await computation.run({
          kind: 'map',
          palette: { swatches: nextPalette.swatches },
          template: requestedTemplate,
          assignments: requestedUserMapping && input.kind === 'map' ? input.assignments : undefined,
        });
      }
      if (lifetime.signal.aborted || current !== revision || raster !== imageData) return;
      palette = nextPalette;
      assignments = result.mapping.theme.assignments;
      appliedThemeTokens = result.mapping.theme.tokens;
      themeResult = result.mapping.result;
      userMapping = requestedUserMapping;
      palettePending = false;
      resultReady = true;
      preview.update({
        tokens: appliedThemeTokens,
        algorithmLabel: customConfiguration ? 'Custom' : methodLabel,
      });
      publishShell();
      renderSidebar();
      // A viewer closed during the request must stay closed.
      if (keepViewer && pipelineViewer.isOpen) openPipeline(pipelineViewer.chapter);
    } catch (failure) {
      if (lifetime.signal.aborted || current !== revision) return;
      palettePending = false;
      error = `Palette computation failed: ${message(failure)}. Try another painting or algorithm.`;
      publishShell();
      renderSidebar();
    }
  }
  function updateMapping(nextAssignments?: RoleAssignments): void {
    if (!palette || !imageData || !resultReady) return;
    void compute(
      {
        kind: 'map',
        palette: { swatches: palette.swatches },
        template,
        assignments: nextAssignments ?? (userMapping ? (assignments ?? undefined) : undefined),
      },
      false,
      !!nextAssignments || userMapping,
    );
  }
  function updatePalette(keepViewer = false): void {
    if (!imageData) return;
    void compute(
      {
        kind: 'extract',
        image: imageData,
        options: { method, count: paletteSize, configuration: customConfiguration },
        template,
      },
      keepViewer,
    );
  }
  function message(e: unknown): string {
    return e instanceof Error ? e.message : String(e);
  }
  function setTemplate(next: 'landing' | 'magazine' | 'poster'): void {
    if (lifetime.signal.aborted) return;
    const requirementsChanged =
      JSON.stringify(TEMPLATE_USAGE[template].requirements) !==
      JSON.stringify(TEMPLATE_USAGE[next].requirements);
    template = next;
    if (palette && (userMapping || requirementsChanged)) updateMapping();
    preview.update({ template });
    publishShell();
  }
  function publishShell() {
    ports.updateShell({
      template,
      canExport: appliedThemeTokens !== null && resultReady && !palettePending,
    });
  }
  function changeConfiguration(config: PipelineConfig) {
    if (lifetime.signal.aborted) return;
    customConfiguration = config;
    updatePalette(pipelineViewer.isOpen);
  }

  function openPipeline(chapter: typeof pipelineViewer.chapter = 'sample') {
    if (
      lifetime.signal.aborted ||
      !resultReady ||
      palettePending ||
      !palette ||
      !imageData ||
      !themeResult
    )
      return;
    try {
      pipelineViewer.open({ result: palette, theme: themeResult }, imageData, chapter);
    } catch (error) {
      setError(`Cannot show pipeline: ${message(error)}`);
    }
  }
  function downloadTheme() {
    if (lifetime.signal.aborted || !resultReady || palettePending || !appliedThemeTokens) return;
    ports.download('theme.css', exportTailwindTheme(appliedThemeTokens), 'text/css;charset=utf-8');
  }
  function getCssVariables(): string | null {
    if (lifetime.signal.aborted || !resultReady || palettePending || !appliedThemeTokens)
      return null;
    return exportCssVariables(appliedThemeTokens);
  }
  function downloadCssVariables() {
    const css = getCssVariables();
    if (css !== null) ports.download('palette.css', css, 'text/css;charset=utf-8');
  }
  const sidebarActions: SidebarActions = {
    getCssVariables,
    selectPainting: (item) => {
      if (!lifetime.signal.aborted) void selectPainting(item);
    },
    changeMethod(next, label) {
      if (lifetime.signal.aborted) return;
      method = next;
      methodLabel = label;
      customConfiguration = undefined;
      pipelineViewer.preset(method);
      if (imageData) updatePalette();
      else renderSidebar();
    },
    assignRole(role, index) {
      if (lifetime.signal.aborted) return;
      if (!resultReady || palettePending || !assignments || !palette) return;
      updateMapping(reassignRole(assignments, role, index, palette.colors.length));
    },
    shuffle() {
      if (lifetime.signal.aborted) return;
      if (!resultReady || palettePending || !assignments || !palette) return;
      updateMapping(shuffleAssignments(assignments, palette.colors.length));
    },
    openPipeline: () => openPipeline(),
  };
  function setError(next: string) {
    error = next;
    renderSidebar();
  }
  preview.update({ tokens: DEFAULT_THEME });
  renderSidebar();
  setTemplate('landing');
  return {
    sidebarActions,
    setTemplate,
    downloadTheme,
    downloadCssVariables,
    changeConfiguration,
    selectionStarted(item: ArtworkSelection) {
      if (lifetime.signal.aborted) return;
      selection = item;
      if (item.source === 'wikimedia') searchedArtwork = { item, url: null };
      beginSelection();
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
      revision++;
      computation.dispose();
    },
  };
}

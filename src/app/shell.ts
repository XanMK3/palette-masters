import { mountSidebar } from '../modules/sidebar/index.js';
import { mountWikimediaSearch } from '../modules/wikimedia-search/index.js';
import { exportTailwindTheme } from '../theme/export.js';
import { createTemplatePreview } from '../templates/bridge.js';
import { PipelineViewer } from '../pipeline-viewer/index.js';
import { buildPaletteTheme } from '../theme/pipeline.js';
import { mountAdvancedControls } from '../extraction/advanced-ui.js';
import { DEFAULT_PRESET, PRESET_LABELS } from '../extraction/presets.js';
import { createRunManager, rasterFingerprint } from '../extraction/run.js';
import { TEMPLATE_USAGE } from '../theme/validation.js';
import type { PipelineConfig } from '../extraction/types.js';
import type { ArtworkSelection } from '../artwork-selection.js';
import type { ArtworkSources } from '../artwork-sources.js';
import type { AppShell, AppActions } from './contracts.js';
import { scopedGet } from '../modules/dom.js';
import { WikimediaArtService } from '../wikimedia-art.service.js';
import { extractPalette, type PaletteMethod, type PaletteResult } from '../palette.service.js';
import {
  reassignRole,
  shuffleAssignments,
  type RoleAssignments,
  DEFAULT_THEME,
} from '../theme.service.js';

export function createAppShell(
  root: HTMLElement,
  art: WikimediaArtService,
  sources: ArtworkSources,
  actions: AppActions,
): AppShell {
  const { selectPainting } = actions;
  const get = scopedGet(root);
  const preview = createTemplatePreview(get<HTMLIFrameElement>('templatePreview'));
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
  const pipelineViewer = new PipelineViewer();
  const advancedHost = document.createElement('div');
  advancedHost.id = 'advanced-controls';
  const advanced = mountAdvancedControls(advancedHost, (config) => {
    customConfiguration = config;
    const chapter = pipelineViewer.chapter;
    const refresh = pipelineViewer.isOpen;
    const focused = document.activeElement as HTMLElement | null;
    updatePalette(refresh);
    if (refresh) {
      openPipeline(chapter);
      if (focused?.isConnected) focused.focus({ preventScroll: true });
      else
        document.querySelector<HTMLElement>('.pv-selection select')?.focus({ preventScroll: true });
    }
  });

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
    get<HTMLButtonElement>('download-theme').disabled = true;
    imageData = null;
    preview.update({ tokens: DEFAULT_THEME });
    renderSidebar();
  }
  function renderSidebar(): void {
    sidebar.update({ selection, palette, assignments, method, error });
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
    get<HTMLButtonElement>('download-theme').disabled = false;
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
    for (const value of ['landing', 'magazine', 'poster']) {
      const tab = root.querySelector<HTMLButtonElement>(`[data-template="${value}"]`);
      tab?.classList.toggle('active', value === next);
    }
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
      advanced.populate(palette.configuration.effective, !pipelineViewer.isOpen);
      pipelineViewer.open(
        { result: palette, theme },
        imageData,
        {
          advanced: advancedHost,
          select: (kind) => advanced.select(kind),
        },
        chapter,
      );
    } catch (error) {
      setError(`Cannot show pipeline: ${message(error)}`);
    }
  }
  root.querySelectorAll<HTMLButtonElement>('[data-template]').forEach((b) =>
    b.addEventListener('click', () => setTemplate(b.dataset.template as typeof template), {
      signal: lifetime.signal,
    }),
  );
  get<HTMLButtonElement>('download-theme').addEventListener(
    'click',
    () => {
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
    },
    { signal: lifetime.signal },
  );
  const sidebar = mountSidebar(get('sidebar'), {
    sources,
    actions: {
      selectPainting: (item) => {
        void selectPainting(item);
      },
      changeMethod(next, label) {
        method = next;
        methodLabel = label;
        customConfiguration = undefined;
        advanced.preset(method);
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
    },
  });
  const search = mountWikimediaSearch(get<HTMLDialogElement>('searchDialog'), {
    service: art,
    onSelect: (item) => {
      void selectPainting(item);
    },
  });
  get('openSearch').addEventListener('click', search.open, { signal: lifetime.signal });
  function setError(next: string) {
    error = next;
    renderSidebar();
  }
  resetColors();
  setTemplate('landing');
  return {
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
      sidebar.dispose();
      search.dispose();
      pipelineViewer.dispose();
      runs.cancel();
      preview.dispose();
      advancedHost.replaceChildren();
    },
  };
}

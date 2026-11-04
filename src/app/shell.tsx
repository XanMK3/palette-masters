import { render } from 'preact';
import { useEffect, useLayoutEffect, useRef, useState } from 'preact/hooks';
import { signal, type Signal } from '@preact/signals';
import { mountSidebar } from '../modules/sidebar';
import { mountWikimediaSearch } from '../modules/wikimedia-search';
import { createTemplatePreview } from '../templates/bridge.js';
import type { ArtworkSources } from '../artwork-sources.js';
import type { WikimediaArtService } from '../wikimedia-art.service.js';
import type { AppShell, AppActions } from './contracts.js';
import type { ShellState } from './ports.js';
import { createComputation } from '../computation/client.js';
import { createController } from './controller.js';
import { createDownloadAdapter } from './download.js';
import { createPipelineAdapter } from './pipeline-adapter.js';

type Controller = ReturnType<typeof createController>;
interface Props {
  art: WikimediaArtService;
  sources: ArtworkSources;
  actions: AppActions;
  state: Signal<ShellState>;
  connect(controller: Controller | null): void;
}

function App({ art, sources, actions, state, connect }: Props) {
  const [downloadOpen, setDownloadOpen] = useState(false);
  const downloadRoot = useRef<HTMLDivElement>(null);
  const downloadButton = useRef<HTMLButtonElement>(null);
  const downloadOption = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!downloadOpen) return;
    downloadOption.current?.focus();
    const closeOutside = (event: PointerEvent) => {
      if (!downloadRoot.current?.contains(event.target as Node)) setDownloadOpen(false);
    };
    // Preview clicks belong to the iframe document and do not bubble to the shell.
    const previewFrame = frame.current;
    let previewDocument: Document | null = null;
    const closeFromPreview = () => setDownloadOpen(false);
    const listenToPreview = () => {
      previewDocument?.removeEventListener('pointerdown', closeFromPreview, true);
      previewDocument = previewFrame?.contentDocument ?? null;
      previewDocument?.addEventListener('pointerdown', closeFromPreview, true);
    };
    listenToPreview();
    previewFrame?.addEventListener('load', listenToPreview);
    document.addEventListener('pointerdown', closeOutside, true);
    return () => {
      document.removeEventListener('pointerdown', closeOutside, true);
      previewFrame?.removeEventListener('load', listenToPreview);
      previewDocument?.removeEventListener('pointerdown', closeFromPreview, true);
    };
  }, [downloadOpen]);
  const sidebarRoot = useRef<HTMLElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const frame = useRef<HTMLIFrameElement>(null);
  const controller = useRef<Controller | null>(null);
  const search = useRef<ReturnType<typeof mountWikimediaSearch> | null>(null);
  useLayoutEffect(() => {
    const downloads = createDownloadAdapter();
    const preview = createTemplatePreview(frame.current!);
    const pipeline = createPipelineAdapter((config) =>
      controller.current?.changeConfiguration(config),
    );
    const sidebar = mountSidebar(sidebarRoot.current!, {
      sources,
      actions: {
        openSearch: () => search.current?.open(),
        selectPainting: (item) => {
          void actions.selectPainting({ ...item, source: item.source ?? 'curated' });
        },
        changeMethod: (method, label) =>
          controller.current?.sidebarActions.changeMethod(method, label),
        assignRole: (role, index) => controller.current?.sidebarActions.assignRole(role, index),
        shuffle: () => controller.current?.sidebarActions.shuffle(),
        openPipeline: () => controller.current?.sidebarActions.openPipeline(),
      },
    });
    const searchModule = mountWikimediaSearch(dialog.current!, {
      service: art,
      onSelect: (item) => {
        void actions.selectPainting({ ...item, source: 'wikimedia' });
      },
    });
    search.current = searchModule;
    const workflow = createController(
      {
        computation: createComputation(),
        preview,
        pipeline,
        download: downloads.save,
        updateSidebar: sidebar.update,
        updateShell: (next) => {
          state.value = next;
        },
      },
      actions,
    );
    controller.current = workflow;
    connect(workflow);
    return () => {
      connect(null);
      controller.current = null;
      search.current = null;
      workflow.dispose();
      sidebar.dispose();
      searchModule.dispose();
      pipeline.destroy();
      preview.dispose();
      downloads.dispose();
    };
  }, [art, sources, actions, state, connect]);

  return (
    <>
      {/* The shell owns host elements; each module owns its own Preact root. */}
      <aside class="sidebar" id="sidebar" ref={sidebarRoot} />
      <dialog id="searchDialog" aria-labelledby="searchTitle" ref={dialog} />
      <main class="workspace">
        <div class="workspace-top">
          <div
            class="download-dropdown"
            ref={downloadRoot}
            onBlur={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
                setDownloadOpen(false);
              }
            }}
            onKeyDown={(event) => {
              if (event.key === 'Escape') {
                setDownloadOpen(false);
                downloadButton.current?.focus();
              }
            }}
          >
            <button
              class="btn"
              id="download-theme"
              ref={downloadButton}
              type="button"
              disabled={!state.value.canExport}
              title="Download theme"
              aria-label="Download theme"
              aria-expanded={downloadOpen && state.value.canExport}
              aria-controls="download-options"
              onClick={() => setDownloadOpen(!downloadOpen)}
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                aria-hidden="true"
              >
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
              </svg>
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                aria-hidden="true"
              >
                <path d="m6 9 6 6 6-6" />
              </svg>
            </button>
            {downloadOpen && state.value.canExport && (
              <div class="download-options" id="download-options">
                <button
                  type="button"
                  ref={downloadOption}
                  onClick={() => {
                    controller.current?.downloadTheme();
                    setDownloadOpen(false);
                    downloadButton.current?.focus();
                  }}
                >
                  Tailwind v4 theme
                </button>
              </div>
            )}
          </div>
          <div class="preview-actions">
            <div class="template-tabs" role="tablist" aria-label="Preview template">
              {(['landing', 'magazine', 'poster'] as const).map((id, index) => (
                <button
                  key={id}
                  data-template={id}
                  class={state.value.template === id ? 'active' : ''}
                  onClick={() => controller.current?.setTemplate(id)}
                >
                  {['Landing', 'Article', 'Poster'][index]}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div class="stage-area">
          <iframe
            id="templatePreview"
            class="preview-scroll"
            src="./preview.html"
            title="Template preview"
            ref={frame}
          />
        </div>
      </main>
    </>
  );
}

/** Mount once; synchronous image-selection methods remain compatible with existing callers. */
export function createAppShell(
  root: HTMLElement,
  art: WikimediaArtService,
  sources: ArtworkSources,
  actions: AppActions,
): AppShell {
  let controller: Controller | null = null;
  let disposed = false;
  const state = signal<ShellState>({ template: 'landing', canExport: false });
  const connect = (next: Controller | null) => {
    controller = next;
  };
  render(
    <App art={art} sources={sources} actions={actions} state={state} connect={connect} />,
    root,
  );
  return {
    selectionStarted: (item) => controller?.selectionStarted(item),
    showImage: (url, title, key) => controller?.showImage(url, title, key),
    pixelsReady: (pixels) => controller?.pixelsReady(pixels),
    dispose() {
      if (disposed) return;
      disposed = true;
      render(null, root);
    },
  };
}

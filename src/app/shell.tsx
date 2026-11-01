import { render } from 'preact';
import { useLayoutEffect, useRef } from 'preact/hooks';
import { signal, type Signal } from '@preact/signals';
import { mountSidebar } from '../modules/sidebar/index.js';
import { mountWikimediaSearch } from '../modules/wikimedia-search/index.js';
import { createTemplatePreview } from '../templates/bridge.js';
import type { ArtworkSources } from '../artwork-sources.js';
import type { WikimediaArtService } from '../wikimedia-art.service.js';
import type { AppShell, AppActions } from './contracts.js';
import type { ShellState } from './ports.js';
import { createController } from './controller.js';
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
  const sidebarRoot = useRef<HTMLElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const frame = useRef<HTMLIFrameElement>(null);
  const controller = useRef<Controller | null>(null);
  const search = useRef<ReturnType<typeof mountWikimediaSearch> | null>(null);
  useLayoutEffect(() => {
    const preview = createTemplatePreview(frame.current!);
    const pipeline = createPipelineAdapter((config) =>
      controller.current?.changeConfiguration(config),
    );
    const sidebar = mountSidebar(sidebarRoot.current!, {
      sources,
      actions: {
        selectPainting: (item) => {
          void actions.selectPainting(item);
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
        void actions.selectPainting(item);
      },
    });
    search.current = searchModule;
    const workflow = createController(
      {
        preview,
        pipeline,
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
    };
  }, [art, sources, actions, state, connect]);

  return (
    <>
      {/* Empty hosts belong to imperative modules; Preact owns only these elements. */}
      <aside class="sidebar" id="sidebar" ref={sidebarRoot} />
      <dialog id="searchDialog" aria-labelledby="searchTitle" ref={dialog} />
      <main class="workspace">
        <div class="workspace-top">
          <div>
            <button
              class="btn"
              id="openSearch"
              type="button"
              aria-haspopup="dialog"
              onClick={() => search.current?.open()}
            >
              Search Wikimedia
            </button>
          </div>
          <div class="preview-actions">
            <button
              class="btn"
              id="download-theme"
              type="button"
              disabled={!state.value.canExport}
              title="Export these colors for any Tailwind v4 project"
              onClick={() => controller.current?.downloadTheme()}
            >
              Download Tailwind v4 theme
            </button>
            <div class="template-tabs" role="tablist" aria-label="Preview template">
              {(['landing', 'magazine', 'poster'] as const).map((id, index) => (
                <button
                  key={id}
                  data-template={id}
                  class={state.value.template === id ? 'active' : ''}
                  onClick={() => controller.current?.setTemplate(id)}
                >
                  {['SaaS landing', 'Magazine article', 'Art poster'][index]}
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

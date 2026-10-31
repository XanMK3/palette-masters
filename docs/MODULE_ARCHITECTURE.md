# Module boundaries

The first two migration stages are implemented in plain TypeScript. Preact is a
later implementation change behind these boundaries.

| Owner / public entry | State and responsibility | Contract |
| --- | --- | --- |
| `src/app/index.ts` | Selected artwork, raster, palette, assignments, extraction configuration, current template, workflow coordination | `createAppShell(root, art, sources, actions)` returns `AppShell`: image-selection output methods plus `dispose()` |
| `src/modules/sidebar/index.ts` | Gallery movement, expanded painting, controls and swatch rendering | `mountSidebar(root, options)` returns `update(SidebarState)` and `dispose()`; typed callbacks report user intents |
| `src/modules/wikimedia-search/index.ts` | Dialog, query, results, debounce, requests and cancellation | `mountWikimediaSearch(dialog, { service, onSelect })` returns `open()`, `close()`, `dispose()` |
| `src/pipeline-viewer/index.ts` | Visualization, playback, chapter and viewer DOM | Existing `PipelineViewer.open(data, image, controls, chapter)`, `close()`, `dispose()`, `chapter`, `isOpen` |
| `src/templates/bridge.ts` | Preview state and iframe messaging lifecycle | `createTemplatePreview(frame)` returns `update(Partial<PreviewState>)` and `dispose()`; renderer consumes `PreviewState` |

Sidebar and search each have a public `index.ts`, typed `contracts.ts`, private
`module.ts`, and owned `view.html`. Their DOM queries stay inside the supplied
root. The shell supplies the aside/dialog host elements; the modules populate
and clear their contents. Each module can mount with fixture services and
callbacks without the shell or its siblings. Shared presentation styles remain
in `index.html` during this extraction; visual styling is not yet independently
packaged. Existing IDs support one instance of each module per application.

## Data flow

1. Sidebar or search emits an artwork selection intent.
2. The shell forwards it to the existing image-selection workflow, which owns
   loading, stale-result protection and image URL lifetime.
3. That workflow calls the shell's `selectionStarted`, `showImage` and
   `pixelsReady` methods.
4. The shell invokes extraction and theme services, passes palette state to the
   sidebar, and sends artwork/theme state through the template bridge.
5. Sidebar method, role and shuffle intents return to the shell. The sidebar
   neither runs extraction nor mutates shared assignments.
6. The shell passes extraction results to the existing pipeline viewer on demand.
   Advanced extraction controls remain shell-managed integration with that viewer.

Modules do not import sibling implementations or reach into sibling DOM. Shared
services and data types stay framework-independent. Consumers should import UI
modules only through their public entry points. No global mutable UI store or
event bus is introduced.

## Lifetimes

The application entry owns image selection and the shell, and disposes both on
Vite hot replacement. The shell disposes its modules, viewer, run manager and
iframe bridge. Module disposal is idempotent. Sidebar disposal disconnects its
resize observer, cancels animations, removes controls and invalidates pending
thumbnail completions. Featured lookups use the existing shared cache; disposing
a sidebar ignores their results rather than cancelling shared service work.

Search aborts queries and detail/artist requests on a new intent, close or
disposal, clears its debounce timer, and checks cancellation after asynchronous
results. Late responses cannot select an artwork after the dialog closes.

The iframe renderer and pipeline viewer retain their existing implementation.
Only the parent iframe bridge gains listener cleanup. `app-ui.ts` is a small
compatibility adapter for the old factory signature; application bootstrap uses
`app/index.ts` directly.

## Verification

`tests/browser/module-boundaries.spec.mjs` mounts sidebar and search in a blank
same-origin page with stub services. It covers selection and method callbacks,
state updates, cleanup/remounting, stale query responses, cancelled detail
selection and successful selection through the public callback. Existing unit
and browser suites cover extraction, themes, galleries, preview and viewer
behavior across the complete application.

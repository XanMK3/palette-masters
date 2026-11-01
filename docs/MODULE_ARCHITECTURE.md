# Module boundaries

The six-stage module migration is complete. Shell, sidebar and Wikimedia search render
with Preact behind their existing public APIs. Shell and search use private
Signals instances; sidebar components keep interaction state in hooks.

| Owner / public entry | State and responsibility | Contract |
| --- | --- | --- |
| `src/app/index.ts` | Selected artwork, raster, palette, assignments, extraction configuration, current template, workflow coordination | `createAppShell(root, art, sources, actions)` returns `AppShell`: image-selection output methods plus `dispose()` |
| `src/modules/sidebar/index.ts` | Gallery movement, expanded painting, controls and swatch rendering | `mountSidebar(root, options)` returns `update(SidebarState)` and `dispose()`; typed callbacks report user intents |
| `src/modules/wikimedia-search/index.ts` | Dialog, query, results, debounce, requests and cancellation | `mountWikimediaSearch(dialog, { service, onSelect })` returns `open()`, `close()`, `dispose()` |
| `src/pipeline-viewer/index.ts` | Visualization, playback, chapter and viewer DOM | Existing `PipelineViewer.open(data, image, controls, chapter)`, `close()`, `dispose()`, `chapter`, `isOpen` |
| `src/templates/bridge.ts` | Preview state and iframe messaging lifecycle | `createTemplatePreview(frame)` returns `update(Partial<PreviewState>)` and `dispose()`; renderer consumes `PreviewState` |

Sidebar and search each have a public `index.ts`, typed `contracts.ts`, private
`module.tsx`, and private components. Their DOM queries stay inside the supplied
root. The shell supplies the aside/dialog host elements; the modules render
and unmount their Preact contents. Each module can mount with fixture services and
callbacks without the shell or its siblings. Shared presentation styles remain
in `index.html` as the shared application design system. Existing IDs support one instance of each module per application.

## Shell implementation

`src/app/shell.tsx` renders the toolbar, template tabs, iframe element and empty
sidebar/search host elements. Preact never renders children inside those module
hosts or inside the iframe. A layout effect mounts the modules and connects the
workflow before `createAppShell` returns, preserving synchronous image-selection
callbacks. Stable references keep module instances alive across shell rerenders.

`src/app/controller.ts` owns extraction and theme workflow state. It sends typed
outputs through `ports.ts` rather than querying shell elements or changing their
properties. The shell's private signal holds the selected template and export
availability; it is created per mount, never shared as a global store.

`src/app/pipeline-adapter.ts` manages the existing imperative viewer and advanced
controls, including focus restoration and cleanup. The viewer's implementation
remains independent of Preact. The existing preview bridge receives updates and
owns iframe messaging. On unmount, the shell disposes the controller, all modules,
the viewer adapter, and the bridge; subsequent callbacks on the old public shell
handle are ignored.

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
The parent iframe bridge handles listener cleanup. The obsolete `app-ui.ts`
compatibility adapter has been removed; application bootstrap uses `app/index.ts`.

## Verification

`tests/browser/module-boundaries.spec.mjs` mounts sidebar and search in a blank
same-origin page with stub services. It covers selection and method callbacks,
state updates, cleanup/remounting, stale query responses, cancelled detail
selection and successful selection through the public callback. Existing unit
and browser suites cover extraction, themes, galleries, preview and viewer
behavior across the complete application.

`tests/browser/shell-lifecycle.spec.mjs` mounts the Preact shell with fixture
services, supplies pixels immediately after mounting, checks stable module DOM
through toolbar updates, opens the viewer, and verifies disposal and remounting.

## Module rendering

The sidebar contains private gallery, image, swatch and header components. State
updates preserve keyed cards and loaded images. Its public `update` still applies
state synchronously. The expansion animation owns a dedicated empty host inside
the gallery; only that adapter creates cloned image/animation DOM and it cleans
up on movement changes and unmounting. Extraction presets are rendered from the
shared preset IDs and labels, verified by the isolated browser test.

Search owns reactive query, result and artist-work views. Its native dialog stays
under the public open/close lifecycle, preserving focus and Escape behavior.
Request cancellation and stale-response guards remain independent of rendering.
Both modules use a Preact artwork component with native image loading, fallback
URLs and Commons source links. The iframe renderer keeps its framework-independent
image helper. Sidebar and search no longer inject static HTML templates.

## Final state boundaries

The controller alone owns the selected raster, extraction results, role assignments
and theme tokens. The sidebar receives a read-only projection of palette colors
and swatch identities, not the extraction result or its mutable provenance. Its
callbacks request changes; modules never import a global store. Search owns its
query/results/request lifetime, while the gallery owns movement and animation
state. Services remain independent of Preact.

Controller ports describe only the operations needed by the workflow. Browser
downloads are handled by a shell-owned adapter that revokes pending object URLs
on disposal. Disposed controllers ignore subsequent UI and image callbacks.
Public entry points export the viewer and preview contract types, so adapters
need not import their implementation files.

The browser suite checks current catalog content, public labels and iframe output.
Former stale assertions for a removed credit element, old catalog counts and
the old download label have been replaced with current behavior checks.

import { DEFAULT_PREVIEW, type PreviewState } from './state.js';

/** Retain the latest complete state, including changes made before the frame is ready. */
export function createTemplatePreview(frame: HTMLIFrameElement) {
  let state: PreviewState = { ...DEFAULT_PREVIEW };
  let ready = false;
  const lifetime = new AbortController();
  const send = () => {
    if (ready) frame.contentWindow?.postMessage({ type: 'preview:state', state }, location.origin);
  };
  window.addEventListener(
    'message',
    (event) => {
      if (event.origin !== location.origin || event.source !== frame.contentWindow) return;
      if (event.data?.type === 'preview:ready') {
        ready = true;
        send();
      }
    },
    { signal: lifetime.signal },
  );
  // Covers both initial navigation and frame reloads, even if ready arrived before setup.
  frame.addEventListener(
    'load',
    () => {
      ready = false;
      frame.contentWindow?.postMessage({ type: 'preview:hello' }, location.origin);
    },
    { signal: lifetime.signal },
  );
  frame.contentWindow?.postMessage({ type: 'preview:hello' }, location.origin);
  return {
    dispose() {
      lifetime.abort();
      ready = false;
    },
    update(patch: Partial<PreviewState>) {
      if (lifetime.signal.aborted) return;
      state = { ...state, ...patch };
      send();
    },
  };
}

export type { PreviewState, TemplateId } from './state.js';

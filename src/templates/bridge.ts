import { DEFAULT_PREVIEW, type PreviewState } from './state.js';

/** Retain the latest complete state, including changes made before the frame is ready. */
export function createTemplatePreview(frame: HTMLIFrameElement) {
  let state: PreviewState = { ...DEFAULT_PREVIEW };
  let ready = false;
  const send = () => {
    if (ready) frame.contentWindow?.postMessage({ type: 'preview:state', state }, location.origin);
  };
  window.addEventListener('message', (event) => {
    if (event.origin !== location.origin || event.source !== frame.contentWindow) return;
    if (event.data?.type === 'preview:ready') {
      ready = true;
      send();
    }
  });
  // Covers both initial navigation and frame reloads, even if ready arrived before setup.
  frame.addEventListener('load', () => {
    ready = false;
    frame.contentWindow?.postMessage({ type: 'preview:hello' }, location.origin);
  });
  frame.contentWindow?.postMessage({ type: 'preview:hello' }, location.origin);
  return {
    update(patch: Partial<PreviewState>) {
      state = { ...state, ...patch };
      send();
    },
  };
}

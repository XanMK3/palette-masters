import { applyThemeTokens } from '../theme/runtime.js';
import './preview.css';
import '../artwork-image.css';
import { mountTemplates } from './index.js';
import { imageError, imgElement } from '../artwork-image.js';
import { DEFAULT_PREVIEW, isPreviewState, type PreviewState } from './state.js';

mountTemplates();
const stage = document.getElementById('themeStage')!;
let previous: PreviewState | undefined;

/** Used by the message bridge and standalone browser fixtures. */
export function renderPreview(state: PreviewState): void {
  if (!isPreviewState(state)) return;
  stage.removeAttribute('style');
  applyThemeTokens(stage, state.tokens);
  for (const template of ['landing', 'magazine', 'poster']) {
    document
      .getElementById(`tpl-${template}`)!
      .classList.toggle('hidden', template !== state.template);
  }
  document.getElementById('poster-art-name')!.textContent = state.title;
  document.getElementById('poster-art-artist')!.textContent = state.artist;
  document.getElementById('poster-algorithm-tag')!.textContent = state.algorithmLabel;
  if (JSON.stringify(state.image) !== JSON.stringify(previous?.image)) {
    const { url, title, key } = state.image;
    document
      .getElementById('poster-artwork')!
      .replaceChildren(
        url ? imgElement(url, title, key) : imageError('no known Commons file', key),
      );
  }
  if (previous?.template !== state.template) window.scrollTo(0, 0);
  previous = state;
  document.body.style.visibility = 'visible';
}

const ready = () => parent.postMessage({ type: 'preview:ready' }, location.origin);
window.addEventListener('message', (event) => {
  if (event.origin !== location.origin || event.source !== parent) return;
  if (event.data?.type === 'preview:hello') ready();
  if (event.data?.type === 'preview:state' && isPreviewState(event.data.state)) {
    renderPreview(event.data.state);
  }
});
if (parent === window) renderPreview(DEFAULT_PREVIEW);
else ready();

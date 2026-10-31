import { createAppShell, type AppActions } from './app/index.js';
import type { ArtworkSources } from './artwork-sources.js';
import type { WikimediaArtService } from './wikimedia-art.service.js';

/** Legacy entry point. New callers should mount the shell through app/index.ts. */
export function createAppUI(
  art: WikimediaArtService,
  sources: ArtworkSources,
  actions: AppActions,
) {
  const root = document.querySelector<HTMLElement>('.shell');
  if (!root) throw new Error('Missing app shell');
  return createAppShell(root, art, sources, actions);
}

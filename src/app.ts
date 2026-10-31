import { createIcons, Palette, Shuffle } from 'lucide';
import './artwork-image.css';
import '@fontsource/inter/400.css';
import '@fontsource/inter/600.css';
import '@fontsource/inter/700.css';
import '@fontsource/inter/800.css';
import { WikimediaArtService } from './wikimedia-art.service.js';
import { FEATURED_MOVEMENTS } from './featured-collections.js';
import { FEATURED_IMAGE_FILENAMES } from './featured-images.js';
import { createArtworkSources } from './artwork-sources.js';
import { createImageSelection } from './image-selection.js';
import { createAppShell } from './app/index.js';

createIcons({ icons: { Palette, Shuffle } });

const art = new WikimediaArtService({ cacheTtlMs: 5 * 60_000 });
const sources = createArtworkSources(art);
// Callbacks run only after UI initialization and user interaction.
const ui = createAppShell(document.querySelector<HTMLElement>('.shell')!, art, sources, {
  selectPainting: (item) => images.selectPainting(item),
});
const images = createImageSelection(art, sources, ui);
const initial = FEATURED_MOVEMENTS.find((movement) => movement.id === 'renaissance')!.paintings[0];
void images.selectPainting({
  ...initial,
  filename: FEATURED_IMAGE_FILENAMES[initial.wikipediaTitle],
});

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    images.dispose();
    ui.dispose();
  });
}

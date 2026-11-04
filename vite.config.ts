import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import { INITIAL_ARTWORK } from './src/initial-artwork.ts';
import { DEFAULT_PAINTINGS } from './src/featured-collections.ts';
import { FEATURED_DIRECT_IMAGES } from './src/featured-images.ts';
import { EMBEDDED_ART_IMAGES } from './src/embedded-art.ts';

export default defineConfig({
  plugins: [
    tailwindcss(),
    {
      name: 'initial-artwork-hints',
      transformIndexHtml(_html, context) {
        if (!context.filename.endsWith('/index.html')) return [];
        const origins = new Set(
          DEFAULT_PAINTINGS.map(
            (work) =>
              EMBEDDED_ART_IMAGES[work.wikipediaTitle] ||
              FEATURED_DIRECT_IMAGES[work.wikipediaTitle],
          )
            .filter((url) => url?.startsWith('https://'))
            .map((url) => new URL(url).origin),
        );
        return [
          ...[...origins].map((href) => ({
            tag: 'link',
            attrs: { rel: 'preconnect', href, crossorigin: 'anonymous' },
            injectTo: 'head-prepend' as const,
          })),
          {
            tag: 'link',
            attrs: {
              rel: 'preload',
              as: 'image',
              href: INITIAL_ARTWORK.imageUrl,
              fetchpriority: 'high',
              crossorigin: 'anonymous',
            },
            injectTo: 'head-prepend' as const,
          },
        ];
      },
    },
  ],
  base: './',
  server: { host: '127.0.0.1', port: 8080, strictPort: true },
  preview: { host: '127.0.0.1', port: 8080, strictPort: true },
  build: {
    target: 'es2022',
    rollupOptions: { input: { app: 'index.html', preview: 'preview.html' } },
  },
});

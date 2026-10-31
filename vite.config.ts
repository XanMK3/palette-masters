import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [tailwindcss()],
  base: './',
  server: { host: '127.0.0.1', port: 8080, strictPort: true },
  preview: { host: '127.0.0.1', port: 8080, strictPort: true },
  build: {
    target: 'es2022',
    rollupOptions: { input: { app: 'index.html', preview: 'preview.html' } },
  },
});

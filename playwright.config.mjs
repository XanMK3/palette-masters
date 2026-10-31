import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/browser',
  use: { baseURL: 'http://127.0.0.1:8081', channel: 'chrome', headless: true },
  webServer: {
    command: 'npm run dev -- --port 8081',
    url: 'http://127.0.0.1:8081',
    reuseExistingServer: false,
  },
});

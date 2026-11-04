import { test, expect } from '@playwright/test';
import { loadArtworkFixture } from './artwork-fixture.mjs';

for (const viewport of [
  { width: 1366, height: 768 },
  { width: 375, height: 667 },
]) {
  test(`dialog headers stay visible at ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.route(/^https:\/\//, (route) => route.abort());
    await page.goto('/');
    await page.evaluate(async () => {
      const { mountWikimediaSearch } = await import('/src/modules/wikimedia-search/index.ts');
      const root = document.createElement('dialog');
      root.id = 'searchDialog';
      document.querySelector('#searchDialog').remove();
      document.body.append(root);
      const module = mountWikimediaSearch(root, {
        service: {
          searchEntities: async () => [],
          searchCommonsImagesPage: () =>
            new Promise((resolve) => {
              window.finishSearch = () =>
                resolve({
                  images: Array.from({ length: 30 }, (_, i) => ({
                    fileTitle: `File:Painting ${i}.png`,
                    thumbnailUrl: '/assets/palette-test-sample.png',
                  })),
                  continuation: null,
                });
            }),
        },
        onSelect() {},
      });
      window.searchFixture = module;
      module.open();
    });
    const search = page.locator('#searchDialog');
    const initial = await search.boundingBox();
    const close = search.locator('.dialog-close');
    await expect(close.locator('svg')).toHaveCount(1);
    await expect(close).toHaveText('');
    await page.locator('#searchQuery').fill('painting');
    await page.getByRole('button', { name: 'Find', exact: true }).click();
    await expect(search).toContainText('Searching for');
    expect(await search.boundingBox()).toEqual(initial);
    await page.evaluate(() => window.finishSearch());
    await expect(search.locator('.result')).toHaveCount(30);
    expect(await search.boundingBox()).toEqual(initial);
    const closeBefore = await close.boundingBox();
    const inputBefore = await page.locator('#searchQuery').boundingBox();
    await search.locator('.dialog-body').evaluate((el) => {
      el.scrollTop = el.scrollHeight;
    });
    expect(await search.locator('.dialog-body').evaluate((el) => el.scrollTop)).toBeGreaterThan(0);
    expect(await close.boundingBox()).toEqual(closeBefore);
    expect(await page.locator('#searchQuery').boundingBox()).toEqual(inputBefore);
    await close.click();
    await page.evaluate(() => window.searchFixture.dispose());

    await loadArtworkFixture(page);
    await page.locator('#view-pipeline').click();
    const pipeline = page.locator('.pipeline-viewer');
    await pipeline.locator('summary').click();
    const headerBefore = await pipeline.locator('.dialog-header').boundingBox();
    await pipeline.locator('.dialog-body').evaluate((el) => {
      el.scrollTop = el.scrollHeight;
    });
    expect(await pipeline.locator('.dialog-body').evaluate((el) => el.scrollTop)).toBeGreaterThan(
      0,
    );
    expect(await pipeline.locator('.dialog-header').boundingBox()).toEqual(headerBefore);
    const bounds = await pipeline.boundingBox();
    expect(bounds.y).toBeGreaterThanOrEqual(0);
    expect(bounds.y + bounds.height).toBeLessThanOrEqual(viewport.height);
    expect(bounds.width).toBeLessThanOrEqual(viewport.width);
    await pipeline.locator('.dialog-close').click();
    await expect(page.locator('#view-pipeline')).toBeFocused();
  });
}

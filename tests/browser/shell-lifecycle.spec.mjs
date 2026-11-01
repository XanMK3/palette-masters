import { test, expect } from '@playwright/test';

test('Preact shell preserves module hosts across updates and cleans up on remount', async ({
  page,
}) => {
  await page.route('**/shell-fixture', (route) =>
    route.fulfill({
      contentType: 'text/html',
      body: '<!doctype html><body><div class="shell"></div></body>',
    }),
  );
  await page.route(/^https:\/\//, (route) => route.abort());
  await page.goto('/shell-fixture');
  await page.evaluate(async () => {
    const { createAppShell } = await import('/src/app/index.ts');
    const root = document.querySelector('.shell');
    const selected = [];
    const mount = () =>
      createAppShell(
        root,
        {},
        {
          featuredDirectImage: () => null,
          resolveFeatured: async () => null,
        },
        { selectPainting: (item) => selected.push(item) },
      );
    const shell = mount();
    // These callbacks must work immediately, before any scheduled Preact rerender.
    shell.selectionStarted({ title: 'Fixture', artist: 'Fixture artist' });
    const image = new ImageData(12, 12);
    for (let i = 0; i < image.data.length; i += 4)
      image.data.set([i % 255, (i * 3) % 255, (i * 7) % 255, 255], i);
    shell.pixelsReady(image);
    window.fixture = {
      shell,
      mount,
      selected,
      image,
      frame: root.querySelector('iframe'),
      gallery: root.querySelector('#paintings'),
      firstCard: root.querySelector('.work'),
    };
  });
  await expect(page.locator('#download-theme')).toBeEnabled();
  await page.locator('[data-template="poster"]').click();
  await expect(page.locator('[data-template="poster"]')).toHaveClass('active');
  await page.locator('#btn-shuffle').click();
  expect(
    await page.evaluate(() => {
      const f = window.fixture;
      return (
        f.frame === document.querySelector('iframe') &&
        f.gallery === document.querySelector('#paintings') &&
        f.firstCard === document.querySelector('.work')
      );
    }),
  ).toBe(true);
  await page.locator('#view-pipeline').click();
  await expect(page.locator('.pipeline-viewer')).toBeVisible();
  await page.evaluate(() => {
    const f = window.fixture;
    f.shell.dispose();
    f.shell.dispose();
    f.shell.pixelsReady(f.image);
  });
  await expect(page.locator('.shell')).toBeEmpty();
  await expect(page.locator('.pipeline-viewer')).toHaveCount(0);
  await page.evaluate(() => {
    window.fixture.shell = window.fixture.mount();
  });
  await expect(page.locator('#download-theme')).toBeDisabled();
  await page.locator('#openSearch').click();
  await expect(page.locator('#searchDialog')).toBeVisible();
  await page.locator('#closeSearch').click();
  await page.locator('.work').first().click();
  expect(await page.evaluate(() => window.fixture.selected.length)).toBe(1);
});

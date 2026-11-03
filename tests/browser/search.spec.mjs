import { test, expect } from '@playwright/test';

test('Wikimedia search opens separately from preset browsing and restores focus', async ({
  page,
}) => {
  await page.goto('/');
  const opener = page.getByRole('button', { name: 'Search Wikimedia', exact: true });
  await expect(page.locator('aside #searchQuery')).toHaveCount(0);
  await expect(page.locator('#movementPicker')).toBeVisible();
  await page.getByRole('button', { name: 'Wikimedia', exact: true }).click();
  await opener.click();
  await expect(page.getByRole('dialog', { name: 'Search Wikimedia' })).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'Search artist or painting' })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await expect(opener).toBeFocused();
  await opener.click();
  await page.getByRole('button', { name: 'Close search' }).click();
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await page.getByRole('button', { name: 'Curated', exact: true }).click();
  await expect(page.locator('#paintings .work').first()).toBeVisible();
});

test('popup selection previews artwork, preserves browsing state and fits a laptop sidebar', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.route(/^https:\/\//, (route) => route.abort());
  await page.goto('/');
  await page.evaluate(async () => {
    const { createAppShell } = await import('/src/app/index.ts');
    const root = document.createElement('div');
    root.className = 'shell';
    document.body.replaceChildren(root);
    const imageUrl = '/assets/palette-test-sample.png';
    let shell;
    shell = createAppShell(
      root,
      {
        searchAll: async () => ({
          entities: [],
          errors: [],
          images: [{ fileTitle: 'File:Test painting.png', thumbnailUrl: imageUrl }],
        }),
      },
      {
        featuredDirectImage: () => imageUrl,
        resolveFeatured: async () => null,
      },
      {
        selectPainting: (item) => {
          shell.selectionStarted(item);
          shell.showImage(imageUrl, item.title);
          const pixels = new ImageData(2, 2);
          pixels.data.set([255, 0, 0, 255, 0, 255, 0, 255, 0, 0, 255, 255, 255, 255, 0, 255]);
          shell.pixelsReady(pixels);
        },
      },
    );
  });
  const source = (name) => page.getByRole('button', { name, exact: true });
  await page.locator('#movementPicker').selectOption('1');
  const initialHeight = await page.locator('.artwork-browser').evaluate((el) => el.offsetHeight);
  await source('Wikimedia').click();
  await expect(page.locator('.artwork-empty')).toBeVisible();
  await page.locator('#openSearch').click();
  await page.locator('#searchQuery').fill('Test');
  await page.getByRole('button', { name: 'Find', exact: true }).click();
  await page.locator('.result').click();
  await expect(page.locator('#searchDialog')).not.toBeVisible();
  await expect(page.locator('.searched-preview img')).toHaveClass('loaded');
  await expect(page.locator('.searched-preview')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.searched-caption')).toContainText('Test painting');
  await expect(page.locator('#download-theme')).toBeEnabled();
  const palette = await page.locator('#swatches').textContent();
  await source('Curated').click();
  await expect(page.locator('#movementPicker')).toHaveValue('1');
  await source('Wikimedia').click();
  expect(await page.locator('#swatches').textContent()).toBe(palette);
  expect(await page.locator('.artwork-browser').evaluate((el) => el.offsetHeight)).toBe(
    initialHeight,
  );
  for (const height of [768, 650]) {
    await page.setViewportSize({ width: 1366, height });
    expect(
      await page.locator('.sideinner').evaluate((el) => el.scrollHeight <= el.clientHeight),
    ).toBe(true);
  }
  await page.locator('#openSearch').click();
  await expect(page.locator('#searchQuery')).toHaveValue('Test');
  await page.keyboard.press('Escape');
  await expect(page.locator('#openSearch')).toBeFocused();
  await source('Curated').click();
  await page.locator('.work').first().click();
  await source('Wikimedia').click();
  await expect(page.locator('.searched-preview')).toHaveAttribute('aria-pressed', 'false');
  await page.locator('.searched-preview').click();
  await expect(page.locator('.searched-preview')).toHaveAttribute('aria-pressed', 'true');
});

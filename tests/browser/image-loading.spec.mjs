import { test, expect } from '@playwright/test';

test('initial HTML preload matches the selected artwork and its request mode', async ({ page }) => {
  await page.route(/^https:\/\//, (route) =>
    route.request().resourceType() === 'image'
      ? route.fulfill({
          path: 'assets/palette-test-sample.png',
          contentType: 'image/png',
          headers: { 'access-control-allow-origin': '*' },
        })
      : route.abort(),
  );
  const response = await page.goto('/');
  expect(await response.text()).toContain('rel="preload"');
  const selected = page.locator('#paintings .work[aria-pressed="true"] img');
  await expect(selected).toHaveAttribute('alt', 'Girl with a Pearl Earring');
  await expect(selected).toHaveAttribute('fetchpriority', 'high');
  await expect(selected).toHaveAttribute('loading', 'eager');
  const preload = page.locator('link[rel="preload"][as="image"]');
  await expect(preload).toHaveCount(1);
  await expect(preload).toHaveAttribute('href', await selected.getAttribute('src'));
  await expect(preload).toHaveAttribute('crossorigin', 'anonymous');
  await expect(selected).toHaveAttribute('crossorigin', 'anonymous');
  await expect(page.getByRole('button', { name: /^Copy palette color 1,/ })).toBeVisible();
});

test('artwork remains visible when CORS image requests fail', async ({ page }) => {
  await page.route(/^https:\/\//, async (route) => {
    const headers = await route.request().allHeaders();
    if (route.request().resourceType() !== 'image' || headers.origin) return route.abort();
    return route.fulfill({ path: 'assets/palette-test-sample.png', contentType: 'image/png' });
  });
  await page.goto('/');
  const selected = page.locator('#paintings .work[aria-pressed="true"] img');
  await expect(selected).toHaveClass('loaded');
  await expect(selected).not.toHaveAttribute('crossorigin');
  await expect(selected).toHaveCSS('opacity', '1');
  await page.getByRole('tab', { name: 'Poster', exact: true }).click();
  await expect(page.frameLocator('#templatePreview').locator('#poster-artwork img')).toHaveClass(
    'loaded',
  );
});

test('missing artwork uses shared styles in both shell and preview', async ({ page }) => {
  await page.route(/^https:\/\//, (route) => route.abort());
  await page.goto('/');
  await page.evaluate(async () => {
    const { render } = await import('/node_modules/preact/dist/preact.mjs');
    const { ImageError } = await import('/src/modules/artwork.tsx');
    const host = document.createElement('div');
    document.body.append(host);
    render(ImageError({ label: 'Fixture image failure' }), host);
  });
  const missing = page
    .getByRole('img', { name: 'Painting image unavailable', exact: true })
    .filter({ hasText: 'Fixture image failure' });
  await expect(missing).toHaveCSS('display', 'flex');
  await expect(missing).toHaveCSS('font-style', 'normal');
  await expect(missing).toHaveCSS('padding', '8px');
  const frame = await (await page.locator('#templatePreview').elementHandle()).contentFrame();
  await frame.evaluate(async () => {
    const { imageError } = await import('/src/artwork-image.ts');
    document.getElementById('themeStage').append(imageError('Fixture image failure'));
  });
  const previewMissing = frame
    .getByRole('img', { name: 'Painting image unavailable', exact: true })
    .filter({ hasText: 'Fixture image failure' });
  await expect(previewMissing).toHaveCSS('display', 'flex');
  await expect(previewMissing).toHaveCSS('font-style', 'normal');
  await expect(previewMissing).toHaveCSS('padding', '8px');
});

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
  await expect(page.locator('#swatches code').first()).toBeVisible();
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
  await page.locator('[data-template="poster"]').click();
  await expect(page.frameLocator('#templatePreview').locator('#poster-artwork img')).toHaveClass(
    'loaded',
  );
});

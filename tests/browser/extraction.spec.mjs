import { test, expect } from '@playwright/test';
import { loadArtworkFixture } from './artwork-fixture.mjs';

test('all six extraction modes update previews from artwork pixels', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.route(/^https:\/\//, (route) => route.abort());
  await page.goto('/');
  await loadArtworkFixture(page);
  await expect(page.locator('#swatches code').first()).toBeVisible();
  const methods = await page
    .locator('#method option')
    .evaluateAll((options) =>
      options.map((option) => ({ value: option.value, name: option.textContent })),
    );
  expect(methods).toHaveLength(6);
  await expect(page.getByRole('group', { name: 'Number of colors' })).toHaveCount(0);
  for (const method of methods) {
    await page.locator('#method').selectOption(method.value);
    const colors = await page.locator('#swatches code').allTextContents();
    expect(colors.length).toBeGreaterThan(0);
    expect(colors.length).toBeLessThanOrEqual(5);
    await expect(page.frameLocator('#templatePreview').locator('#poster-algorithm-tag')).toHaveText(
      method.name,
    );
    await expect(page.locator('#btn-shuffle')).toBeEnabled();
  }
  expect(errors).toEqual([]);
});

import { test, expect } from '@playwright/test';
import { loadArtworkFixture, paletteColors } from './artwork-fixture.mjs';

test('all six extraction modes update previews from artwork pixels', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.route(/^https:\/\//, (route) => route.abort());
  await page.goto('/');
  await loadArtworkFixture(page);
  await expect(page.getByRole('button', { name: /^Copy palette color 1,/ })).toBeVisible();
  const methods = await page
    .getByRole('combobox', { name: 'Extraction algorithm', exact: true })
    .getByRole('option')
    .evaluateAll((options) =>
      options.map((option) => ({ value: option.value, name: option.textContent })),
    );
  expect(methods).toHaveLength(6);
  await expect(page.getByRole('group', { name: 'Number of colors' })).toHaveCount(0);
  for (const method of methods) {
    await page
      .getByRole('combobox', { name: 'Extraction algorithm', exact: true })
      .selectOption(method.value);
    const colors = await paletteColors(page);
    expect(colors.length).toBeGreaterThan(0);
    expect(colors.length).toBeLessThanOrEqual(5);
    await expect(page.frameLocator('#templatePreview').locator('#poster-algorithm-tag')).toHaveText(
      method.name,
    );
    await expect(page.getByRole('button', { name: 'Shuffle Roles', exact: true })).toBeEnabled();
  }
  expect(errors).toEqual([]);
});

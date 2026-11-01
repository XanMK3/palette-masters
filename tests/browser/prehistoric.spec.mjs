import { test, expect } from '@playwright/test';
import { loadArtworkFixture } from './artwork-fixture.mjs';

test('corrected prehistoric panels load and extract colors through remote image requests without search', async ({
  page,
}) => {
  await page.goto('/');
  await loadArtworkFixture(page);
  await page.locator('#movementPicker').selectOption('0');
  const cards = page.locator('#paintings .work');
  await expect(cards).toHaveCount(9);
  for (const index of [0, 1, 2, 3, 4, 5, 6, 7, 8]) {
    const card = cards.nth(index);
    await expect(card.locator('img')).toHaveAttribute(
      'src',
      /^https:\/\/(thumb|upload)\.wikimedia\.org\//,
    );
    await expect(card.locator('img')).toHaveClass('loaded');
    await card.click();
    await expect(page.locator('#swatches code').first()).toBeVisible();
    await expect(card).toHaveAttribute('aria-pressed', 'true');
    await expect(page.frameLocator('#templatePreview').locator('#themeStage')).toContainText(
      await card.locator('span').first().textContent(),
    );
    await page.getByRole('button', { name: 'Close expanded painting' }).click();
  }
  await page.locator('#paintings').screenshot({ path: 'test-results/prehistoric-grid.png' });
});

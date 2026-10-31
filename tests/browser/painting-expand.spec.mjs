import { test, expect } from '@playwright/test';
import { loadArtworkFixture } from './artwork-fixture.mjs';

for (const reducedMotion of ['no-preference', 'reduce']) {
  test(`painting expands and returns to the grid (${reducedMotion})`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion });
    await page.goto('/');
    await loadArtworkFixture(page);
    const card = page.locator('#paintings .work').first();
    const thumbnail = card.locator('img');
    await expect(thumbnail).toHaveClass('loaded');
    const count = await page.locator('#paintings .work').count();
    await card.click();
    const overlay = page.locator('.painting-overlay');
    const close = page.getByRole('button', { name: 'Close expanded painting' });
    await expect(close).toBeFocused();
    await expect(card).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('#paintings .work')).toHaveCount(count);
    const fillsGallery = () =>
      page.locator('#paintings').evaluate((gallery) => {
        const a = gallery.getBoundingClientRect();
        const b = gallery.querySelector('.painting-overlay').getBoundingClientRect();
        return Math.abs(a.width - b.width) < 1 && Math.abs(a.height - b.height) < 1;
      });
    await expect.poll(fillsGallery).toBe(true);
    await page.keyboard.press('Escape');
    await expect(overlay).toBeVisible();
    await page.setViewportSize({ width: 390, height: 844 });
    await expect.poll(fillsGallery).toBe(true);
    await close.click();
    await expect(overlay).toHaveCount(0);
    await expect(thumbnail).toBeVisible();
    await expect(card).toBeFocused();
    await card.click();
    await expect(overlay).toBeVisible();
    await page.getByRole('combobox', { name: 'Art period' }).selectOption('1');
    await expect(overlay).toHaveCount(0);
    await expect(page.locator('#paintings .work[inert]')).toHaveCount(0);
  });
}

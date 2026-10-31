import { test, expect } from '@playwright/test';

test('Wikimedia search opens separately from preset browsing and restores focus', async ({
  page,
}) => {
  await page.goto('/');
  const opener = page.getByRole('button', { name: 'Search Wikimedia', exact: true });
  await expect(page.locator('aside #searchQuery')).toHaveCount(0);
  await expect(page.locator('#movementPicker')).toBeVisible();
  await opener.click();
  await expect(page.getByRole('dialog', { name: 'Search Wikimedia' })).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'Search artist or painting' })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await expect(opener).toBeFocused();
  await opener.click();
  await page.getByRole('button', { name: 'Close search' }).click();
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await expect(page.locator('#paintings .work').first()).toBeVisible();
});

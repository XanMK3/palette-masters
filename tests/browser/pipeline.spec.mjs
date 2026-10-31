import { test, expect } from '@playwright/test';
import { loadArtworkFixture } from './artwork-fixture.mjs';

test.beforeEach(async ({ page }) => {
  await page.route(/^https:\/\//, (route) => route.abort());
  await page.goto('/');
  await loadArtworkFixture(page);
  await expect(page.locator('#swatches code').first()).toBeVisible();
});
const roles = (page) =>
  page
    .frameLocator('#templatePreview')
    .locator('#themeStage')
    .evaluate((el) =>
      Object.fromEntries(
        ['bg', 'surface', 'text', 'accent', 'secondary', 'tertiary'].map((role) => [
          role,
          el.style.getPropertyValue(`--color-${role}`),
        ]),
      ),
    );
const swatches = (page) =>
  page.locator('#swatches [data-swatch-id]').evaluateAll((nodes) =>
    nodes
      .map((n) => ({
        id: n.dataset.swatchId,
        hex: n.querySelector('code').textContent,
      }))
      .sort((a, b) => a.id.localeCompare(b.id)),
  );

test('clean palette controls retain mapping across templates', async ({ page }) => {
  await expect(
    page.locator(
      '.swatch-metadata, #palette-sort, #reset-automatic, #pipeline-summary, #mapping-status',
    ),
  ).toHaveCount(0);
  const help = page.getByRole('button', { name: 'How this palette was extracted' });
  await expect(page.locator('.palette-title').getByRole('button')).toHaveAttribute(
    'id',
    'view-pipeline',
  );
  await expect(help.locator('svg')).toBeVisible();
  const original = await swatches(page),
    automatic = await roles(page);
  await page.locator('#btn-shuffle').click();
  await expect.poll(() => roles(page)).not.toEqual(automatic);
  const shuffled = await roles(page);
  for (const template of ['magazine', 'poster', 'landing']) {
    await page.locator(`[data-template="${template}"]`).click();
    await expect.poll(() => roles(page)).toEqual(shuffled);
    expect(await swatches(page)).toEqual(original);
  }
  await help.click();
  await expect(page.getByRole('dialog')).toBeVisible();
});

test('custom pipeline validation and static viewer', async ({ page }) => {
  await page.locator('#method').selectOption('oklab-kmeans-auto');
  await page.locator('#view-pipeline').click();
  await page.locator('summary').filter({ hasText: 'Advanced composition' }).click();
  const previous = await swatches(page);
  await page.locator('#pipeline-budget').fill('0');
  await page.locator('#pipeline-budget').dispatchEvent('change');
  await expect(page.locator('#pipeline-validation')).toContainText('Candidate budget');
  expect(await swatches(page)).toEqual(previous);
  await page.locator('#pipeline-budget').fill('12');
  await page.locator('#pipeline-budget').dispatchEvent('change');
  await page.locator('#pipeline-snapping').selectOption('nearest-original-sample');
  await page.locator('#pipeline-selection').selectOption('lightness');
  await expect(page.locator('#pipeline-strategy')).toHaveValue('stratified');
  await expect(page.locator('#pipeline-validation')).toContainText('per-band');
  await expect(page.locator('#download-trace')).toHaveCount(0);
  await expect(page.getByRole('dialog')).toBeVisible();
});

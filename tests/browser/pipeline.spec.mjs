import { test, expect } from '@playwright/test';
import { loadArtworkFixture, paletteColors } from './artwork-fixture.mjs';

test.beforeEach(async ({ page }) => {
  await page.route(/^https:\/\//, (route) => route.abort());
  await page.goto('/');
  await loadArtworkFixture(page);
  await expect(page.getByRole('button', { name: /^Copy palette color 1,/ })).toBeVisible();
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
const swatches = async (page) => (await paletteColors(page)).sort();

test('clean palette controls retain mapping across templates', async ({ page }) => {
  await expect(
    page.locator(
      '.swatch-metadata, #palette-sort, #reset-automatic, #pipeline-summary, #mapping-status',
    ),
  ).toHaveCount(0);
  const help = page.getByRole('button', { name: 'How this palette was extracted' });
  await expect(help).toBeVisible();
  await expect(help.locator('svg')).toBeVisible();
  const original = await swatches(page),
    automatic = await roles(page);
  await page.getByRole('button', { name: 'Shuffle Roles', exact: true }).click();
  await expect.poll(() => roles(page)).not.toEqual(automatic);
  const shuffled = await roles(page);
  for (const template of ['magazine', 'poster', 'landing']) {
    await page
      .getByRole('tab', {
        name: { landing: 'Landing', magazine: 'Article', poster: 'Poster' }[template],
        exact: true,
      })
      .click();
    await expect.poll(() => roles(page)).toEqual(shuffled);
    expect(await swatches(page)).toEqual(original);
  }
  await help.click();
  await expect(page.getByRole('dialog')).toBeVisible();
});

test('custom pipeline validation and static viewer', async ({ page }) => {
  await page
    .getByRole('combobox', { name: 'Extraction algorithm', exact: true })
    .selectOption('oklab-kmeans-auto');
  await page.getByRole('button', { name: 'How this palette was extracted', exact: true }).click();
  await page.locator('summary').filter({ hasText: 'Advanced composition' }).click();
  const previous = await swatches(page);
  await page.getByLabel('Candidate budget', { exact: true }).fill('0');
  await page.getByLabel('Candidate budget', { exact: true }).dispatchEvent('change');
  await expect(page.locator('#pipeline-validation')).toContainText('Candidate budget');
  expect(await swatches(page)).toEqual(previous);
  await page.getByLabel('Candidate budget', { exact: true }).fill('12');
  await page.getByLabel('Candidate budget', { exact: true }).dispatchEvent('change');
  await page
    .getByLabel('Use only sampled image colors', { exact: true })
    .selectOption('nearest-original-sample');
  await page.getByLabel('Representative selection', { exact: true }).selectOption('lightness');
  await expect(page.getByLabel('Strategy', { exact: true })).toHaveValue('stratified');
  await expect(page.locator('#pipeline-validation')).toContainText('per-band');
  await expect(page.locator('#download-trace')).toHaveCount(0);
  await expect(page.getByRole('dialog')).toBeVisible();
});

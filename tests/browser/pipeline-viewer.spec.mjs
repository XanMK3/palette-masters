import { test, expect } from '@playwright/test';
import { loadArtworkFixture } from './artwork-fixture.mjs';

test('painting story covers available chapters for every preset without debug UI', async ({
  page,
}) => {
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.route(/^https:\/\//, (r) => r.abort());
  await page.goto('/');
  const trigger = page.locator('#view-pipeline');
  await expect(trigger).toBeDisabled();
  await loadArtworkFixture(page);
  const methods = await page
    .locator('#method option')
    .evaluateAll((items) => items.map((o) => o.value));
  for (const method of methods) {
    await page.locator('#method').selectOption(method);
    await trigger.click();
    const dialog = page.getByRole('dialog');
    await expect(dialog.locator('.pv-painting canvas')).toBeVisible();
    for (const chapter of ['Sample', 'Find colors', 'Select', 'Coverage', 'Theme']) {
      await dialog.getByRole('button', { name: chapter, exact: true }).click();
      await expect(dialog.locator('.pv-caption')).not.toBeEmpty();
    }
    await expect(dialog.getByRole('button', { name: 'Background', exact: true })).toBeVisible();
    await expect(dialog.locator('pre')).toHaveCount(0);
    await expect(dialog.locator('details')).toHaveCount(1);
    await expect(dialog.locator('summary')).toHaveText('Advanced composition');
    await expect(dialog.locator('header nav button')).toHaveText([
      'Sample',
      'Find colors',
      'Select',
      'Coverage',
      'Theme',
    ]);
    await expect(dialog.locator('.pv-duration, .pv-hint')).toHaveCount(0);
    await expect(dialog.locator('.pv-theme-card .pv-roles button')).toHaveCount(6);
    await expect(page.locator('#download-trace')).toHaveCount(0);
    await page.keyboard.press('Escape');
    await expect(trigger).toBeFocused();
  }
  expect(errors).toEqual([]);
});

test('K-means story completes under twenty seconds with faithful seeking and original comparison', async ({
  page,
}) => {
  await page.clock.install();
  await page.route(/^https:\/\//, (r) => r.abort());
  await page.goto('/');
  const fixture = await page.evaluate(() => {
    const c = document.createElement('canvas');
    c.width = 60;
    c.height = 60;
    const ctx = c.getContext('2d'),
      p = ctx.createImageData(60, 60);
    for (let y = 0; y < 60; y++)
      for (let x = 0; x < 60; x++) p.data.set([x * 4, y * 4, (x + y) * 2, 255], (y * 60 + x) * 4);
    ctx.putImageData(p, 0, 0);
    return c.toDataURL().split(',')[1];
  });
  await loadArtworkFixture(page, Buffer.from(fixture, 'base64'));
  for (const method of ['oklab-kmeans-auto', 'oklab-kmeans-auto']) {
    await page.locator('#method').selectOption(method);
    await page.locator('#view-pipeline').click();
    const d = page.getByRole('dialog');
    const step = d.getByLabel('Story step');
    await d.getByRole('button', { name: 'Find colors', exact: true }).click();
    await d.getByRole('button', { name: 'Next', exact: true }).click();
    const first = await d.locator('.pv-painting canvas').evaluate((c) => c.toDataURL());
    await d.getByRole('button', { name: 'Next', exact: true }).click();
    await d.getByRole('button', { name: 'Previous', exact: true }).click();
    expect(await d.locator('.pv-painting canvas').evaluate((c) => c.toDataURL())).toBe(first);
    await d.getByRole('button', { name: 'Original', exact: true }).click();
    expect(await d.locator('.pv-painting canvas').evaluate((c) => c.toDataURL())).not.toBe(first);
    await d.getByRole('button', { name: 'Original', exact: true }).click();
    await d.locator('.pv-swatch').first().click();
    await expect(d.locator('.pv-swatch').first()).toHaveAttribute('aria-pressed', 'true');
    expect(await d.locator('.pv-painting canvas').evaluate((c) => c.toDataURL())).not.toBe(first);
    await d.getByRole('button', { name: 'Restart', exact: true }).click();
    await d.getByRole('button', { name: 'Play', exact: true }).click();
    await page.clock.fastForward(19000);
    await expect(d.getByRole('button', { name: 'Play', exact: true })).toBeVisible();
    await expect(step).toHaveValue(await step.getAttribute('max'));
    await expect(d.locator('.pv-theme-card')).toBeVisible();
    await page.keyboard.press('Escape');
  }
  await page.locator('#view-pipeline').click();
  await page.getByRole('button', { name: 'Find colors', exact: true }).click();
  await page.getByRole('button', { name: 'Next', exact: true }).click();
  await page.screenshot({ path: '/tmp/painting-story.png' });
  await page.setViewportSize({ width: 390, height: 844 });
  const d = page.getByRole('dialog');
  expect(await d.evaluate((e) => e.scrollWidth <= e.clientWidth)).toBe(true);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(d.getByRole('button', { name: 'Play', exact: true })).toBeDisabled();
  await expect(d.getByRole('button', { name: 'Next', exact: true })).toBeEnabled();
  await page.keyboard.press('Escape');
  await page.clock.fastForward(20000);
  await page.locator('#view-pipeline').click();
  await expect(page.getByLabel('Story step')).toHaveValue('0');
});

test('remaining methods animate fitting and selection with deterministic backward seeking', async ({
  page,
}) => {
  await page.clock.install();
  await page.route(/^https:\/\//, (r) => r.abort());
  await page.goto('/');
  const fixture = await page.evaluate(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 24;
    canvas.height = 24;
    const ctx = canvas.getContext('2d'),
      pixels = ctx.createImageData(24, 24);
    for (let y = 0; y < 24; y++)
      for (let x = 0; x < 24; x++)
        pixels.data.set([x * 10, y * 10, (x + y) * 5, 255], (y * 24 + x) * 4);
    ctx.putImageData(pixels, 0, 0);
    return canvas.toDataURL().split(',')[1];
  });
  await loadArtworkFixture(page, Buffer.from(fixture, 'base64'));
  const cases = [
    ['hue-auto', 'Reveal'],
    ['octree-auto', 'merge'],
    ['medoids-dominance', 'input representatives'],
    ['edge-medoids-farthest', 'input representatives'],
    ['slic-samples-farthest', 'farthest'],
  ];
  for (const [method, caption] of cases) {
    await page.locator('#method').selectOption(method);
    await page.locator('#view-pipeline').click();
    const d = page.getByRole('dialog');
    await d
      .getByRole('button', {
        name: method === 'slic-samples-farthest' ? 'Select' : 'Find colors',
        exact: true,
      })
      .click();
    let found = false;
    for (let i = 0; i < 12; i++) {
      if ((await d.locator('.pv-caption').textContent()).includes(caption)) {
        found = true;
        break;
      }
      await d.getByRole('button', { name: 'Next', exact: true }).click();
    }
    expect(found, method).toBe(true);
    const before = await d.locator('.pv-painting canvas').evaluate((c) => c.toDataURL());
    await d.getByRole('button', { name: 'Next', exact: true }).click();
    await d.getByRole('button', { name: 'Previous', exact: true }).click();
    expect(await d.locator('.pv-painting canvas').evaluate((c) => c.toDataURL())).toBe(before);
    await d.getByRole('button', { name: 'Restart', exact: true }).click();
    await d.getByRole('button', { name: 'Play', exact: true }).click();
    await page.clock.fastForward(19000);
    await expect(d.locator('.pv-theme-card')).toBeVisible();
    await expect(d.getByRole('button', { name: 'Play', exact: true })).toBeVisible();
    await page.keyboard.press('Escape');
  }
});

test('composition edits refresh the open viewer and persist selection', async ({ page }) => {
  await page.route(/^https:\/\//, (r) => r.abort());
  await page.goto('/');
  await loadArtworkFixture(page);
  await expect(page.locator('#advanced-controls')).toHaveCount(0);
  await page.locator('#view-pipeline').click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('button', { name: 'Select', exact: true }).click();
  const strategy = dialog.getByLabel('Selection strategy', { exact: true });
  const initial = await strategy.inputValue();
  await dialog.locator('summary').click();
  await expect(dialog.getByLabel('Representative selection', { exact: true })).toHaveValue(initial);
  await strategy.selectOption('population');
  await expect(dialog).toBeVisible();
  await expect(strategy).toHaveValue('population');
  await expect(dialog.getByLabel('Representative selection', { exact: true })).toHaveValue(
    'population',
  );
  await dialog
    .getByLabel('Representative selection', { exact: true })
    .selectOption('farthest-point');
  await expect(strategy).toHaveValue('farthest-point');
  await expect(dialog.locator('nav button[aria-current="true"]')).toHaveText('Select');
  expect(
    await dialog
      .locator('#advanced-controls')
      .evaluate((e) => e === e.parentElement.lastElementChild),
  ).toBe(true);
  for (const name of ['Close', 'Previous', 'Play', 'Next', 'Restart']) {
    const button = dialog.getByRole('button', { name, exact: true });
    await expect(button.locator('svg')).toHaveCount(1);
    await expect(button).toHaveText('');
  }
  await dialog.getByRole('button', { name: 'Close', exact: true }).click();
  await expect(page.locator('#view-pipeline')).toBeFocused();
  await page.locator('#view-pipeline').click();
  await dialog.getByRole('button', { name: 'Select', exact: true }).click();
  await expect(strategy).toHaveValue('farthest-point');
});

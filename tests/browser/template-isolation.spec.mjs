import { textContrastFailures } from './template-contrast.mjs';
import { test, expect } from '@playwright/test';
import { loadArtworkFixture } from './artwork-fixture.mjs';

const fixture = async (page, template, colors) =>
  page.evaluate(
    async ({ template, colors }) => {
      const { renderPreview } = await import('/src/templates/preview.ts');
      const { DEFAULT_PREVIEW } = await import('/src/templates/state.ts');
      const { createTheme } = await import('/src/theme.service.ts');
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = 20;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = colors[0];
      ctx.fillRect(0, 0, 20, 20);
      renderPreview({
        ...DEFAULT_PREVIEW,
        template,
        tokens: createTheme(colors).tokens,
        title: 'Fixture artwork',
        artist: 'Fixture artist',
        algorithmLabel: 'Fixture extraction',
        image: { url: canvas.toDataURL(), title: 'Fixture artwork' },
      });
    },
    { template, colors },
  );

for (const width of [320, 390, 1024]) {
  test(`standalone templates render fixture palettes and artwork at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/preview.html');
    for (const colors of [
      ['#060609', '#151719', '#33312F'],
      ['#FFFFFF', '#FFF8EF', '#F1F5EF'],
      ['#FF0000', '#00FF00', '#0000FF'],
    ]) {
      for (const template of ['landing', 'magazine', 'poster']) {
        await fixture(page, template, colors);
        await expect(page.locator(`#tpl-${template}`)).toBeVisible();
        expect(
          await page.locator(`#tpl-${template}`).evaluate((el) => el.scrollWidth <= el.clientWidth),
        ).toBe(true);
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
          true,
        );
        await expect(page.locator('#poster-artwork img')).toHaveClass('loaded');
        await expect(page.locator('#poster-art-name')).toHaveText('Fixture artwork');
        expect(await textContrastFailures(page)).toEqual([]);
      }
    }
  });
}

test('app CSS is isolated and iframe reload restores the current state', async ({ page }) => {
  await page.route(/^https:\/\//, (route) => route.abort());
  await page.goto('/');
  await loadArtworkFixture(page);
  await page.locator('[data-template="poster"]').click();
  const preview = page.frameLocator('#templatePreview');
  await expect(preview.locator('#poster-artwork img')).toHaveClass('loaded');
  const appearance = () =>
    preview.locator('#tpl-poster').evaluate((el) => {
      const style = getComputedStyle(el);
      return {
        color: style.color,
        background: style.backgroundColor,
        font: style.fontFamily,
        padding: style.padding,
      };
    });
  const before = await appearance();
  await page.addStyleTag({
    content:
      'h2, .template-view, .theme-stage * { color: magenta !important; background: lime !important; font-family: monospace !important; padding: 99px !important; }',
  });
  expect(await appearance()).toEqual(before);
  expect(await page.locator('#tpl-poster').count()).toBe(0);
  await page.locator('#templatePreview').evaluate((el) => el.contentWindow.location.reload());
  await expect(preview.locator('#tpl-poster')).toBeVisible();
  await expect(preview.locator('#poster-art-name')).toHaveText('Mona Lisa');
  await expect(preview.locator('#poster-artwork img')).toHaveClass('loaded');
  expect(await appearance()).toEqual(before);
});

test('Tailwind utilities override preview resets for typography, spacing and borders', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1024, height: 900 });
  await page.goto('/preview.html');
  const button = page.locator('#tpl-landing nav button');
  await expect(button).toHaveCSS('font-size', '12px');
  await expect(button).toHaveCSS('font-weight', '600');
  await expect(button).toHaveCSS('padding-left', '16px');
  await expect(page.locator('#tpl-landing h1')).toHaveCSS('font-size', '48px');
  await expect(page.locator('#tpl-landing h1')).toHaveCSS('font-weight', '800');
  await expect(page.locator('#tpl-landing')).toHaveCSS('border-top-width', '1px');
  await page.setViewportSize({ width: 390, height: 900 });
  await expect(page.locator('#tpl-landing h1')).toHaveCSS('font-size', '30px');
});

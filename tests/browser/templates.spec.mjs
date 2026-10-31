import { textContrastFailures as inspectContrast } from './template-contrast.mjs';
import { test, expect } from '@playwright/test';
import { loadArtworkFixture } from './artwork-fixture.mjs';

async function textContrastFailures(page) {
  const frame = await (await page.locator('#templatePreview').elementHandle()).contentFrame();
  return inspectContrast(frame);
}

const palettes = {
  saturated: ['#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#00FFFF', '#FF00FF'],
  muted: ['#A39486', '#758675', '#D6CDBE', '#625D59', '#BAA294'],
  dark: ['#060609', '#151719', '#262225', '#33312F', '#242B29', '#101D29'],
  light: ['#FFFFFF', '#FFF8EF', '#F1F5EF', '#FAEFFF', '#FFFFEE'],
  monochrome: ['#777777'],
  boundary: ['#757575', '#767676', '#777777', '#787878', '#797979', '#7A7A7A'],
};

test.beforeEach(async ({ page }) => {
  await page.route(/^https:\/\//, (route) => route.abort());
  await page.goto('/');
});

for (const width of [1440, 390]) {
  test(`every template uses the palette with readable text at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    for (const [name, colors] of Object.entries(palettes)) {
      const frame = await (await page.locator('#templatePreview').elementHandle()).contentFrame();
      for (const template of ['landing', 'magazine', 'poster']) {
        await page.locator(`[data-template="${template}"]`).click();
        await expect(
          page.frameLocator('#templatePreview').locator(`#tpl-${template}`),
        ).toBeVisible();
        await frame.evaluate(async (colors) => {
          const { createTheme, applyTheme } = await import('/src/theme.service.ts');
          applyTheme(document.getElementById('themeStage'), createTheme(colors));
        }, colors);
        expect(await textContrastFailures(page), `${name}/${template}/${width}`).toEqual([]);
        const link = page
          .frameLocator('#templatePreview')
          .locator(`#tpl-${template} a:visible, #tpl-${template} button:visible`)
          .first();
        if (await link.count()) {
          await link.hover();
          await link.focus();
        }
        expect(await textContrastFailures(page), 'Hover/focus text contrast').toEqual([]);
        expect(
          await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
          `${template}: page overflow`,
        ).toBe(true);
        expect(
          await page
            .frameLocator('#templatePreview')
            .locator(`#tpl-${template} [data-tone]`)
            .count(),
        ).toBe(0);
      }
    }
  });
}

test('artwork, extraction controls and all previews remain connected', async ({ page }) => {
  await loadArtworkFixture(page);
  await expect(page.locator('#swatches code').first()).toBeVisible();
  await page.locator('#method').selectOption('oklab-kmeans-auto');
  await expect(page.frameLocator('#templatePreview').locator('#poster-algorithm-tag')).toHaveText(
    'Oklab K-means · Auto selection',
  );
  for (const template of ['landing', 'magazine', 'poster']) {
    await page.locator(`[data-template="${template}"]`).click();
    expect(await textContrastFailures(page)).toEqual([]);
    await expect(page.frameLocator('#templatePreview').locator('#poster-art-name')).toHaveText(
      'Mona Lisa',
    );
  }
});

test('default theme and responsive compositions stay readable', async ({ page }, testInfo) => {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  for (const width of [1440, 1024, 390, 320]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const template of ['landing', 'magazine', 'poster']) {
      await page.locator(`[data-template="${template}"]`).click();
      expect(await textContrastFailures(page)).toEqual([]);
      expect(
        await page
          .frameLocator('#templatePreview')
          .locator(`#tpl-${template}`)
          .evaluate((el) => el.scrollWidth <= el.clientWidth),
        `${template} overflows at ${width}px`,
      ).toBe(true);
      const headerTop = await page
        .locator('.workspace-top')
        .evaluate((el) => el.getBoundingClientRect().top);
      const scroll = await (
        await (await page.locator('#templatePreview').elementHandle()).contentFrame()
      ).evaluate(() => {
        const el = document.scrollingElement;
        el.scrollTop = 200;
        return {
          top: el.scrollTop,
          height: el.clientHeight,
          bodyHeight: document.documentElement.scrollHeight,
          viewport: innerHeight,
          maxScroll: el.scrollHeight - el.clientHeight,
        };
      });
      expect(scroll.top).toBe(Math.min(200, scroll.maxScroll));
      expect(scroll.height).toBeGreaterThan(100);
      expect(await page.evaluate(() => document.documentElement.scrollHeight <= innerHeight)).toBe(
        true,
      );
      expect(
        await page.locator('.workspace-top').evaluate((el) => el.getBoundingClientRect().top),
      ).toBe(headerTop);
      await (
        await (await page.locator('#templatePreview').elementHandle()).contentFrame()
      ).evaluate(() => {
        const el = document.scrollingElement;
        el.scrollTop = 0;
      });
      if (width === 1440 || width === 390) {
        await page
          .locator('#templatePreview')
          .screenshot({ path: testInfo.outputPath(`${template}-${width}.png`) });
        await (
          await (await page.locator('#templatePreview').elementHandle()).contentFrame()
        ).evaluate(() => {
          const el = document.scrollingElement;
          el.scrollTop = el.scrollHeight;
        });
        await page
          .locator('#templatePreview')
          .screenshot({ path: testInfo.outputPath(`${template}-${width}-bottom.png`) });
      }
    }
  }
  expect(errors).toEqual([]);
});

test('reference templates, role controls and shuffle use five colors', async ({ page }) => {
  await expect(page.frameLocator('#templatePreview').locator('#tpl-landing')).toContainText(
    'Aura Analytics',
  );
  await expect(page.frameLocator('#templatePreview').locator('#tpl-magazine')).toContainText(
    'Extracting Palette Harmonies from Wikimedia Masterpieces',
  );
  await expect(page.frameLocator('#templatePreview').locator('#tpl-poster')).toContainText(
    'Studies in Color',
  );
  await loadArtworkFixture(page);
  await expect(page.locator('#swatches code').first()).toBeVisible();
  // A six-color input must still produce a five-color UI palette.
  const dataUrl = await page.evaluate(() => {
    const c = document.createElement('canvas');
    c.width = 120;
    c.height = 20;
    const x = c.getContext('2d');
    ['#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#00FFFF', '#FF00FF'].forEach((v, i) => {
      x.fillStyle = v;
      x.fillRect(i * 20, 0, 20, 20);
    });
    return c.toDataURL();
  });
  await loadArtworkFixture(page, Buffer.from(dataUrl.split(',')[1], 'base64'));
  await expect(page.locator('#swatches code').first()).toBeVisible();
  await page.locator('#method').selectOption('octree-auto');
  await expect(page.locator('#swatches select option[value="tertiary"]')).toHaveCount(0);
  const palette = await page.locator('#swatches code').allTextContents();
  expect(palette).toHaveLength(5);
  const before = await page.locator('[data-role="accent"]').getAttribute('data-swatch-index');
  await page.locator('[data-role="accent"]').selectOption('bg');
  expect(
    await page
      .frameLocator('#templatePreview')
      .locator('#themeStage')
      .evaluate((el) => el.style.getPropertyValue('--color-bg')),
  ).toBe(palette[Number(before)]);
  const mapping = await page
    .locator('#swatches select')
    .evaluateAll((els) => els.map((el) => el.value));
  await page.locator('#btn-shuffle').click();
  expect(
    await page.locator('#swatches select').evaluateAll((els) => els.map((el) => el.value)),
  ).not.toEqual(mapping);
  expect(await page.locator('#swatches code').allTextContents()).toEqual(palette);
  for (const template of ['landing', 'magazine', 'poster']) {
    await page.locator(`[data-template="${template}"]`).click();
    expect(await textContrastFailures(page)).toEqual([]);
  }
  await expect(page.locator('#swatches select option[value="tertiary"]')).toHaveCount(0);
  expect(
    await page
      .frameLocator('#templatePreview')
      .locator('#themeStage')
      .evaluate(
        (el) =>
          el.style.getPropertyValue('--color-tertiary') ===
          el.style.getPropertyValue('--color-secondary'),
      ),
  ).toBe(true);
});

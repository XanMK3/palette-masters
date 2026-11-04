import { test, expect } from '@playwright/test';
import { loadArtworkFixture } from './artwork-fixture.mjs';

test('poster follows selected artwork and renders all five exact palette colors', async ({
  page,
}) => {
  await page.route(/^https:\/\//, (route) => route.abort());
  await page.goto('/');
  const dataUrl = await page.evaluate(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 100;
    canvas.height = 20;
    const context = canvas.getContext('2d');
    ['#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#00FFFF'].forEach((color, index) => {
      context.fillStyle = color;
      context.fillRect(index * 20, 0, 20, 20);
    });
    return canvas.toDataURL();
  });
  await loadArtworkFixture(page, Buffer.from(dataUrl.split(',')[1], 'base64'));
  await page.locator('#method').selectOption('octree-auto');
  await page.locator('[data-template="poster"]').click();
  await expect(page.frameLocator('#templatePreview').locator('#poster-artwork img')).toHaveClass(
    'loaded',
  );
  await expect(
    page.frameLocator('#templatePreview').locator('#poster-artwork img'),
  ).toHaveAttribute('alt', 'Girl with a Pearl Earring');
  await expect(page.frameLocator('#templatePreview').locator('#poster-swatch-row')).toHaveCount(0);
  const verifyColors = async () => {
    const actual = await page
      .frameLocator('#templatePreview')
      .locator('#tpl-poster')
      .evaluate((poster) => [
        getComputedStyle(poster).backgroundColor,
        getComputedStyle(poster.querySelector('.bg-surface')).backgroundColor,
        getComputedStyle(poster.querySelector('.poster-heading')).backgroundColor,
        getComputedStyle(poster.querySelector('.poster-info')).backgroundColor,
        getComputedStyle(poster.querySelector('#poster-artwork')).borderTopColor,
      ]);
    const expected = await page
      .locator('#swatches .pigment')
      .evaluateAll((elements) =>
        elements.map((element) => getComputedStyle(element).backgroundColor),
      );
    expect(actual.sort()).toEqual(expected.sort());
  };
  await verifyColors();
  await page.getByRole('button', { name: 'Select Venus of Urbino, Titian', exact: true }).click();
  await expect(
    page.frameLocator('#templatePreview').locator('#poster-artwork img'),
  ).toHaveAttribute('alt', 'Venus of Urbino');
  await expect(page.frameLocator('#templatePreview').locator('#poster-artwork img')).toHaveClass(
    'loaded',
  );
  await expect(page.frameLocator('#templatePreview').locator('#poster-art-name')).toHaveText(
    'Venus of Urbino',
  );
  await expect(page.frameLocator('#templatePreview').locator('#poster-swatch-row')).toHaveCount(0);
  await verifyColors();
  await page.locator('#btn-shuffle').click();
  await verifyColors();
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    expect(
      await page
        .frameLocator('#templatePreview')
        .locator('#tpl-poster')
        .evaluate((el) => el.scrollWidth <= el.clientWidth),
    ).toBe(true);
    await page
      .frameLocator('#templatePreview')
      .locator('#tpl-poster')
      .screenshot({ path: `test-results/poster-${width}.png` });
  }
});

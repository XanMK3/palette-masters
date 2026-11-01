import { test, expect } from '@playwright/test';
import { loadArtworkFixture } from './artwork-fixture.mjs';

test('movement dropdown renders the catalog and preserves selection across galleries', async ({
  page,
}) => {
  await page.route(/^https:\/\//, (route) => route.abort());
  await page.goto('/');
  await loadArtworkFixture(page);
  const picker = page.getByRole('combobox', { name: 'Art period' });
  await expect(picker).toHaveValue('');
  const { defaults, movements } = await page.evaluate(async () => {
    const { DEFAULT_PAINTINGS, FEATURED_MOVEMENTS } = await import('/src/featured-collections.ts');
    return {
      defaults: DEFAULT_PAINTINGS.map((work) => work.title),
      movements: FEATURED_MOVEMENTS.map((movement) => movement.paintings.map((work) => work.title)),
    };
  });
  await expect(picker.locator('option')).toHaveCount(movements.length + 1);
  const expectedDefaultTitles = defaults;
  const titles = () => page.locator('#paintings .work > span:first-of-type').allTextContents();
  expect(await titles()).toEqual(expectedDefaultTitles);
  for (let index = 0; index < movements.length; index++) {
    await picker.selectOption(String(index));
    await expect(page.locator('#paintings .work')).toHaveCount(movements[index].length);
    expect(await titles()).toEqual(movements[index]);
    expect(
      await page
        .locator('#paintings')
        .evaluate((el) => getComputedStyle(el).gridTemplateColumns.split(' ').length),
    ).toBe(3);
  }
  await picker.selectOption('1');
  const venus = page.getByRole('button', {
    name: 'Select The Birth of Venus, Sandro Botticelli',
    exact: true,
  });
  await venus.click();
  await expect(venus).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('#swatches code').first()).toBeVisible();
  await picker.selectOption('2');
  await picker.selectOption('1');
  await expect(venus).toHaveAttribute('aria-pressed', 'true');
  await picker.selectOption('');
  expect(await titles()).toEqual(expectedDefaultTitles);
  const defaultVenus = page.getByRole('button', {
    name: 'Select Venus of Urbino, Titian',
    exact: true,
  });
  await defaultVenus.click();
  await expect(defaultVenus).toHaveAttribute('aria-pressed', 'true');
  await expect(picker).toHaveValue('');
  await expect(page.locator('#swatches code').first()).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page
      .locator('#paintings')
      .evaluate((el) => getComputedStyle(el).gridTemplateColumns.split(' ').length),
  ).toBe(4);
});

import { test, expect } from '@playwright/test';
import { loadArtworkFixture } from './artwork-fixture.mjs';

test('movement dropdown shows periods and nine selectable paintings in three columns', async ({
  page,
}) => {
  await page.route(/^https:\/\//, (route) => route.abort());
  await page.goto('/');
  await loadArtworkFixture(page);
  const picker = page.getByRole('combobox', { name: 'Art period' });
  await expect(picker.locator('option')).toHaveCount(16);
  await expect(picker).toHaveValue('');
  const expectedDefaultTitles = [
    'Panel of Horses',
    'The Garden of Earthly Delights',
    'Mona Lisa',
    'Venus of Urbino',
    'Girl with a Pearl Earring',
    'Grande Odalisque',
    'The Slave Ship',
    'Olympia',
    'Impression, Sunrise',
    'The Boulevard Montmartre at Night',
    'The Starry Night',
    'Open Window, Collioure',
    'The Scream',
    'Improvisation 28 (Second Version)',
    "Les Demoiselles d'Avignon",
    'The Ten Largest, No. 7, Adulthood',
    'Composition with Red, Blue and Yellow',
    "The Harlequin's Carnival",
  ];
  const titles = () => page.locator('#paintings .work > span:first-of-type').allTextContents();
  expect(await titles()).toEqual(expectedDefaultTitles);
  for (let index = 0; index < 15; index++) {
    await picker.selectOption(String(index));
    await expect(page.locator('#paintings .work')).toHaveCount(9);
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
  ).toBe(3);
});

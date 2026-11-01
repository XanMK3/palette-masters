import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { compile } from 'tailwindcss';
import { loadArtworkFixture } from './artwork-fixture.mjs';

async function downloadTheme(page) {
  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download Tailwind v4 theme', exact: true }).click();
  const download = await pending;
  expect(download.suggestedFilename()).toBe('theme.css');
  return readFile(await download.path(), 'utf8');
}

const colorsFromCSS = (css) =>
  Object.fromEntries(
    [...css.matchAll(/(--color-[\w-]+): (#[\da-f]{6});/gi)].map((m) => [m[1], m[2]]),
  );

async function previewColors(page) {
  const frame = await (await page.locator('#templatePreview').elementHandle()).contentFrame();
  return frame.evaluate(async () => {
    const { resolveTailwindColors } = await import('/src/theme/export.ts');
    const style = document.getElementById('themeStage').style;
    return resolveTailwindColors(
      Object.fromEntries([...style].map((name) => [name, style.getPropertyValue(name)])),
    );
  });
}

test('download exports current mapped colors and works in an independent Tailwind project', async ({
  page,
  browser,
}) => {
  await page.route(/^https:\/\//, (route) => route.abort());
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Download Tailwind v4 theme' })).toBeDisabled();
  await loadArtworkFixture(page);
  await expect(page.getByRole('button', { name: 'Download Tailwind v4 theme' })).toBeEnabled();
  for (const action of ['initial', 'manual', 'shuffle']) {
    if (action === 'manual') await page.locator('#swatches select').first().selectOption('accent');
    if (action === 'shuffle') await page.locator('#btn-shuffle').click();
    const css = await downloadTheme(page);
    const colors = colorsFromCSS(css);
    expect(Object.keys(colors)).toHaveLength(31);
    expect(css).toContain('@theme static');
    expect(css).not.toContain('var(');
    expect(css).not.toContain('--color-*:');
    await expect.poll(() => previewColors(page)).toEqual(colors);
    if (action !== 'shuffle') continue;
    // Compile only the downloaded artifact and Tailwind's utilities: no app CSS or JS.
    const utilities = await readFile(
      new URL('../../node_modules/tailwindcss/utilities.css', import.meta.url),
      'utf8',
    );
    const compiler = await compile(css + '\n' + utilities);
    const roles = ['canvas', 'surface', 'accent', 'secondary', 'tertiary'];
    const classes = roles.flatMap((role) => [
      `bg-${role}`,
      `text-on-${role}`,
      `text-on-${role}-muted`,
      `text-accent-on-${role}`,
    ]);
    const compiled = compiler.build(classes);
    const consumer = await browser.newPage();
    try {
      await consumer.setContent(
        `<style>${compiled}</style>` +
          roles
            .map(
              (role) =>
                `<section id="${role}" class="bg-${role} text-on-${role}">Body <span class="text-on-${role}-muted">Muted</span><a class="text-accent-on-${role}">Link</a></section>`,
            )
            .join(''),
      );
      for (const role of roles) {
        const result = await consumer.locator(`#${role}`).evaluate((el) => {
          const style = getComputedStyle(el);
          return {
            background: style.backgroundColor,
            foreground: style.color,
            muted: getComputedStyle(el.querySelector('span')).color,
            accent: getComputedStyle(el.querySelector('a')).color,
          };
        });
        const rgb = (hex) =>
          `rgb(${hex
            .slice(1)
            .match(/../g)
            .map((n) => parseInt(n, 16))
            .join(', ')})`;
        expect(result).toEqual({
          background: rgb(colors[`--color-${role}`]),
          foreground: rgb(colors[`--color-on-${role}`]),
          muted: rgb(colors[`--color-on-${role}-muted`]),
          accent: rgb(colors[`--color-accent-on-${role}`]),
        });
      }
    } finally {
      await consumer.close();
    }
    await page.locator('[data-template="poster"]').click();
    expect(await downloadTheme(page)).toBe(css);
  }
});

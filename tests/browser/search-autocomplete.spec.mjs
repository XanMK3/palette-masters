import { test, expect } from '@playwright/test';

async function fixture(page) {
  await page.route(/^https:\/\//, (route) => route.abort());
  await page.goto('/');
  await page.evaluate(async () => {
    const { mountWikimediaSearch } = await import('/src/modules/wikimedia-search/index.ts');
    document.querySelector('#searchDialog').remove();
    const root = document.createElement('dialog');
    root.id = 'searchDialog';
    document.body.append(root);
    const image = (name) => ({
      fileTitle: `File:${name}.jpg`,
      thumbnailUrl: '/assets/palette-test-sample.png',
    });
    const hits = [
      { id: 'Q5598', label: 'Rembrandt', description: 'Dutch painter', kindHint: 'artist' },
      {
        id: 'Q2',
        label: 'The Night Watch',
        description: 'Painting by Rembrandt',
        kindHint: 'painting',
      },
    ];
    const state = (window.wiki = {
      calls: [],
      pending: [],
      selected: [],
      hits,
      defer: false,
      fail: false,
      broken: false,
    });
    const service = {
      searchEntities: async (query, { signal }) => {
        if (query.startsWith('pending'))
          return new Promise((resolve) => state.pending.push({ signal, resolve }));
        return hits;
      },
      searchCommonsImagesPage: async (query, { signal, continuation }) => {
        state.calls.push({ query, continuation });
        if (state.defer) return new Promise((resolve) => state.pending.push({ signal, resolve }));
        if (state.fail) throw new Error('Network unavailable');
        if (query === 'empty') return { images: [], continuation: null };
        if (state.broken)
          return {
            images: [{ ...image('Broken'), thumbnailUrl: '/missing-fixture.jpg' }],
            continuation: null,
          };
        return continuation
          ? { images: [image('First'), image('Second')], continuation: null }
          : { images: [image('First')], continuation: { continue: 'gsroffset||', gsroffset: 24 } };
      },
    };
    state.mount = () =>
      mountWikimediaSearch(root, { service, onSelect: (item) => state.selected.push(item) });
    state.module = state.mount();
    state.module.open();
  });
}

test('artist and painting hints both open Commons galleries without source switching', async ({
  page,
}) => {
  await fixture(page);
  const input = page.getByRole('combobox', { name: 'Search artist or painting' });
  const bounds = await page.locator('#searchDialog').boundingBox();
  await input.fill('rembrandt');
  await expect(page.locator('#searchDialog').getByRole('option')).toHaveCount(2);
  await expect(page.getByRole('group', { name: 'Artists', exact: true })).toBeVisible();
  await expect(page.getByRole('group', { name: 'Paintings', exact: true })).toBeVisible();
  expect(await page.locator('#searchDialog').boundingBox()).toEqual(bounds);
  await input.press('Escape');
  await expect(page.locator('#searchDialog')).toBeVisible();
  await input.press('ArrowDown');
  await input.press('Enter');
  await expect(page.locator('.search-gallery-title')).toHaveText('Images for “Rembrandt”');
  await expect(page.locator('.artwork-result')).toHaveCount(1);
  await expect(page.locator('#searchDialog').getByRole('option')).toHaveCount(0);
  await expect(
    page.getByRole('button', { name: /Back to Wikidata|Search more images on Commons/ }),
  ).toHaveCount(0);
  await input.fill('Night');
  await expect(page.locator('#searchDialog').getByRole('option')).toHaveCount(2);
  await input.press('ArrowUp');
  await input.press('Enter');
  await expect(page.locator('.search-gallery-title')).toHaveText('Images for “The Night Watch”');
  await expect(page.locator('#searchDialog')).toBeVisible();
  expect(await page.evaluate(() => window.wiki.calls.map((call) => call.query))).toEqual([
    'Rembrandt',
    'The Night Watch',
  ]);
  await page.locator('.artwork-result').click();
  await expect(page.locator('#searchDialog')).not.toBeVisible();
  expect(await page.evaluate(() => window.wiki.selected[0].title)).toBe('First');
});

test('Load more retries the same page, appends unique files, and stops at exhaustion', async ({
  page,
}) => {
  await fixture(page);
  await page.getByRole('combobox', { name: 'Search artist or painting' }).fill('rembrandt');
  await page.getByRole('button', { name: 'Find', exact: true }).click();
  await expect(page.locator('.artwork-result')).toHaveCount(1);
  await page.evaluate(() => {
    window.wiki.fail = true;
  });
  await page.getByRole('button', { name: 'Load more' }).click();
  await expect(page.getByRole('alert')).toContainText('Unable to load more images');
  await expect(page.locator('.artwork-result')).toHaveCount(1);
  await page.evaluate(() => {
    window.wiki.fail = false;
    window.wiki.defer = true;
  });
  await page.getByRole('button', { name: 'Try again' }).click();
  await expect(page.locator('.search-load-more')).toBeDisabled();
  await page.evaluate(() =>
    window.wiki.pending[0].resolve({
      images: [
        { fileTitle: 'File:First.jpg', thumbnailUrl: '/assets/palette-test-sample.png' },
        { fileTitle: 'File:Second.jpg', thumbnailUrl: '/assets/palette-test-sample.png' },
      ],
      continuation: null,
    }),
  );
  await expect(page.locator('.artwork-result')).toHaveCount(2);
  await expect(page.locator('.search-load-more')).toHaveCount(0);
  expect(
    await page.evaluate(() => window.wiki.calls.slice(1).map((call) => call.continuation)),
  ).toEqual([
    { continue: 'gsroffset||', gsroffset: 24 },
    { continue: 'gsroffset||', gsroffset: 24 },
  ]);
  await page.keyboard.press('Escape');
  await page.evaluate(() => window.wiki.module.open());
  await expect(page.locator('.artwork-result')).toHaveCount(2);
  await expect(page.getByRole('combobox', { name: 'Search artist or painting' })).toHaveValue(
    'rembrandt',
  );
});

test('new searches cancel stale pages and reset pagination; failed images stay inline', async ({
  page,
}) => {
  await fixture(page);
  const input = page.getByRole('combobox', { name: 'Search artist or painting' });
  await input.fill('rembrandt');
  await input.press('Enter');
  await expect(page.locator('.artwork-result')).toHaveCount(1);
  await page.evaluate(() => {
    window.wiki.defer = true;
  });
  await page.getByRole('button', { name: 'Load more' }).click();
  await expect.poll(() => page.evaluate(() => window.wiki.pending.length)).toBe(1);
  await page.evaluate(() => {
    window.wiki.defer = false;
  });
  await input.fill('empty');
  await input.press('Enter');
  await expect(page.locator('.search-status')).toContainText('No images found');
  await page.evaluate(() =>
    window.wiki.pending[0].resolve({
      images: [{ fileTitle: 'File:Stale.jpg' }],
      continuation: { gsroffset: 48 },
    }),
  );
  await expect(page.locator('.artwork-result')).toHaveCount(0);
  await expect(page.locator('.search-load-more')).toHaveCount(0);
  expect(await page.evaluate(() => window.wiki.pending[0].signal.aborted)).toBe(true);
  expect(await page.evaluate(() => window.wiki.calls.at(-1).continuation)).toBeUndefined();
  await page.evaluate(() => {
    window.wiki.broken = true;
  });
  await input.fill('broken');
  await input.press('Enter');
  await page.locator('.artwork-result').click();
  await expect(page.getByRole('alert')).toContainText('could not be loaded');
  await expect(page.locator('#searchDialog')).toBeVisible();
  expect(await page.evaluate(() => window.wiki.selected)).toEqual([]);
});

test('stale suggestions and closed requests are ignored and remount starts cleanly', async ({
  page,
}) => {
  await fixture(page);
  const input = page.getByRole('combobox', { name: 'Search artist or painting' });
  await input.fill('pending first');
  await expect.poll(() => page.evaluate(() => window.wiki.pending.length)).toBe(1);
  await input.fill('pending second');
  await expect.poll(() => page.evaluate(() => window.wiki.pending.length)).toBe(2);
  await page.evaluate(() => {
    window.wiki.pending[1].resolve(window.wiki.hits);
    window.wiki.pending[0].resolve([{ id: 'Q3', label: 'Stale artist', kindHint: 'artist' }]);
  });
  await expect(page.locator('#searchDialog').getByRole('option')).toHaveCount(2);
  await expect(page.getByText('Stale artist')).toHaveCount(0);
  await page.evaluate(() => {
    window.wiki.defer = true;
  });
  await page
    .locator('#searchDialog')
    .getByRole('option', { name: /Rembrandt Dutch/ })
    .click();
  await expect.poll(() => page.evaluate(() => window.wiki.pending.length)).toBe(3);
  await page.getByRole('button', { name: 'Close search' }).click();
  await page.evaluate(() =>
    window.wiki.pending[2].resolve({
      images: [{ fileTitle: 'File:Late.jpg' }],
      continuation: null,
    }),
  );
  expect(await page.evaluate(() => window.wiki.pending[2].signal.aborted)).toBe(true);
  await page.evaluate(() => {
    window.wiki.module.dispose();
    window.wiki.module = window.wiki.mount();
    window.wiki.module.open();
  });
  await expect(input).toHaveValue('');
  await expect(page.locator('.artwork-result')).toHaveCount(0);
});

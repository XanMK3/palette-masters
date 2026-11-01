import { test, expect } from '@playwright/test';

// Use a blank same-origin document: neither the shell nor sibling modules are present.
async function blankPage(page) {
  await page.route('**/module-fixture', (route) =>
    route.fulfill({ contentType: 'text/html', body: '<!doctype html><body></body>' }),
  );
  await page.goto('/module-fixture');
}

test('sidebar mounts independently, emits intents, accepts state, and remounts cleanly', async ({
  page,
}) => {
  await blankPage(page);
  const result = await page.evaluate(async () => {
    const { mountSidebar } = await import('/src/modules/sidebar/index.ts');
    const root = document.createElement('aside');
    document.body.append(root);
    const events = [];
    const options = {
      sources: {
        featuredDirectImage: () =>
          'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
        resolveFeatured: async () => null,
      },
      actions: {
        selectPainting: (item) => events.push(['select', item.wikipediaTitle]),
        changeMethod: (method) => events.push(['method', method]),
        assignRole: (role, index) => events.push(['role', role, index]),
        shuffle: () => events.push(['shuffle']),
        openPipeline: () => events.push(['pipeline']),
      },
    };
    let sidebar = mountSidebar(root, options);
    const { PRESET_IDS, PRESET_LABELS } = await import('/src/extraction/presets.ts');
    const methods = Array.from(root.querySelector('#method').options, (option) => [
      option.value,
      option.textContent,
    ]);
    const expectedMethods = PRESET_IDS.map((id) => [id, PRESET_LABELS[id]]);
    const first = root.querySelector('.work');
    const title = first.dataset.wikipediaTitle;
    first.click();
    sidebar.update({
      selection: { wikipediaTitle: title },
      palette: null,
      assignments: null,
      method: 'octree-auto',
      error: 'Fixture error',
    });
    const selected = first.getAttribute('aria-pressed');
    const error = root.querySelector('#palette-error').textContent;
    const picker = root.querySelector('#method');
    picker.dispatchEvent(new Event('change'));
    sidebar.dispose();
    picker.dispatchEvent(new Event('change'));
    const empty = root.children.length === 0;
    sidebar = mountSidebar(root, options);
    const optionsCount = root.querySelector('#movementPicker').options.length;
    sidebar.dispose();
    return { events, selected, error, empty, optionsCount, methods, expectedMethods };
  });
  expect(result.events.map((event) => event[0])).toEqual(['select', 'method']);
  expect(result.methods).toEqual(result.expectedMethods);
  expect(result.selected).toBe('true');
  expect(result.error).toBe('Fixture error');
  expect(result.empty).toBe(true);
  expect(result.optionsCount).toBeGreaterThan(1);
});

test('search cancels stale queries and detail selection on close, then remounts', async ({
  page,
}) => {
  await blankPage(page);
  await page.evaluate(async () => {
    const { mountWikimediaSearch } = await import('/src/modules/wikimedia-search/index.ts');
    const root = document.createElement('dialog');
    document.body.append(root);
    const pending = [];
    const selected = [];
    const service = {
      searchAll: (query, { signal }) =>
        new Promise((resolve) => pending.push({ query, signal, resolve })),
      getEntity: (id, { signal }) =>
        new Promise((resolve) => pending.push({ id, signal, resolve })),
      searchEntities: async () => [],
      getArtistPaintings: async () => [],
    };
    window.fixture = {
      root,
      pending,
      selected,
      mount: () => mountWikimediaSearch(root, { service, onSelect: (item) => selected.push(item) }),
    };
    window.fixture.module = window.fixture.mount();
    window.fixture.module.open();
  });
  const input = page.locator('#searchQuery');
  await input.fill('first');
  await input.press('Enter');
  await input.fill('second');
  await input.press('Enter');
  await page.evaluate(() => {
    const { pending } = window.fixture;
    pending[1].resolve({
      entities: [{ id: 'Q2', label: 'Current artwork', kindHint: 'painting' }],
      images: [],
      errors: [],
    });
    pending[0].resolve({
      entities: [{ id: 'Q1', label: 'Stale artwork', kindHint: 'painting' }],
      images: [],
      errors: [],
    });
  });
  await expect(page.getByText('Current artwork')).toBeVisible();
  await expect(page.getByText('Stale artwork')).toHaveCount(0);
  await page.getByText('Current artwork').click();
  await page.evaluate(async () => {
    const f = window.fixture;
    f.module.close();
    f.pending[2].resolve({ label: 'Late artwork', imageFilename: 'Late.jpg' });
    await Promise.resolve();
  });
  expect(await page.evaluate(() => window.fixture.selected)).toEqual([]);
  expect(await page.evaluate(() => window.fixture.pending.every((p) => p.signal.aborted))).toBe(
    true,
  );
  await page.evaluate(() => {
    const f = window.fixture;
    f.module.dispose();
    f.module = f.mount();
    f.module.open();
  });
  await input.fill('final');
  await input.press('Enter');
  await page.evaluate(() => {
    window.fixture.pending[3].resolve({
      entities: [],
      images: [{ fileTitle: 'File:Chosen.jpg', thumbnailUrl: null, license: 'Public domain' }],
      errors: [],
    });
  });
  await page.getByRole('button', { name: /Chosen/ }).click();
  expect(await page.evaluate(() => window.fixture.selected.map((item) => item.title))).toEqual([
    'Chosen',
  ]);
  expect(await page.evaluate(() => window.fixture.pending.length)).toBe(4);
});

test('search renders artist works and selects through its public callback', async ({ page }) => {
  await blankPage(page);
  await page.evaluate(async () => {
    const { mountWikimediaSearch } = await import('/src/modules/wikimedia-search/index.ts');
    const root = document.createElement('dialog');
    document.body.append(root);
    window.selectedWorks = [];
    const module = mountWikimediaSearch(root, {
      service: {
        searchAll: async () => ({
          entities: [
            { id: 'Q1', label: 'Fixture artist', kindHint: 'artist', description: 'Painter' },
          ],
          images: [],
          errors: [],
        }),
        getEntity: async () => ({
          id: 'Q1',
          label: 'Fixture artist',
          description: 'Artist biography',
        }),
        getArtistPaintings: async () => [
          {
            id: 'Q2',
            title: 'Fixture painting',
            year: 1900,
            imageUrl: null,
            imageFilename: 'Fixture.jpg',
          },
        ],
      },
      onSelect: (item) => window.selectedWorks.push(item),
    });
    module.open();
  });
  await page.locator('#searchQuery').fill('fixture');
  await page.locator('#searchQuery').press('Enter');
  await page.getByRole('button', { name: /Fixture artist/ }).click();
  await expect(page.locator('#artistWorks')).toContainText('Artist biography');
  await expect(page.locator('#searchQuery')).toHaveValue('Fixture artist');
  await page.getByRole('button', { name: /Fixture painting/ }).click();
  await expect(page.locator('dialog')).not.toBeVisible();
  expect(await page.evaluate(() => window.selectedWorks)).toEqual([
    {
      title: 'Fixture painting',
      artist: 'Fixture artist',
      date: '1900',
      qid: 'Q2',
      filename: 'Fixture.jpg',
    },
  ]);
});

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

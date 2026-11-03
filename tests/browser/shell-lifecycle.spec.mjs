import { test, expect } from '@playwright/test';

test('Preact shell preserves module hosts across updates and cleans up on remount', async ({
  page,
}) => {
  await page.route('**/shell-fixture', (route) =>
    route.fulfill({
      contentType: 'text/html',
      body: '<!doctype html><body><div class="shell"></div></body>',
    }),
  );
  await page.route(/^https:\/\//, (route) => route.abort());
  await page.goto('/shell-fixture');
  await page.evaluate(async () => {
    const { createAppShell } = await import('/src/app/index.ts');
    const root = document.querySelector('.shell');
    const selected = [];
    const mount = () =>
      createAppShell(
        root,
        {},
        {
          featuredDirectImage: () => null,
          resolveFeatured: async () => null,
        },
        { selectPainting: (item) => selected.push(item) },
      );
    const shell = mount();
    // These callbacks must work immediately, before any scheduled Preact rerender.
    shell.selectionStarted({ title: 'Fixture', artist: 'Fixture artist' });
    const image = new ImageData(12, 12);
    for (let i = 0; i < image.data.length; i += 4)
      image.data.set([i % 255, (i * 3) % 255, (i * 7) % 255, 255], i);
    shell.pixelsReady(image);
    window.fixture = {
      shell,
      mount,
      selected,
      image,
      frame: root.querySelector('iframe'),
      gallery: root.querySelector('#paintings'),
      firstCard: root.querySelector('.work'),
    };
  });
  await expect(page.locator('#download-theme')).toBeEnabled();
  await page.locator('[data-template="poster"]').click();
  await expect(page.locator('[data-template="poster"]')).toHaveClass('active');
  await page.locator('#btn-shuffle').click();
  expect(
    await page.evaluate(() => {
      const f = window.fixture;
      return (
        f.frame === document.querySelector('iframe') &&
        f.gallery === document.querySelector('#paintings') &&
        f.firstCard === document.querySelector('.work')
      );
    }),
  ).toBe(true);
  await page.locator('#view-pipeline').click();
  await expect(page.locator('.pipeline-viewer')).toBeVisible();
  await page.evaluate(() => {
    const f = window.fixture;
    f.shell.dispose();
    f.shell.dispose();
    f.shell.pixelsReady(f.image);
  });
  await expect(page.locator('.shell')).toBeEmpty();
  await expect(page.locator('.pipeline-viewer')).toHaveCount(0);
  await page.evaluate(() => {
    window.fixture.shell = window.fixture.mount();
  });
  await expect(page.locator('#download-theme')).toBeDisabled();
  await page.getByRole('button', { name: 'Wikimedia', exact: true }).click();
  await page.locator('#openSearch').click();
  await expect(page.locator('#searchDialog')).toBeVisible();
  await page.locator('#closeSearch').click();
  await page.getByRole('button', { name: 'Selected art', exact: true }).click();
  await page.locator('.work').first().click();
  expect(await page.evaluate(() => window.fixture.selected.length)).toBe(1);
});

test('workflow instances keep state separate and ignore all intents after disposal', async ({
  page,
}) => {
  await page.route('**/controller-fixture', (route) =>
    route.fulfill({ contentType: 'text/html', body: '<!doctype html><body></body>' }),
  );
  await page.goto('/controller-fixture');
  const result = await page.evaluate(async () => {
    const { createController } = await import('/src/app/controller.ts');
    const { createComputation } = await import('/src/computation/client.ts');
    function fixture() {
      const outputs = [];
      let sidebar;
      let shell;
      const controller = createController(
        {
          computation: createComputation(),
          updateSidebar: (state) => {
            sidebar = state;
            outputs.push('sidebar');
          },
          updateShell: (state) => {
            shell = state;
            outputs.push('shell');
          },
          preview: { update: () => outputs.push('preview') },
          pipeline: {
            chapter: 'sample',
            isOpen: false,
            preset: () => outputs.push('preset'),
            open: () => outputs.push('viewer'),
            dispose: () => outputs.push('close'),
          },
          download: () => outputs.push('download'),
        },
        { selectPainting: () => outputs.push('select') },
      );
      return {
        controller,
        outputs,
        state: () => ({
          method: sidebar.method,
          template: shell.template,
          canExport: shell.canExport,
        }),
      };
    }
    const first = fixture();
    const second = fixture();
    first.controller.sidebarActions.changeMethod('octree-auto', 'Octree');
    first.controller.setTemplate('poster');
    const separate = [first.state(), second.state()];
    first.controller.dispose();
    const before = first.outputs.length;
    first.controller.setTemplate('landing');
    first.controller.showImage(null, 'Late image');
    first.controller.selectionStarted({ title: 'Late selection', artist: '' });
    first.controller.pixelsReady(new ImageData(1, 1));
    first.controller.sidebarActions.changeMethod('hue-auto', 'Hue');
    first.controller.sidebarActions.selectPainting({ title: 'Late selection', artist: '' });
    first.controller.sidebarActions.assignRole('accent', 0);
    first.controller.sidebarActions.shuffle();
    first.controller.sidebarActions.openPipeline();
    first.controller.downloadTheme();
    first.controller.changeConfiguration({});
    second.controller.dispose();
    return { separate, ignored: first.outputs.length === before };
  });
  expect(result).toEqual({
    separate: [
      { method: 'octree-auto', template: 'poster', canExport: false },
      { method: 'hue-auto', template: 'landing', canExport: false },
    ],
    ignored: true,
  });
});

test('painting changes retain the previous theme until replacement pixels arrive', async ({
  page,
}) => {
  await page.route('**/transition-fixture', (route) =>
    route.fulfill({
      contentType: 'text/html',
      body: '<!doctype html><body></body>',
    }),
  );
  await page.goto('/transition-fixture');
  const result = await page.evaluate(async () => {
    const { createController } = await import('/src/app/controller.ts');
    const { createComputation } = await import('/src/computation/client.ts');
    let sidebar, shell;
    const themes = [];
    let downloads = 0;
    const controller = createController(
      {
        computation: createComputation(),
        updateSidebar: (value) => (sidebar = value),
        updateShell: (value) => (shell = value),
        preview: {
          update: (value) => {
            if (value.tokens) themes.push(value.tokens);
          },
        },
        pipeline: { dispose() {}, preset() {}, open() {}, chapter: 'sample', isOpen: false },
        download: () => downloads++,
      },
      { selectPainting() {} },
    );
    const pixels = (color) => {
      const data = new ImageData(2, 2);
      for (let i = 0; i < data.data.length; i += 4) data.data.set([...color, 255], i);
      return data;
    };
    controller.selectionStarted({ title: 'First', artist: '', date: '' });
    controller.pixelsReady(pixels([180, 40, 20]));
    while (!shell.canExport) await new Promise((resolve) => setTimeout(resolve, 10));
    const oldPalette = sidebar.palette;
    const oldAssignments = sidebar.assignments;
    const before = themes.length;
    controller.selectionStarted({ title: 'Second', artist: '', date: '' });
    controller.sidebarActions.shuffle();
    controller.sidebarActions.assignRole('accent', 0);
    controller.setTemplate('poster');
    controller.downloadTheme();
    const pending = {
      samePalette: sidebar.palette === oldPalette,
      sameAssignments: sidebar.assignments === oldAssignments,
      noThemeUpdate: themes.length === before,
      canExport: shell.canExport,
      downloads,
    };
    // Rapid replacement must also retain the last completed theme.
    controller.selectionStarted({ title: 'Third', artist: '', date: '' });
    const noReset = themes.length === before;
    controller.pixelsReady(pixels([20, 60, 190]));
    while (!shell.canExport) await new Promise((resolve) => setTimeout(resolve, 10));
    const ready = {
      newPalette: sidebar.palette !== oldPalette,
      updates: themes.length - before,
      canExport: shell.canExport,
      pending: sidebar.palettePending,
    };
    controller.dispose();
    return { pending, noReset, ready };
  });
  expect(result).toEqual({
    pending: {
      samePalette: true,
      sameAssignments: true,
      noThemeUpdate: true,
      canExport: false,
      downloads: 0,
    },
    noReset: true,
    ready: { newPalette: true, updates: 1, canExport: true, pending: false },
  });
});

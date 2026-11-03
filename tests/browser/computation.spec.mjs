import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.route('**/worker-fixture', (route) =>
    route.fulfill({
      contentType: 'text/html',
      body: '<!doctype html><body></body>',
    }),
  );
  await page.goto('/worker-fixture');
});

test('worker matches synchronous extraction and theme mapping for every preset', async ({
  page,
}) => {
  const result = await page.evaluate(async () => {
    const { createComputation } = await import('/src/computation/client.ts');
    const { extractPalette } = await import('/src/palette.service.ts');
    const { PRESET_IDS } = await import('/src/extraction/presets.ts');
    const { buildPaletteTheme } = await import('/src/theme/pipeline.ts');
    const { TEMPLATE_USAGE } = await import('/src/theme/validation.ts');
    const image = new ImageData(24, 24);
    for (let i = 0; i < image.data.length; i += 4)
      image.data.set([(i * 17) % 251, (i * 7) % 253, (i * 31) % 255, 255], i);
    const client = createComputation();
    const matches = [];
    for (const method of PRESET_IDS) {
      const result = await client.run({
        kind: 'extract',
        image,
        options: { method },
        template: 'landing',
      });
      const expected = extractPalette(image, { method }, { captureVisuals: true });
      const normalize = (value) => JSON.stringify({ ...value, runId: 'comparison' });
      matches.push({
        method,
        extraction: normalize(result.palette) === normalize(expected),
        theme: JSON.stringify(result.mapping) === JSON.stringify(buildPaletteTheme(expected)),
      });
    }
    const last = await client.run({ kind: 'extract', image, options: {}, template: 'landing' });
    const assignments = { ...last.mapping.theme.assignments };
    [assignments.bg, assignments.accent] = [assignments.accent, assignments.bg];
    const remapped = await client.run({
      kind: 'map',
      palette: { swatches: last.palette.swatches },
      template: 'poster',
      assignments,
    });
    const mappingMatches =
      JSON.stringify(remapped.mapping) ===
      JSON.stringify(buildPaletteTheme(last.palette, TEMPLATE_USAGE.poster, {}, assignments));
    const pixelsRetained = image.data.byteLength === 24 * 24 * 4;
    let error = '';
    try {
      await client.run({
        kind: 'extract',
        image: new ImageData(1, 1),
        options: {},
        template: 'landing',
      });
    } catch (failure) {
      error = failure.message;
    }
    const recovered = await client.run({
      kind: 'extract',
      image,
      options: {},
      template: 'landing',
    });
    client.dispose();
    return { matches, mappingMatches, pixelsRetained, error, recovered: !!recovered.palette };
  });
  expect(result.matches).toHaveLength(6);
  for (const entry of result.matches)
    expect(entry, entry.method).toMatchObject({ extraction: true, theme: true });
  expect(result).toMatchObject({ mappingMatches: true, pixelsRetained: true, recovered: true });
  expect(result.error).toContain('No opaque pixels');
});

test('replacement terminates busy workers and ignores their late messages', async ({ page }) => {
  const result = await page.evaluate(async () => {
    const { createComputation } = await import('/src/computation/client.ts');
    const workers = [];
    const client = createComputation(() => {
      const worker = {
        terminate() {
          this.terminated = true;
        },
        postMessage(request) {
          this.request = request;
        },
      };
      workers.push(worker);
      return worker;
    });
    const input = { kind: 'map', palette: { swatches: [] }, template: 'landing' };
    const first = client.run(input).catch((error) => error.name);
    const second = client.run(input);
    workers[0].onmessage({ data: { id: workers[0].request.id, result: { stale: true } } });
    workers[1].onmessage({ data: { id: workers[1].request.id, result: { fresh: true } } });
    const accepted = await second;
    const third = client.run(input).catch((error) => error.name);
    client.dispose();
    const afterDisposal = await client.run(input).catch((error) => error.name);
    return {
      first: await first,
      accepted,
      third: await third,
      afterDisposal,
      terminated: workers.every((worker) => worker.terminated),
      count: workers.length,
    };
  });
  expect(result).toEqual({
    first: 'AbortError',
    accepted: { fresh: true },
    third: 'AbortError',
    afterDisposal: 'AbortError',
    terminated: true,
    count: 2,
  });
});

test('animation frames advance while expensive extraction runs in a real worker', async ({
  page,
}) => {
  const result = await page.evaluate(async () => {
    const { createComputation } = await import('/src/computation/client.ts');
    const { presetConfig } = await import('/src/extraction/presets.ts');
    const client = createComputation();
    const image = new ImageData(260, 260);
    let seed = 123;
    for (let i = 0; i < image.data.length; i += 4) {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      image.data.set([seed & 255, (seed >>> 8) & 255, (seed >>> 16) & 255, 255], i);
    }
    // Warm the worker so frame advancement cannot be attributed only to startup.
    await client.run({
      kind: 'extract',
      image,
      options: { method: 'hue-auto' },
      template: 'landing',
    });
    const element = document.createElement('div');
    document.body.append(element);
    const animation = element.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 10000 });
    let frames = 0;
    let active = true;
    function frame() {
      if (active) {
        frames++;
        requestAnimationFrame(frame);
      }
    }
    requestAnimationFrame(frame);
    const started = performance.now();
    const result = await client.run({
      kind: 'extract',
      image,
      template: 'landing',
      options: {
        configuration: {
          ...presetConfig('medoids-dominance'),
          quantization: { kind: 'medoids', candidates: 24, maxSamples: 1000, iterations: 30 },
        },
      },
    });
    const elapsed = performance.now() - started;
    active = false;
    const animationTime = animation.currentTime;
    animation.cancel();
    client.dispose();
    return { frames, elapsed, animationTime, colors: result.palette.colors.length };
  });
  expect(result.frames).toBeGreaterThan(1);
  expect(result.animationTime).toBeGreaterThan(0);
  expect(result.colors).toBeGreaterThan(0);
  console.log('Worker responsiveness:', result);
});

test('controller rejects stale results, remaps for current template and recovers after errors', async ({
  page,
}) => {
  const result = await page.evaluate(async () => {
    const { createController } = await import('/src/app/controller.ts');
    const { extractPalette } = await import('/src/palette.service.ts');
    const { buildPaletteTheme } = await import('/src/theme/pipeline.ts');
    const { presetConfig } = await import('/src/extraction/presets.ts');
    const image = new ImageData(new Uint8ClampedArray([180, 50, 20, 255]), 1, 1);
    const palette = extractPalette(image);
    const completed = { palette, mapping: buildPaletteTheme(palette) };
    const requests = [];
    let sidebar,
      shell,
      opens = 0,
      disposed = false;
    const viewer = {
      chapter: 'sample',
      isOpen: false,
      preset() {},
      open(_data, _image, chapter) {
        this.isOpen = true;
        this.chapter = chapter;
        opens++;
      },
      dispose() {
        this.isOpen = false;
      },
    };
    const controller = createController(
      {
        computation: {
          run(input) {
            return new Promise((resolve, reject) => requests.push({ input, resolve, reject }));
          },
          cancel() {}, // Deliberately deliver late replies to exercise controller guards.
          dispose() {
            disposed = true;
          },
        },
        updateSidebar: (value) => (sidebar = value),
        updateShell: (value) => (shell = value),
        preview: { update() {} },
        pipeline: viewer,
        download() {},
      },
      { selectPainting() {} },
    );
    const flush = async () => {
      await Promise.resolve();
      await Promise.resolve();
    };
    controller.selectionStarted({ title: 'First', artist: '', date: '' });
    controller.pixelsReady(image);
    controller.selectionStarted({ title: 'Second', artist: '', date: '' });
    controller.pixelsReady(image);
    requests[0].resolve(completed);
    await flush();
    const staleIgnored = sidebar.palette === null && !shell.canExport;
    controller.setTemplate('poster');
    requests[1].resolve(completed);
    await flush();
    const remapped = requests[2].input.kind === 'map' && requests[2].input.template === 'poster';
    requests[2].resolve({ mapping: completed.mapping });
    await flush();
    const ready = shell.canExport && sidebar.selection.title === 'Second';
    controller.sidebarActions.openPipeline();
    controller.changeConfiguration(presetConfig('hue-auto'));
    viewer.chapter = 'theme';
    requests[3].resolve(completed);
    await flush();
    const chapterPreserved = viewer.chapter === 'theme';
    controller.changeConfiguration(presetConfig('octree-auto'));
    viewer.dispose();
    const before = opens;
    requests[4].resolve(completed);
    await flush();
    const stayedClosed = !viewer.isOpen && opens === before;
    const previous = sidebar.palette;
    controller.sidebarActions.changeMethod('medoids-dominance', 'Medoids');
    requests[5].reject(new Error('Worker unavailable'));
    await flush();
    const failure =
      sidebar.palette === previous &&
      sidebar.error.includes('Worker unavailable') &&
      !shell.canExport;
    controller.sidebarActions.changeMethod('hue-auto', 'Hue');
    requests[6].resolve(completed);
    await flush();
    const recovered = shell.canExport && !sidebar.error;
    controller.sidebarActions.changeMethod('octree-auto', 'Octree');
    controller.dispose();
    const snapshot = sidebar;
    requests[7].resolve(completed);
    await flush();
    return {
      staleIgnored,
      remapped,
      ready,
      chapterPreserved,
      stayedClosed,
      failure,
      recovered,
      disposed,
      ignoredAfterDispose: sidebar === snapshot,
    };
  });
  expect(Object.values(result)).toEqual(Array(9).fill(true));
});

test('worker startup and runtime failures reject and allow retry', async ({ page }) => {
  const result = await page.evaluate(async () => {
    const { createComputation } = await import('/src/computation/client.ts');
    let attempts = 0,
      worker;
    const client = createComputation(() => {
      if (++attempts === 1) throw new Error('Worker blocked');
      worker = {
        postMessage(request) {
          this.request = request;
        },
        terminate() {},
      };
      return worker;
    });
    const input = { kind: 'map', palette: { swatches: [] }, template: 'landing' };
    const startup = await client.run(input).catch((error) => error.message);
    const failed = client.run(input).catch((error) => error.message);
    worker.onerror({ preventDefault() {}, message: 'Worker crashed' });
    const runtime = await failed;
    const retried = client.run(input);
    worker.onmessage({ data: { id: worker.request.id, result: { recovered: true } } });
    const recovered = (await retried).recovered;
    client.dispose();
    return { startup, runtime, recovered, attempts };
  });
  expect(result).toEqual({
    startup: 'Worker blocked',
    runtime: 'Worker crashed',
    recovered: true,
    attempts: 3,
  });
});

import assert from 'node:assert/strict';
import test from 'node:test';
import { createImageSelection } from '../.cache/tests/image-selection.js';
import { createArtworkSources } from '../.cache/tests/artwork-sources.js';
import { FEATURED_UPLOAD_IMAGES } from '../.cache/tests/featured-images.js';

const pixels = { width: 1, height: 1, data: new Uint8ClampedArray([255, 0, 0, 255]) };
const painting = (title = 'A') => ({
  title,
  artist: 'Artist',
  date: '',
  imageUrl: `https://example.test/${title}`,
});
function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}
function setup(overrides = {}) {
  const events = [];
  const service = {
    resolveArtworkImage: async () => null,
    readImagePixelsViaImageTag: async () => pixels,
    fetchArtworkImage: async () => {
      throw new Error('fetch unavailable');
    },
    ...overrides,
  };
  const sources = createArtworkSources(service);
  const view = Object.fromEntries(
    ['selectionStarted', 'showImage', 'pixelsReady', 'selectionFailed'].map((name) => [
      name,
      (...args) => events.push([name, ...args]),
    ]),
  );
  return { events, sources, controller: createImageSelection(service, sources, view) };
}
const emitted = (events, name) => events.filter((event) => event[0] === name);

test('displays the direct image synchronously and preserves it when pixel access fails', async () => {
  const pending = deferred();
  const { controller, events } = setup({ readImagePixelsViaImageTag: () => pending.promise });
  const work = controller.selectPainting(painting());
  assert.equal(emitted(events, 'showImage')[0][1], painting().imageUrl);
  assert.equal(emitted(events, 'pixelsReady').length, 0);
  pending.reject(new Error('CORS blocked'));
  await work;
  assert.match(emitted(events, 'selectionFailed')[0][1], /CORS blocked; fetch unavailable/);
  assert.equal(emitted(events, 'showImage').length, 1);
  assert.equal(emitted(events, 'pixelsReady').length, 0);
});

test('cancels the earlier selection and ignores late pixels', async () => {
  const pending = deferred();
  let oldSignal;
  const { controller, events } = setup({
    readImagePixelsViaImageTag: (url, { signal }) => {
      if (url.endsWith('/A')) {
        oldSignal = signal;
        return pending.promise;
      }
      return Promise.resolve(pixels);
    },
  });
  const first = controller.selectPainting(painting());
  await controller.selectPainting(painting('B'));
  assert.equal(oldSignal.aborted, true);
  pending.resolve({ ...pixels, width: 2 });
  await first;
  assert.deepEqual(emitted(events, 'pixelsReady'), [['pixelsReady', pixels]]);
});

test('ignores metadata from an earlier selection', async () => {
  const pending = deferred();
  const { controller, events } = setup({ resolveArtworkImage: () => pending.promise });
  const first = controller.selectPainting({ ...painting(), imageUrl: undefined });
  await controller.selectPainting(painting('B'));
  pending.resolve({ thumbnailUrl: 'https://example.test/stale' });
  await first;
  assert.equal(emitted(events, 'showImage').at(-1)[1], painting('B').imageUrl);
});

test('tries the alternate Wikimedia image before fetch', async () => {
  const [key, alternate] = Object.entries(FEATURED_UPLOAD_IMAGES)[0];
  const calls = [];
  const { controller, events } = setup({
    readImagePixelsViaImageTag: async (url) => {
      calls.push(url);
      if (url === alternate) return pixels;
      throw new Error('primary blocked');
    },
    fetchArtworkImage: async () => assert.fail('fetch should not be needed'),
  });
  await controller.selectPainting({ ...painting(), wikipediaTitle: key });
  assert.deepEqual(calls, [painting().imageUrl, alternate]);
  assert.equal(emitted(events, 'pixelsReady').length, 1);
});

test('releases fetched object URLs on replacement and disposal', async () => {
  let disposed = 0;
  const { controller } = setup({
    readImagePixelsViaImageTag: async () => {
      throw new Error('blocked');
    },
    fetchArtworkImage: async () => ({
      displayUrl: 'blob:art',
      imageData: pixels,
      dispose: () => disposed++,
    }),
  });
  await controller.selectPainting(painting());
  assert.equal(disposed, 0);
  await controller.selectPainting(painting('B'));
  assert.equal(disposed, 1);
  controller.dispose();
  controller.dispose();
  assert.equal(disposed, 2);
});

test('releases a fetched image that completes after cancellation', async () => {
  const pending = deferred();
  const started = deferred();
  let disposed = 0;
  const { controller, events } = setup({
    readImagePixelsViaImageTag: async () => {
      throw new Error('blocked');
    },
    fetchArtworkImage: () => {
      started.resolve();
      return pending.promise;
    },
  });
  const work = controller.selectPainting(painting());
  await started.promise;
  controller.dispose();
  pending.resolve({ displayUrl: 'blob:stale', imageData: pixels, dispose: () => disposed++ });
  await work;
  assert.equal(disposed, 1);
  assert.equal(emitted(events, 'pixelsReady').length, 0);
});

test('reports missing artwork and recovers on a later selection', async () => {
  const { controller, events } = setup();
  await controller.selectPainting({ ...painting(), imageUrl: undefined });
  assert.match(emitted(events, 'selectionFailed')[0][1], /No Wikimedia image found/);
  await controller.selectPainting(painting('B'));
  assert.deepEqual(emitted(events, 'pixelsReady'), [['pixelsReady', pixels]]);
});

test('reports lookup failures through the selection view', async () => {
  const { controller, events } = setup({
    resolveArtworkImage: () => {
      throw new Error('Lookup unavailable');
    },
  });
  await controller.selectPainting({ ...painting(), imageUrl: undefined });
  assert.match(
    emitted(events, 'selectionFailed')[0][1],
    /Commons lookup failed: Lookup unavailable/,
  );
});

for (const stage of ['metadata', 'pixels', 'fetch']) {
  for (const finish of ['replacement', 'disposal']) {
    test(`ignores late ${stage} failure after ${finish}`, async () => {
      const pending = deferred();
      const started = deferred();
      let oldSignal;
      const { controller, events } = setup({
        resolveArtworkImage: (_item, { signal }) => {
          oldSignal = signal;
          started.resolve();
          return pending.promise;
        },
        readImagePixelsViaImageTag: (url, { signal }) => {
          if (url.endsWith('/B')) return Promise.resolve(pixels);
          oldSignal = signal;
          if (stage === 'fetch') return Promise.reject(new Error('Try fetch'));
          started.resolve();
          return pending.promise;
        },
        fetchArtworkImage: () => {
          started.resolve();
          return pending.promise;
        },
      });
      const first = controller.selectPainting({
        ...painting(),
        ...(stage === 'metadata' ? { imageUrl: undefined } : {}),
      });
      await started.promise;
      if (finish === 'replacement') await controller.selectPainting(painting('B'));
      else controller.dispose();
      assert.equal(oldSignal.aborted, true);
      pending.reject(new Error('Late failure'));
      await first;
      assert.deepEqual(emitted(events, 'selectionFailed'), []);
      assert.equal(emitted(events, 'pixelsReady').length, finish === 'replacement' ? 1 : 0);
      if (finish === 'disposal') {
        const previous = events.length;
        await controller.selectPainting(painting('C'));
        assert.equal(events.length, previous);
      }
    });
  }
}

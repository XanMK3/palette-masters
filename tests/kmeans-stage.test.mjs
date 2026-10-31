import assert from 'node:assert/strict';
import test from 'node:test';
import { quantizeKMeans } from '../.cache/tests/extraction/quantizers/kmeans.js';
import { rgbToOklab, oklabToRgb } from '../.cache/tests/extraction/color-math.js';
import { extractPalette } from './fixtures/extraction.mjs';
const sample = (id, rgb, area = 1, influence = area) => ({
  id,
  rgb,
  representedArea: area,
  influence,
  derivationId: `${id}:source`,
});
const config = (space = 'rgb', candidates = 2, iterations = 12) => ({
  kind: 'kmeans',
  space,
  candidates,
  iterations,
});

test('weighted means use influence while physical area is accounted independently', () => {
  const input = [sample('a', [0, 0, 0], 90, 1), sample('b', [200, 100, 50], 10, 3)];
  const result = quantizeKMeans(input, config('rgb', 1));
  assert.deepEqual(result.candidates[0].rgb, [150, 75, 38]);
  assert.equal(result.candidates[0].representedArea, 100);
  assert.equal(result.candidates[0].influence, 4);
  assert.equal(result.candidates[0].originalSampleId, undefined);
  const proof = result.derivations[0].inputs[0];
  const table = result.memberships.find((t) => t.id === proof.tableId);
  const group = table.groups.find((g) => g.id === proof.groupId);
  assert.deepEqual(table.memberIds.slice(group.start, group.start + group.length), ['a', 'b']);
});

test('Oklab averages use weighted perceptual coordinates rather than RGB arithmetic means', () => {
  const input = [sample('a', [0, 0, 0], 1), sample('b', [255, 255, 255], 3)];
  const labs = input.map((s) => rgbToOklab(s.rgb));
  const expected = oklabToRgb(labs[0].map((v, i) => (v + labs[1][i] * 3) / 4));
  const result = quantizeKMeans(input, config('oklab', 1));
  assert.deepEqual(result.candidates[0].rgb, expected);
  assert.notDeepEqual(result.candidates[0].rgb, [191, 191, 191]);
});

test('duplicate colors do not create duplicate seeds; zero-influence pixels still have area', () => {
  const input = [
    sample('a', [10, 20, 30], 5, 1),
    sample('b', [10, 20, 30], 2, 1),
    sample('c', [255, 255, 255], 3, 0),
  ];
  const result = quantizeKMeans(input, config('rgb', 6));
  assert.equal(result.candidates.length, 1);
  assert.deepEqual(result.candidates[0].rgb, [10, 20, 30]);
  assert.equal(result.candidates[0].representedArea, 10);
  assert.equal(result.candidates[0].influence, 2);
  assert.deepEqual(quantizeKMeans([], config()).candidates, []);
});

test('K-means rejects invalid contracts and respects cancellation', () => {
  const a = sample('a', [10, 20, 30]);
  assert.throws(() => quantizeKMeans([a, a], config()), /unique/);
  assert.throws(() => quantizeKMeans([sample('a', [1, 2, 3], 1, -1)], config()), /influence/);
  assert.throws(() => quantizeKMeans([sample('a', [1, 2, 3], 1, 0)], config()), /positive fitting/);
  assert.throws(() => quantizeKMeans([a], config('rgb', 0)), /positive/);
  assert.throws(() => quantizeKMeans([a], config('rgb', 2, 0)), /positive/);
  const controller = new AbortController();
  controller.abort();
  assert.throws(() => quantizeKMeans([a], config(), { signal: controller.signal }), {
    name: 'AbortError',
  });
});

test('application adapter exposes candidate provenance and respects final short sampling-block area', () => {
  const data = new Uint8ClampedArray(4001 * 4);
  for (let p = 0; p < 4001; p++) data.set([p % 256, (p * 7) % 256, (p * 13) % 256, 255], p * 4);
  for (const method of ['kmeans', 'oklab-kmeans']) {
    const result = extractPalette({ width: 4001, height: 1, data }, { method });
    assert.equal(result.originalSamples.samples.at(-1).representedArea, 1);
    assert.equal(
      result.quantization.candidates.reduce((sum, c) => sum + c.representedArea, 0),
      4001,
    );
    assert.ok(result.quantization.derivations.length > 0);
  }
});

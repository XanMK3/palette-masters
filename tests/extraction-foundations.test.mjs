import assert from 'node:assert/strict';
import test from 'node:test';
import {
  rgbToHex,
  hexToRgb,
  rgbToOklab,
  oklabToRgb,
  contrastRatio,
  relativeLuminance,
} from '../.cache/tests/extraction/color-math.js';
import { extractPalette } from './fixtures/extraction.mjs';
import { sampleOriginalPixels } from '../.cache/tests/extraction/sampling/original-samples.js';
import { createRunManager } from '../.cache/tests/extraction/run.js';

function raster(width, height, pixel) {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let p = 0; p < width * height; p++) data.set(pixel(p), p * 4);
  return { width, height, data };
}
const fixture = () =>
  raster(4, 3, (p) => [p * 13, 255 - p * 7, p * 3, [0, 3, 11].includes(p) ? 0 : 255]);

test('shared color math retains physical endpoints and reversible sRGB/Oklab conversions', () => {
  assert.equal(relativeLuminance([0, 0, 0]), 0);
  assert.equal(relativeLuminance([255, 255, 255]), 1);
  assert.equal(contrastRatio('#000000', '#FFFFFF'), 21);
  for (const rgb of [
    [0, 0, 0],
    [255, 255, 255],
    [255, 0, 0],
    [0, 255, 0],
    [0, 0, 255],
    [35, 77, 129],
    [100, 101, 102],
  ]) {
    assert.deepEqual(hexToRgb(rgbToHex(rgb)), rgb);
    const restored = oklabToRgb(rgbToOklab(rgb));
    assert.ok(restored.every((v, i) => Math.abs(v - rgb[i]) <= 1));
  }
  assert.throws(() => hexToRgb('not-a-color'), TypeError);
});

test('sampling records source coordinates, eligible blocks, independent weights and conserved area', () => {
  const image = fixture(),
    before = image.data.slice();
  const config = { maxSamples: 4, alphaThreshold: 192 };
  const result = sampleOriginalPixels(image, config);
  assert.deepEqual(
    result.samples.map((s) => s.source.pixelIndex),
    [1, 5, 8],
  );
  assert.deepEqual(
    result.samples.map((s) => s.source),
    [
      { pixelIndex: 1, x: 1, y: 0 },
      { pixelIndex: 5, x: 1, y: 1 },
      { pixelIndex: 8, x: 0, y: 2 },
    ],
  );
  assert.deepEqual(
    result.samples.map((s) => s.eligibleRange),
    [
      { start: 0, count: 3 },
      { start: 3, count: 3 },
      { start: 6, count: 3 },
    ],
  );
  assert.deepEqual(result.stats, {
    totalPixels: 12,
    eligiblePixels: 9,
    excludedAlphaPixels: 3,
    unsampledEligiblePixels: 6,
    sampledPixels: 3,
    representedArea: 9,
  });
  assert.equal(
    result.samples.reduce((n, s) => n + s.representedArea, 0),
    result.stats.eligiblePixels,
  );
  for (const sample of result.samples) {
    assert.equal(sample.influence, sample.representedArea);
    assert.deepEqual(sample.rgb, [
      ...image.data.slice(sample.source.pixelIndex * 4, sample.source.pixelIndex * 4 + 3),
    ]);
  }
  assert.deepEqual(image.data, before);
  config.maxSamples = 1;
  assert.equal(result.config.maxSamples, 4);
  image.data.fill(0);
  assert.deepEqual(result.samples[0].rgb, [13, 248, 3]);
});

test('last sampling block carries only its remaining eligible area; IDs survive budget changes', () => {
  const image = raster(10, 1, (p) => [p, p, p, 255]);
  const sparse = sampleOriginalPixels(image, { maxSamples: 4, alphaThreshold: 192 });
  assert.deepEqual(
    sparse.samples.map((s) => s.representedArea),
    [3, 3, 3, 1],
  );
  const full = sampleOriginalPixels(image);
  for (const sample of sparse.samples)
    assert.equal(sample.id, full.samples[sample.source.pixelIndex].id);
});

test('large sparse-alpha images retain their opaque color instead of missing it through raster stride', () => {
  const image = raster(101, 101, (p) => (p === 101 ? [24, 64, 128, 192] : [255, 0, 255, 0]));
  const samples = sampleOriginalPixels(image);
  assert.equal(samples.samples.length, 1);
  assert.equal(samples.samples[0].source.pixelIndex, 101);
  assert.equal(samples.stats.representedArea, 1);
  assert.deepEqual(extractPalette(image).colors, ['#184080']);
});

test('fully transparent samples have explicit zero-area accounting; extraction still rejects them', () => {
  const image = raster(3, 2, () => [20, 30, 40, 0]);
  const result = sampleOriginalPixels(image);
  assert.deepEqual(result.samples, []);
  assert.equal(result.stats.eligiblePixels, 0);
  assert.equal(result.stats.excludedAlphaPixels, 6);
  assert.throws(() => extractPalette(image), /opaque/);
});

test('raster and sampling contracts reject invalid inputs and distinguish alpha boundaries', () => {
  for (const image of [
    { width: 0, height: 1, data: new Uint8ClampedArray(4) },
    { width: 1.5, height: 1, data: new Uint8ClampedArray(8) },
    { width: 2, height: 2, data: new Uint8ClampedArray(4) },
  ])
    assert.throws(() => sampleOriginalPixels(image), /ImageData/);
  const image = raster(2, 1, (p) => [0, 0, 0, 191 + p]);
  assert.equal(sampleOriginalPixels(image).samples[0].source.pixelIndex, 1);
  for (const maxSamples of [0, -1, 1.5, NaN, Infinity])
    assert.throws(() => sampleOriginalPixels(image, { maxSamples, alphaThreshold: 192 }), /budget/);
  for (const alphaThreshold of [0, -1, 256, 192.5, NaN])
    assert.throws(
      () => sampleOriginalPixels(image, { maxSamples: 4, alphaThreshold }),
      /threshold/,
    );
});

test('new runs cancel predecessors; cancelled or superseded handles cannot commit', async () => {
  const manager = createRunManager('test-owner');
  const first = manager.start({ inputFingerprint: 'a', algorithmVersion: 'sampling-v1' });
  const second = manager.start({
    inputFingerprint: 'b',
    algorithmVersion: 'sampling-v1',
  });
  assert.equal(first.isCurrent(), false);
  assert.equal(first.signal.aborted, true);
  assert.throws(() => first.assertCurrent(), { name: 'AbortError' });
  assert.equal(second.isCurrent(), true);
  assert.equal('trace' in second, false);
  let committed = false;
  await Promise.resolve().then(() => {
    if (first.isCurrent()) committed = true;
  });
  assert.equal(committed, false);
  assert.throws(() => sampleOriginalPixels(fixture(), undefined, first), { name: 'AbortError' });
  manager.cancel();
  assert.equal(second.isCurrent(), false);
  assert.throws(() => second.assertCurrent(), { name: 'AbortError' });
  const third = manager.start({ inputFingerprint: 'c', algorithmVersion: 'sampling-v1' });
  assert.notEqual(second.metadata.runId, third.metadata.runId);
  assert.equal(third.isCurrent(), true);
  assert.throws(
    () => manager.start({ inputFingerprint: '', algorithmVersion: 'sampling-v1' }),
    /required/,
  );
  assert.equal(third.isCurrent(), true, 'invalid run does not cancel a valid current run');
});

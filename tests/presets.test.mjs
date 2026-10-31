import test from 'node:test';
import assert from 'node:assert/strict';
import { PRESET_IDS, presetVariants } from '../.cache/tests/extraction/presets.js';
import { extractPalette } from '../.cache/tests/palette.service.js';
import { extractPipeline } from '../.cache/tests/extraction/pipeline.js';
import { compareQuality, paletteQuality } from '../.cache/tests/theme/quality.js';
const image = {
  width: 32,
  height: 16,
  data: Uint8ClampedArray.from({ length: 32 * 16 * 4 }, (_, i) =>
    i % 4 === 3 ? 255 : (Math.floor(i / 4) * [13, 31, 71][i % 4]) % 256,
  ),
};
test('three automatic presets evaluate both selectors and retain the winning pipeline', () => {
  assert.deepEqual(
    [...PRESET_IDS],
    [
      'hue-auto',
      'oklab-kmeans-auto',
      'octree-auto',
      'slic-samples-farthest',
      'medoids-dominance',
      'edge-medoids-farthest',
    ],
  );
  for (const method of PRESET_IDS.slice(0, 3))
    for (const count of [5, 6]) {
      const variants = presetVariants(method, count);
      assert.deepEqual(
        variants.map((c) => c.selection.kind),
        method === 'hue-auto'
          ? ['lightness', 'dominance-separated']
          : ['dominance-separated', 'farthest-point'],
      );
      assert.ok(variants.every((c) => c.preprocessing.kind === 'none'));
      if (method === 'hue-auto') assert.equal(variants[0].strategy.kind, 'stratified');
      const result = extractPalette(image, { method, count }, { captureVisuals: true });
      const candidates = variants.map((c) => extractPipeline(image, c));
      const scores = candidates.map(paletteQuality);
      const winner = compareQuality(scores[1], scores[0]) < 0 ? 1 : 0;
      assert.equal(result.autoSelection.winner, winner);
      assert.deepEqual(result.swatches, candidates[winner].swatches);
      assert.deepEqual(
        result.autoSelection.alternatives.map((a) => a.score),
        scores,
      );
      assert.ok(result.visual);
      assert.deepEqual(
        extractPalette(image, { method, count }).autoSelection,
        result.autoSelection,
      );
    }
});
test('readability outranks all lower priority metrics and ties are stable', () => {
  assert.ok(compareQuality([0, 100, 100, 100], [1, 0, 0, 0]) < 0);
  assert.equal(compareQuality([0, 0, 0, 0], [0, 0, 0, 0]), 0);
  const configuration = presetVariants('octree-auto')[1];
  assert.equal(extractPalette(image, { configuration }).autoSelection, undefined);
});

test('fixed presets retain their exact recipes without automatic comparison', () => {
  for (const [method, preprocessing, quantization, selection] of [
    ['slic-samples-farthest', 'slic', 'original-samples', 'farthest-point'],
    ['medoids-dominance', 'none', 'medoids', 'dominance-separated'],
    ['edge-medoids-farthest', 'edge-weighted', 'medoids', 'farthest-point'],
  ])
    for (const count of [5, 6]) {
      const variants = presetVariants(method, count);
      assert.equal(variants.length, 1);
      const config = variants[0];
      assert.deepEqual(
        [config.preprocessing.kind, config.quantization.kind, config.selection.kind],
        [preprocessing, quantization, selection],
      );
      const result = extractPalette(image, { method, count });
      assert.equal(result.autoSelection, undefined);
      assert.deepEqual(result.swatches, extractPipeline(image, config).swatches);
    }
});

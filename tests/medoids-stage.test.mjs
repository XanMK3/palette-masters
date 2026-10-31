import assert from 'node:assert/strict';
import test from 'node:test';
import { quantizeMedoids } from '../.cache/tests/extraction/quantizers/medoids.js';
import { rgbToOklab } from '../.cache/tests/extraction/color-math.js';
import { extractPalette } from './fixtures/extraction.mjs';
const sample = (id, value, influence = 1, representedArea = 1) => ({
  id,
  rgb: [value, value, value],
  influence,
  representedArea,
  derivationId: `${id}:source`,
  originalSampleId: id,
});
const config = (candidates = 1, maxSamples = 600, iterations = 20) => ({
  kind: 'medoids',
  candidates,
  maxSamples,
  iterations,
});
const dist = (a, b) => Math.hypot(...rgbToOklab(a).map((v, i) => v - rgbToOklab(b)[i]));

test('medoid replacement minimizes weighted distances, retaining original identity and full area', () => {
  const input = [sample('dark', 0, 4, 90), sample('middle', 100, 3, 2), sample('light', 255, 3, 8)];
  const result = quantizeMedoids(input, config());
  const c = result.candidates[0];
  assert.equal(c.originalSampleId, 'middle');
  assert.deepEqual(c.rgb, input[1].rgb);
  assert.equal(c.representedArea, 100);
  assert.equal(c.influence, 10);
  assert.deepEqual(result.derivations[0].inputs, [{ kind: 'entity', id: 'middle' }]);
  assert.deepEqual(
    result.memberships[0].memberIds,
    input.map((s) => s.id),
  );
  const objective = (candidate) =>
    input.reduce((sum, sample) => sum + sample.influence * dist(sample.rgb, candidate.rgb), 0);
  assert.ok(input.every((candidate) => objective(c) <= objective(candidate) + 1e-12));
});

test('bounded representative pool still fits and accounts for every input, including zero influence', () => {
  const input = [
    sample('a', 0),
    sample('b', 255, 100, 50),
    sample('c', 255),
    sample('d', 255),
    sample('z', 128, 0, 20),
  ];
  const result = quantizeMedoids(input, config(1, 2));
  assert.equal(result.candidates[0].originalSampleId, 'c');
  assert.equal(result.candidates[0].influence, 103);
  assert.equal(result.candidates[0].representedArea, 73);
  assert.equal(result.memberships[0].memberIds.length, 5);
});

test('ties retain representatives, duplicates yield fewer candidates, and averages make no original claim', () => {
  const input = [sample('a', 100), sample('b', 100), sample('z', 255, 0)];
  delete input[0].originalSampleId;
  const result = quantizeMedoids(input, config(6));
  assert.equal(result.candidates.length, 1);
  assert.equal(result.candidates[0].originalSampleId, undefined);
  assert.equal(result.candidates[0].representedArea, 3);
  const tied = quantizeMedoids([sample('a', 0), sample('b', 255)], config());
  assert.equal(tied.candidates[0].originalSampleId, 'a');
  assert.deepEqual(quantizeMedoids([], config()).candidates, []);
});

test('medoids reject invalid contracts and respect cancellation', () => {
  const a = sample('a', 10);
  for (const invalid of [config(0), config(1, 0), config(1, 2, 0)])
    assert.throws(() => quantizeMedoids([a], invalid), /positive/);
  assert.throws(() => quantizeMedoids([a, a], config()), /unique/);
  assert.throws(() => quantizeMedoids([sample('z', 10, 0)], config()), /positive fitting/);
  assert.throws(() => quantizeMedoids([sample('z', 10, -1)], config()), /influence/);
  assert.throws(() => quantizeMedoids([sample('z', 256)], config()), /byte/);
  const controller = new AbortController();
  controller.abort();
  assert.throws(() => quantizeMedoids([a], config(), { signal: controller.signal }), {
    name: 'AbortError',
  });
});

test('direct medoid preset exposes original provenance and full sampled area in both palette sizes', () => {
  const data = new Uint8ClampedArray(4001 * 4);
  for (let i = 0; i < 4001; i++)
    data.set([(i % 3) * 100, (i % 3) * 100, (i % 3) * 100, 255], i * 4);
  for (const count of [5, 6]) {
    const result = extractPalette(
      { width: 4001, height: 1, data },
      { method: 'oklab-kmedoids', count },
    );
    assert.equal(
      result.quantization.candidates.reduce((sum, c) => sum + c.representedArea, 0),
      4001,
    );
    for (const candidate of result.quantization.candidates) {
      const original = result.originalSamples.samples.find(
        (s) => s.id === candidate.originalSampleId,
      );
      assert.deepEqual(candidate.rgb, original.rgb);
    }
  }
});

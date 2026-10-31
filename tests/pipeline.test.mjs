import test from 'node:test';
import assert from 'node:assert/strict';
import { extractPalette } from './fixtures/extraction.mjs';
import { PRESET_IDS } from '../.cache/tests/extraction/presets.js';
import { presetConfig } from './fixtures/extraction.mjs';
import { resolveConfiguration } from '../.cache/tests/extraction/capabilities.js';
import { validateProvenance } from '../.cache/tests/extraction/provenance.js';
import { buildPaletteTheme } from '../.cache/tests/theme/pipeline.js';
import { mapRoles, strictAssignments } from '../.cache/tests/theme/mapping.js';
import { TEMPLATE_USAGE, validateMapping } from '../.cache/tests/theme/validation.js';
import { quantizeMMCQ } from '../.cache/tests/extraction/quantizers/mmcq.js';
import { quantizeOctree } from '../.cache/tests/extraction/quantizers/octree.js';
import { quantizeHue } from '../.cache/tests/extraction/quantizers/hue-groups.js';
import { measureDominance } from '../.cache/tests/extraction/dominance.js';
import { prepareSamples } from '../.cache/tests/extraction/sampling/preprocess.js';
import { sampleOriginalPixels } from '../.cache/tests/extraction/sampling/original-samples.js';
import { createRunManager } from '../.cache/tests/extraction/run.js';
import { rgbToOklab } from '../.cache/tests/extraction/color-math.js';
const raster = (width = 24, height = 18) => ({
  width,
  height,
  data: Uint8ClampedArray.from({ length: width * height * 4 }, (_, i) =>
    i % 4 === 3 ? 255 : (Math.floor(i / 4) * [29, 43, 67][i % 4]) % 256,
  ),
});
test('all six presets conserve dominance, provenance and accessible theme mapping', () => {
  for (const method of PRESET_IDS)
    for (const count of [5, 6]) {
      const result = extractPalette(raster(12, 9), { method, count });
      assert.ok(Math.abs(result.swatches.reduce((sum, s) => sum + s.share, 0) - 1) < 1e-12);
      assert.equal(
        result.swatches.reduce((sum, s) => sum + s.representedArea, 0),
        108,
      );
      const { theme, result: mapping } = buildPaletteTheme(result, TEMPLATE_USAGE.landing);
      validateProvenance(result, mapping);
      assert.ok(theme.renderedChecks.every((c) => c.passed));
    }
});

test('weighted histogram stages preserve population independently from fitting influence and retain memberships', () => {
  const samples = [
    { id: 'a', rgb: [16, 16, 16], representedArea: 90, influence: 1, derivationId: 'a' },
    { id: 'b', rgb: [22, 22, 22], representedArea: 10, influence: 3, derivationId: 'b' },
  ];
  for (const run of [
    (s, c) => quantizeMMCQ(s, { kind: 'mmcq', candidates: 1, populationFraction: 0.75 }, c),
    (s, c) => quantizeOctree(s, 1, c),
    (s, c) => quantizeHue(s, 12, c),
  ]) {
    const result = run(samples, {});
    assert.deepEqual(result.candidates[0].rgb, [21, 21, 21]);
    assert.equal(result.candidates[0].representedArea, 100);
    assert.equal(result.candidates[0].influence, 4);
    assert.deepEqual(new Set(result.memberships[0].memberIds), new Set(['a', 'b']));
  }
});

test('edge and SLIC preprocessing separate influence/area, preserve source chains, and retain region inputs', () => {
  const image = raster(20, 15),
    originals = sampleOriginalPixels(image);
  const edge = prepareSamples(image, originals, { kind: 'edge-weighted', strength: 2 });
  assert.equal(
    edge.samples.reduce((sum, s) => sum + s.representedArea, 0),
    300,
  );
  assert.ok(edge.samples.reduce((sum, s) => sum + s.influence, 0) > 300);
  const config = {
    ...presetConfig('slic'),
    preprocessing: { kind: 'slic', maxDimension: 10, regions: 8, compactness: 10, iterations: 3 },
  };
  const result = extractPalette(image, { configuration: config });
  validateProvenance(result);
  assert.ok(result.swatches.every((s) => !s.originalSampleId));
  assert.ok(
    Math.abs(result.preparedSamples.reduce((sum, s) => sum + s.representedArea, 0) - 300) < 1e-9,
  );
});

test('configuration validates combinations and explicitly resolves lightness strategy', () => {
  const base = presetConfig('kmeans');
  assert.equal(
    resolveConfiguration({
      ...base,
      selection: { kind: 'lightness', boundaries: [0.4, 0.7], minWithinBandSeparation: 0.06 },
    }).effective.strategy.kind,
    'stratified',
  );
  assert.throws(
    () =>
      resolveConfiguration({
        ...presetConfig('oklab-kmedoids'),
        strategy: { kind: 'adaptive-k', minK: 3, maxK: 7, improvementThreshold: 0.1 },
      }),
    /K-means/,
  );
  assert.throws(
    () => resolveConfiguration({ ...base, quantization: { ...base.quantization, candidates: 0 } }),
    /budget/,
  );
  assert.throws(
    () =>
      resolveConfiguration({
        ...base,
        postprocessing: {
          snapping: 'off',
          missingColors: { kind: 'relax-separation', minimum: 0.1 },
        },
      }),
    /exceed/,
  );
  assert.throws(
    () =>
      resolveConfiguration({ ...base, preprocessing: { kind: 'edge-weighted', strength: NaN } }),
    /strength/,
  );
});

test('snapping rechecks collisions, separation and band coverage; fallback is explicit', () => {
  const image = raster(20, 10);
  for (const method of ['kmeans', 'mmcq', 'slic', 'lightness-medoids']) {
    const config = presetConfig(method);
    config.postprocessing.snapping = 'nearest-original-sample';
    const result = extractPalette(image, { configuration: config });
    validateProvenance(result);
    const source = new Set(result.originalSamples.samples.map((s) => s.rgb.join()));
    assert.ok(result.swatches.every((s) => source.has(s.rgb.join()) && s.originalSampleId));
    assert.equal(result.originalColorGuarantee, 'preserved');
  }
  const config = presetConfig('oklab-farthest');
  config.selection.minSeparation = 2;
  const short = extractPalette(image, { configuration: config });
  assert.equal(short.swatches.length, 1);
  config.postprocessing.missingColors = { kind: 'relax-separation', minimum: 0.01 };
  const relaxed = extractPalette(image, { configuration: config });
  assert.equal(relaxed.swatches.length, 5);
  assert.ok(relaxed.diagnostics.some((d) => d.code === 'separation-relaxed'));
});

test('dominance tie-breaking uses stable IDs and physical area only', () => {
  const originals = sampleOriginalPixels({
    width: 2,
    height: 1,
    data: new Uint8ClampedArray([0, 0, 0, 255, 255, 255, 255, 255]),
  });
  const candidate = (id, rgb) => ({
    id,
    rgb,
    oklab: rgbToOklab(rgb),
    representedArea: 0,
    influence: 999,
    derivationId: id,
  });
  const a = candidate('a', [0, 0, 0]),
    b = candidate('b', [255, 255, 255]);
  const first = measureDominance(originals, [b, a]);
  assert.deepEqual(first, measureDominance(originals, [a, b]));
  assert.deepEqual(
    first.swatches.map((s) => [s.id, s.share, s.dominanceRank]),
    [
      ['a', 0.5, 1],
      ['b', 0.5, 2],
    ],
  );
  assert.throws(() => measureDominance(originals, []), /requires/);
});

test('strict mapping is validated before guards and fallback keeps the highest feasible dominant background', () => {
  const good = ['#000000', '#111111', '#FFFFFF', '#FF0000', '#0000FF'];
  const strict = mapRoles(good);
  assert.equal(strict.appliedPolicy, 'strict-dominance');
  assert.deepEqual(strict.assignments, strictAssignments(5));
  const bad = ['#000000', '#FFFFFF', '#111111', '#EEEEEE', '#FF0000'];
  const fallback = mapRoles(bad);
  assert.equal(fallback.appliedPolicy, 'dominance-aware');
  assert.ok(fallback.checks.every((c) => c.passed));
  assert.equal(fallback.assignments.bg, 0);
  assert.equal(fallback.assignments.tertiary, fallback.assignments.secondary);
  const user = mapRoles(bad, TEMPLATE_USAGE.landing, {}, strictAssignments(5));
  assert.equal(user.appliedPolicy, 'user');
  assert.deepEqual(user.assignments, strictAssignments(5));
  assert.ok(user.unresolved);
  for (let size = 1; size <= 4; size++) {
    const result = mapRoles(Array(size).fill('#777777'));
    assert.ok(result.unresolved);
    assert.equal(new Set(Object.values(result.assignments)).size, size);
  }
  assert.throws(
    () => validateMapping(good, { ...strictAssignments(5), bg: 20 }, TEMPLATE_USAGE.landing),
    /Invalid role/,
  );
});

test('template-specific requirements and non-text cues influence raw checks', () => {
  const colors = ['#000000', '#111111', '#FFFFFF', '#FF0000', '#0000FF'];
  const manifest = {
    ...TEMPLATE_USAGE.landing,
    requirements: [
      ...TEMPLATE_USAGE.landing.requirements,
      { roles: ['bg', 'surface'], target: 3, kind: 'distinction', cueAvailable: true },
    ],
  };
  assert.ok(validateMapping(colors, strictAssignments(5), manifest).every((c) => c.passed));
  manifest.requirements.at(-1).cueAvailable = false;
  assert.equal(validateMapping(colors, strictAssignments(5), manifest).at(-1).passed, false);
});

test('corrupt provenance is rejected and cancelled runs cannot commit', () => {
  const result = extractPalette(raster(), { method: 'slic' });
  const broken = structuredClone(result);
  broken.derivations[0].inputs = [{ kind: 'entity', id: 'missing' }];
  assert.throws(() => validateProvenance(broken), /Unresolved/);
  broken.derivations[0].inputs = [{ kind: 'entity', id: result.originalSamples.samples[0].id }];
  assert.throws(() => validateProvenance(broken), /Cyclic/);
  const manager = createRunManager('test'),
    old = manager.start({ inputFingerprint: '1', algorithmVersion: '1' });
  manager.start({ inputFingerprint: '2', algorithmVersion: '1' });
  assert.throws(() => extractPalette(raster(), {}, old), { name: 'AbortError' });
  assert.equal(old.isCurrent(), false);
});

test('supported preprocessing/quantizer combinations conserve populations and keep guarantees honest', () => {
  const image = raster(9, 7);
  const preprocessors = [
    { kind: 'none' },
    { kind: 'edge-weighted', strength: 1 },
    { kind: 'slic', regions: 8, maxDimension: 16, compactness: 10, iterations: 2 },
  ];
  const quantizers = [
    { kind: 'kmeans', space: 'rgb', candidates: 10, iterations: 3 },
    { kind: 'kmeans', space: 'oklab', candidates: 10, iterations: 3 },
    { kind: 'medoids', candidates: 10, maxSamples: 40, iterations: 3 },
    { kind: 'mmcq', candidates: 10, populationFraction: 0.75 },
    { kind: 'octree', candidates: 10 },
    { kind: 'hue-groups', sectors: 12 },
    { kind: 'original-samples' },
  ];
  for (const preprocessing of preprocessors)
    for (const quantization of quantizers)
      for (const count of [5, 6]) {
        const config = { ...presetConfig('kmeans', count), preprocessing, quantization };
        const result = extractPalette(image, { configuration: config });
        validateProvenance(result);
        assert.ok(
          Math.abs(
            result.quantization.candidates.reduce((sum, c) => sum + c.representedArea, 0) - 63,
          ) < 1e-8,
        );
        assert.equal(
          result.swatches.reduce((sum, c) => sum + c.representedArea, 0),
          63,
        );
        if (preprocessing.kind === 'slic')
          assert.equal(result.originalColorGuarantee, 'not-guaranteed');
        else if (['medoids', 'original-samples'].includes(quantization.kind))
          assert.equal(result.originalColorGuarantee, 'preserved');
      }
});

test('snapping collisions have distinct reasons and use available alternate candidates', async () => {
  const { postprocess } = await import('../.cache/tests/extraction/postprocessing/process.js');
  const originals = sampleOriginalPixels({
    width: 3,
    height: 1,
    data: new Uint8ClampedArray([0, 0, 0, 255, 128, 128, 128, 255, 255, 255, 255, 255]),
  });
  const candidates = [0, 1, 128, 255].map((v, i) => ({
    id: `c${i}`,
    rgb: [v, v, v],
    oklab: rgbToOklab([v, v, v]),
    representedArea: 4 - i,
    influence: 4 - i,
    derivationId: `c${i}:d`,
  }));
  const config = presetConfig('kmeans');
  config.selection = { kind: 'population' };
  config.postprocessing.snapping = 'nearest-original-sample';
  const result = postprocess(
    { candidates, derivations: [], memberships: [], diagnostics: [] },
    originals,
    config,
  );
  assert.equal(result.selected.length, 3);
  assert.ok(result.selection.decisions.some((d) => d.reason === 'snapping-collision'));
  assert.deepEqual(
    result.selected.map((c) => c.rgb[0]),
    [0, 128, 255],
  );
});

test('automatic mapping keeps the reported olive background and guards panel foregrounds', async () => {
  const { createTheme } = await import('../.cache/tests/theme.service.js');
  const colors = ['#798253', '#150F26', '#361E23', '#5A3726', '#53684B'];
  const before = [...colors];
  const theme = createTheme(colors);
  assert.equal(theme.assignments.bg, 0);
  assert.equal(theme.tokens['--color-bg'], '#798253');
  assert.equal(theme.mapping.appliedPolicy, 'dominance-aware');
  assert.equal(theme.mapping.unresolved, true);
  assert.match(theme.mapping.explanation, /most dominant color remains the background/);
  assert.ok(theme.renderedChecks.every((check) => check.passed));
  assert.deepEqual(colors, before);
});

test('fallback pins explicit dominance rank across short palettes but respects user backgrounds', () => {
  const colors = ['#798253', '#150F26', '#361E23', '#5A3726', '#53684B', '#454545'];
  for (let size = 1; size <= 6; size++) {
    const palette = colors.slice(0, size);
    const order = palette.map((_, i) => i).reverse();
    const automatic = mapRoles(palette, TEMPLATE_USAGE.landing, {}, undefined, order);
    assert.equal(automatic.assignments.bg, order[0]);
    assert.equal(new Set(Object.values(automatic.assignments)).size, size);
  }
  const user = { ...strictAssignments(5), bg: 1, surface: 0 };
  assert.deepEqual(
    mapRoles(colors.slice(0, 5), TEMPLATE_USAGE.landing, {}, user).assignments,
    user,
  );
});

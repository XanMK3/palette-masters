import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import {
  extractPalette,
  mmcq,
  octree,
  oklabMedoids,
  oklabFarthest,
  dominanceMedoids,
  lightnessMedoids,
  rgbToOklab,
  rgbToHex,
  relativeLuminance,
  hexToRgb,
} from './fixtures/extraction.mjs';
import { slicRegions } from '../.cache/tests/slic.js';

import { PRESET_IDS as methods, PRESET_LABELS } from '../.cache/tests/extraction/presets.js';
function raster(width, height, pixel) {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) data.set(pixel(x, y), (y * width + x) * 4);
  return { width, height, data };
}

test('selector exposes exactly the six supported methods with accurate names', () => {
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  const select = html.match(/<select id="method">([\s\S]*?)<\/select>/)[1];
  const options = [...select.matchAll(/<option value="([^"]+)">([^<]+)<\/option>/g)];
  assert.deepEqual(options.map((m) => m[1]).sort(), [...methods].sort());
  for (const option of options) assert.equal(option[2].trim(), PRESET_LABELS[option[1]]);
});

test('all methods handle tiny, monochrome, thin and partially transparent images without inventing colors', () => {
  const fixtures = [
    raster(1, 1, () => [40, 90, 150, 255]),
    raster(1, 27, () => [40, 90, 150, 255]),
    raster(27, 1, () => [40, 90, 150, 255]),
    raster(23, 19, (x, y) => (x === 7 && y === 8 ? [40, 90, 150, 255] : [255, 0, 255, 0])),
  ];
  for (const image of fixtures)
    for (const method of methods)
      for (const count of [5, 6]) {
        assert.deepEqual(
          extractPalette(image, { method, count }).colors,
          ['#285A96'],
          `${method}/${image.width}x${image.height}`,
        );
      }
});

test('all methods reject empty alpha and malformed buffers', () => {
  for (const method of methods) {
    assert.throws(
      () =>
        extractPalette(
          raster(8, 8, () => [255, 0, 0, 191]),
          { method },
        ),
      /opaque/,
    );
    assert.throws(
      () => extractPalette({ width: 10, height: 10, data: new Uint8ClampedArray(4) }, { method }),
      /ImageData/,
    );
  }
});

test('diverse inputs give bounded, unique, dominance-sorted palettes without input mutation', () => {
  const image = raster(87, 63, (x, y) => [
    (x * 29 + y * 7) % 256,
    (x * 3 + y * 47) % 256,
    (x * 67 + y * 13) % 256,
    255,
  ]);
  const original = image.data.slice();
  for (const method of methods)
    for (const count of [5, 6]) {
      const result = extractPalette(image, { method, count });
      assert.ok(result.colors.length > 0 && result.colors.length <= count, method);
      assert.ok(result.sampledPixels <= 4000);
      assert.equal(new Set(result.colors).size, result.colors.length);
      result.colors.forEach((c) => assert.match(c, /^#[0-9A-F]{6}$/));
      const lightness = result.swatches.map((c) => c.representedArea);
      assert.deepEqual(
        lightness,
        [...lightness].sort((a, b) => b - a),
      );
      assert.deepEqual(extractPalette(image, { method, count }), result, method);
    }
  assert.deepEqual(image.data, original);
});

test('K-medoids minimizes weighted distances within a cluster, not distance to its average', () => {
  const pixels = [
    [0, 0, 0],
    [100, 100, 100],
    [100, 100, 100],
    [100, 100, 100],
    [255, 255, 255],
  ];
  assert.deepEqual(oklabMedoids(pixels, 1), [[100, 100, 100]]);
});

test('Sample-preserving final palettes contain only actual opaque sampled pixels', () => {
  const image = raster(91, 71, (x, y) => [
    (x * 19 + y * 17) % 256,
    (x * 37 + y * 5) % 256,
    (x * 11 + y * 23) % 256,
    (x + y) % 7 ? 255 : 0,
  ]);
  for (const method of [
    'oklab-kmedoids',
    'oklab-farthest',
    'dominance-medoids',
    'lightness-medoids',
  ])
    for (const count of [5, 6]) {
      const result = extractPalette(image, { method, count });
      const sampled = new Set(result.originalSamples.samples.map((sample) => rgbToHex(sample.rgb)));
      for (const sample of result.originalSamples.samples) {
        const offset = sample.source.pixelIndex * 4;
        assert.deepEqual(sample.rgb, [...image.data.slice(offset, offset + 3)]);
        assert.ok(image.data[offset + 3] >= 192);
      }
      for (const hex of result.colors) assert.ok(sampled.has(hex), hex);
    }
});

test('MMCQ separates sparse distant colors and averages histogram bins using actual population', () => {
  const pixels = [
    ...Array.from({ length: 200 }, () => [16, 20, 24]),
    [240, 20, 24],
    [16, 240, 24],
    [16, 20, 240],
  ];
  assert.deepEqual(
    new Set(mmcq(pixels, 4).map(rgbToHex)),
    new Set(['#101418', '#F01418', '#10F018', '#1014F0']),
  );
  assert.deepEqual(
    mmcq(
      [
        [16, 16, 16],
        [16, 16, 16],
        [22, 22, 22],
      ],
      5,
    ),
    [[18, 18, 18]],
  );
});

test('octree selectively reduces a deep branch while preserving a distant color', () => {
  const pixels = [
    [240, 0, 0],
    [241, 0, 0],
    [242, 0, 0],
    [243, 0, 0],
    [0, 0, 255],
  ];
  assert.deepEqual(new Set(octree(pixels, 2).map(rgbToHex)), new Set(['#F20000', '#0000FF']));
  assert.deepEqual(
    octree(
      [
        [12, 24, 36],
        [12, 24, 36],
      ],
      6,
    ),
    [[12, 24, 36]],
  );
});

test('SLIC respects a strong off-grid color boundary and conserves region populations', () => {
  const image = raster(80, 60, (x) => (x < 33 ? [230, 30, 20, 255] : [20, 30, 230, 255]));
  const result = slicRegions(image);
  assert.equal(
    result.weights.reduce((a, b) => a + b, 0),
    80 * 60,
  );
  const pure = new Set(['#E61E14', '#141EE6']);
  assert.ok(result.colors.length > 2);
  assert.ok(
    result.colors.every((c) => pure.has(rgbToHex(c))),
    'regions should follow the boundary, not blend across grid cells',
  );
});

test('SLIC outputs connected regions, excludes transparency and bounds its raster', () => {
  const image = raster(190, 130, (x, y) =>
    x === 70 || y === 60 ? [255, 0, 255, 0] : [(x * 31) % 256, (y * 43) % 256, (x * y) % 256, 255],
  );
  const result = slicRegions(image),
    { labels, width, height, weights } = result;
  assert.ok(width <= 160 && height <= 160);
  assert.equal(
    weights.reduce((a, b) => a + b, 0),
    [...labels].filter((n) => n >= 0).length,
  );
  const visited = new Set();
  for (let p = 0; p < labels.length; p++) {
    const sx = Math.floor(((p % width) * image.width) / width),
      sy = Math.floor((Math.floor(p / width) * image.height) / height);
    if (image.data[(sy * image.width + sx) * 4 + 3] < 192) assert.equal(labels[p], -1);
    if (labels[p] < 0 || visited.has(p)) continue;
    const id = labels[p],
      queue = [p];
    visited.add(p);
    for (let i = 0; i < queue.length; i++) {
      const q = queue[i],
        candidates = [];
      if (q % width) candidates.push(q - 1);
      if (q % width < width - 1) candidates.push(q + 1);
      if (q >= width) candidates.push(q - width);
      if (q < width * (height - 1)) candidates.push(q + width);
      for (const r of candidates)
        if (labels[r] === id && !visited.has(r)) {
          visited.add(r);
          queue.push(r);
        }
    }
    assert.equal(queue.length, weights[id], `region ${id} is disconnected`);
  }
});

test('farthest-point starts at the most frequent color and maximizes nearest-set distance at each step', () => {
  const pixels = [
    [90, 90, 90],
    [90, 90, 90],
    [255, 0, 0],
    [0, 255, 0],
    [0, 0, 255],
    [255, 255, 255],
    [0, 0, 0],
    [255, 255, 0],
  ];
  const selected = oklabFarthest(pixels, 6);
  assert.deepEqual(selected[0], [90, 90, 90]);
  assert.equal(selected.length, 6);
  const d = (a, b) => Math.hypot(...rgbToOklab(a).map((v, i) => v - rgbToOklab(b)[i]));
  for (let i = 1; i < selected.length; i++) {
    const previous = selected.slice(0, i);
    const separation = (p) => Math.min(...previous.map((q) => d(p, q)));
    assert.equal(separation(selected[i]), Math.max(...pixels.map(separation)));
  }
  const image = raster(pixels.length, 1, (x) => [...pixels[x], 255]);
  assert.deepEqual(
    new Set(extractPalette(image, { method: 'oklab-farthest', count: 6 }).colors),
    new Set(selected.map(rgbToHex)),
    'display cleanup must not replace maximin choices',
  );
});

test('farthest-point stops for indistinguishable shades and handles empty samples', () => {
  assert.deepEqual(oklabFarthest([], 5), []);
  assert.deepEqual(
    oklabFarthest(
      [
        [100, 100, 100],
        [101, 101, 101],
      ],
      5,
    ),
    [[100, 100, 100]],
  );
});

test('dominance-ranked medoids prefer populated colors, skip similar shades and do not fill rejected slots', () => {
  const groups = [
    [[100, 100, 100], 100],
    [[103, 103, 103], 80],
    [[0, 0, 255], 60],
    [[0, 255, 0], 40],
    [[255, 0, 0], 20],
    [[255, 255, 255], 10],
    [[0, 0, 0], 5],
  ];
  const pixels = groups.flatMap(([rgb, n]) => Array.from({ length: n }, () => rgb));
  assert.deepEqual(dominanceMedoids(pixels, 5), [
    groups[0][0],
    groups[2][0],
    groups[3][0],
    groups[4][0],
    groups[5][0],
  ]);
  const image = raster(pixels.length, 1, (x) => [...pixels[x], 255]);
  const result = extractPalette(image, { method: 'dominance-medoids', count: 5 });
  assert.deepEqual(new Set(result.colors), new Set(dominanceMedoids(pixels, 5).map(rgbToHex)));
  const similar = raster(40, 1, (x) => (x < 30 ? [100, 100, 100, 255] : [105, 105, 105, 255]));
  assert.deepEqual(extractPalette(similar, { method: 'dominance-medoids' }).colors, ['#646464']);
  assert.deepEqual(dominanceMedoids([], 5), []);
});

test('dominance-ranked final colors maintain the minimum Oklab separation', () => {
  const image = raster(91, 71, (x, y) => [
    (x * 19 + y * 17) % 256,
    (x * 37 + y * 5) % 256,
    (x * 11 + y * 23) % 256,
    255,
  ]);
  for (const count of [5, 6]) {
    const labs = extractPalette(image, { method: 'dominance-medoids', count }).colors.map((c) =>
      rgbToOklab(hexToRgb(c)),
    );
    for (let i = 0; i < labs.length; i++)
      for (let j = 0; j < i; j++)
        assert.ok(Math.hypot(...labs[i].map((v, c) => v - labs[j][c])) >= 0.06);
  }
});

test('lightness-stratified medoids reserve rare dark and light colors in both count modes', () => {
  const pixels = [
    [5, 5, 5],
    [250, 250, 250],
    [255, 255, 0],
    [0, 255, 255],
    ...Array.from({ length: 100 }, () => [180, 0, 0]),
    ...Array.from({ length: 100 }, () => [0, 100, 0]),
    ...Array.from({ length: 100 }, () => [0, 0, 255]),
  ];
  const image = raster(pixels.length, 1, (x) => [...pixels[x], 255]);
  for (const count of [5, 6]) {
    const result = extractPalette(image, { method: 'lightness-medoids', count }).colors;
    assert.equal(result.length, count);
    const bands = new Set(
      result.map((c) => rgbToOklab(hexToRgb(c))[0]).map((l) => (l < 0.4 ? 0 : l < 0.7 ? 1 : 2)),
    );
    assert.deepEqual(bands, new Set([0, 1, 2]));
    assert.ok(result.includes('#050505'));
    assert.deepEqual(new Set(result), new Set(lightnessMedoids(pixels, count).map(rgbToHex)));
  }
});

test('lightness-stratified fallback reuses occupied bands without inventing missing shades', () => {
  const pixels = [
    [180, 0, 0],
    [0, 100, 0],
    [0, 0, 255],
  ];
  assert.ok(pixels.every((p) => rgbToOklab(p)[0] >= 0.4 && rgbToOklab(p)[0] < 0.7));
  assert.deepEqual(
    new Set(lightnessMedoids(pixels, 6).map(rgbToHex)),
    new Set(pixels.map(rgbToHex)),
  );
  assert.deepEqual(lightnessMedoids([], 5), []);
});

test('lightness-stratified cleanup preserves adjacent colors on opposite sides of a band boundary', () => {
  for (const boundary of [0.4, 0.7]) {
    let value = 1;
    while (rgbToOklab([value, value, value])[0] < boundary) value++;
    const pixels = [
      [value - 1, value - 1, value - 1],
      [value, value, value],
    ];
    const image = raster(2, 1, (x) => [...pixels[x], 255]);
    assert.deepEqual(
      new Set(extractPalette(image, { method: 'lightness-medoids' }).colors),
      new Set(pixels.map(rgbToHex)),
    );
  }
});

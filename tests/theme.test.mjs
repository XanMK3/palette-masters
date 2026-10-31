import { PRESET_IDS } from '../.cache/tests/extraction/presets.js';
import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createTheme,
  chooseText,
  applyTheme,
  defaultAssignments,
  reassignRole,
  shuffleAssignments,
  ROLE_KEYS,
} from '../.cache/tests/theme.service.js';
import { contrastRatio, extractPalette } from './fixtures/extraction.mjs';
const colors = ['#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#00FFFF', '#FF00FF'];

test('raw semantic roles use all sampled colors; foreground pairs remain readable after shuffling', () => {
  for (const palette of [
    colors,
    colors.slice(0, 5),
    ['#777777'],
    ['#000001', '#050505', '#111111', '#222222', '#333333'],
    ['#FFFFFE', '#FAFAFA', '#EEEEEE', '#EEFFEE', '#FFFFEE'],
  ]) {
    let mapping = defaultAssignments(palette);
    for (let i = 0; i < 15; i++) {
      const theme = createTheme(palette, mapping);
      for (const role of ROLE_KEYS)
        assert.equal(theme.tokens[`--color-${role}`], palette[mapping[role]]);
      for (const color of palette)
        assert.ok(ROLE_KEYS.some((role) => theme.tokens[`--color-${role}`] === color));
      for (const role of ['bg', 'surface', 'accent', 'secondary', 'tertiary']) {
        for (const suffix of ['text-contrast', 'text-muted'])
          assert.ok(
            contrastRatio(
              theme.tokens[`--color-${role}`],
              theme.tokens[`--color-${role}-${suffix}`],
            ) >= 4.5,
          );
      }
      assert.ok(theme.contrast >= 4.5);
      if (palette.length < 6)
        assert.equal(theme.tokens['--color-tertiary'], theme.tokens['--color-secondary']);
      mapping = shuffleAssignments(mapping, palette.length, () => 0.37);
    }
  }
});
test('manual reassignment swaps roles without dropping colors', () => {
  const before = defaultAssignments(colors);
  const after = reassignRole(before, 'bg', before.accent, 6);
  assert.equal(after.bg, before.accent);
  assert.equal(after.accent, before.bg);
  assert.equal(new Set(Object.values(after)).size, 6);
  assert.deepEqual(defaultAssignments(colors), before);
  const five = defaultAssignments(colors.slice(0, 5));
  const changed = reassignRole(five, 'secondary', five.bg, 5);
  assert.equal(changed.tertiary, changed.secondary);
  assert.equal(new Set(ROLE_KEYS.slice(0, 5).map((k) => changed[k])).size, 5);
});
test('shuffle changes assignments, includes all six roles, and preserves palette', () => {
  const before = defaultAssignments(colors),
    original = [...colors];
  const after = shuffleAssignments(before, 6, () => 0.999);
  assert.notDeepEqual(after, before);
  assert.equal(new Set(Object.values(after)).size, 6);
  assert.deepEqual(colors, original);
});
test('switching to fewer colors clears stale CSS variables', () => {
  const properties = new Map();
  const element = {
    style: {
      setProperty: (k, v) => properties.set(k, v),
      removeProperty: (k) => properties.delete(k),
    },
  };
  applyTheme(element, createTheme(colors));
  applyTheme(element, createTheme(['#777777']));
  assert.equal(properties.has('--palette-6'), false);
  assert.equal(properties.get('--color-bg'), '#777777');
});
test('all extraction methods are deterministic for the same pixels', () => {
  const data = new Uint8ClampedArray(32 * 32 * 4);
  for (let i = 0; i < data.length; i += 4) {
    data[i] = (i * 13) % 256;
    data[i + 1] = (i * 7 + 40) % 256;
    data[i + 2] = (i * 3 + 90) % 256;
    data[i + 3] = 255;
  }
  const image = { data, width: 32, height: 32 };
  for (const method of PRESET_IDS) {
    for (const count of [5, 6]) {
      const first = extractPalette(image, { method, count });
      for (let run = 0; run < 3; run++)
        assert.deepEqual(extractPalette(image, { method, count }), first, method);
    }
  }
});

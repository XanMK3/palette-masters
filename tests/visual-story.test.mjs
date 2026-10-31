import test from 'node:test';
import assert from 'node:assert/strict';
import { extractPalette } from './fixtures/extraction.mjs';
import { presetConfig } from './fixtures/extraction.mjs';
import { buildPaletteTheme } from '../.cache/tests/theme/pipeline.js';
import { packLabels, unpackLabels } from '../.cache/tests/extraction/visual-state.js';
import { createStory, frameLabels, resolveFrame } from '../.cache/tests/pipeline-viewer/story.js';
import { StoryPlayer } from '../.cache/tests/pipeline-viewer/player.js';
const image = {
  width: 32,
  height: 24,
  data: Uint8ClampedArray.from({ length: 32 * 24 * 4 }, (_, i) =>
    i % 4 === 3 ? 255 : (Math.floor(i / 4) * [29, 43, 67][i % 4]) % 256,
  ),
};
function bundle(method = 'kmeans', configuration) {
  const result = extractPalette(image, { method, configuration }, { captureVisuals: true });
  return { result, theme: buildPaletteTheme(result).result };
}
test('visual label maps are lossless for runs, dense maps and large groups', () => {
  for (const labels of [
    [],
    [0, 1, 2, 3],
    Array(4000).fill(3),
    [0, 256, 1000, 1],
    Array.from({ length: 4000 }, (_, i) => i % 64),
  ])
    assert.deepEqual([...unpackLabels(packLabels(labels))], labels);
  assert.equal(packLabels(Array(4000).fill(3)).encoding, 'runs');
  assert.equal(packLabels([0, 1, 2, 3]).values.BYTES_PER_ELEMENT, 1);
});
test('all K-means fitting states survive capture without changing semantic extraction', () => {
  for (const method of ['kmeans', 'oklab-kmeans', 'edge-weighted', 'slic', 'adaptive']) {
    const data = bundle(method);
    const { visual, ...semantic } = data.result;
    assert.deepEqual(semantic, extractPalette(image, { method }));
    assert.ok(visual.fits.length);
    for (const fit of visual.fits) {
      assert.ok(fit.iterations.length > 0);
      assert.ok(fit.stop);
      for (const iteration of fit.iterations) {
        const labels = unpackLabels(iteration.assignments);
        assert.equal(labels.length, fit.sampleIds.length);
        assert.ok([...labels].every((l) => l < fit.centerIds.length));
        assert.equal(iteration.colors.length, fit.centerIds.length);
      }
      assert.equal(unpackLabels(fit.finalAssignments).length, fit.sampleIds.length);
    }
    const story = createStory(data);
    assert.ok(story.reduce((n, f) => n + f.duration, 0) <= 18500.001);
    for (const fit of visual.fits)
      assert.equal(
        story.filter((f) => f.fit === fit && f.assignment === 'iteration').length,
        fit.iterations.length * 2,
      );
    const finalLabels = unpackLabels(visual.fits.at(-1).finalAssignments);
    assert.ok(finalLabels.length);
  }
});
test('chapters preserve preparation, selection, snapping, coverage and theme', () => {
  const config = presetConfig('edge-weighted');
  config.postprocessing.snapping = 'nearest-original-sample';
  const data = bundle('edge-weighted', config),
    story = createStory(data);
  assert.deepEqual(
    [...new Set(story.map((f) => f.chapter))],
    ['sample', 'prepare', 'find', 'select', 'refine', 'coverage', 'theme'],
  );
  assert.deepEqual(
    story.at(-1).colors.map((c) => c.rgb),
    data.result.swatches.map((s) => s.rgb),
  );
  const assign = story.find((f) => f.assignment === 'iteration');
  assert.deepEqual(frameLabels(assign), unpackLabels(assign.fit.iterations[0].assignments));
  const move = story[story.indexOf(assign) + 1];
  assert.deepEqual(frameLabels(move), frameLabels(assign));
  const plain = createStory(bundle());
  assert.ok(!plain.some((f) => f.chapter === 'prepare' || f.chapter === 'refine'));
  const fallback = createStory(bundle('mmcq'));
  assert.ok(fallback.some((f) => f.partition?.method === 'mmcq'));
  assert.ok(!fallback.some((f) => /not available/.test(f.caption)));
});
test('the story clock catches up, seeks, pauses and stops without extending total duration', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  let time = 0,
    calls = 0;
  const frames = createStory(bundle());
  const player = new StoryPlayer(
    frames,
    () => calls++,
    () => time,
  );
  player.play();
  time = player.total + 1;
  t.mock.timers.tick(32);
  assert.equal(player.playing, false);
  assert.equal(player.index, frames.length - 1);
  player.seek(2);
  assert.equal(player.index, 2);
  player.play();
  player.pause();
  const paused = player.index;
  time += 10000;
  t.mock.timers.tick(10000);
  assert.equal(player.index, paused);
  player.seek(0);
  player.play();
  player.dispose();
  const count = calls;
  time += 10000;
  t.mock.timers.tick(10000);
  assert.equal(calls, count);
});

test('other methods retain their actual partitions and representatives without changing results', () => {
  for (const method of [
    'mmcq',
    'octree',
    'hue-oklab',
    'oklab-kmedoids',
    'dominance-medoids',
    'lightness-medoids',
    'oklab-farthest',
  ]) {
    const data = bundle(method),
      { visual, ...semantic } = data.result;
    assert.deepEqual(semantic, extractPalette(image, { method }));
    const story = createStory(data);
    assert.ok(story.reduce((sum, f) => sum + f.duration, 0) <= 18500.001);
    assert.ok(story.every((f) => !f.caption.includes('not available')));
    for (const partition of visual.partitions ?? []) {
      const finalFrame = story.findLast((f) => f.partition === partition);
      const groups = resolveFrame(finalFrame).groups;
      assert.equal(
        groups.reduce((sum, g) => sum + g.members.length, 0),
        partition.sampleIds.length,
      );
      const memberSet = new Set(groups.flatMap((g) => [...g.members]));
      assert.equal(memberSet.size, partition.sampleIds.length);
      for (const group of groups) {
        const candidate = data.result.quantization.candidates.find((c) => c.id === group.id);
        assert.ok(candidate);
        assert.deepEqual(group.rgb, candidate.rgb);
      }
      const middle = story.find((f) => f.partition === partition && f.partitionStep === 1);
      if (middle) {
        const before = structuredClone(resolveFrame(middle).groups);
        resolveFrame(finalFrame);
        assert.deepEqual(resolveFrame(middle).groups, before);
      }
      if (partition.method === 'octree')
        assert.ok(partition.changes.every((c) => c.remove.length > 1 && c.add.length === 1));
      if (partition.method === 'mmcq')
        assert.ok(partition.changes.every((c) => c.remove.length === 1 && c.add.length === 2));
    }
    for (const fit of visual.fits) {
      assert.equal(fit.method, 'medoids');
      assert.ok(fit.pool.length <= 600);
      for (const step of fit.iterations)
        step.representatives.forEach((index, i) => {
          const sample = data.result.preparedSamples.find((s) => s.id === fit.sampleIds[index]);
          assert.deepEqual(step.colors[i], sample.rgb);
          assert.ok(fit.pool.includes(index));
        });
    }
    if (method === 'oklab-farthest') {
      const choices = story.filter((f) => f.chapter === 'select' && f.focusGroups);
      assert.deepEqual(
        choices.map((f) => f.focusGroups[0]),
        visual.initialSelection,
      );
    }
  }
});

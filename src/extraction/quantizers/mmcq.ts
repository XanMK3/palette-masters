import { visualGroup, type PartitionVisual } from '../visual-state.js';
import type { PreparedSample, QuantizerConfig } from '../types.js';
import type { StageContext } from '../run.js';
import { groupedCandidates, validateSamples } from '../shared.js';
export function quantizeMMCQ(
  samples: readonly PreparedSample[],
  config: Extract<QuantizerConfig, { kind: 'mmcq' }>,
  context: StageContext = {},
  id = 'mmcq',
) {
  validateSamples(samples);
  if (
    !Number.isInteger(config.candidates) ||
    config.candidates < 1 ||
    !Number.isFinite(config.populationFraction) ||
    config.populationFraction < 0 ||
    config.populationFraction > 1
  )
    throw new RangeError('Invalid MMCQ configuration');
  const boxes = samples.length ? [{ id: `${id}:root`, members: samples.map((_, i) => i) }] : [];
  const visual: PartitionVisual | undefined = context.visual
    ? {
        id,
        method: 'mmcq',
        sampleIds: samples.map((s) => s.id),
        initial: boxes.map((g) => visualGroup(samples, g)),
        changes: [],
      }
    : undefined;
  if (visual) (context.visual!.partitions ??= []).push(visual);
  const bounds = (members: number[]) =>
    [0, 1, 2].map((c) => {
      const values = members.map((i) => samples[i].rgb[c] >> 3);
      return [Math.min(...values), Math.max(...values)];
    });
  while (boxes.length < config.candidates) {
    context.signal?.throwIfAborted();
    const volumePhase = boxes.length >= Math.ceil(config.candidates * config.populationFraction);
    const ranked = boxes
      .map((b, i) => {
        const limits = bounds(b.members);
        return {
          b,
          i,
          limits,
          priority:
            b.members.reduce((s, j) => s + samples[j].influence, 0) *
            (volumePhase ? limits.reduce((v, [lo, hi]) => v * (hi - lo + 1), 1) : 1),
        };
      })
      .filter((b) => b.limits.some(([lo, hi]) => lo < hi))
      .sort((a, b) => b.priority - a.priority);
    if (!ranked.length) break;
    const chosen = ranked[0],
      axis = [0, 1, 2].sort(
        (a, b) =>
          chosen.limits[b][1] - chosen.limits[b][0] - (chosen.limits[a][1] - chosen.limits[a][0]),
      )[0];
    const [lo, hi] = chosen.limits[axis];
    const slices = Array(32).fill(0) as number[];
    for (const i of chosen.b.members) slices[samples[i].rgb[axis] >> 3] += samples[i].influence;
    let cumulative = 0,
      median = lo;
    for (; median < hi; median++) {
      cumulative += slices[median];
      if (cumulative >= slices.reduce((a, b) => a + b, 0) / 2) break;
    }
    const cut = Math.max(
      lo,
      Math.min(
        hi - 1,
        median - lo <= hi - median
          ? median + Math.floor((hi - median) / 2)
          : median - 1 - Math.floor((median - lo) / 2),
      ),
    );
    const children = [
      {
        id: `${chosen.b.id}:0`,
        members: chosen.b.members.filter((i) => samples[i].rgb[axis] >> 3 <= cut),
      },
      {
        id: `${chosen.b.id}:1`,
        members: chosen.b.members.filter((i) => samples[i].rgb[axis] >> 3 > cut),
      },
    ];

    visual?.changes.push({
      remove: [chosen.b.id],
      add: children.map((g) => visualGroup(samples, g)),
      phase: volumePhase ? 'volume' : 'population',
    });
    boxes.splice(chosen.i, 1, ...children);
  }
  return groupedCandidates(samples, boxes, context);
}

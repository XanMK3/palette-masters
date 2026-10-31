import type { CandidateSet, PreparedSample, PipelineConfig, QuantizerConfig } from '../types.js';
import type { StageContext } from '../run.js';
import { quantizeKMeans } from '../quantizers/kmeans.js';
import { quantizeMedoids } from '../quantizers/medoids.js';
import { quantizeMMCQ } from '../quantizers/mmcq.js';
import { quantizeOctree } from '../quantizers/octree.js';
import { quantizeHue } from '../quantizers/hue-groups.js';
import { originalCandidates, distance } from '../shared.js';
import { bandOf } from '../selection/select.js';
import { rgbToOklab } from '../color-math.js';
export function quantize(
  samples: readonly PreparedSample[],
  q: QuantizerConfig,
  context: StageContext = {},
  id = 'quantizer',
): CandidateSet {
  context.signal?.throwIfAborted();

  let result: CandidateSet;
  switch (q.kind) {
    case 'kmeans':
      result = quantizeKMeans(samples, q, context, id);
      break;
    case 'medoids':
      result = quantizeMedoids(samples, q, context, id);
      break;
    case 'mmcq':
      result = quantizeMMCQ(samples, q, context, id);
      break;
    case 'octree':
      result = quantizeOctree(samples, q.candidates, context, id);
      break;
    case 'hue-groups':
      result = quantizeHue(samples, q.sectors, context, id);
      break;
    case 'original-samples':
      result = originalCandidates(samples);
      break;
  }

  return result;
}
export function generateCandidates(
  samples: readonly PreparedSample[],
  c: PipelineConfig,
  context: StageContext = {},
): CandidateSet {
  if (c.strategy.kind === 'stratified' && c.selection.kind === 'lightness') {
    const b = c.selection.boundaries,
      bands = [0, 1, 2].map((band) =>
        samples.filter((s) => {
          const l = rgbToOklab(s.rgb)[0];
          return (l < b[0] ? 0 : l < b[1] ? 1 : 2) === band;
        }),
      );
    const sets = bands.map((s, i) => {
      const set = quantize(s, c.quantization, context, `band:${i}`);
      const escaped = set.candidates.filter((candidate) => bandOf(candidate, b) !== i);

      return {
        ...set,
        candidates: set.candidates.filter((candidate) => bandOf(candidate, b) === i),
        diagnostics: [
          ...set.diagnostics,
          ...escaped.map((candidate) => ({
            stage: 'quantization' as const,
            severity: 'warning' as const,
            code: 'candidate-left-lightness-band',
            entityIds: [candidate.id],
            measurements: { requiredBand: i },
          })),
        ],
      };
    });
    return {
      candidates: sets.flatMap((s) => s.candidates),
      derivations: sets.flatMap((s) => s.derivations),
      memberships: sets.flatMap((s) => s.memberships),
      diagnostics: sets.flatMap((s) => s.diagnostics),
    };
  }
  if (c.strategy.kind === 'adaptive-k' && c.quantization.kind === 'kmeans') {
    const trials: { k: number; objective: number; set: CandidateSet }[] = [];
    for (let k = c.strategy.minK; k <= c.strategy.maxK; k++) {
      const set = quantize(samples, { ...c.quantization, candidates: k }, context, `adaptive:${k}`);
      const objective = samples.reduce(
        (sum, s) =>
          sum +
          s.influence *
            Math.min(
              ...set.candidates.map(
                (p) =>
                  distance(
                    c.quantization.kind === 'kmeans' && c.quantization.space === 'rgb'
                      ? s.rgb
                      : rgbToOklab(s.rgb),
                    c.quantization.kind === 'kmeans' && c.quantization.space === 'rgb'
                      ? p.rgb
                      : p.oklab,
                  ) ** 2,
              ),
            ),
        0,
      );
      const previous = trials.at(-1),
        gain = previous
          ? (previous.objective - objective) / Math.max(1e-12, previous.objective)
          : 1;

      trials.push({ k, objective, set });
      if (previous && gain < c.strategy.improvementThreshold) break;
    }
    const chosen = trials.length > 1 ? trials[trials.length - 2] : trials[0];
    // Only choose the prior trial when the improvement threshold actually failed.
    const last = trials.at(-1)!;
    const gain =
      trials.length > 1
        ? (chosen.objective - last.objective) / Math.max(1e-12, chosen.objective)
        : 1;
    const winner = trials.length > 1 && gain < c.strategy.improvementThreshold ? chosen : last;

    return {
      ...winner.set,
      derivations: trials.flatMap((t) => t.set.derivations),
      memberships: trials.flatMap((t) => t.set.memberships),
    };
  }
  return quantize(samples, c.quantization, context);
}

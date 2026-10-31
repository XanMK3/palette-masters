import { packLabels, type KMeansVisual } from '../visual-state.js';
import { rgbToOklab } from '../color-math.js';
import type { CandidateSet, PreparedSample, QuantizerConfig } from '../types.js';
import type { StageContext } from '../run.js';

type MedoidConfig = Extract<QuantizerConfig, { kind: 'medoids' }>;

/** Alternating weighted Euclidean Oklab medoids. maxSamples bounds the set of
 * possible representatives, not objective/population accounting. Distances are
 * streamed: O(n + maxSamples) working storage, with no pairwise distance matrix.
 */
export function quantizeMedoids(
  samples: readonly PreparedSample[],
  config: MedoidConfig,
  context: StageContext = {},
  invocationId = 'medoids',
): CandidateSet {
  context.signal?.throwIfAborted();
  for (const value of [config.candidates, config.maxSamples, config.iterations])
    if (!Number.isSafeInteger(value) || value < 1)
      throw new RangeError('Medoid budgets must be positive safe integers');
  if (!invocationId.trim()) throw new TypeError('Quantizer invocation ID is required');
  const ids = new Set<string>();
  for (const s of samples) {
    if (!s.id || ids.has(s.id)) throw new TypeError('Prepared sample IDs must be unique');
    ids.add(s.id);
    if (s.rgb.length !== 3 || s.rgb.some((v) => !Number.isInteger(v) || v < 0 || v > 255))
      throw new TypeError('Prepared RGB must contain three byte values');
    if (
      !Number.isFinite(s.representedArea) ||
      s.representedArea <= 0 ||
      !Number.isFinite(s.influence) ||
      s.influence < 0
    )
      throw new RangeError('Prepared samples require positive area and non-negative influence');
  }
  const eligible = samples.flatMap((s, i) => (s.influence > 0 ? [i] : []));
  if (samples.length && !eligible.length)
    throw new RangeError('Medoids require positive fitting influence');
  const size = Math.min(config.maxSamples, eligible.length);
  const pool = Array.from(
    { length: size },
    (_, i) => eligible[Math.floor((i * eligible.length) / size)],
  );
  const points = samples.map((s) => rgbToOklab(s.rgb));
  const distance = (a: number, b: number) =>
    Math.hypot(...points[a].map((v, c) => v - points[b][c]));

  let medoids = pool.length
    ? [pool.reduce((a, b) => (samples[b].influence > samples[a].influence ? b : a))]
    : [];
  while (medoids.length < Math.min(config.candidates, pool.length)) {
    context.signal?.throwIfAborted();
    let best = -1,
      score = 0;
    for (const i of pool) {
      const d = Math.min(...medoids.map((m) => distance(i, m)));
      if (d > score) {
        score = d;
        best = i;
      }
    }
    if (best < 0) break;
    medoids.push(best);
  }
  const groupIds = medoids.map((_, i) => `${invocationId}:medoid:${i}`);

  const visual: KMeansVisual | undefined = context.visual
    ? {
        method: 'medoids',
        id: invocationId,
        sampleIds: samples.map((s) => s.id),
        centerIds: groupIds,
        seeds: [...medoids],
        pool: [...pool],
        initialColors: medoids.map((i) => [...samples[i].rgb]),
        iterations: [],
      }
    : undefined;
  if (visual) context.visual!.fits.push(visual);
  const assign = () =>
    samples.map((_, i) => {
      if (i % 256 === 0) context.signal?.throwIfAborted();
      let nearest = 0;
      for (let c = 1; c < medoids.length; c++)
        if (distance(i, medoids[c]) < distance(i, medoids[nearest])) nearest = c;
      return nearest;
    });
  let iterations = 0,
    converged = false;
  for (; medoids.length && iterations < config.iterations;) {
    const labels = assign();
    const next = medoids.map((current, c) => {
      const members = labels.flatMap((label, i) => (label === c ? [i] : []));
      const cost = (candidate: number) => {
        context.signal?.throwIfAborted();
        return members.reduce((sum, i) => sum + samples[i].influence * distance(candidate, i), 0);
      };
      let best = current,
        bestCost = cost(current);
      for (const candidate of pool) {
        if (labels[candidate] !== c || candidate === current) continue;
        const objective = cost(candidate);
        if (objective < bestCost) {
          best = candidate;
          bestCost = objective;
        }
      }

      return best;
    });

    visual?.iterations.push({
      assignments: packLabels(labels),
      colors: next.map((i) => [...samples[i].rgb]),
      representatives: [...next],
    });
    converged = next.every((m, c) => m === medoids[c]);
    medoids = next;
    iterations++;
    if (converged) break;
  }
  const labels = assign();
  if (visual) {
    visual.finalAssignments = packLabels(labels);
    visual.stop = converged ? 'converged' : 'iteration-limit';
  }
  const memberIds: string[] = [];
  const groups = groupIds.map((id, c) => {
    const start = memberIds.length;
    labels.forEach((label, i) => {
      if (label === c) memberIds.push(samples[i].id);
    });
    return { id, start, length: memberIds.length - start };
  });
  const derivations = medoids.map((m, c) => ({
    id: `${groupIds[c]}:derivation`,
    operation: 'medoid' as const,
    inputs: [{ kind: 'entity' as const, id: samples[m].id }],
  }));
  const candidates = medoids.map((m, c) => ({
    id: groupIds[c],
    rgb: [...samples[m].rgb] as [number, number, number],
    oklab: points[m],
    representedArea: samples.reduce(
      (sum, s, i) => sum + (labels[i] === c ? s.representedArea : 0),
      0,
    ),
    influence: samples.reduce((sum, s, i) => sum + (labels[i] === c ? s.influence : 0), 0),
    derivationId: derivations[c].id,
    ...(samples[m].originalSampleId ? { originalSampleId: samples[m].originalSampleId } : {}),
  }));

  context.signal?.throwIfAborted();
  return {
    candidates,
    derivations,
    memberships: [{ id: `${invocationId}:represented-members`, memberIds, groups }],
    diagnostics: [],
  };
}

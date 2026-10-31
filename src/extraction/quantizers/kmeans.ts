import { packLabels, type KMeansVisual } from '../visual-state.js';
import { rgbToOklab, oklabToRgb } from '../color-math.js';
import type {
  RGB,
  Lab,
  PreparedSample,
  QuantizerConfig,
  CandidateSet,
  MembershipTable,
  ColorCandidate,
  Derivation,
} from '../types.js';
import type { StageContext } from '../run.js';

type KMeansConfig = Extract<QuantizerConfig, { kind: 'kmeans' }>;
const squaredDistance = (a: readonly number[], b: readonly number[]) =>
  (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2;

/** Weighted Lloyd iterations with deterministic farthest-point initialization.
 * Physical area and fitting influence remain separate throughout the stage.
 */
export function quantizeKMeans(
  samples: readonly PreparedSample[],
  config: KMeansConfig,
  context: StageContext = {},
  invocationId = `kmeans-${config.space}`,
): CandidateSet {
  context.signal?.throwIfAborted();
  if (
    !Number.isSafeInteger(config.candidates) ||
    config.candidates < 1 ||
    !Number.isSafeInteger(config.iterations) ||
    config.iterations < 1
  )
    throw new RangeError('K-means candidate and iteration counts must be positive safe integers');
  if (!['rgb', 'oklab'].includes(config.space)) throw new TypeError('Unknown K-means color space');
  if (!invocationId.trim()) throw new TypeError('Quantizer invocation ID is required');
  const ids = new Set<string>();
  for (const sample of samples) {
    if (!sample.id || ids.has(sample.id)) throw new TypeError('Prepared sample IDs must be unique');
    ids.add(sample.id);
    if (sample.rgb.length !== 3 || sample.rgb.some((v) => !Number.isInteger(v) || v < 0 || v > 255))
      throw new TypeError('Prepared RGB must contain three byte values');
    if (
      !Number.isFinite(sample.representedArea) ||
      sample.representedArea <= 0 ||
      !Number.isFinite(sample.influence) ||
      sample.influence < 0
    )
      throw new RangeError('Prepared samples require positive area and non-negative influence');
  }

  if (!samples.length) {
    return { candidates: [], derivations: [], memberships: [], diagnostics: [] };
  }
  const eligible = samples.map((s, i) => (s.influence > 0 ? i : -1)).filter((i) => i >= 0);
  if (!eligible.length)
    throw new RangeError('K-means requires at least one positive fitting influence');
  const points = samples.map((s) =>
    config.space === 'oklab' ? rgbToOklab(s.rgb) : ([...s.rgb] as RGB),
  );
  let centers: number[][] = [[...points[eligible[0]]]];
  const seedIndices = [eligible[0]];
  while (centers.length < Math.min(config.candidates, eligible.length)) {
    context.signal?.throwIfAborted();
    let best = -1,
      score = 0;
    for (const i of eligible) {
      const d = Math.min(...centers.map((c) => squaredDistance(points[i], c)));
      if (d > score) {
        score = d;
        best = i;
      }
    }
    if (best < 0) break; // All remaining eligible samples have already represented colors.
    centers.push([...points[best]]);
    seedIndices.push(best);
  }
  const centerIds = centers.map((_, i) => `${invocationId}:center:${i}`);

  function assign(): number[] {
    return points.map((p, i) => {
      if (i % 1024 === 0) context.signal?.throwIfAborted();
      let nearest = 0;
      for (let c = 1; c < centers.length; c++)
        if (squaredDistance(p, centers[c]) < squaredDistance(p, centers[nearest])) nearest = c;
      return nearest;
    });
  }
  const toRgb = (point: readonly number[]): RGB =>
    config.space === 'oklab' ? oklabToRgb(point as Lab) : (point.map((v) => Math.round(v)) as RGB);
  const visual: KMeansVisual | undefined = context.visual
    ? {
        id: invocationId,
        sampleIds: samples.map((s) => s.id),
        centerIds,
        seeds: [...seedIndices],
        initialColors: centers.map(toRgb),
        iterations: [],
      }
    : undefined;
  if (visual) context.visual!.fits.push(visual);
  const averagingMembers = seedIndices.map((index) => [index]);
  let converged = false;
  for (let iteration = 0; iteration < config.iterations; iteration++) {
    context.signal?.throwIfAborted();
    const labels = assign();
    const sums = centers.map(() => [0, 0, 0]);
    const influence = centers.map(() => 0);
    for (let i = 0; i < samples.length; i++) {
      const c = labels[i],
        sample = samples[i];
      influence[c] += sample.influence;
      for (let channel = 0; channel < 3; channel++)
        sums[c][channel] += points[i][channel] * sample.influence;
    }
    const next = centers.map((c, i) =>
      influence[i] ? sums[i].map((v) => v / influence[i]) : [...c],
    );

    visual?.iterations.push({ assignments: packLabels(labels), colors: next.map(toRgb) });
    converged = next.every((c, i) => squaredDistance(c, centers[i]) <= 1e-12);
    for (let c = 0; c < centers.length; c++) {
      if (influence[c] > 0)
        averagingMembers[c] = labels.flatMap((label, i) => (label === c ? [i] : []));
    }
    centers = next;
    if (converged) break;
  }
  // Final nearest-center populations can differ from the memberships that produced
  // the last arithmetic means if the iteration limit was reached. Keep both tables.
  const finalLabels = assign();
  if (visual) {
    visual.finalAssignments = packLabels(finalLabels);
    visual.stop = converged ? 'converged' : 'iteration-limit';
  }
  function membership(
    id: string,
    groupsOfIndices: readonly (readonly number[])[],
  ): MembershipTable {
    const memberIds: string[] = [];
    const groups = centerIds.map((centerId, c) => {
      const start = memberIds.length;
      for (const i of groupsOfIndices[c]) memberIds.push(samples[i].id);
      return { id: centerId, start, length: memberIds.length - start };
    });
    return { id, memberIds, groups };
  }
  const averages = membership(`${invocationId}:averaging-members`, averagingMembers);
  const represented = membership(
    `${invocationId}:represented-members`,
    centerIds.map((_, c) => finalLabels.flatMap((label, i) => (label === c ? [i] : []))),
  );
  const populations = centers.map(() => 0),
    influences = centers.map(() => 0);
  for (let i = 0; i < samples.length; i++) {
    populations[finalLabels[i]] += samples[i].representedArea;
    influences[finalLabels[i]] += samples[i].influence;
  }
  const derivations: Derivation[] = centers.map((_, c) => ({
    id: `${centerIds[c]}:derivation`,
    operation: 'average',
    inputs: [{ kind: 'membership', tableId: averages.id, groupId: centerIds[c] }],
  }));
  const candidates: ColorCandidate[] = centers.map((center, c) => {
    const rgb = toRgb(center);
    return {
      id: centerIds[c],
      rgb,
      oklab: rgbToOklab(rgb),
      representedArea: populations[c],
      influence: influences[c],
      derivationId: derivations[c].id,
    };
  });

  context.signal?.throwIfAborted();
  return { candidates, derivations, memberships: [averages, represented], diagnostics: [] };
}

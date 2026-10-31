import type { PipelineConfig, ResolvedConfiguration } from './types.js';
export function resolveConfiguration(
  requested: PipelineConfig,
  presetId?: string,
): ResolvedConfiguration {
  const c = structuredClone(requested);
  const integer = (v: number, min: number, max: number, label: string) => {
    if (!Number.isInteger(v) || v < min || v > max)
      throw new RangeError(`${label} must be an integer from ${min} to ${max}`);
  };
  const number = (v: number, min: number, max: number, label: string) => {
    if (!Number.isFinite(v) || v < min || v > max)
      throw new RangeError(`${label} must be from ${min} to ${max}`);
  };
  if (c.schemaVersion !== 1) throw new TypeError('Unsupported pipeline version');
  if (c.count !== 5 && c.count !== 6) throw new RangeError('Palette count must be 5 or 6');
  integer(c.sampling.maxSamples, 1, 20000, 'Sample budget');
  integer(c.sampling.alphaThreshold, 1, 255, 'Alpha threshold');
  const p = c.preprocessing,
    q = c.quantization,
    s = c.selection;
  if (p.kind === 'edge-weighted') number(p.strength, 0, 20, 'Edge strength');
  else if (p.kind === 'slic') {
    integer(p.maxDimension, 1, 256, 'SLIC dimension');
    integer(p.regions, 1, 1000, 'SLIC regions');
    integer(p.iterations, 1, 50, 'SLIC iterations');
    number(p.compactness, 0.1, 100, 'SLIC compactness');
  } else if (p.kind !== 'none') throw new TypeError('Unknown preprocessing');
  if ('candidates' in q) integer(q.candidates, 1, 64, 'Candidate budget');
  if (q.kind === 'kmeans') {
    integer(q.iterations, 1, 100, 'Iterations');
    if (!['rgb', 'oklab'].includes(q.space)) throw new TypeError('Unknown color space');
  } else if (q.kind === 'medoids') {
    integer(q.iterations, 1, 100, 'Iterations');
    integer(q.maxSamples, 1, 1000, 'Medoid pool');
    if (q.candidates > q.maxSamples)
      throw new RangeError('Medoid candidate budget exceeds representative pool');
  } else if (q.kind === 'mmcq') number(q.populationFraction, 0, 1, 'Population fraction');
  else if (q.kind === 'hue-groups') integer(q.sectors, 1, 360, 'Hue sectors');
  else if (q.kind !== 'original-samples' && q.kind !== 'octree')
    throw new TypeError('Unknown quantizer');
  if (s.kind === 'dominance-separated' || s.kind === 'farthest-point')
    number(s.minSeparation, 0, 2, 'Separation');
  else if (s.kind === 'lightness') {
    number(s.boundaries[0], 0, 1, 'Dark boundary');
    number(s.boundaries[1], s.boundaries[0] + 0.001, 1, 'Light boundary');
    number(s.minWithinBandSeparation, 0, 2, 'Band separation');
  } else if (s.kind !== 'population') throw new TypeError('Unknown selection');
  const resolutions: ResolvedConfiguration['resolutions'][number][] = [];
  let effective = c;
  if (s.kind === 'lightness' && c.strategy.kind === 'standard') {
    effective = { ...c, strategy: { kind: 'stratified' } };
    resolutions.push({
      stage: 'selection',
      severity: 'info',
      code: 'lightness-requires-stratified',
      entityIds: [],
      measurements: {},
    });
  }
  if (effective.strategy.kind === 'stratified' && s.kind !== 'lightness')
    throw new TypeError('Stratified quantization requires lightness selection');
  if (effective.strategy.kind === 'adaptive-k') {
    if (q.kind !== 'kmeans') throw new TypeError('Adaptive K requires K-means');
    if (s.kind === 'lightness')
      throw new TypeError('Adaptive K cannot supply per-band lightness quantization');
    integer(effective.strategy.minK, 1, q.candidates, 'Adaptive minimum K');
    integer(effective.strategy.maxK, effective.strategy.minK, q.candidates, 'Adaptive maximum K');
    number(effective.strategy.improvementThreshold, 0, 1, 'Improvement threshold');
  } else if (!['standard', 'stratified'].includes(effective.strategy.kind))
    throw new TypeError('Unknown strategy');
  if (!['off', 'nearest-original-sample'].includes(c.postprocessing.snapping))
    throw new TypeError('Unknown snapping policy');
  if (c.postprocessing.missingColors.kind === 'relax-separation') {
    number(c.postprocessing.missingColors.minimum, 0, 2, 'Relaxed separation');
    const initial =
      s.kind === 'population'
        ? 0
        : s.kind === 'lightness'
          ? s.minWithinBandSeparation
          : s.minSeparation;
    if (c.postprocessing.missingColors.minimum > initial)
      throw new RangeError('Relaxed separation cannot exceed requested separation');
  } else if (c.postprocessing.missingColors.kind !== 'return-fewer')
    throw new TypeError('Unknown missing-color policy');
  return {
    requested: structuredClone(requested),
    effective,
    resolutions,
    ...(presetId ? { presetId } : {}),
  };
}

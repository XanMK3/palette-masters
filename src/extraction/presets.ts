import type { PipelineConfig, PaletteSize } from './types.js';
export const PRESET_IDS = [
  'oklab-kmeans-auto',
  'hue-auto',
  'octree-auto',
  'slic-samples-farthest',
  'medoids-dominance',
  'edge-medoids-farthest',
] as const;
export type PresetId = (typeof PRESET_IDS)[number];
export const DEFAULT_PRESET: PresetId = PRESET_IDS[0];
export const PRESET_VERSION = 3;
export const PRESET_LABELS: Record<PresetId, string> = {
  'oklab-kmeans-auto': 'Oklab K-means · Auto selection',
  'hue-auto': 'Hue groups · Auto selection',
  'octree-auto': 'Octree · Auto selection',
  'slic-samples-farthest': 'SLIC + Original samples + Farthest',
  'medoids-dominance': 'None + Medoids + Dominance',
  'edge-medoids-farthest': 'Edge-weighted + Medoids + Farthest',
};
export function presetVariants(id: PresetId, count: PaletteSize = 5): PipelineConfig[] {
  if (!PRESET_IDS.includes(id)) throw new TypeError('Unknown extraction method');
  const base: PipelineConfig = {
    schemaVersion: 1,
    count,
    sampling: { maxSamples: 4000, alphaThreshold: 192 },
    preprocessing: { kind: 'none' },
    quantization:
      id === 'hue-auto'
        ? { kind: 'hue-groups', sectors: 12 }
        : id === 'octree-auto'
          ? { kind: 'octree', candidates: count * 3 }
          : { kind: 'kmeans', space: 'oklab', candidates: count * 3, iterations: 12 },
    selection: { kind: 'dominance-separated', minSeparation: id === 'hue-auto' ? 0.085 : 0.024 },
    strategy: { kind: 'standard' },
    postprocessing: { snapping: 'off', missingColors: { kind: 'return-fewer' } },
  };
  if (id === 'slic-samples-farthest')
    return [
      {
        ...base,
        preprocessing: {
          kind: 'slic',
          maxDimension: 160,
          regions: 200,
          compactness: 10,
          iterations: 10,
        },
        quantization: { kind: 'original-samples' },
        selection: { kind: 'farthest-point', minSeparation: 0.015 },
      },
    ];
  if (id === 'medoids-dominance' || id === 'edge-medoids-farthest')
    return [
      {
        ...base,
        preprocessing:
          id === 'edge-medoids-farthest'
            ? { kind: 'edge-weighted', strength: 1 }
            : { kind: 'none' },
        quantization: { kind: 'medoids', candidates: count * 3, maxSamples: 600, iterations: 20 },
        selection:
          id === 'edge-medoids-farthest'
            ? { kind: 'farthest-point', minSeparation: 0.015 }
            : { kind: 'dominance-separated', minSeparation: 0.06 },
      },
    ];
  return id === 'hue-auto'
    ? [
        {
          ...base,
          strategy: { kind: 'stratified' },
          selection: { kind: 'lightness', boundaries: [0.4, 0.7], minWithinBandSeparation: 0.06 },
        },
        base,
      ]
    : [base, { ...base, selection: { kind: 'farthest-point', minSeparation: 0.015 } }];
}
/** Starting configuration for manual editing; automatic extraction evaluates both variants. */
export function presetConfig(id: PresetId, count: PaletteSize = 5): PipelineConfig {
  return presetVariants(id, count)[0];
}
export function pipelineSummary(c: PipelineConfig): string {
  const quantizer =
    c.quantization.kind === 'kmeans'
      ? `${c.quantization.space === 'rgb' ? 'RGB' : 'Oklab'} K-means`
      : c.quantization.kind === 'medoids'
        ? 'Oklab medoids'
        : c.quantization.kind === 'hue-groups'
          ? 'Hue groups'
          : c.quantization.kind === 'original-samples'
            ? 'Sampled colors'
            : c.quantization.kind === 'mmcq'
              ? 'MMCQ'
              : 'Octree';
  const selection = {
    population: 'Population ranking',
    'dominance-separated': 'Population + separation',
    'farthest-point': 'Farthest-point selection',
    lightness: 'Lightness coverage',
  }[c.selection.kind];
  const preprocessing =
    c.preprocessing.kind === 'none'
      ? ''
      : c.preprocessing.kind === 'slic'
        ? 'SLIC regions → '
        : 'Edge influence → ';
  const strategy =
    c.strategy.kind === 'standard'
      ? ''
      : c.strategy.kind === 'stratified'
        ? 'Per-band '
        : 'Adaptive ';
  return `Original sampling → ${preprocessing}${strategy}${quantizer} → ${selection} → ${c.postprocessing.snapping === 'off' ? 'Validate' : 'Snap + validate'}`;
}

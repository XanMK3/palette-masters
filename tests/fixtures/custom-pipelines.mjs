// Explicit custom configurations for algorithm regression tests; these are not application presets.
export const CUSTOM_CASES = [
  'kmeans',
  'oklab-kmeans',
  'mmcq',
  'octree',
  'hue-oklab',
  'edge-weighted',
  'slic',
  'adaptive',
  'oklab-kmedoids',
  'oklab-farthest',
  'dominance-medoids',
  'lightness-medoids',
];
export const CUSTOM_CASE_VERSION = 1;
export function customPipelineConfig(id, count = 5) {
  if (!CUSTOM_CASES.includes(id)) throw new TypeError('Unknown extraction method');
  const base = {
    schemaVersion: 1,
    count,
    sampling: { maxSamples: 4000, alphaThreshold: 192 },
    preprocessing: { kind: 'none' },
    quantization: { kind: 'kmeans', space: 'rgb', candidates: count * 3, iterations: 12 },
    selection: { kind: 'dominance-separated', minSeparation: 0.024 },
    strategy: { kind: 'standard' },
    postprocessing: { snapping: 'off', missingColors: { kind: 'return-fewer' } },
  };
  switch (id) {
    case 'oklab-kmeans':
      return {
        ...base,
        quantization: { kind: 'kmeans', space: 'oklab', candidates: count * 3, iterations: 12 },
      };
    case 'mmcq':
      return {
        ...base,
        quantization: { kind: 'mmcq', candidates: count * 3, populationFraction: 0.75 },
      };
    case 'octree':
      return { ...base, quantization: { kind: 'octree', candidates: count * 3 } };
    case 'hue-oklab':
      return {
        ...base,
        quantization: { kind: 'hue-groups', sectors: 12 },
        selection: { kind: 'dominance-separated', minSeparation: 0.085 },
      };
    case 'edge-weighted':
      return { ...base, preprocessing: { kind: 'edge-weighted', strength: 1 } };
    case 'slic':
      return {
        ...base,
        preprocessing: {
          kind: 'slic',
          maxDimension: 160,
          regions: 200,
          compactness: 10,
          iterations: 10,
        },
        quantization: { kind: 'kmeans', space: 'oklab', candidates: count * 3, iterations: 12 },
      };
    case 'adaptive':
      return {
        ...base,
        quantization: { kind: 'kmeans', space: 'rgb', candidates: 18, iterations: 12 },
        strategy: { kind: 'adaptive-k', minK: count, maxK: 18, improvementThreshold: 0.11 },
      };
    case 'oklab-kmedoids':
      return {
        ...base,
        quantization: { kind: 'medoids', candidates: count * 3, maxSamples: 600, iterations: 20 },
      };
    case 'dominance-medoids':
      return {
        ...base,
        quantization: { kind: 'medoids', candidates: count * 3, maxSamples: 600, iterations: 20 },
        selection: { kind: 'dominance-separated', minSeparation: 0.06 },
      };
    case 'lightness-medoids':
      return {
        ...base,
        quantization: { kind: 'medoids', candidates: count * 3, maxSamples: 600, iterations: 20 },
        strategy: { kind: 'stratified' },
        selection: { kind: 'lightness', boundaries: [0.4, 0.7], minWithinBandSeparation: 0.06 },
      };
    case 'oklab-farthest':
      return {
        ...base,
        quantization: { kind: 'original-samples' },
        selection: { kind: 'farthest-point', minSeparation: 0.015 },
      };
    default:
      return base;
  }
}

import { choosePalette } from './theme/quality.js';
/** Compatibility boundary: all application extraction uses the composable pipeline. */
import { extractPipeline, type PipelineResult } from './extraction/pipeline.js';
import {
  presetConfig,
  presetVariants,
  DEFAULT_PRESET,
  type PresetId,
} from './extraction/presets.js';
import { quantizeMMCQ } from './extraction/quantizers/mmcq.js';
import { quantizeOctree } from './extraction/quantizers/octree.js';
import { quantizeMedoids } from './extraction/quantizers/medoids.js';
import { generateCandidates } from './extraction/strategies/generate.js';
import { selectRepresentatives } from './extraction/selection/select.js';
import { originalCandidates } from './extraction/shared.js';
import { rgbToHex } from './extraction/color-math.js';
import type {
  RGB,
  PaletteSize,
  PipelineConfig,
  RasterData,
  PreparedSample,
} from './extraction/types.js';
import type { StageContext } from './extraction/run.js';
export {
  rgbToHex,
  hexToRgb,
  rgbToOklab,
  oklabToRgb,
  relativeLuminance,
  contrastRatio,
} from './extraction/color-math.js';
export type { RGB, Lab } from './extraction/types.js';
export type PaletteMethod = PresetId;
export type PaletteCount = PaletteSize;
export interface PaletteOptions {
  count?: PaletteCount;
  method?: PaletteMethod;
  configuration?: PipelineConfig;
}
export interface PaletteResult extends PipelineResult {
  colors: string[];
  method: PaletteMethod;
  count: PaletteCount;
  sampledPixels: number;
}
export function extractPalette(
  image: RasterData,
  options: PaletteOptions = {},
  context: StageContext = {},
): PaletteResult {
  const method = options.method ?? DEFAULT_PRESET;
  const configuration = options.configuration ?? presetConfig(method, options.count ?? 5);
  const result = options.configuration
    ? extractPipeline(image, configuration, context, undefined)
    : choosePalette(
        presetVariants(method, options.count ?? 5).map((config) =>
          extractPipeline(image, config, context, method),
        ),
      );
  return {
    ...result,
    colors: result.swatches.map((s) => rgbToHex(s.rgb)),
    method,
    count: configuration.count,
    sampledPixels: result.originalSamples.samples.length,
  };
}
const prepared = (pixels: RGB[]): PreparedSample[] =>
  pixels.map((rgb, i) => ({
    id: `sample:${i}`,
    rgb,
    representedArea: 1,
    influence: 1,
    originalSampleId: `sample:${i}`,
    derivationId: `sample:${i}:source`,
  }));
export const mmcq = (pixels: RGB[], count: number) =>
  quantizeMMCQ(prepared(pixels), {
    kind: 'mmcq',
    candidates: count,
    populationFraction: 0.75,
  }).candidates.map((c) => c.rgb);
export const octree = (pixels: RGB[], count: number) =>
  quantizeOctree(prepared(pixels), count).candidates.map((c) => c.rgb);
export const oklabMedoids = (pixels: RGB[], count: number) =>
  quantizeMedoids(prepared(pixels), {
    kind: 'medoids',
    candidates: count,
    maxSamples: 600,
    iterations: 20,
  }).candidates.map((c) => c.rgb);
export function oklabFarthest(pixels: RGB[], count: number): RGB[] {
  const set = originalCandidates(prepared(pixels));
  const result = selectRepresentatives(set, count, {
    kind: 'farthest-point',
    minSeparation: 0.015,
  });
  return result.selectedIds.map((id) => set.candidates.find((c) => c.id === id)!.rgb);
}
export function dominanceMedoids(pixels: RGB[], count: number): RGB[] {
  const set = quantizeMedoids(prepared(pixels), {
    kind: 'medoids',
    candidates: count * 3,
    maxSamples: 600,
    iterations: 20,
  });
  const result = selectRepresentatives(set, count, {
    kind: 'dominance-separated',
    minSeparation: 0.06,
  });
  return result.selectedIds.map((id) => set.candidates.find((c) => c.id === id)!.rgb);
}
export function lightnessMedoids(pixels: RGB[], count: number): RGB[] {
  const config: PipelineConfig = {
    ...presetConfig('oklab-kmeans-auto'),
    quantization: { kind: 'medoids', candidates: 15, maxSamples: 600, iterations: 20 },
    strategy: { kind: 'stratified' },
    selection: { kind: 'lightness', boundaries: [0.4, 0.7], minWithinBandSeparation: 0.06 },
  };
  const set = generateCandidates(prepared(pixels), config);
  const result = selectRepresentatives(set, count, config.selection);
  return result.selectedIds.map((id) => set.candidates.find((c) => c.id === id)!.rgb);
}

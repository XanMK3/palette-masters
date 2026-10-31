import type {
  OriginalSampleSet,
  RasterData,
  Sample,
  SamplingConfig,
  SamplingStats,
} from '../types.js';
import type { StageContext } from '../run.js';

export const DEFAULT_SAMPLING_CONFIG: SamplingConfig = { maxSamples: 4000, alphaThreshold: 192 };

/** Sample over eligible-pixel order, not raw raster stride, so sparse opaque inputs survive.
 * Each chosen pixel represents its consecutive block of eligible pixels. The final
 * block may be shorter. Population is exact for these blocks; colors are estimates.
 */
export function sampleOriginalPixels(
  image: RasterData,
  config: SamplingConfig = DEFAULT_SAMPLING_CONFIG,
  context: StageContext = {},
): OriginalSampleSet {
  context.signal?.throwIfAborted();
  if (
    !image ||
    !Number.isSafeInteger(image.width) ||
    !Number.isSafeInteger(image.height) ||
    image.width < 1 ||
    image.height < 1 ||
    !Number.isSafeInteger(image.width * image.height) ||
    !(image.data instanceof Uint8ClampedArray) ||
    image.data.length < image.width * image.height * 4
  )
    throw new TypeError('Valid ImageData-compatible raster is required');
  if (!Number.isSafeInteger(config.maxSamples) || config.maxSamples < 1)
    throw new RangeError('Sample budget must be a positive safe integer');
  if (
    !Number.isInteger(config.alphaThreshold) ||
    config.alphaThreshold < 1 ||
    config.alphaThreshold > 255
  )
    throw new RangeError('Alpha threshold must be an integer from 1 to 255');
  const totalPixels = image.width * image.height;

  let eligiblePixels = 0;
  for (let p = 0; p < totalPixels; p++) {
    if (p % 1024 === 0) context.signal?.throwIfAborted();
    if (image.data[p * 4 + 3] >= config.alphaThreshold) eligiblePixels++;
  }
  const stride = Math.max(1, Math.ceil(eligiblePixels / config.maxSamples));
  const samples: Sample[] = [];
  let ordinal = 0;
  for (let p = 0; p < totalPixels; p++) {
    if (p % 1024 === 0) context.signal?.throwIfAborted();
    if (image.data[p * 4 + 3] < config.alphaThreshold) {
      continue;
    }
    if (ordinal % stride === 0) {
      const representedArea = Math.min(stride, eligiblePixels - ordinal);
      const sample: Sample = {
        id: `sample:${p}`,
        rgb: [image.data[p * 4], image.data[p * 4 + 1], image.data[p * 4 + 2]],
        source: { pixelIndex: p, x: p % image.width, y: Math.floor(p / image.width) },
        representedArea,
        influence: representedArea,
        eligibleRange: { start: ordinal, count: representedArea },
      };
      samples.push(sample);
    }
    ordinal++;
  }
  context.signal?.throwIfAborted();
  const stats: SamplingStats = {
    totalPixels,
    eligiblePixels,
    excludedAlphaPixels: totalPixels - eligiblePixels,
    unsampledEligiblePixels: eligiblePixels - samples.length,
    sampledPixels: samples.length,
    representedArea: eligiblePixels,
  };

  context.signal?.throwIfAborted();
  return { width: image.width, height: image.height, config: { ...config }, samples, stats };
}

// Keep regression coverage for custom algorithms that are no longer named presets.
export * from '../../.cache/tests/palette.service.js';
import { extractPalette as extract } from '../../.cache/tests/palette.service.js';
import {
  PRESET_IDS,
  presetConfig as currentPreset,
} from '../../.cache/tests/extraction/presets.js';
import { CUSTOM_CASES, customPipelineConfig } from './custom-pipelines.mjs';
export function presetConfig(id, count = 5) {
  return PRESET_IDS.includes(id) ? currentPreset(id, count) : customPipelineConfig(id, count);
}
export function extractPalette(image, options = {}, context = {}) {
  if (CUSTOM_CASES.includes(options.method))
    return extract(
      image,
      {
        ...options,
        method: undefined,
        configuration:
          options.configuration ?? customPipelineConfig(options.method, options.count ?? 5),
      },
      context,
    );
  return extract(image, options, context);
}

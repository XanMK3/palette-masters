import type { PipelineResult } from '../extraction/pipeline.js';
import { rgbToHex, rgbToOklab, hexToRgb } from '../extraction/color-math.js';
import { buildPaletteTheme } from './pipeline.js';
import { TEMPLATE_USAGE } from './validation.js';
const distance = (a: readonly number[], b: readonly number[]) =>
  Math.hypot(...a.map((v, i) => v - b[i]));
/** Lower is better, lexicographically. These are product heuristics, not aesthetic judgments. */
export function paletteQuality(palette: PipelineResult): readonly number[] {
  let failures = 0,
    hierarchy = 0,
    corrections = 0;
  for (const manifest of Object.values(TEMPLATE_USAGE)) {
    const { theme } = buildPaletteTheme(palette, manifest);
    failures += [...theme.mapping.checks, ...theme.renderedChecks].filter((c) => !c.passed).length;
    const role = (name: string) => rgbToOklab(hexToRgb(theme.tokens[`--color-${name}`]));
    // Reward a distinguishable accent and supporting colors; cap rewards to avoid chasing extremes.
    for (const [a, b] of [
      ['accent', 'bg'],
      ['accent', 'surface'],
      ['accent', 'secondary'],
      ['secondary', 'tertiary'],
    ])
      hierarchy += Math.max(0, 0.1 - distance(role(a), role(b)));
    for (const [token, metadata] of Object.entries(theme.derivedTokens))
      corrections += distance(rgbToOklab(hexToRgb(theme.tokens[token])), role(metadata.sources[0]));
  }
  const colors = palette.swatches.map((s) => rgbToOklab(s.rgb));
  let error = 0,
    area = 0;
  for (const sample of palette.originalSamples.samples) {
    error +=
      sample.representedArea * Math.min(...colors.map((c) => distance(rgbToOklab(sample.rgb), c)));
    area += sample.representedArea;
  }
  return [failures, hierarchy, corrections, error / area];
}
export function compareQuality(a: readonly number[], b: readonly number[]): number {
  for (let i = 0; i < a.length; i++) if (Math.abs(a[i] - b[i]) > 1e-9) return a[i] - b[i];
  return 0;
}
export function choosePalette(results: PipelineResult[]): PipelineResult {
  if (results.length === 1) return results[0];
  const alternatives = results.map((result) => ({
    selection: result.configuration.effective.selection.kind,
    colors: result.swatches.map((s) => rgbToHex(s.rgb)),
    score: paletteQuality(result),
  }));
  let winner = 0;
  for (let i = 1; i < results.length; i++)
    if (compareQuality(alternatives[i].score, alternatives[winner].score) < 0) winner = i;
  return { ...results[winner], autoSelection: { winner, alternatives } };
}

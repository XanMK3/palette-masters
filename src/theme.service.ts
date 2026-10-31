import { applyThemeTokens } from './theme/runtime.js';
import { mapRoles, type MappingResult } from './theme/mapping.js';
import { TEMPLATE_USAGE, validateRenderedTokens, type UsageManifest } from './theme/validation.js';
import type { StageContext } from './extraction/run.js';
import type { MappingCheck } from './extraction/types.js';
/** Base roles always retain sampled colors; readable foregrounds are separate tokens. */
import { contrastRatio, hexToRgb, rgbToHex } from './extraction/color-math.js';
export const ROLE_KEYS = ['bg', 'surface', 'text', 'accent', 'secondary', 'tertiary'] as const;
export type ThemeRoleKey = (typeof ROLE_KEYS)[number];
export type RoleAssignments = Record<ThemeRoleKey, number>;
export interface ArtTheme {
  colors: string[];
  assignments: RoleAssignments;
  tokens: Record<string, string>;
  contrast: number;
  textGuardApplied: boolean;
  mapping: MappingResult;
  renderedChecks: MappingCheck[];
  derivedTokens: Record<string, { sources: ThemeRoleKey[]; reason: string }>;
}
export const DEFAULT_PALETTE = ['#0F172A', '#1E293B', '#F8FAFC', '#38BDF8', '#818CF8', '#F43F5E'];
export const chooseText = (bg: string) =>
  contrastRatio(bg, '#000000') >= contrastRatio(bg, '#FFFFFF') ? '#000000' : '#FFFFFF';
const safeText = (bg: string, preferred: string) =>
  contrastRatio(bg, preferred) >= 4.5 ? preferred : chooseText(bg);
function mutedText(bg: string, text: string): string {
  const a = hexToRgb(text),
    b = hexToRgb(bg);
  for (let step = 35; step >= 0; step--) {
    const amount = step / 100;
    const color = rgbToHex([
      a[0] * (1 - amount) + b[0] * amount,
      a[1] * (1 - amount) + b[1] * amount,
      a[2] * (1 - amount) + b[2] * amount,
    ]);
    if (contrastRatio(bg, color) >= 4.5) return color;
  }
  return text;
}
export function defaultAssignments(colors: string[]): RoleAssignments {
  return mapRoles(colors).assignments;
}

export function reassignRole(
  assignments: RoleAssignments,
  role: ThemeRoleKey,
  index: number,
  size: number,
): RoleAssignments {
  if (!Number.isInteger(index) || index < 0 || index >= size)
    throw new RangeError('Invalid palette index');
  const next = { ...assignments };
  const active = ROLE_KEYS.slice(0, size >= 6 ? 6 : 5);
  if (!active.includes(role)) return next;
  const other = active.find((key) => key !== role && next[key] === index);
  if (other) next[other] = next[role];
  next[role] = index;
  if (size < 6) next.tertiary = next.secondary;
  return next;
}
export function shuffleAssignments(
  assignments: RoleAssignments,
  size: number,
  random: () => number = Math.random,
): RoleAssignments {
  const keys = ROLE_KEYS.slice(0, size >= 6 ? 6 : 5);
  const values = keys.map((key) => assignments[key]);
  for (let i = values.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [values[i], values[j]] = [values[j], values[i]];
  }
  if (values.every((value, i) => value === assignments[keys[i]])) values.push(values.shift()!);
  const next = { ...assignments };
  keys.forEach((key, i) => {
    next[key] = values[i];
  });
  if (size < 6) next.tertiary = next.secondary;
  return next;
}
export function createTheme(
  colors: string[],
  assignments?: RoleAssignments,
  manifest: UsageManifest = TEMPLATE_USAGE.landing,
  context: StageContext = {},
): ArtTheme {
  if (!colors.length) throw new TypeError('Palette must contain sampled colors');
  const normalized =
    assignments && colors.length < 6
      ? { ...assignments, tertiary: assignments.secondary }
      : assignments;
  const mappingResult = mapRoles(colors, manifest, context, normalized);
  const mapping = { ...mappingResult.assignments };
  if (colors.length < 6) mapping.tertiary = mapping.secondary;
  for (const index of Object.values(mapping))
    if (!Number.isInteger(index) || index < 0 || index >= colors.length)
      throw new RangeError('Invalid role assignment');
  const tokens: Record<string, string> = {};
  const pairs: string[][] = [];
  for (const role of ROLE_KEYS) tokens[`--color-${role}`] = colors[mapping[role]];
  const preferred = colors[mapping.text];
  for (const role of ['bg', 'surface', 'accent', 'secondary', 'tertiary'] as const) {
    const bg = colors[mapping[role]],
      fg = safeText(bg, preferred),
      muted = mutedText(bg, fg);
    tokens[`--color-${role}-text-contrast`] = fg;
    tokens[`--color-${role}-text-muted`] = muted;
    pairs.push([bg, fg], [bg, muted]);
    // Colored text uses the sampled accent when readable, otherwise a safe foreground.
    for (const accent of ['accent', 'secondary', 'tertiary'] as const) {
      const color = safeText(bg, colors[mapping[accent]]);
      tokens[`--color-${accent}-on-${role}`] = color;
      pairs.push([bg, color]);
    }
  }
  tokens['--color-text-main'] = tokens['--color-bg-text-contrast'];
  tokens['--color-text-secondary'] = tokens['--color-bg-text-muted'];
  tokens['--color-text-muted'] = tokens['--color-bg-text-muted'];
  colors.forEach((color, i) => {
    tokens[`--palette-${i + 1}`] = color;
  });
  const derivedTokens: ArtTheme['derivedTokens'] = {};
  for (const [token, value] of Object.entries(tokens)) {
    if (ROLE_KEYS.some((role) => token === `--color-${role}`) || token.startsWith('--palette-'))
      continue;
    const background =
      (['bg', 'surface', 'accent', 'secondary', 'tertiary'] as const).find(
        (role) => token.includes(`-${role}-text-`) || token.endsWith(`-on-${role}`),
      ) ?? 'bg';
    const foreground =
      (['accent', 'secondary', 'tertiary'] as const).find((role) =>
        token.startsWith(`--color-${role}-on-`),
      ) ?? 'text';
    derivedTokens[token] = {
      sources: [foreground, background],
      reason: value === colors[mapping[foreground]] ? 'retained-foreground' : 'contextual-contrast',
    };
  }
  const renderedChecks = validateRenderedTokens(tokens, manifest);
  return {
    mapping: mappingResult,
    renderedChecks,
    derivedTokens,
    colors: [...colors],
    assignments: mapping,
    tokens,
    contrast: Math.min(...pairs.map(([bg, fg]) => contrastRatio(bg, fg))),
    textGuardApplied: ['bg', 'surface', 'accent', 'secondary', 'tertiary'].some(
      (role) => tokens[`--color-${role}-text-contrast`] !== preferred,
    ),
  };
}
export const DEFAULT_THEME = createTheme(DEFAULT_PALETTE).tokens;
export function applyTheme(element: HTMLElement, theme: ArtTheme): void {
  applyThemeTokens(element, theme.tokens);
}

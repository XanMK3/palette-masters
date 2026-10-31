import { contrastRatio } from '../extraction/color-math.js';
import type { MappingCheck, ThemeRole } from '../extraction/types.js';
export const ROLES = ['bg', 'surface', 'text', 'accent', 'secondary', 'tertiary'] as const;
export type Assignments = Record<ThemeRole, number>;
export interface UsageRequirement {
  roles: readonly [ThemeRole, ThemeRole];
  target: number;
  kind: 'text' | 'distinction';
  cueAvailable?: boolean;
}
export interface UsageManifest {
  id: string;
  version: number;
  requirements: readonly UsageRequirement[];
  renderedBackgrounds: readonly ThemeRole[];
}
const base: readonly UsageRequirement[] = [
  { roles: ['text', 'bg'], target: 4.5, kind: 'text' },
  { roles: ['text', 'surface'], target: 4.5, kind: 'text' },
];
/** Bundled templates use contextual foreground tokens on colored panels. Their
 * borders are decorative; no universal background/surface distinction is required. */
export const TEMPLATE_USAGE: Record<'landing' | 'magazine' | 'poster', UsageManifest> = {
  landing: {
    id: 'landing',
    version: 1,
    requirements: base,
    renderedBackgrounds: ['bg', 'surface', 'accent', 'secondary', 'tertiary'],
  },
  magazine: {
    id: 'magazine',
    version: 1,
    requirements: base,
    renderedBackgrounds: ['bg', 'surface', 'accent', 'secondary', 'tertiary'],
  },
  poster: {
    id: 'poster',
    version: 1,
    requirements: base,
    renderedBackgrounds: ['bg', 'surface', 'accent', 'secondary', 'tertiary'],
  },
};
export function validateMapping(
  colors: readonly string[],
  mapping: Assignments,
  manifest: UsageManifest,
): MappingCheck[] {
  if (!colors.length || colors.some((c) => !/^#[0-9a-f]{6}$/i.test(c)))
    throw new TypeError('Valid palette colors required');
  for (const role of ROLES)
    if (!Number.isInteger(mapping[role]) || mapping[role] < 0 || mapping[role] >= colors.length)
      throw new RangeError('Invalid role assignment');
  return manifest.requirements.map((r) => {
    if (!Number.isFinite(r.target) || r.target < 1 || r.target > 21)
      throw new RangeError('Invalid contrast requirement');
    const actual = contrastRatio(colors[mapping[r.roles[0]]], colors[mapping[r.roles[1]]]);
    return {
      roles: [...r.roles],
      code: `${r.kind}-contrast`,
      actual,
      required: r.target,
      passed: actual >= r.target || (r.kind === 'distinction' && r.cueAvailable === true),
    };
  });
}
export function validateRenderedTokens(
  tokens: Record<string, string>,
  manifest: UsageManifest,
): MappingCheck[] {
  return manifest.renderedBackgrounds.flatMap((role) => {
    const usages = [
      ...['text-contrast', 'text-muted'].map((suffix) => ({
        foreground: 'text' as ThemeRole,
        token: `--color-${role}-${suffix}`,
      })),
      ...(['accent', 'secondary', 'tertiary'] as const).map((foreground) => ({
        foreground,
        token: `--color-${foreground}-on-${role}`,
      })),
    ];
    return usages.map(({ foreground, token }) => {
      const actual = contrastRatio(tokens[`--color-${role}`], tokens[token]);
      return {
        roles: [foreground, role],
        code: `rendered-${token}`,
        actual,
        required: 4.5,
        passed: actual >= 4.5,
      };
    });
  });
}

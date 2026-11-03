import type { PipelineResult } from '../extraction/pipeline.js';
import type { StageContext } from '../extraction/run.js';
import type { ThemeResult, ThemeRole } from '../extraction/types.js';
import { rgbToHex, hexToRgb } from '../extraction/color-math.js';
import { createTheme, ROLE_KEYS, type RoleAssignments } from '../theme.service.js';
import { TEMPLATE_USAGE, type UsageManifest } from './validation.js';
export function buildPaletteTheme(
  palette: Pick<PipelineResult, 'swatches'>,
  manifest: UsageManifest = TEMPLATE_USAGE.landing,
  context: StageContext = {},
  user?: RoleAssignments,
) {
  const colors = palette.swatches.map((s) => rgbToHex(s.rgb));
  const theme = createTheme(colors, user, manifest, context);
  const roleSwatchIds = Object.fromEntries(
    ROLE_KEYS.map((role) => [role, palette.swatches[theme.assignments[role]].id]),
  ) as Record<ThemeRole, string>;
  const derivations = Object.entries(theme.derivedTokens).map(([token, metadata]) => ({
    id: `token:${token}`,
    operation: 'derive-token' as const,
    reason: metadata.reason,
    inputs: metadata.sources.map((role) => ({ kind: 'entity' as const, id: roleSwatchIds[role] })),
  }));
  const result: ThemeResult = {
    roleSwatchIds,
    aliases: theme.mapping.aliases,
    explanation: theme.mapping.explanation,
    requestedPolicy: user ? 'user' : 'strict-dominance',
    appliedPolicy: theme.mapping.appliedPolicy,
    checks: [...theme.mapping.checks, ...theme.renderedChecks],
    diagnostics: theme.mapping.checks
      .filter((c) => !c.passed)
      .map((c) => ({
        stage: 'theme',
        severity: 'warning',
        code: c.code,
        entityIds: c.roles.map((r) => roleSwatchIds[r]),
        measurements: { actual: c.actual, required: c.required },
      })),
    tokens: Object.fromEntries(
      Object.entries(theme.tokens).map(([token, value]) => [
        token,
        {
          rgb: hexToRgb(value),
          derivationId: theme.derivedTokens[token]
            ? `token:${token}`
            : (palette.swatches[
                ROLE_KEYS.includes(token.replace('--color-', '') as ThemeRole)
                  ? theme.assignments[token.replace('--color-', '') as ThemeRole]
                  : Number(token.replace('--palette-', '')) - 1
              ]?.derivationId ?? palette.swatches[0].derivationId),
        },
      ]),
    ),
    derivations,
  };
  return { theme, result };
}

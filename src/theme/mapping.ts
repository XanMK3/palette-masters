import type { StageContext } from '../extraction/run.js';
import type { MappingCheck, ThemeRole } from '../extraction/types.js';
import {
  ROLES,
  TEMPLATE_USAGE,
  validateMapping,
  type Assignments,
  type UsageManifest,
} from './validation.js';
export interface MappingResult {
  assignments: Assignments;
  appliedPolicy: 'strict-dominance' | 'dominance-aware' | 'user';
  checks: MappingCheck[];
  strictChecks: MappingCheck[];
  aliases: Partial<Record<ThemeRole, ThemeRole>>;
  unresolved: boolean;
  explanation: string;
}
export function strictAssignments(
  size: number,
  order = Array.from({ length: size }, (_, i) => i),
): Assignments {
  if (
    size < 1 ||
    size > 6 ||
    order.length !== size ||
    new Set(order).size !== size ||
    order.some((i) => !Number.isInteger(i) || i < 0 || i >= size)
  )
    throw new RangeError('Invalid palette order');
  return Object.fromEntries(
    ROLES.map((role, i) => [role, order[Math.min(i, size - 1)]]),
  ) as Assignments;
}
function permutations(values: number[]): number[][] {
  return values.length
    ? values.flatMap((v, i) =>
        permutations(values.filter((_, j) => i !== j)).map((rest) => [v, ...rest]),
      )
    : [[]];
}
export function mapRoles(
  colors: readonly string[],
  manifest: UsageManifest = TEMPLATE_USAGE.landing,
  context: StageContext = {},
  user?: Assignments,
  dominanceOrder = colors.map((_, i) => i),
): MappingResult {
  const strict = strictAssignments(colors.length, dominanceOrder),
    strictChecks = validateMapping(colors, strict, manifest);
  let assignments = user ? { ...user } : strict,
    checks = user ? validateMapping(colors, assignments, manifest) : strictChecks;
  let appliedPolicy: MappingResult['appliedPolicy'] = user ? 'user' : 'strict-dominance';
  if (!user && checks.some((c) => !c.passed)) {
    const rank = (index: number) => dominanceOrder.indexOf(index);
    const score = (mapping: Assignments, validation: MappingCheck[]) => {
      const failed = validation.filter((c) => !c.passed);
      const severity = failed.reduce((sum, c) => sum + (c.required - c.actual) / c.required, 0);
      const departure = ROLES.reduce(
        (sum, r, i) => sum + Math.abs(rank(mapping[r]) - Math.min(i, colors.length - 1)),
        0,
      );
      return [
        failed.length,
        severity,
        rank(mapping.surface),
        departure,
        ...ROLES.map((r) => rank(mapping[r])),
      ];
    };
    const compare = (a: number[], b: number[]) => {
      for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return a[i] - b[i];
      return 0;
    };
    let bestScore: number[] | undefined;
    // Automatic mapping keeps the most dominant background even when no raw
    // palette text color works on every panel. Token generation guards each panel.
    for (const remaining of permutations(dominanceOrder.slice(1))) {
      const order = [dominanceOrder[0], ...remaining];
      context.signal?.throwIfAborted();
      const mapping = strictAssignments(colors.length, order),
        validation = validateMapping(colors, mapping, manifest),
        value = score(mapping, validation);
      if (!bestScore || compare(value, bestScore) < 0) {
        bestScore = value;
        assignments = mapping;
        checks = validation;
      }
    }
    appliedPolicy = 'dominance-aware';
  }
  const aliases: MappingResult['aliases'] = {};
  for (let i = 0; i < ROLES.length; i++) {
    const prior = ROLES.slice(0, i).find((r) => assignments[r] === assignments[ROLES[i]]);
    if (prior) aliases[ROLES[i]] = prior;
  }
  const unresolved = checks.some((c) => !c.passed);
  const explanation = unresolved
    ? user
      ? 'Your mapping fails raw role requirements; contextual foreground safeguards are applied.'
      : 'The most dominant color remains the background. Some panels need separate readable foregrounds because no assignment with this background satisfies all raw role requirements.'
    : appliedPolicy === 'dominance-aware'
      ? `Strict ${strictChecks.find((c) => !c.passed)!.roles.join(' / ')} contrast was too low; other roles were reassigned while keeping the most dominant background.`
      : appliedPolicy === 'user'
        ? 'Your role assignments are retained.'
        : 'Roles follow represented-area rank.';

  return { assignments, appliedPolicy, checks, strictChecks, aliases, unresolved, explanation };
}

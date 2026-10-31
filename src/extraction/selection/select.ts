import type {
  CandidateSet,
  ColorCandidate,
  SelectionConfig,
  SelectionDecision,
  SelectionResult,
} from '../types.js';
import type { StageContext } from '../run.js';
import { distance } from '../shared.js';
export const bandOf = (c: ColorCandidate, b: readonly [number, number]) =>
  c.oklab[0] < b[0] ? 0 : c.oklab[0] < b[1] ? 1 : 2;
export function selectRepresentatives(
  set: CandidateSet,
  count: number,
  config: SelectionConfig,
  context: StageContext = {},
): SelectionResult {
  const ranked = [...set.candidates].sort(
    (a, b) => b.representedArea - a.representedArea || a.id.localeCompare(b.id),
  );
  const selected: ColorCandidate[] = [],
    decisions: SelectionDecision[] = [];
  const pending = [...ranked];
  const area = [0, 0, 0];
  if (config.kind === 'lightness')
    for (const c of ranked) area[bandOf(c, config.boundaries)] += c.representedArea;
  while (pending.length) {
    context.signal?.throwIfAborted();
    let index = 0;
    if (config.kind === 'farthest-point' && selected.length && selected.length < count)
      index = pending.reduce(
        (best, c, i) =>
          Math.min(...selected.map((s) => distance(s.oklab, c.oklab))) >
          Math.min(...selected.map((s) => distance(s.oklab, pending[best].oklab)))
            ? i
            : best,
        0,
      );
    if (config.kind === 'lightness' && selected.length < count) {
      const allocated = [0, 0, 0];
      for (const c of selected) allocated[bandOf(c, config.boundaries)]++;
      const available = [0, 1, 2].filter((b) =>
        pending.some((c) => bandOf(c, config.boundaries) === b),
      );
      const band =
        available.find((b) => allocated[b] === 0) ??
        available.sort(
          (a, b) => area[b] / (allocated[b] + 1) - area[a] / (allocated[a] + 1) || a - b,
        )[0];
      index = pending.findIndex((c) => bandOf(c, config.boundaries) === band);
    }
    const c = pending.splice(index, 1)[0];
    const comparisons = selected.filter(
      (s) =>
        config.kind !== 'lightness' ||
        bandOf(s, config.boundaries) === bandOf(c, config.boundaries),
    );
    const score = comparisons.length
      ? Math.min(...comparisons.map((s) => distance(s.oklab, c.oklab)))
      : undefined;
    const threshold =
      config.kind === 'population'
        ? 0
        : config.kind === 'lightness'
          ? config.minWithinBandSeparation
          : config.minSeparation;
    const duplicate = selected.some((s) => s.rgb.join() === c.rgb.join());
    const reason =
      selected.length >= count
        ? 'quota-filled'
        : duplicate
          ? c.id.endsWith(':snapped')
            ? 'snapping-collision'
            : 'duplicate-color'
          : score !== undefined && score < threshold
            ? 'too-similar'
            : config.kind === 'farthest-point'
              ? 'farthest-point'
              : config.kind === 'lightness'
                ? 'lightness-coverage'
                : 'population-rank';
    const accepted = ![
      'quota-filled',
      'too-similar',
      'duplicate-color',
      'snapping-collision',
    ].includes(reason);
    const decision: SelectionDecision = {
      candidateId: c.id,
      outcome: accepted ? 'accepted' : 'rejected',
      reason,
      comparedWith: comparisons.map((s) => s.id),
      ...(score === undefined ? {} : { score }),
      threshold,
    };
    decisions.push(decision);
    if (accepted) selected.push(c);
  }
  const diagnostics = [...set.diagnostics];
  if (selected.length < count) {
    const d = {
      stage: 'selection' as const,
      severity: 'warning' as const,
      code: 'candidate-exhausted',
      entityIds: selected.map((s) => s.id),
      measurements: { requested: count, actual: selected.length },
    };
    diagnostics.push(d);
  }
  return { ...set, selectedIds: selected.map((s) => s.id), decisions, diagnostics };
}

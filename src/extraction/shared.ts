import { rgbToOklab } from './color-math.js';
import type { CandidateSet, PreparedSample, RGB, ColorCandidate } from './types.js';
import type { StageContext } from './run.js';
export const distance = (a: readonly number[], b: readonly number[]) =>
  Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
export function validateSamples(samples: readonly PreparedSample[]): void {
  const ids = new Set<string>();
  for (const s of samples) {
    if (!s.id || ids.has(s.id)) throw new TypeError('Sample IDs must be unique');
    ids.add(s.id);
    if (s.rgb.length !== 3 || s.rgb.some((v) => !Number.isInteger(v) || v < 0 || v > 255))
      throw new TypeError('Invalid RGB');
    if (
      !Number.isFinite(s.representedArea) ||
      s.representedArea <= 0 ||
      !Number.isFinite(s.influence) ||
      s.influence < 0
    )
      throw new RangeError('Invalid sample weights');
  }
  if (samples.length && !samples.some((s) => s.influence > 0))
    throw new RangeError('Positive influence required');
}
export function groupedCandidates(
  samples: readonly PreparedSample[],
  groups: { id: string; members: number[] }[],
  context: StageContext,
): CandidateSet {
  context.signal?.throwIfAborted();
  const memberIds: string[] = [];
  const tableId = `${groups[0]?.id ?? 'empty'}:members`;
  const memberships = [
    {
      id: tableId,
      memberIds,
      groups: groups.map((g) => {
        const start = memberIds.length;
        memberIds.push(...g.members.map((i) => samples[i].id));
        return { id: g.id, start, length: g.members.length };
      }),
    },
  ];
  const derivations = groups.map((g) => ({
    id: `${g.id}:derivation`,
    operation: 'average' as const,
    inputs: [{ kind: 'membership' as const, tableId, groupId: g.id }],
  }));
  const candidates = groups.map((g, index): ColorCandidate => {
    const area = g.members.reduce((sum, i) => sum + samples[i].representedArea, 0);
    const influence = g.members.reduce((sum, i) => sum + samples[i].influence, 0);
    const rgb = [0, 1, 2].map((c) =>
      Math.round(
        g.members.reduce(
          (sum, i) =>
            sum +
            samples[i].rgb[c] * (influence ? samples[i].influence : samples[i].representedArea),
          0,
        ) / (influence || area),
      ),
    ) as RGB;
    return {
      id: g.id,
      rgb,
      oklab: rgbToOklab(rgb),
      representedArea: area,
      influence,
      derivationId: derivations[index].id,
    };
  });

  return { candidates, derivations, memberships, diagnostics: [] };
}
export function originalCandidates(samples: readonly PreparedSample[]): CandidateSet {
  // Exact duplicates share a representative; their populations remain aggregated.
  const groups = new Map<string, PreparedSample[]>();
  for (const s of samples) {
    const key = s.rgb.join(',');
    const group = groups.get(key) ?? [];
    group.push(s);
    groups.set(key, group);
  }
  const entries = [...groups.values()];
  const candidates = entries.map((group) => {
    const s = group[0];
    return {
      id: `original:${s.id}`,
      rgb: [...s.rgb] as RGB,
      oklab: rgbToOklab(s.rgb),
      representedArea: group.reduce((sum, p) => sum + p.representedArea, 0),
      influence: group.reduce((sum, p) => sum + p.influence, 0),
      derivationId: `original:${s.id}:derivation`,
      ...(s.originalSampleId ? { originalSampleId: s.originalSampleId } : {}),
    };
  });
  return {
    candidates,
    derivations: candidates.map((c, i) => ({
      id: c.derivationId,
      operation: 'select',
      inputs: [{ kind: 'entity', id: entries[i][0].id }],
    })),
    memberships: [],
    diagnostics: [],
  };
}

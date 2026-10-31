import type { ColorCandidate, FinalSwatch, OriginalSampleSet, MembershipTable } from './types.js';
import type { StageContext } from './run.js';
import { rgbToOklab } from './color-math.js';
import { distance } from './shared.js';
export function measureDominance(
  originals: OriginalSampleSet,
  candidates: readonly ColorCandidate[],
  context: StageContext = {},
): { swatches: FinalSwatch[]; memberships: MembershipTable[] } {
  if (!candidates.length || !originals.samples.length)
    throw new Error('Dominance requires samples and palette');
  const ordered = [...candidates].sort((a, b) => a.id.localeCompare(b.id));
  const populations = ordered.map(() => 0),
    labels: number[] = [];
  originals.samples.forEach((s, i) => {
    if (i % 256 === 0) context.signal?.throwIfAborted();
    const lab = rgbToOklab(s.rgb);
    let nearest = 0;
    for (let j = 1; j < ordered.length; j++)
      if (distance(lab, ordered[j].oklab) < distance(lab, ordered[nearest].oklab)) nearest = j;
    populations[nearest] += s.representedArea;
    labels.push(nearest);
  });
  const total = populations.reduce((a, b) => a + b, 0);
  const swatches = ordered
    .map((c, i) => ({
      ...c,
      representedArea: populations[i],
      share: populations[i] / total,
      dominanceRank: 0,
    }))
    .sort((a, b) => b.representedArea - a.representedArea || a.id.localeCompare(b.id))
    .map((c, i) => ({ ...c, dominanceRank: i + 1 }));
  const memberIds: string[] = [];
  const groups = ordered.map((c, i) => {
    const start = memberIds.length;
    labels.forEach((label, j) => {
      if (label === i) memberIds.push(originals.samples[j].id);
    });
    return { id: c.id, start, length: memberIds.length - start };
  });

  return { swatches, memberships: [{ id: 'dominance:members', memberIds, groups }] };
}

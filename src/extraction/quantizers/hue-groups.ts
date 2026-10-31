import { visualGroup, type PartitionVisual } from '../visual-state.js';
import type { PreparedSample } from '../types.js';
import type { StageContext } from '../run.js';
import { groupedCandidates, validateSamples } from '../shared.js';
export function quantizeHue(
  samples: readonly PreparedSample[],
  sectors: number,
  context: StageContext = {},
  id = 'hue',
) {
  validateSamples(samples);
  if (!Number.isInteger(sectors) || sectors < 1 || sectors > 360)
    throw new RangeError('Hue sectors must be 1–360');
  const groups = Array.from({ length: sectors + 2 }, (_, i) => ({
    id: `${id}:group:${i}`,
    members: [] as number[],
  }));
  samples.forEach((s, i) => {
    context.signal?.throwIfAborted();
    const [r, g, b] = s.rgb.map((v) => v / 255),
      max = Math.max(r, g, b),
      min = Math.min(r, g, b),
      d = max - min,
      l = (max + min) / 2,
      saturation = d ? d / (1 - Math.abs(2 * l - 1)) : 0;
    const hue = d
      ? ((max === r ? (g - b) / d : max === g ? (b - r) / d + 2 : (r - g) / d + 4) * 60 + 360) % 360
      : 0;
    const neutral = saturation < 0.12,
      group = neutral
        ? sectors + (l < 0.48 ? 0 : 1)
        : Math.min(sectors - 1, Math.floor((hue / 360) * sectors));
    groups[group].members.push(i);
  });
  if (context.visual) {
    const visual: PartitionVisual = {
      id,
      method: 'hue',
      sampleIds: samples.map((s) => s.id),
      initial: [],
      changes: [],
    };
    for (const group of groups.filter((g) => g.members.length))
      visual.changes.push({
        remove: [],
        add: [visualGroup(samples, group)],
        phase: Number(group.id.split(':').at(-1)) >= sectors ? 'neutral' : 'hue',
      });
    (context.visual.partitions ??= []).push(visual);
  }
  return groupedCandidates(
    samples,
    groups.filter((g) => g.members.length),
    context,
  );
}

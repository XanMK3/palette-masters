import type { PartitionVisual, VisualGroup } from '../extraction/visual-state.js';
const cache = new WeakMap<PartitionVisual, { step: number; groups: Map<string, VisualGroup> }>();
/** Rebuild backward from the initial partition; advance forward using structural changes. */
export function partitionGroups(visual: PartitionVisual, step: number): readonly VisualGroup[] {
  let state = cache.get(visual);
  if (!state || step < state.step) {
    state = { step: 0, groups: new Map(visual.initial.map((g) => [g.id, g])) };
    cache.set(visual, state);
  }
  while (state.step < step) {
    const change = visual.changes[state.step++];
    for (const id of change.remove) state.groups.delete(id);
    for (const group of change.add) state.groups.set(group.id, group);
  }
  return [...state.groups.values()];
}

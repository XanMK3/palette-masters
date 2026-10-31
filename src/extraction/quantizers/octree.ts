import { visualGroup, type PartitionVisual } from '../visual-state.js';
import type { PreparedSample } from '../types.js';
import type { StageContext } from '../run.js';
import { groupedCandidates, validateSamples } from '../shared.js';
export function quantizeOctree(
  samples: readonly PreparedSample[],
  count: number,
  context: StageContext = {},
  id = 'octree',
) {
  validateSamples(samples);
  if (!Number.isInteger(count) || count < 1) throw new RangeError('Invalid octree budget');
  interface Node {
    id: string;
    depth: number;
    members: number[];
    children: Map<number, Node>;
  }
  const root: Node = { id: `${id}:root`, depth: 0, members: [], children: new Map() };
  const nodes = [root];
  samples.forEach((s, i) => {
    let n = root;
    for (let depth = 0; depth <= 8; depth++) {
      n.members.push(i);
      if (depth === 8) break;
      const bit = 7 - depth,
        key =
          (((s.rgb[0] >> bit) & 1) << 2) | (((s.rgb[1] >> bit) & 1) << 1) | ((s.rgb[2] >> bit) & 1);
      let child = n.children.get(key);
      if (!child) {
        child = { id: `${n.id}:${key}`, depth: depth + 1, members: [], children: new Map() };
        n.children.set(key, child);
        nodes.push(child);
      }
      n = child;
    }
  });

  const leaves = (n: Node): Node[] =>
    n.children.size ? [...n.children.values()].flatMap(leaves) : [n];
  const visual: PartitionVisual | undefined = context.visual
    ? {
        id,
        method: 'octree',
        sampleIds: samples.map((s) => s.id),
        initial: samples.length ? leaves(root).map((g) => visualGroup(samples, g)) : [],
        changes: [],
      }
    : undefined;
  if (visual) (context.visual!.partitions ??= []).push(visual);
  let total = leaves(root).length;
  const weight = (n: Node) => n.members.reduce((sum, i) => sum + samples[i].influence, 0);
  for (const n of nodes
    .filter((n) => n.children.size)
    .sort((a, b) => b.depth - a.depth || weight(a) - weight(b))) {
    context.signal?.throwIfAborted();
    if (total <= count) break;
    const descendants = leaves(n);
    if (descendants.length < 2) continue;

    visual?.changes.push({ remove: descendants.map((g) => g.id), add: [visualGroup(samples, n)] });
    total -= descendants.length - 1;
    n.children.clear();
  }
  return groupedCandidates(samples, samples.length ? leaves(root) : [], context);
}

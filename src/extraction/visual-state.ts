import type { RGB, PreparedSample } from './types.js';

/** Lossless visual state, not an event log. Each assignment exists once per iteration. */
export interface LabelMap {
  readonly encoding: 'dense' | 'runs';
  readonly values: Uint8Array | Uint32Array;
  readonly length: number;
}
export function packLabels(labels: readonly number[]): LabelMap {
  const runs: number[] = [];
  for (let i = 0; i < labels.length;) {
    const label = labels[i];
    let end = i + 1;
    while (end < labels.length && labels[end] === label) end++;
    runs.push(label, end - i);
    i = end;
  }
  const small = labels.every((v) => v < 256);
  if (runs.length * 4 < labels.length * (small ? 1 : 4))
    return { encoding: 'runs', values: Uint32Array.from(runs), length: labels.length };
  return {
    encoding: 'dense',
    values: small ? Uint8Array.from(labels) : Uint32Array.from(labels),
    length: labels.length,
  };
}
export function unpackLabels(map: LabelMap): Uint32Array {
  if (map.encoding === 'dense') return Uint32Array.from(map.values);
  const result = new Uint32Array(map.length);
  let offset = 0;
  for (let i = 0; i < map.values.length; i += 2) {
    result.fill(map.values[i], offset, offset + map.values[i + 1]);
    offset += map.values[i + 1];
  }
  return result;
}
export interface KMeansVisual {
  readonly method?: 'medoids';
  readonly pool?: readonly number[];
  readonly id: string;
  readonly sampleIds: readonly string[];
  readonly centerIds: readonly string[];
  readonly seeds: readonly number[];
  readonly initialColors: readonly RGB[];
  readonly iterations: {
    readonly assignments: LabelMap;
    readonly colors: readonly RGB[];
    readonly representatives?: readonly number[];
  }[];
  finalAssignments?: LabelMap;
  stop?: 'converged' | 'iteration-limit';
}
export interface PipelineVisual {
  readonly fits: KMeansVisual[];
  partitions?: PartitionVisual[];
  regions?: { readonly width: number; readonly height: number; readonly labels: Int32Array };
  initialSelection?: readonly string[];
}

export interface VisualGroup {
  readonly id: string;
  readonly rgb: RGB;
  readonly members: Uint32Array;
}
/** Structural partitions retain changed groups once, rather than copying the whole image at every merge. */
export interface PartitionVisual {
  readonly id: string;
  readonly method: 'mmcq' | 'octree' | 'hue';
  readonly sampleIds: readonly string[];
  readonly initial: readonly VisualGroup[];
  readonly changes: {
    readonly remove: readonly string[];
    readonly add: readonly VisualGroup[];
    readonly phase?: 'population' | 'volume' | 'neutral' | 'hue';
  }[];
}
export function visualGroup(
  samples: readonly PreparedSample[],
  group: { id: string; members: readonly number[] },
): VisualGroup {
  const area = group.members.reduce((sum, i) => sum + samples[i].representedArea, 0);
  const influence = group.members.reduce((sum, i) => sum + samples[i].influence, 0);
  const rgb = [0, 1, 2].map((c) =>
    Math.round(
      group.members.reduce(
        (sum, i) =>
          sum + samples[i].rgb[c] * (influence ? samples[i].influence : samples[i].representedArea),
        0,
      ) / (influence || area || 1),
    ),
  ) as RGB;
  return { id: group.id, rgb, members: Uint32Array.from(group.members) };
}

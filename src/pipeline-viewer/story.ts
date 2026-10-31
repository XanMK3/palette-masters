import type { PipelineViewData } from './model.js';
import { partitionGroups } from './partitions.js';
import type { PartitionVisual, VisualGroup } from '../extraction/visual-state.js';
import type { RGB } from '../extraction/types.js';
import { unpackLabels, type KMeansVisual } from '../extraction/visual-state.js';
export type Chapter = 'sample' | 'prepare' | 'find' | 'select' | 'refine' | 'coverage' | 'theme';
export interface StoryColor {
  id: string;
  rgb: RGB;
  kept?: boolean;
  share?: number;
}
export interface StoryFrame {
  chapter: Chapter;
  caption: string;
  duration: number;
  mode: 'samples' | 'prepare' | 'seeds' | 'groups' | 'original';
  colors: readonly StoryColor[];
  fit?: KMeansVisual;
  iteration?: number;
  assignment?: 'iteration' | 'final';
  pins?: readonly string[];
  oldPins?: readonly string[];
  partition?: PartitionVisual;
  partitionStep?: number;
  groups?: readonly VisualGroup[];
  focusGroups?: readonly string[];
}
export const chapterNames: Record<Chapter, string> = {
  sample: 'Sample',
  prepare: 'Prepare',
  find: 'Find colors',
  select: 'Select',
  refine: 'Refine',
  coverage: 'Coverage',
  theme: 'Theme',
};
export function createStory({ result: r, theme }: PipelineViewData): StoryFrame[] {
  const frames: StoryFrame[] = [];
  const config = r.configuration.effective;
  const final = r.swatches.map((s) => ({ id: s.id, rgb: s.rgb, share: s.share }));
  const add = (frame: StoryFrame) => frames.push(frame);
  add({
    chapter: 'sample',
    caption: 'Pick colors across the painting.',
    duration: 1800,
    mode: 'samples',
    colors: [],
  });
  if (config.preprocessing.kind !== 'none')
    add({
      chapter: 'prepare',
      caption:
        config.preprocessing.kind === 'slic'
          ? 'Nearby pixels become regions.'
          : 'Edges get more influence.',
      duration: 1800,
      mode: 'prepare',
      colors: [],
    });
  const fits = r.visual?.fits ?? [];
  const fitting: StoryFrame[] = [];
  for (const fit of fits) {
    const suffix = fit.id.startsWith('band:')
      ? ` · ${['shadows', 'midtones', 'highlights'][Number(fit.id.split(':')[1])]}`
      : fits.length > 1
        ? ` · ${fit.centerIds.length} groups`
        : '';
    const colors = (rgb: readonly RGB[]) =>
      rgb.map((value, i) => ({ id: fit.centerIds[i], rgb: value }));
    if (fit.method === 'medoids')
      fitting.push({
        chapter: 'find',
        caption: 'Only these sampled inputs can become representatives.',
        duration: 0,
        mode: 'seeds',
        colors: [],
        fit,
        pins: fit.pool?.map((i) => fit.sampleIds[i]),
      });
    fitting.push({
      chapter: 'find',
      caption: `Start with ${r.visual?.regions ? 'region colors' : 'colors from the painting'}${suffix}.`,
      duration: 0,
      mode: 'seeds',
      colors: colors(fit.initialColors),
      fit,
      pins: fit.seeds.map((i) => fit.sampleIds[i]),
    });
    fit.iterations.forEach((iteration, i) => {
      fitting.push({
        chapter: 'find',
        caption: `Similar colors gather${suffix}.`,
        duration: 0,
        mode: 'groups',
        colors: colors(i ? fit.iterations[i - 1].colors : fit.initialColors),
        fit,
        iteration: i,
        assignment: 'iteration',
      });
      fitting.push({
        chapter: 'find',
        caption:
          fit.method === 'medoids'
            ? `Choose better input representatives${suffix}.`
            : `Each group adjusts its color${suffix}.`,
        duration: 0,
        mode: 'groups',
        colors: colors(iteration.colors),
        ...(fit.method === 'medoids'
          ? {
              pins: iteration.representatives?.map((i) => fit.sampleIds[i]),
              oldPins: (i ? (fit.iterations[i - 1].representatives ?? fit.seeds) : fit.seeds).map(
                (j) => fit.sampleIds[j],
              ),
            }
          : {}),
        fit,
        iteration: i,
        assignment: 'iteration',
      });
    });
    fitting.push({
      chapter: 'find',
      caption:
        fit.stop === 'converged'
          ? `The colors settle${suffix}.`
          : `The fitting limit is reached${suffix}.`,
      duration: 0,
      mode: 'groups',
      colors: colors(fit.iterations.at(-1)?.colors ?? fit.initialColors),
      fit,
      assignment: 'final',
    });
  }
  for (const partition of r.visual?.partitions ?? []) {
    const initialCaption =
      partition.method === 'mmcq'
        ? 'Begin with one color family.'
        : partition.method === 'octree'
          ? 'Begin with fine color groups.'
          : 'Find hue families and neutral colors.';
    fitting.push({
      chapter: 'find',
      caption: initialCaption,
      duration: 0,
      mode: 'groups',
      colors: [],
      partition,
      partitionStep: 0,
    });
    partition.changes.forEach((change, i) => {
      const caption =
        partition.method === 'mmcq'
          ? change.phase === 'volume'
            ? 'Split a broad, populated color family.'
            : 'Split the most influential color family.'
          : partition.method === 'octree'
            ? 'Merge neighboring color groups.'
            : change.phase === 'neutral'
              ? 'Reveal a neutral color family.'
              : 'Reveal a hue family.';
      if (partition.method !== 'hue')
        fitting.push({
          chapter: 'find',
          caption:
            partition.method === 'mmcq'
              ? 'This color family will split.'
              : 'These color groups will merge.',
          duration: 0,
          mode: 'groups',
          colors: [],
          partition,
          partitionStep: i,
          focusGroups: change.remove,
        });
      fitting.push({
        chapter: 'find',
        caption,
        duration: 0,
        mode: 'groups',
        colors: [],
        partition,
        partitionStep: i + 1,
        focusGroups: change.add.map((g) => g.id),
      });
    });
    fitting.push({
      chapter: 'find',
      caption: 'The color families are ready.',
      duration: 0,
      mode: 'groups',
      colors: [],
      partition,
      partitionStep: partition.changes.length,
    });
  }
  // All visual states survive. Only their display time is compressed.
  fitting.forEach((frame, i) => {
    frame.duration = i < 3 ? 950 : 4350 / Math.max(1, fitting.length - 3);
  });
  frames.push(...fitting);
  add({
    chapter: 'find',
    caption:
      config.quantization.kind === 'original-samples'
        ? 'Keep the sampled colors as candidates.'
        : 'These are the candidate colors.',
    duration: fitting.length ? 800 : 1800,
    mode: 'groups',
    colors: r.quantization.candidates.map((s) => ({ id: s.id, rgb: s.rgb })),
  });
  const initial = new Set(r.visual?.initialSelection ?? r.selection.selectedIds);
  if (config.selection.kind === 'farthest-point') {
    const choices = r.visual?.initialSelection ?? r.selection.selectedIds;
    choices.forEach((id, i) => {
      const chosen = new Set(choices.slice(0, i + 1));
      const candidate = r.quantization.candidates.find((c) => c.id === id);
      add({
        chapter: 'select',
        caption: i
          ? 'Add the color farthest from the current choices.'
          : 'Start with the most represented color.',
        duration: 2600 / choices.length,
        mode: 'groups',
        colors: r.quantization.candidates
          .filter((c) => chosen.has(c.id))
          .map((c) => ({ id: c.id, rgb: c.rgb, kept: true })),
        pins: candidate?.originalSampleId ? [candidate.originalSampleId] : [],
        focusGroups: [id],
      });
    });
  }

  add({
    chapter: 'select',
    caption: 'Keep a small, distinct palette.',
    duration: 1700,
    mode: 'groups',
    colors: r.quantization.candidates.map((s) => ({
      id: s.id,
      rgb: s.rgb,
      kept: initial.has(s.id),
    })),
  });
  add({
    chapter: 'select',
    caption: 'The chosen colors remain.',
    duration: 900,
    mode: 'groups',
    colors: r.quantization.candidates
      .filter((s) => initial.has(s.id))
      .map((s) => ({ id: s.id, rgb: s.rgb, kept: true })),
  });
  if (
    config.postprocessing.snapping !== 'off' ||
    r.swatches.length < config.count ||
    r.diagnostics.some((d) => d.code === 'separation-relaxed')
  ) {
    add({
      chapter: 'refine',
      caption:
        config.postprocessing.snapping !== 'off'
          ? 'Snap back to colors sampled from the painting.'
          : r.swatches.length < config.count
            ? `${r.swatches.length} distinct colors fit this painting.`
            : 'Allow closer colors to complete the palette.',
      duration: 1700,
      mode: 'groups',
      colors: final,
      pins: r.swatches.flatMap((s) => (s.originalSampleId ? [s.originalSampleId] : [])),
    });
  }
  add({
    chapter: 'coverage',
    caption: 'See how much of the painting each color represents.',
    duration: 2000,
    mode: 'groups',
    colors: final,
  });
  add({
    chapter: 'theme',
    caption:
      theme.appliedPolicy === 'user'
        ? 'Your colors, in your chosen roles.'
        : theme.appliedPolicy === 'dominance-aware'
          ? 'Map the colors to roles; adjust for readability.'
          : 'The painting becomes a theme.',
    duration: 2200,
    mode: 'original',
    colors: final,
  });
  const total = frames.reduce((n, f) => n + f.duration, 0);
  if (total > 18500) frames.forEach((f) => (f.duration *= 18500 / total));
  return frames;
}
export function frameLabels(frame: StoryFrame) {
  if (!frame.fit) return undefined;
  const packed =
    frame.assignment === 'final'
      ? frame.fit.finalAssignments
      : frame.assignment === 'iteration'
        ? frame.fit.iterations[frame.iteration!].assignments
        : undefined;
  return packed ? unpackLabels(packed) : undefined;
}

/** Resolve just the displayed partition, keeping long octree histories compact. */
export function resolveFrame(frame: StoryFrame): StoryFrame {
  if (!frame.partition) return frame;
  const groups = partitionGroups(frame.partition, frame.partitionStep ?? 0);
  return { ...frame, groups, colors: groups.map((g) => ({ id: g.id, rgb: g.rgb })) };
}

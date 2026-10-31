import type {
  CandidateSet,
  ColorCandidate,
  OriginalSampleSet,
  PipelineConfig,
  SelectionResult,
} from '../types.js';
import type { StageContext } from '../run.js';
import { distance } from '../shared.js';
import { rgbToOklab } from '../color-math.js';
import { bandOf, selectRepresentatives } from '../selection/select.js';
export function postprocess(
  set: CandidateSet,
  originals: OriginalSampleSet,
  c: PipelineConfig,
  context: StageContext = {},
  initial?: SelectionResult,
) {
  const derivations = [...set.derivations],
    diagnostics = [...set.diagnostics];
  const candidates: ColorCandidate[] = [];
  for (const candidate of set.candidates) {
    context.signal?.throwIfAborted();
    if (c.postprocessing.snapping === 'off') {
      candidates.push(candidate);
      continue;
    }
    const sourcePool = originals.samples.filter(
      (s) =>
        c.selection.kind !== 'lightness' ||
        bandOf({ ...candidate, oklab: rgbToOklab(s.rgb) }, c.selection.boundaries) ===
          bandOf(candidate, c.selection.boundaries),
    );
    let nearest = sourcePool[0],
      best = Infinity;
    for (const s of sourcePool) {
      const d = distance(candidate.oklab, rgbToOklab(s.rgb));
      if (d < best) {
        best = d;
        nearest = s;
      }
    }
    if (!nearest) {
      diagnostics.push({
        stage: 'postprocessing',
        severity: 'warning',
        code: 'snapping-band-unavailable',
        entityIds: [candidate.id],
        measurements: {},
      });
      continue;
    }
    const id = `${candidate.id}:snapped`,
      derivationId = `${id}:derivation`;
    derivations.push({
      id: derivationId,
      operation: 'snap',
      inputs: [
        { kind: 'entity', id: candidate.id },
        { kind: 'entity', id: nearest.id },
      ],
    });
    candidates.push({
      ...candidate,
      id,
      rgb: [...nearest.rgb],
      oklab: rgbToOklab(nearest.rgb),
      derivationId,
      originalSampleId: nearest.id,
    });
  }
  // Select again over transformed alternatives: collision/separation repairs use
  // the same explicit policy and never fabricate extra extracted colors.
  const snappedSet = { ...set, candidates, derivations, diagnostics };
  let selection =
    c.postprocessing.snapping === 'off' && initial
      ? initial
      : selectRepresentatives(snappedSet, c.count, c.selection, context);
  if (
    selection.selectedIds.length < c.count &&
    c.postprocessing.missingColors.kind === 'relax-separation'
  ) {
    const minimum = c.postprocessing.missingColors.minimum;
    const relaxed =
      c.selection.kind === 'population'
        ? c.selection
        : c.selection.kind === 'lightness'
          ? { ...c.selection, minWithinBandSeparation: minimum }
          : { ...c.selection, minSeparation: minimum };

    selection = selectRepresentatives(snappedSet, c.count, relaxed, context);
    selection = {
      ...selection,
      diagnostics: [
        ...selection.diagnostics,
        {
          stage: 'postprocessing',
          severity: 'warning',
          code: 'separation-relaxed',
          entityIds: selection.selectedIds,
          measurements: { minimum },
        },
      ],
    };
  }
  const selected = selection.selectedIds.map((id) => candidates.find((p) => p.id === id)!);
  const collisions = candidates.length - new Set(candidates.map((p) => p.rgb.join())).size;
  if (collisions)
    selection = {
      ...selection,
      diagnostics: [
        ...selection.diagnostics,
        {
          stage: 'postprocessing',
          severity: 'info',
          code: 'duplicate-collisions',
          entityIds: [],
          measurements: { count: collisions },
        },
      ],
    };
  if (!selected.length) throw new Error('No valid palette colors remain');
  if (new Set(selected.map((s) => s.rgb.join())).size !== selected.length)
    throw new Error('Duplicate final palette colors');

  return { selected, selection };
}

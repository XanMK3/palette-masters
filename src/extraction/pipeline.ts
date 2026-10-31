import type {
  CandidateSet,
  ColorCandidate,
  Derivation,
  ExtractionResult,
  MembershipTable,
  SelectionResult,
  PreparedSample,
  OriginalSampleSet,
  PipelineConfig,
  RasterData,
} from './types.js';
import type { StageContext } from './run.js';
import { resolveConfiguration } from './capabilities.js';
import { sampleOriginalPixels } from './sampling/original-samples.js';
import { prepareSamples } from './sampling/preprocess.js';
import { generateCandidates } from './strategies/generate.js';
import { selectRepresentatives } from './selection/select.js';
import { postprocess } from './postprocessing/process.js';
import { measureDominance } from './dominance.js';
export interface PipelineResult extends ExtractionResult {
  readonly autoSelection?: {
    winner: number;
    alternatives: { selection: string; colors: string[]; score: readonly number[] }[];
  };
  readonly visual?: import('./visual-state.js').PipelineVisual;
  readonly originalSamples: OriginalSampleSet;
  readonly quantization: CandidateSet;
  readonly preparedSamples: readonly PreparedSample[];
  readonly derivations: readonly Derivation[];
  readonly memberships: readonly MembershipTable[];
  readonly entities: readonly { readonly id: string; readonly derivationId: string }[];
  readonly candidates: readonly ColorCandidate[];
  readonly selection: SelectionResult;
}
export function extractPipeline(
  image: RasterData,
  config: PipelineConfig,
  context: StageContext = {},
  presetId?: string,
): PipelineResult {
  context.signal?.throwIfAborted();
  if (context.captureVisuals) context = { ...context, visual: { fits: [] } };
  const configuration = resolveConfiguration(config, presetId),
    c = configuration.effective;
  const originalSamples = sampleOriginalPixels(image, c.sampling, context);
  if (!originalSamples.samples.length) throw new Error('No opaque pixels found');
  const prepared = prepareSamples(image, originalSamples, c.preprocessing, context);
  const quantization = generateCandidates(prepared.samples, c, context);
  const initial = selectRepresentatives(quantization, c.count, c.selection, context);
  if (context.visual) context.visual.initialSelection = [...initial.selectedIds];
  const processed = postprocess(quantization, originalSamples, c, context, initial);
  const dominance = measureDominance(originalSamples, processed.selected, context);
  const derivations = [...prepared.derivations, ...processed.selection.derivations];
  const candidates = [
    ...quantization.candidates,
    ...processed.selection.candidates.filter(
      (p) => !quantization.candidates.some((q) => q.id === p.id),
    ),
  ];
  const entities = [
    ...originalSamples.samples.map((s) => ({ id: s.id, derivationId: `${s.id}:source` })),
    ...prepared.samples.map((s) => ({ id: s.id, derivationId: s.derivationId })),
    ...candidates.map((s) => ({ id: s.id, derivationId: s.derivationId })),
  ];
  const result: PipelineResult = {
    ...(context.visual ? { visual: context.visual } : {}),
    selection: processed.selection,
    schemaVersion: 1,
    runId: context.metadata?.runId ?? 'synchronous',
    configuration,
    swatches: dominance.swatches,
    displayOrder: dominance.swatches.map((s) => s.id),
    originalColorGuarantee: dominance.swatches.every((s) => s.originalSampleId)
      ? 'preserved'
      : 'not-guaranteed',
    diagnostics: [
      ...configuration.resolutions,
      ...processed.selection.diagnostics,
      ...dominance.swatches
        .filter((s) => !s.representedArea)
        .map((s) => ({
          stage: 'dominance' as const,
          severity: 'warning' as const,
          code: 'zero-support',
          entityIds: [s.id],
          measurements: { share: 0 },
        })),
    ],
    originalSamples,
    preparedSamples: prepared.samples,
    quantization,
    derivations,
    memberships: [...prepared.memberships, ...quantization.memberships, ...dominance.memberships],
    entities: [...new Map(entities.map((e) => [e.id, e])).values()],
    candidates,
  };

  context.signal?.throwIfAborted();
  return result;
}

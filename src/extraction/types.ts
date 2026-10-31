/** Version-one pipeline contracts. Stage implementations migrate incrementally. */
export const PIPELINE_SCHEMA_VERSION = 1 as const;
export type RGB = [number, number, number];
export type Lab = [number, number, number];
export type PaletteSize = 5 | 6;
export type EntityId = string;
export type StageId =
  | 'sampling'
  | 'preprocessing'
  | 'quantization'
  | 'selection'
  | 'postprocessing'
  | 'dominance'
  | 'theme';

/** Structural ImageData-compatible input; no Canvas or DOM ownership. */
export interface RasterData {
  readonly width: number;
  readonly height: number;
  readonly data: Uint8ClampedArray;
}
export interface SourcePixel {
  /** Row-major offset in the supplied decoded raster, not the full-resolution file. */
  readonly pixelIndex: number;
  readonly x: number;
  readonly y: number;
}
export interface Sample {
  /** Stable within this input. IDs are scoped by run/input metadata. */
  readonly id: EntityId;
  readonly rgb: RGB;
  readonly source: SourcePixel;
  /** Image area represented by this sample; never an edge/saliency weight. */
  readonly representedArea: number;
  /** Effective fitting weight; initially equals representedArea. */
  readonly influence: number;
  /** Consecutive eligible-pixel ordinals represented by this original sample. */
  readonly eligibleRange: { readonly start: number; readonly count: number };
}
export interface SamplingConfig {
  readonly maxSamples: number;
  readonly alphaThreshold: number;
}
export interface SamplingStats {
  readonly totalPixels: number;
  readonly eligiblePixels: number;
  readonly excludedAlphaPixels: number;
  readonly unsampledEligiblePixels: number;
  readonly sampledPixels: number;
  readonly representedArea: number;
}
export interface OriginalSampleSet {
  readonly width: number;
  readonly height: number;
  readonly config: SamplingConfig;
  readonly samples: readonly Sample[];
  readonly stats: SamplingStats;
}

/** Tables avoid duplicating large region/cluster membership lists on every entity. */
export interface MembershipTable {
  readonly id: EntityId;
  readonly memberIds: readonly EntityId[];
  readonly groups: readonly {
    readonly id: EntityId;
    readonly start: number;
    readonly length: number;
  }[];
}
export type SourceReference =
  | { readonly kind: 'entity'; readonly id: EntityId }
  | { readonly kind: 'membership'; readonly tableId: EntityId; readonly groupId: EntityId };
export interface Derivation {
  readonly id: EntityId;
  readonly operation:
    'sample' | 'average' | 'medoid' | 'merge' | 'select' | 'snap' | 'derive-token';
  readonly inputs: readonly SourceReference[];
  readonly sourcePixel?: SourcePixel;
  /** Source RGB retained for provenance when sampling a separate SLIC working raster. */
  readonly sampledRgb?: RGB;
  readonly reason?: string;
}
export interface PreparedSample {
  /** Explicit original identity; absent for averaged/preprocessed colors. */
  readonly originalSampleId?: EntityId;
  readonly id: EntityId;
  readonly rgb: RGB;
  readonly representedArea: number;
  readonly influence: number;
  readonly derivationId: EntityId;
  readonly regionId?: EntityId;
}
export interface PreparedSampleSet {
  readonly originals: OriginalSampleSet;
  readonly samples: readonly PreparedSample[];
  readonly derivations: readonly Derivation[];
  readonly memberships: readonly MembershipTable[];
}
export interface ColorCandidate {
  readonly id: EntityId;
  readonly rgb: RGB;
  readonly oklab: Lab;
  readonly representedArea: number;
  readonly influence: number;
  readonly derivationId: EntityId;
  /** Present only when the color is an actual original sample, not a SLIC mean. */
  readonly originalSampleId?: EntityId;
}
export interface Diagnostic {
  readonly stage: StageId;
  readonly severity: 'info' | 'warning' | 'error';
  readonly code: string;
  readonly entityIds: readonly EntityId[];
  readonly measurements: Readonly<Record<string, number>>;
}
export interface CandidateSet {
  readonly candidates: readonly ColorCandidate[];
  readonly derivations: readonly Derivation[];
  readonly memberships: readonly MembershipTable[];
  readonly diagnostics: readonly Diagnostic[];
}
export type SelectionReason =
  | 'population-rank'
  | 'farthest-point'
  | 'lightness-coverage'
  | 'too-similar'
  | 'duplicate-color'
  | 'snapping-collision'
  | 'quota-filled'
  | 'below-population-threshold'
  | 'candidate-exhausted';
export interface SelectionDecision {
  readonly candidateId: EntityId;
  readonly outcome: 'accepted' | 'rejected';
  readonly reason: SelectionReason;
  readonly comparedWith: readonly EntityId[];
  readonly score?: number;
  readonly threshold?: number;
}
export interface SelectionResult extends CandidateSet {
  readonly selectedIds: readonly EntityId[];
  readonly decisions: readonly SelectionDecision[];
}
export interface FinalSwatch extends ColorCandidate {
  /** Recomputed after snapping/selection from original area, not fitting influence. */
  readonly representedArea: number;
  readonly share: number;
  readonly dominanceRank: number;
}
export interface ExtractionResult {
  readonly schemaVersion: typeof PIPELINE_SCHEMA_VERSION;
  readonly runId: string;
  readonly swatches: readonly FinalSwatch[];
  readonly displayOrder: readonly EntityId[];
  readonly originalColorGuarantee: 'preserved' | 'not-guaranteed';
  readonly diagnostics: readonly Diagnostic[];
  readonly configuration: ResolvedConfiguration;
}

export type PreprocessingConfig =
  | { readonly kind: 'none' }
  | { readonly kind: 'edge-weighted'; readonly strength: number }
  | {
      readonly kind: 'slic';
      readonly maxDimension: number;
      readonly regions: number;
      readonly compactness: number;
      readonly iterations: number;
    };
export type QuantizerConfig =
  | { readonly kind: 'original-samples' }
  | {
      readonly kind: 'kmeans';
      readonly space: 'rgb' | 'oklab';
      readonly candidates: number;
      readonly iterations: number;
    }
  | {
      readonly kind: 'medoids';
      readonly candidates: number;
      readonly maxSamples: number;
      readonly iterations: number;
    }
  | { readonly kind: 'mmcq'; readonly candidates: number; readonly populationFraction: number }
  | { readonly kind: 'octree'; readonly candidates: number }
  | { readonly kind: 'hue-groups'; readonly sectors: number };
export type SelectionConfig =
  | { readonly kind: 'population' }
  | { readonly kind: 'dominance-separated'; readonly minSeparation: number }
  | { readonly kind: 'farthest-point'; readonly minSeparation: number }
  | {
      readonly kind: 'lightness';
      readonly boundaries: readonly [number, number];
      readonly minWithinBandSeparation: number;
    };
export type StrategyConfig =
  | { readonly kind: 'standard' }
  | { readonly kind: 'stratified' }
  | {
      readonly kind: 'adaptive-k';
      readonly minK: number;
      readonly maxK: number;
      readonly improvementThreshold: number;
    };
export interface PipelineConfig {
  readonly schemaVersion: typeof PIPELINE_SCHEMA_VERSION;
  readonly count: PaletteSize;
  readonly sampling: SamplingConfig;
  readonly preprocessing: PreprocessingConfig;
  readonly quantization: QuantizerConfig;
  readonly selection: SelectionConfig;
  readonly strategy: StrategyConfig;
  readonly postprocessing: {
    readonly snapping: 'off' | 'nearest-original-sample';
    readonly missingColors:
      | { readonly kind: 'return-fewer' }
      | { readonly kind: 'relax-separation'; readonly minimum: number };
  };
}
export interface ResolvedConfiguration {
  readonly requested: PipelineConfig;
  readonly effective: PipelineConfig;
  readonly presetId?: string;
  readonly resolutions: readonly Diagnostic[];
}
export interface RunMetadata {
  readonly schemaVersion: typeof PIPELINE_SCHEMA_VERSION;
  readonly runId: string;
  readonly inputFingerprint: string;
  readonly algorithmVersion: string;
}
export type ThemeRole = 'bg' | 'surface' | 'text' | 'accent' | 'secondary' | 'tertiary';
export interface MappingCheck {
  readonly roles: readonly ThemeRole[];
  readonly code: string;
  readonly actual: number;
  readonly required: number;
  readonly passed: boolean;
}
export interface ThemeResult {
  readonly roleSwatchIds: Readonly<Record<ThemeRole, EntityId>>;
  readonly aliases: Readonly<Partial<Record<ThemeRole, ThemeRole>>>;
  readonly explanation: string;
  readonly requestedPolicy: 'strict-dominance' | 'user';
  readonly appliedPolicy: 'strict-dominance' | 'dominance-aware' | 'user';
  readonly checks: readonly MappingCheck[];
  readonly diagnostics: readonly Diagnostic[];
  readonly tokens: Readonly<Record<string, { readonly rgb: RGB; readonly derivationId: EntityId }>>;
  readonly derivations: readonly Derivation[];
}

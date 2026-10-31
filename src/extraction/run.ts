import type { PipelineVisual } from './visual-state.js';
import { PIPELINE_SCHEMA_VERSION } from './types.js';
import type { RunMetadata } from './types.js';

export interface StageContext {
  readonly captureVisuals?: boolean;
  readonly visual?: PipelineVisual;
  readonly metadata?: RunMetadata;
  readonly signal?: AbortSignal;
}
export interface ExtractionRun extends StageContext {
  readonly signal: AbortSignal;
  readonly metadata: RunMetadata;
  isCurrent(): boolean;
  assertCurrent(): void;
}

/** One manager per extraction owner. An older run can never become current again. */
export function createRunManager(ownerId: string) {
  if (!ownerId.trim()) throw new TypeError('A run owner ID is required');
  let revision = 0;
  let active: AbortController | undefined;
  return {
    start(input: { inputFingerprint: string; algorithmVersion: string }): ExtractionRun {
      if (!input.inputFingerprint || !input.algorithmVersion)
        throw new TypeError('Input fingerprint and algorithm version are required');
      const metadata: RunMetadata = {
        schemaVersion: PIPELINE_SCHEMA_VERSION,
        runId: `${ownerId}:${revision + 1}`,
        inputFingerprint: input.inputFingerprint,
        algorithmVersion: input.algorithmVersion,
      };
      active?.abort();
      active = new AbortController();
      revision++;
      const controller = active;
      return {
        metadata,
        signal: controller.signal,
        isCurrent: () => active === controller && !controller.signal.aborted,
        assertCurrent: () => controller.signal.throwIfAborted(),
      };
    },
    cancel(): void {
      active?.abort();
      active = undefined;
    },
  };
}

/** Stable non-cryptographic fingerprint of the processed input, including alpha. */
export function rasterFingerprint(image: import('./types.js').RasterData): string {
  let hash = 2166136261;
  for (const byte of image.data) {
    hash ^= byte;
    hash = Math.imul(hash, 16777619);
  }
  return `${image.width}x${image.height}:${(hash >>> 0).toString(16)}`;
}

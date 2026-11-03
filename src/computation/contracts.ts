import type { PaletteOptions, PaletteResult } from '../palette.service.js';
import type { RasterData } from '../extraction/types.js';
import type { RoleAssignments } from '../theme.service.js';
import type { buildPaletteTheme } from '../theme/pipeline.js';
import type { TemplateId } from '../templates/bridge.js';

export type ComputationInput =
  | { kind: 'extract'; image: RasterData; options: PaletteOptions; template: TemplateId }
  | {
      kind: 'map';
      palette: Pick<PaletteResult, 'swatches'>;
      template: TemplateId;
      assignments?: RoleAssignments;
    };
export interface ComputationResult {
  palette?: PaletteResult;
  mapping: ReturnType<typeof buildPaletteTheme>;
}
export type WorkerRequest = ComputationInput & { id: number };
export type WorkerResponse =
  { id: number; result: ComputationResult } | { id: number; error: string };

export interface Computation {
  run(input: ComputationInput): Promise<ComputationResult>;
  cancel(): void;
  dispose(): void;
}

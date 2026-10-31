import type { PipelineResult } from '../extraction/pipeline.js';
import type { ThemeResult } from '../extraction/types.js';
export interface PipelineViewData {
  result: PipelineResult;
  theme: ThemeResult;
}

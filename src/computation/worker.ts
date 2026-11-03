import { extractPalette } from '../palette.service.js';
import { rasterFingerprint } from '../extraction/run.js';
import { buildPaletteTheme } from '../theme/pipeline.js';
import { TEMPLATE_USAGE } from '../theme/validation.js';
import type { WorkerRequest, WorkerResponse } from './contracts.js';

// Only structured data crosses this boundary; DOM and image loading stay in the app.
self.onmessage = (event: MessageEvent<WorkerRequest>) => {
  const request = event.data;
  let response: WorkerResponse;
  try {
    const palette =
      request.kind === 'extract'
        ? extractPalette(request.image, request.options, {
            captureVisuals: true,
            metadata: {
              schemaVersion: 1,
              runId: `worker:${request.id}`,
              inputFingerprint: rasterFingerprint(request.image),
              algorithmVersion: 'pipeline-v1',
            },
          })
        : undefined;
    const mapping = buildPaletteTheme(
      palette ?? (request.kind === 'map' ? request.palette : { swatches: [] }),
      TEMPLATE_USAGE[request.template],
      {},
      request.kind === 'map' ? request.assignments : undefined,
    );
    response = { id: request.id, result: { palette, mapping } };
  } catch (error) {
    response = { id: request.id, error: error instanceof Error ? error.message : String(error) };
  }
  self.postMessage(response);
};

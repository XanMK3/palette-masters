import type {
  Computation,
  ComputationInput,
  ComputationResult,
  WorkerRequest,
  WorkerResponse,
} from './contracts.js';

/** One worker per app. Termination interrupts synchronous CPU work immediately. */
export function createComputation(
  spawn: () => Worker = () =>
    new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' }),
): Computation {
  let worker: Worker | undefined;
  let revision = 0;
  let disposed = false;
  let pending:
    | {
        id: number;
        resolve(value: ComputationResult): void;
        reject(error: Error): void;
      }
    | undefined;

  function stop(error: Error) {
    worker?.terminate();
    worker = undefined;
    const previous = pending;
    pending = undefined;
    previous?.reject(error);
  }
  function cancel() {
    if (pending) stop(new DOMException('Computation superseded', 'AbortError'));
  }
  function run(input: ComputationInput): Promise<ComputationResult> {
    if (disposed) return Promise.reject(new DOMException('Computation disposed', 'AbortError'));
    cancel();
    return new Promise((resolve, reject) => {
      const id = ++revision;
      pending = { id, resolve, reject };
      try {
        if (!worker) {
          const instance = spawn();
          worker = instance;
          instance.onmessage = (event: MessageEvent<WorkerResponse>) => {
            if (worker !== instance || !pending || pending.id !== event.data.id) return;
            const current = pending;
            pending = undefined;
            if ('error' in event.data) current.reject(new Error(event.data.error));
            else current.resolve(event.data.result);
          };
          instance.onerror = (event) => {
            event.preventDefault();
            if (worker === instance)
              stop(new Error(event.message || 'Palette worker failed to start'));
          };
          instance.onmessageerror = () => {
            if (worker === instance) stop(new Error('Unable to read palette worker response'));
          };
        }
        let request: WorkerRequest;
        const transfer: Transferable[] = [];
        if (input.kind === 'extract') {
          // Keep the app's raster intact for the viewer and subsequent configuration changes.
          const data = new Uint8ClampedArray(input.image.data);
          request = {
            ...input,
            id,
            image: { width: input.image.width, height: input.image.height, data },
          };
          transfer.push(data.buffer);
        } else {
          request = { ...input, id };
        }
        worker.postMessage(request, transfer);
      } catch (error) {
        stop(error instanceof Error ? error : new Error(String(error)));
      }
    });
  }
  return {
    run,
    cancel,
    dispose() {
      disposed = true;
      stop(new DOMException('Computation disposed', 'AbortError'));
    },
  };
}

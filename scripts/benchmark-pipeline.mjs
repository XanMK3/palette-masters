import { performance } from 'node:perf_hooks';
import { writeFile } from 'node:fs/promises';
import os from 'node:os';
import { extractPalette } from '../.cache/tests/palette.service.js';
import { PRESET_IDS } from '../.cache/tests/extraction/presets.js';
import { buildPaletteTheme } from '../.cache/tests/theme/pipeline.js';
const width = 192,
  height = 128;
const image = {
  width,
  height,
  data: Uint8ClampedArray.from({ length: width * height * 4 }, (_, i) =>
    i % 4 === 3
      ? 255
      : (Math.floor(i / 4) * [29, 43, 67][i % 4] + Math.floor(i / 4 / width) * 17) % 256,
  ),
};
const records = [];
for (const method of PRESET_IDS)
  for (const count of [5, 6]) {
    const timings = [];
    let bundleBytes = 0,
      heapDelta = 0;
    for (let trial = 0; trial < 3; trial++) {
      global.gc?.();
      const before = process.memoryUsage().heapUsed;
      const start = performance.now();
      const result = extractPalette(image, { method, count });
      const { result: theme } = buildPaletteTheme(result);
      timings.push(performance.now() - start);
      global.gc?.();
      heapDelta = Math.max(heapDelta, process.memoryUsage().heapUsed - before);
      bundleBytes = Buffer.byteLength(JSON.stringify({ result, theme }));
    }
    timings.sort((a, b) => a - b);
    records.push({
      method,
      count,
      medianMs: +timings[1].toFixed(2),
      maximumMs: +timings[2].toFixed(2),
      serializedResultBytes: bundleBytes,
      retainedHeapDeltaBytes: Math.max(0, heapDelta),
    });
  }
const report = {
  date: new Date().toISOString().slice(0, 10),
  node: process.version,
  platform: `${os.platform()} ${os.arch()}`,
  cpu: os.cpus()[0].model,
  width,
  height,
  runsPerCase: 3,
  notes:
    'Synthetic raster; three-run median and maximum, not p95. Post-GC retained heap estimate, not peak memory. Extraction and theme results only.',
  records,
};
await writeFile('docs/PIPELINE_BENCHMARK.json', JSON.stringify(report, null, 2) + '\n');
console.log(
  JSON.stringify(
    {
      cases: records.length,
      slowest: records.toSorted((a, b) => b.maximumMs - a.maximumMs).slice(0, 5),
    },
    null,
    2,
  ),
);

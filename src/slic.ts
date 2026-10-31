import type { StageContext } from './extraction/run.js';
import type { RGB, RasterData } from './extraction/types.js';

/** CIELAB (D65), used by SLIC; distinct from Oklab used by final clustering. */
function cielab(r: number, g: number, b: number): RGB {
  const linear = (v: number) => {
    v /= 255;
    return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  r = linear(r);
  g = linear(g);
  b = linear(b);
  const f = (v: number) => (v > 216 / 24389 ? Math.cbrt(v) : (v * (24389 / 27)) / 116 + 16 / 116);
  const x = f((0.4124564 * r + 0.3575761 * g + 0.1804375 * b) / 0.95047);
  const y = f(0.2126729 * r + 0.7151522 * g + 0.072175 * b);
  const z = f((0.0193339 * r + 0.119192 * g + 0.9503041 * b) / 1.08883);
  return [116 * y - 16, 500 * (x - y), 200 * (y - z)];
}

export interface SlicResult {
  colors: RGB[];
  weights: number[];
  /** Connected region IDs in row-major order; -1 marks excluded transparent pixels. */
  labels: Int32Array;
  width: number;
  height: number;
}

/** SLIC in CIELAB + xy, with connected-component cleanup and region population weights.
 * Nearest-neighbor working raster is bounded to 160px on its longest side.
 */
export function slicRegions(
  image: RasterData,
  config = {
    maxDimension: 160,
    regions: 200,
    compactness: 10,
    iterations: 10,
    alphaThreshold: 192,
  },
  context: StageContext = {},
): SlicResult {
  context.signal?.throwIfAborted();
  if (
    [config.maxDimension, config.regions, config.iterations].some(
      (v) => !Number.isInteger(v) || v < 1,
    ) ||
    !Number.isFinite(config.compactness) ||
    config.compactness <= 0
  )
    throw new RangeError('Invalid SLIC settings');
  const scale = Math.min(1, config.maxDimension / Math.max(image.width, image.height));
  const width = Math.max(1, Math.round(image.width * scale));
  const height = Math.max(1, Math.round(image.height * scale));
  const n = width * height,
    rgb = new Uint8ClampedArray(n * 3),
    lab = new Float64Array(n * 3);
  const valid = new Uint8Array(n),
    opaque: number[] = [];
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      const p = y * width + x;
      const source =
        (Math.min(image.height - 1, Math.floor((y * image.height) / height)) * image.width +
          Math.min(image.width - 1, Math.floor((x * image.width) / width))) *
        4;
      if (image.data[source + 3] < config.alphaThreshold) continue;
      valid[p] = 1;
      opaque.push(p);
      const color = [image.data[source], image.data[source + 1], image.data[source + 2]] as RGB;
      rgb.set(color, p * 3);
      lab.set(cielab(...color), p * 3);
    }
  const labels = new Int32Array(n).fill(-1);
  if (!opaque.length) return { colors: [], weights: [], labels, width, height };
  const spacing = Math.max(1, Math.sqrt(n / config.regions));
  interface Center {
    l: number;
    a: number;
    b: number;
    x: number;
    y: number;
  }
  const centers: Center[] = [],
    seeded = new Set<number>();
  const gradient = (p: number): number => {
    const x = p % width,
      y = Math.floor(p / width);
    const neighbors = [
      y * width + Math.max(0, x - 1),
      y * width + Math.min(width - 1, x + 1),
      Math.max(0, y - 1) * width + x,
      Math.min(height - 1, y + 1) * width + x,
    ];
    if (neighbors.some((q) => !valid[q])) return Infinity;
    let sum = 0;
    for (let c = 0; c < 3; c++)
      sum +=
        (lab[neighbors[0] * 3 + c] - lab[neighbors[1] * 3 + c]) ** 2 +
        (lab[neighbors[2] * 3 + c] - lab[neighbors[3] * 3 + c]) ** 2;
    return sum;
  };
  function addSeed(p: number): void {
    if (seeded.has(p)) return;
    seeded.add(p);

    centers.push({
      l: lab[p * 3],
      a: lab[p * 3 + 1],
      b: lab[p * 3 + 2],
      x: p % width,
      y: Math.floor(p / width),
    });
  }
  for (let gy = Math.min(height - 1, spacing / 2); gy < height; gy += spacing)
    for (let gx = Math.min(width - 1, spacing / 2); gx < width; gx += spacing) {
      const x = Math.floor(gx),
        y = Math.floor(gy);
      let best = -1,
        score = Infinity;
      for (let yy = Math.max(0, y - 1); yy <= Math.min(height - 1, y + 1); yy++)
        for (let xx = Math.max(0, x - 1); xx <= Math.min(width - 1, x + 1); xx++) {
          const p = yy * width + xx;
          if (!valid[p] || seeded.has(p)) continue;
          const g = gradient(p);
          if (best < 0 || g < score) {
            best = p;
            score = g;
          }
        }
      if (best >= 0) addSeed(best);
    }
  if (!centers.length) addSeed(opaque[0]);
  const distances = new Float64Array(n);
  const spatialWeight = (config.compactness / spacing) ** 2;
  function metric(p: number, c: Center): number {
    return (
      (lab[p * 3] - c.l) ** 2 +
      (lab[p * 3 + 1] - c.a) ** 2 +
      (lab[p * 3 + 2] - c.b) ** 2 +
      spatialWeight * (((p % width) - c.x) ** 2 + (Math.floor(p / width) - c.y) ** 2)
    );
  }
  for (let iteration = 0; iteration < config.iterations; iteration++) {
    context.signal?.throwIfAborted();
    distances.fill(Infinity);
    labels.fill(-1);
    centers.forEach((c, id) => {
      for (
        let y = Math.max(0, Math.floor(c.y - spacing));
        y <= Math.min(height - 1, Math.ceil(c.y + spacing));
        y++
      )
        for (
          let x = Math.max(0, Math.floor(c.x - spacing));
          x <= Math.min(width - 1, Math.ceil(c.x + spacing));
          x++
        ) {
          const p = y * width + x;
          if (!valid[p]) continue;
          const d = metric(p, c);
          if (d < distances[p]) {
            distances[p] = d;
            labels[p] = id;
          }
        }
    });
    // Sparse transparency can leave islands outside every local search window.
    for (const p of opaque)
      if (labels[p] < 0) {
        centers.forEach((c, id) => {
          const d = metric(p, c);
          if (d < distances[p]) {
            distances[p] = d;
            labels[p] = id;
          }
        });
      }
    const sums = centers.map(() => [0, 0, 0, 0, 0, 0]);
    for (const p of opaque) {
      const s = sums[labels[p]];
      s[0] += lab[p * 3];
      s[1] += lab[p * 3 + 1];
      s[2] += lab[p * 3 + 2];
      s[3] += p % width;
      s[4] += Math.floor(p / width);
      s[5]++;
    }

    centers.forEach((c, id) => {
      const s = sums[id];
      if (s[5]) {
        c.l = s[0] / s[5];
        c.a = s[1] / s[5];
        c.b = s[2] / s[5];
        c.x = s[3] / s[5];
        c.y = s[4] / s[5];
      }
    });
  }
  // Flood-fill each connected component; merge tiny components only into an adjacent region.
  const connected = new Int32Array(n).fill(-1),
    queue = new Int32Array(n);
  const minimum = Math.max(1, Math.floor(opaque.length / centers.length / 4));
  const neighbors = (p: number): number[] => {
    const result: number[] = [];
    if (p % width) result.push(p - 1);
    if (p % width < width - 1) result.push(p + 1);
    if (p >= width) result.push(p - width);
    if (p < n - width) result.push(p + width);
    return result;
  };
  let nextId = 0;
  for (const start of opaque) {
    context.signal?.throwIfAborted();
    if (connected[start] >= 0) continue;
    let head = 0,
      tail = 1,
      adjacent = -1;
    queue[0] = start;
    connected[start] = nextId;
    while (head < tail) {
      const p = queue[head++];
      for (const q of neighbors(p)) {
        if (!valid[q]) continue;
        if (connected[q] >= 0) {
          if (connected[q] !== nextId) adjacent = connected[q];
          continue;
        }
        if (labels[q] === labels[start]) {
          connected[q] = nextId;
          queue[tail++] = q;
        }
      }
    }
    if (tail < minimum && adjacent >= 0) {
      for (let i = 0; i < tail; i++) connected[queue[i]] = adjacent;
    } else nextId++;
  }
  const sums = Array.from({ length: nextId }, () => [0, 0, 0]);
  const weights = Array(nextId).fill(0) as number[];
  for (const p of opaque) {
    const id = connected[p];
    weights[id]++;
    for (let c = 0; c < 3; c++) sums[id][c] += rgb[p * 3 + c];
  }

  return {
    colors: sums.map((s, i) => s.map((v) => Math.round(v / weights[i])) as RGB),
    weights,
    labels: connected,
    width,
    height,
  };
}

import type {
  RasterData,
  OriginalSampleSet,
  PreparedSampleSet,
  PreprocessingConfig,
  PreparedSample,
  Derivation,
  MembershipTable,
  RGB,
} from '../types.js';
import type { StageContext } from '../run.js';
import { slicRegions } from '../../slic.js';
export function prepareSamples(
  image: RasterData,
  originals: OriginalSampleSet,
  config: PreprocessingConfig,
  context: StageContext = {},
): PreparedSampleSet {
  const derivations: Derivation[] = originals.samples.map((s) => ({
    id: `${s.id}:source`,
    operation: 'sample',
    inputs: [],
    sourcePixel: s.source,
    sampledRgb: [...s.rgb],
  }));
  let samples: PreparedSample[] = originals.samples.map((s) => ({
    ...s,
    originalSampleId: s.id,
    derivationId: `${s.id}:source`,
  }));
  const memberships: MembershipTable[] = [];

  if (config.kind === 'edge-weighted') {
    samples = samples.map((s, i) => {
      context.signal?.throwIfAborted();
      const { x, y } = originals.samples[i].source;
      const neighbor = (xx: number, yy: number, c: number) => {
        const p =
          (Math.max(0, Math.min(image.height - 1, yy)) * image.width +
            Math.max(0, Math.min(image.width - 1, xx))) *
          4;
        return image.data[p + 3] >= originals.config.alphaThreshold ? image.data[p + c] : s.rgb[c];
      };
      let edge = 0;
      for (let c = 0; c < 3; c++)
        edge +=
          Math.abs(neighbor(x + 1, y, c) - neighbor(x - 1, y, c)) +
          Math.abs(neighbor(x, y + 1, c) - neighbor(x, y - 1, c));
      const influence = s.influence * (1 + (config.strength * edge) / 255);

      return { ...s, influence };
    });
  }
  if (config.kind === 'slic') {
    const regions = slicRegions(
      image,
      { ...config, alphaThreshold: originals.config.alphaThreshold },
      context,
    );
    if (context.visual)
      context.visual.regions = {
        width: regions.width,
        height: regions.height,
        labels: regions.labels.slice(),
      };
    const missingOriginals = originals.samples.filter((s) => {
      const x = Math.min(regions.width - 1, Math.floor((s.source.x * regions.width) / image.width)),
        y = Math.min(regions.height - 1, Math.floor((s.source.y * regions.height) / image.height));
      return regions.labels[y * regions.width + x] < 0;
    });
    const rasterScale = (image.width * image.height) / (regions.width * regions.height);
    const rawArea =
      regions.weights.reduce((sum, w) => sum + w * rasterScale, 0) +
      missingOriginals.reduce((sum, s) => sum + s.representedArea, 0);
    const areaScale = originals.stats.representedArea / rawArea;
    const memberIds: string[] = [];
    const groups: MembershipTable['groups'][number][] = [];
    // Provenance uses the actual working-raster source pixels that produced each mean.
    const sourceGroups = regions.colors.map(() => [] as number[]);
    regions.labels.forEach((label, p) => {
      if (label >= 0) sourceGroups[label].push(p);
    });
    samples = regions.colors.map((rgb, i) => {
      const id = `slic:region:${i}`,
        start = memberIds.length;
      for (const p of sourceGroups[i]) {
        const x = Math.min(
            image.width - 1,
            Math.floor(((p % regions.width) * image.width) / regions.width),
          ),
          y = Math.min(
            image.height - 1,
            Math.floor((Math.floor(p / regions.width) * image.height) / regions.height),
          );
        const sourceId = `slic:pixel:${p}`;
        memberIds.push(sourceId);
        derivations.push({
          id: sourceId,
          operation: 'sample',
          inputs: [],
          sourcePixel: { x, y, pixelIndex: y * image.width + x },
          sampledRgb: [
            image.data[(y * image.width + x) * 4],
            image.data[(y * image.width + x) * 4 + 1],
            image.data[(y * image.width + x) * 4 + 2],
          ],
        });
      }
      groups.push({ id, start, length: memberIds.length - start });
      const area = regions.weights[i] * rasterScale * areaScale;
      derivations.push({
        id: `${id}:mean`,
        operation: 'average',
        inputs: [{ kind: 'membership', tableId: 'slic:members', groupId: id }],
      });

      return {
        id,
        rgb: [...rgb] as RGB,
        representedArea: area,
        influence: area,
        derivationId: `${id}:mean`,
        regionId: id,
      };
    });
    memberships.push({ id: 'slic:members', memberIds, groups });
    // Downsampling can miss isolated opaque pixels. Preserve those original samples
    // as singleton regions rather than returning an empty or incomplete fitting pool.
    for (const s of missingOriginals)
      samples.push({
        ...s,
        representedArea: s.representedArea * areaScale,
        influence: s.influence * areaScale,
        originalSampleId: s.id,
        derivationId: `${s.id}:source`,
      });
  }

  return { originals, samples, derivations, memberships };
}

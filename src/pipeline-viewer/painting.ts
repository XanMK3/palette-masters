import type { PipelineViewData } from './model.js';
import type { StoryFrame } from './story.js';
import { frameLabels } from './story.js';

/** Display expands each retained sample over its represented eligible-pixel interval.
 * This is a sample-based reconstruction, never an assertion of exact per-pixel fitting. */
export class PaintingView {
  private originalOwner: Int32Array;
  private preparedOwner: Int32Array;
  private sampleIndex: Map<string, number>;
  private preparedIndex: Map<string, number>;
  private context: CanvasRenderingContext2D;
  constructor(
    canvas: HTMLCanvasElement,
    private readonly image: ImageData,
    private readonly data: PipelineViewData,
  ) {
    canvas.width = image.width;
    canvas.height = image.height;
    this.context = canvas.getContext('2d')!;
    const r = data.result;
    this.sampleIndex = new Map(r.originalSamples.samples.map((s, i) => [s.id, i]));
    this.preparedIndex = new Map(r.preparedSamples.map((s, i) => [s.id, i]));
    this.originalOwner = new Int32Array(image.width * image.height).fill(-1);
    let ordinal = 0,
      index = 0;
    for (let p = 0; p < this.originalOwner.length; p++) {
      if (image.data[p * 4 + 3] < r.originalSamples.config.alphaThreshold) continue;
      while (
        index + 1 < r.originalSamples.samples.length &&
        ordinal >= r.originalSamples.samples[index + 1].eligibleRange.start
      )
        index++;
      this.originalOwner[p] = index;
      ordinal++;
    }
    this.preparedOwner = Int32Array.from(this.originalOwner, (i) =>
      i < 0 ? -1 : (this.preparedIndex.get(r.originalSamples.samples[i].id) ?? -1),
    );
    const regions = r.visual?.regions;
    if (regions)
      for (let p = 0; p < this.preparedOwner.length; p++) {
        if (this.originalOwner[p] < 0) continue;
        const x = p % image.width,
          y = Math.floor(p / image.width);
        const label =
          regions.labels[
            Math.floor((y * regions.height) / image.height) * regions.width +
              Math.floor((x * regions.width) / image.width)
          ];
        if (label >= 0)
          this.preparedOwner[p] = this.preparedIndex.get(`slic:region:${label}`) ?? -1;
      }
  }
  draw(frame: StoryFrame, selected?: string, original = false) {
    const { result: r } = this.data,
      ctx = this.context;
    if (original) {
      ctx.putImageData(this.image, 0, 0);
      return;
    }
    const preparedLabels = new Map<number, string>(),
      originalLabels = new Map<number, string>();
    const assign = (id: string, group: string) => {
      const prepared = this.preparedIndex.get(id),
        source = this.sampleIndex.get(id);
      if (prepared !== undefined) preparedLabels.set(prepared, group);
      if (source !== undefined) originalLabels.set(source, group);
    };
    const labels = frameLabels(frame);
    if (frame.partition && frame.groups)
      for (const group of frame.groups)
        for (const input of group.members) assign(frame.partition.sampleIds[input], group.id);
    else if (frame.fit && labels)
      frame.fit.sampleIds.forEach((id, i) => assign(id, frame.fit!.centerIds[labels[i]]));
    else if (frame.fit && frame.mode === 'seeds')
      frame.fit.seeds.forEach((input, i) =>
        assign(frame.fit!.sampleIds[input], frame.fit!.centerIds[i]),
      );
    else {
      const final =
        frame.chapter === 'coverage' || frame.chapter === 'theme' || frame.chapter === 'refine';
      const tables = final
        ? r.memberships.filter((t) => t.id === 'dominance:members')
        : r.quantization.memberships;
      for (const table of tables) {
        if (table.id.endsWith(':averaging-members')) continue;
        for (const group of table.groups)
          for (let i = group.start; i < group.start + group.length; i++)
            assign(table.memberIds[i], group.id);
      }
      if (!final && r.configuration.effective.quantization.kind === 'original-samples') {
        const byColor = new Map(r.quantization.candidates.map((c) => [c.rgb.join(','), c.id]));
        for (const sample of r.preparedSamples) {
          const group = byColor.get(sample.rgb.join(','));
          if (group) assign(sample.id, group);
        }
      }
    }
    const colors = new Map(frame.colors.map((c) => [c.id, c]));
    const output = new ImageData(
      new Uint8ClampedArray(this.image.data),
      this.image.width,
      this.image.height,
    );
    const useOriginal =
      frame.chapter === 'coverage' || frame.chapter === 'theme' || frame.chapter === 'refine';
    for (let p = 0; p < this.originalOwner.length; p++) {
      if (this.originalOwner[p] < 0) continue;
      const owner = this.preparedOwner[p];
      const group = useOriginal
        ? originalLabels.get(this.originalOwner[p])
        : (preparedLabels.get(owner) ?? originalLabels.get(this.originalOwner[p]));
      const swatch = group ? colors.get(group) : undefined;
      const dim = selected
        ? group !== selected
        : frame.focusGroups
          ? !group || !frame.focusGroups.includes(group)
          : frame.chapter === 'select'
            ? !swatch || swatch.kept === false
            : false;
      if (
        frame.mode === 'prepare' &&
        r.configuration.effective.preprocessing.kind === 'edge-weighted'
      ) {
        const input = r.preparedSamples[owner];
        if (!input) continue;
        const strength = 1 - Math.exp(-Math.max(0, input.influence / input.representedArea - 1));
        output.data[p * 4] = this.image.data[p * 4] * (1 - strength) + 255 * strength;
        output.data[p * 4 + 1] *= 1 - strength;
        output.data[p * 4 + 2] *= 1 - strength;
        continue;
      }
      for (let channel = 0; channel < 3; channel++) {
        if (dim) output.data[p * 4 + channel] *= 0.18;
        else if (frame.mode === 'groups' && swatch)
          output.data[p * 4 + channel] =
            swatch.rgb[channel] * 0.88 + this.image.data[p * 4 + channel] * 0.12;
      }
    }
    ctx.putImageData(output, 0, 0);
    if (frame.mode === 'prepare' && r.visual?.regions) {
      ctx.fillStyle = '#fff';
      for (let p = 0; p < this.preparedOwner.length; p++)
        if (
          this.preparedOwner[p] >= 0 &&
          ((p % this.image.width > 0 && this.preparedOwner[p] !== this.preparedOwner[p - 1]) ||
            (p >= this.image.width &&
              this.preparedOwner[p] !== this.preparedOwner[p - this.image.width]))
        )
          ctx.fillRect(p % this.image.width, Math.floor(p / this.image.width), 1, 1);
    }
    if (frame.mode === 'samples') {
      const samples = r.originalSamples.samples;
      const stride = Math.max(1, Math.ceil(samples.length / 400));
      const size = Math.max(0.5, this.image.width / 450);
      ctx.fillStyle = '#fff';
      ctx.strokeStyle = '#000';
      ctx.lineWidth = Math.max(0.2, size / 3);
      for (let i = 0; i < samples.length; i += stride) {
        const sample = samples[i];
        ctx.beginPath();
        ctx.arc(sample.source.x, sample.source.y, size, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
    }
    for (const [pins, stroke] of [
      [frame.oldPins, '#f97316'],
      [frame.pins, '#fff'],
    ] as const) {
      if (!pins) continue;
      for (const id of pins) {
        const source = r.originalSamples.samples.find((s) => s.id === id)?.source;
        let x = source?.x,
          y = source?.y;
        if (x === undefined) {
          const index = this.preparedIndex.get(id);
          if (index === undefined) continue;
          let count = 0,
            sumX = 0,
            sumY = 0;
          for (let p = 0; p < this.preparedOwner.length; p++)
            if (this.preparedOwner[p] === index) {
              count++;
              sumX += p % this.image.width;
              sumY += Math.floor(p / this.image.width);
            }
          if (!count) continue;
          x = sumX / count;
          y = sumY / count;
        }
        ctx.beginPath();
        ctx.arc(x, y!, Math.max(2, this.image.width / 100), 0, Math.PI * 2);
        ctx.strokeStyle = stroke;
        ctx.lineWidth = Math.max(1, this.image.width / 250);
        ctx.stroke();
      }
    }
  }
}

import type { StoryFrame } from './story.js';
/** One clock for the entire story. Frame count never changes its total duration. */
export class StoryPlayer {
  index = 0;
  playing = false;
  private elapsed = 0;
  private started = 0;
  private timer: ReturnType<typeof setTimeout> | undefined;
  readonly total: number;
  private offsets: number[] = [];
  constructor(
    readonly frames: readonly StoryFrame[],
    private readonly change: () => void,
    private readonly now = () => performance.now(),
  ) {
    let time = 0;
    for (const frame of frames) {
      this.offsets.push(time);
      time += frame.duration;
    }
    this.total = time;
  }
  pause() {
    if (this.playing) this.elapsed = Math.min(this.total, this.now() - this.started);
    this.playing = false;
    clearTimeout(this.timer);
    this.change();
  }
  seek(index: number) {
    this.playing = false;
    clearTimeout(this.timer);
    this.index = Math.max(0, Math.min(this.frames.length - 1, index));
    this.elapsed = this.offsets[this.index];
    this.change();
  }
  play() {
    if (this.playing) return;
    if (this.elapsed >= this.total) this.seek(0);
    this.playing = true;
    this.started = this.now() - this.elapsed;
    this.change();
    this.tick();
  }
  private tick() {
    if (!this.playing) return;
    this.elapsed = Math.min(this.total, this.now() - this.started);
    let next = this.index;
    while (next + 1 < this.frames.length && this.offsets[next + 1] <= this.elapsed) next++;
    if (next !== this.index) {
      this.index = next;
      this.change();
    }
    if (this.elapsed >= this.total) {
      this.playing = false;
      this.change();
      return;
    }
    this.timer = setTimeout(() => this.tick(), 32);
  }
  dispose() {
    this.playing = false;
    clearTimeout(this.timer);
  }
}

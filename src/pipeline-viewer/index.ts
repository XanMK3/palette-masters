import type { PipelineViewData } from './model.js';
import { createStory, resolveFrame, chapterNames, type Chapter } from './story.js';
import { PaintingView } from './painting.js';
import { StoryPlayer } from './player.js';
import './viewer.css';
function el<K extends keyof HTMLElementTagNameMap>(tag: K, text?: string) {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  return node;
}
const rgb = (value: readonly number[]) => `rgb(${value.join(',')})`;
const hex = (value: readonly number[]) =>
  '#' + value.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');
const icons: Record<string, string> = {
  Close: '<path d="m6 6 12 12M18 6 6 18"/>',
  Play: '<path d="m8 5 11 7-11 7Z"/>',
  Pause: '<path d="M8 5v14M16 5v14"/>',
  Previous: '<path d="m15 6-6 6 6 6"/>',
  Next: '<path d="m9 6 6 6-6 6"/>',
  Restart: '<path d="M3 10a9 9 0 1 1 2 8M3 4v6h6"/>',
};
function setIcon(button: HTMLButtonElement, label: string) {
  button.classList.add('pv-icon');
  button.setAttribute('aria-label', label);
  button.title = label;
  button.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[label]}</svg>`;
}
const visibleChapter = (chapter: Chapter): Chapter =>
  chapter === 'prepare' ? 'sample' : chapter === 'refine' ? 'select' : chapter;
interface ViewerControls {
  advanced: HTMLElement;
  select: (value: string) => void;
}
export class PipelineViewer {
  private dialog: HTMLDialogElement | undefined;
  private stop: (() => void) | undefined;
  private opener: HTMLElement | null = null;
  chapter: Chapter = 'sample';
  get isOpen() {
    return this.dialog?.open ?? false;
  }
  close() {
    this.dialog?.close();
  }
  dispose() {
    this.stop?.();
    this.close();
    this.dialog?.remove();
    this.dialog = undefined;
    this.stop = undefined;
  }
  open(
    data: PipelineViewData,
    image: ImageData,
    options: ViewerControls,
    chapter: Chapter = 'sample',
  ) {
    const refreshing = this.isOpen;
    this.stop?.();
    if (!refreshing) this.opener = document.activeElement as HTMLElement | null;
    const dialog = this.dialog ?? el('dialog');
    this.dialog = dialog;
    dialog.replaceChildren();
    dialog.className = 'pipeline-viewer';
    dialog.setAttribute('aria-label', 'Palette extraction pipeline');
    const close = el('button');
    setIcon(close, 'Close');
    close.onclick = () => this.close();
    const header = el('header');
    const frames = createStory(data);
    const nav = el('nav');
    nav.setAttribute('aria-label', 'Pipeline chapters');
    header.append(nav, close);
    const stage = el('div');
    stage.className = 'pv-painting';
    const canvas = el('canvas');
    canvas.setAttribute('role', 'img');
    canvas.setAttribute('aria-label', 'Painting showing palette extraction');
    const badge = el('span', 'Sample-based reconstruction');
    badge.className = 'pv-badge';
    const themeCard = el('div');
    themeCard.className = 'pv-theme-card';
    themeCard.hidden = true;
    const roleNames: Record<string, string> = {
      bg: 'Background',
      surface: 'Surface',
      text: 'Text',
      accent: 'Accent',
      secondary: 'Secondary',
      tertiary: 'Tertiary',
    };
    const themeColors = Object.fromEntries(
      Object.entries(data.theme.roleSwatchIds).map(([role, id]) => [
        role,
        data.result.swatches.find((s) => s.id === id)!.rgb,
      ]),
    );
    themeCard.style.background = rgb(themeColors.bg);
    themeCard.style.color = rgb(data.theme.tokens['--color-text']?.rgb ?? themeColors.text);
    themeCard.append(el('strong', 'Your palette, applied'));
    const panel = el('div');
    panel.style.background = rgb(themeColors.surface);
    panel.style.height = '24px';
    panel.style.margin = '10px 0';
    panel.style.borderRadius = '6px';
    themeCard.append(panel);
    const accent = el('div');
    accent.style.background = rgb(themeColors.accent);
    accent.style.height = '14px';
    accent.style.width = '50%';
    accent.style.borderRadius = '8px';
    themeCard.append(accent);
    stage.append(canvas, badge, themeCard);
    const caption = el('p');
    caption.className = 'pv-caption';
    caption.setAttribute('aria-live', 'polite');
    const swatches = el('div');
    swatches.className = 'pv-swatches';
    swatches.setAttribute('role', 'group');
    swatches.setAttribute('aria-label', 'Colors in this step');
    const roles = el('div');
    roles.className = 'pv-roles';
    roles.hidden = true;
    themeCard.append(roles);
    const selection = el('label', 'Select by ');
    selection.className = 'pv-selection';
    const strategy = el('select');
    strategy.setAttribute('aria-label', 'Selection strategy');
    for (const [value, label] of [
      ['population', 'Population'],
      ['dominance-separated', 'Dominance'],
      ['farthest-point', 'Farthest point'],
      ['lightness', 'Lightness'],
    ])
      strategy.add(new Option(label, value));
    strategy.value = data.result.configuration.effective.selection.kind;
    strategy.onchange = () => {
      player.pause();
      options.select(strategy.value);
    };
    selection.append(strategy);
    const stepDescription = el('div');
    stepDescription.className = 'pv-step-description';
    stepDescription.append(caption, selection);
    const controls = el('div');
    controls.className = 'pv-controls';
    const previous = el('button', 'Previous'),
      play = el('button', 'Play'),
      next = el('button', 'Next'),
      restart = el('button', 'Restart'),
      original = el('button', 'Original');
    for (const button of [previous, play, next, restart]) setIcon(button, button.textContent!);
    original.setAttribute('aria-pressed', 'false');
    const timeline = el('input');
    timeline.type = 'range';
    timeline.min = '0';
    timeline.max = String(frames.length - 1);
    timeline.step = '1';
    timeline.value = '0';
    timeline.setAttribute('aria-label', 'Story step');
    const progress = el('output');
    progress.setAttribute('aria-label', 'Story position');
    controls.append(play, previous, next, restart, timeline, original, progress);
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    dialog.append(header, stage, stepDescription, swatches, controls, options.advanced);
    const painting = new PaintingView(canvas, image, data);
    let selected: string | undefined,
      showOriginal = false;
    const player = new StoryPlayer(frames, render);
    const viewer = this;
    const chapterButtons = new Map<Chapter, HTMLButtonElement>();
    for (const [index, frame] of frames.entries())
      if (!chapterButtons.has(visibleChapter(frame.chapter))) {
        const button = el('button', chapterNames[visibleChapter(frame.chapter)]);
        button.onclick = () => {
          selected = undefined;
          player.seek(index);
        };
        if (nav.childElementCount) {
          const arrow = el('span', '→');
          arrow.setAttribute('aria-hidden', 'true');
          nav.append(arrow);
        }
        nav.append(button);
        chapterButtons.set(visibleChapter(frame.chapter), button);
      }
    const inspect = (id: string) => {
      player.pause();
      selected = selected === id ? undefined : id;
      render();
    };
    function render() {
      const frame = resolveFrame(frames[player.index]);
      if (selected && !frame.colors.some((c) => c.id === selected)) selected = undefined;
      painting.draw(frame, selected, showOriginal);
      caption.setAttribute('aria-live', player.playing ? 'off' : 'polite');
      caption.textContent = frame.caption;
      setIcon(play, player.playing ? 'Pause' : 'Play');
      viewer.chapter = visibleChapter(frame.chapter);
      selection.hidden = viewer.chapter !== 'select';
      play.disabled = reduced.matches;
      previous.disabled = player.index === 0;
      next.disabled = player.index === frames.length - 1;
      progress.textContent = `${player.index + 1} / ${frames.length}`;
      timeline.value = String(player.index);
      for (const [chapter, button] of chapterButtons)
        button.setAttribute('aria-current', String(chapter === visibleChapter(frame.chapter)));
      original.setAttribute('aria-pressed', String(showOriginal));
      swatches.replaceChildren();
      if (frame.colors.length <= 128)
        for (const color of frame.colors) {
          const button = el('button');
          button.className = 'pv-swatch';
          button.style.background = rgb(color.rgb);
          button.dataset.colorId = color.id;
          button.setAttribute(
            'aria-label',
            `${hex(color.rgb)}${color.share !== undefined ? ` · ${(color.share * 100).toFixed(1)}%` : ''}${color.kept === false ? ' · not selected' : ''}`,
          );
          button.title = button.getAttribute('aria-label')!;
          button.setAttribute('aria-pressed', String(selected === color.id));
          if (color.kept === false) button.classList.add('pv-rejected');
          if (color.share !== undefined) {
            button.style.flexGrow = String(Math.max(0.1, color.share * 10));
            const label = el('span', `${(color.share * 100).toFixed(0)}%`);
            button.append(label);
          }
          button.onclick = () => {
            inspect(color.id);
            swatches
              .querySelector<HTMLButtonElement>(`[data-color-id="${CSS.escape(color.id)}"]`)
              ?.focus();
          };
          swatches.append(button);
        }
      else {
        const strip = el('canvas');
        strip.width = 1000;
        strip.height = 32;
        strip.className = 'pv-color-strip';
        strip.setAttribute('aria-label', `${frame.colors.length} candidate colors`);
        const ctx = strip.getContext('2d')!;
        frame.colors.forEach((c, i) => {
          ctx.fillStyle = rgb(c.rgb);
          ctx.fillRect(
            (i * 1000) / frame.colors.length,
            0,
            Math.max(1, 1000 / frame.colors.length),
            32,
          );
        });
        const selector = el('input');
        selector.type = 'range';
        selector.min = '0';
        selector.max = String(frame.colors.length - 1);
        selector.setAttribute('aria-label', 'Inspect candidate color');
        selector.value = String(
          Math.max(
            0,
            frame.colors.findIndex((c) => c.id === selected),
          ),
        );
        selector.oninput = () => inspect(frame.colors[Number(selector.value)].id);
        swatches.append(strip, selector);
      }
      roles.hidden = frame.chapter !== 'theme';
      themeCard.hidden = frame.chapter !== 'theme' || showOriginal;
      roles.replaceChildren();
      if (frame.chapter === 'theme')
        for (const [role, id] of Object.entries(data.theme.roleSwatchIds)) {
          const button = el('button', roleNames[role]);
          const dot = el('span');
          dot.style.background = rgb(themeColors[role]);
          button.prepend(dot);
          button.dataset.role = role;
          button.onclick = () => {
            inspect(id);
            roles.querySelector<HTMLButtonElement>(`[data-role="${role}"]`)?.focus();
          };
          roles.append(button);
        }
      const sampleCount = data.result.originalSamples.samples.length;
      badge.textContent = showOriginal
        ? 'Original painting'
        : frame.chapter === 'sample'
          ? `${Math.ceil(sampleCount / Math.max(1, Math.ceil(sampleCount / 400)))} of ${sampleCount.toLocaleString()} sample locations marked`
          : frame.chapter === 'prepare' && data.result.visual?.regions
            ? 'Working-resolution regions'
            : 'Sample-based reconstruction';
    }
    previous.onclick = () => {
      selected = undefined;
      player.seek(player.index - 1);
    };
    next.onclick = () => {
      selected = undefined;
      player.seek(player.index + 1);
    };
    restart.onclick = () => {
      selected = undefined;
      player.seek(0);
    };
    play.onclick = () => {
      selected = undefined;
      if (player.playing) player.pause();
      else player.play();
    };
    timeline.oninput = () => {
      selected = undefined;
      player.seek(Number(timeline.value));
    };
    original.onclick = () => {
      showOriginal = !showOriginal;
      render();
    };
    const onMotion = () => {
      player.pause();
      play.disabled = reduced.matches;
    };
    reduced.addEventListener('change', onMotion);
    const onVisibility = () => {
      if (document.hidden) player.pause();
    };
    document.addEventListener('visibilitychange', onVisibility);
    const onClose = () => {
      this.stop?.();
      dialog.remove();
      if (this.dialog === dialog) {
        this.dialog = undefined;
        this.stop = undefined;
      }
      this.opener?.focus();
    };
    dialog.addEventListener('close', onClose, { once: true });
    this.stop = () => {
      player.dispose();
      reduced.removeEventListener('change', onMotion);
      document.removeEventListener('visibilitychange', onVisibility);
      dialog.removeEventListener('close', onClose);
    };
    if (!refreshing) document.body.append(dialog);
    player.seek(
      Math.max(
        0,
        frames.findIndex((frame) => visibleChapter(frame.chapter) === chapter),
      ),
    );
    if (!refreshing) {
      dialog.showModal();
      close.focus();
    }
  }
}

export type { PipelineViewData } from './model.js';
export type { Chapter } from './story.js';

import type {
  PipelineConfig,
  QuantizerConfig,
  SelectionConfig,
  PreprocessingConfig,
  StrategyConfig,
} from './types.js';
import { presetConfig, DEFAULT_PRESET, type PresetId } from './presets.js';
import { resolveConfiguration } from './capabilities.js';
/** All values are validated before the application receives a new configuration. */
export function mountAdvancedControls(
  host: HTMLElement,
  onChange: (config: PipelineConfig) => void,
) {
  const details = document.createElement('details');
  details.className = 'advanced-pipeline';
  const summary = document.createElement('summary');
  summary.textContent = 'Advanced composition';
  details.append(summary);
  const form = document.createElement('div');
  form.className = 'pipeline-fields';
  details.append(form);
  host.append(details);
  const controls = new Map<string, HTMLInputElement | HTMLSelectElement>();
  function field(key: string, label: string, options?: string[], value = '') {
    const wrapper = document.createElement('label');
    wrapper.textContent = label;
    const control = options ? document.createElement('select') : document.createElement('input');
    control.id = `pipeline-${key}`;
    control.setAttribute('aria-label', label);
    if (control instanceof HTMLSelectElement)
      for (const option of options!) control.add(new Option(option, option));
    else {
      control.type = 'number';
      control.step = 'any';
    }
    control.value = value;
    controls.set(key, control);
    wrapper.append(control);
    form.append(wrapper);
    control.addEventListener('change', change);
  }
  field('preprocessing', 'Preprocessing', ['none', 'edge-weighted', 'slic']);
  field('quantizer', 'Candidate generation', [
    'kmeans-rgb',
    'kmeans-oklab',
    'medoids',
    'mmcq',
    'octree',
    'hue-groups',
    'original-samples',
  ]);
  field('budget', 'Candidate budget');
  field('iterations', 'Fitting iterations');
  field('pool', 'Medoid representative pool');
  field('sectors', 'Hue sectors');
  field('fraction', 'MMCQ population fraction');
  field('selection', 'Representative selection', [
    'population',
    'dominance-separated',
    'farthest-point',
    'lightness',
  ]);
  field('separation', 'Minimum Oklab separation');
  field('strategy', 'Strategy', ['standard', 'adaptive-k', 'stratified']);
  field('min-k', 'Minimum K');
  field('max-k', 'Maximum K');
  field('gain', 'Adaptive improvement threshold');
  field('dark', 'Dark lightness boundary');
  field('light', 'Light lightness boundary');
  field('edge', 'Edge influence strength');
  field('regions', 'SLIC regions');
  field('dimension', 'SLIC raster dimension');
  field('compactness', 'SLIC compactness');
  field('slic-iterations', 'SLIC iterations');
  field('samples', 'Original sample budget');
  field('alpha', 'Minimum alpha');
  field('snapping', 'Use only sampled image colors', ['off', 'nearest-original-sample']);
  field('missing', 'Missing colors', ['return-fewer', 'relax-separation']);
  field('relaxed', 'Relaxed minimum separation');
  const error = document.createElement('p');
  error.className = 'tiny';
  error.id = 'pipeline-validation';
  error.setAttribute('role', 'status');
  details.append(error);
  let current = presetConfig(DEFAULT_PRESET);
  const value = (key: string) => controls.get(key)!.value;
  const number = (key: string) => Number(value(key));
  const set = (key: string, v: string | number) => {
    controls.get(key)!.value = String(v);
  };
  function visibility() {
    const q = value('quantizer'),
      p = value('preprocessing'),
      s = value('selection'),
      strategy = value('strategy');
    const enabled: Record<string, boolean> = {
      budget: !['original-samples', 'hue-groups'].includes(q),
      iterations: ['kmeans-rgb', 'kmeans-oklab', 'medoids'].includes(q),
      pool: q === 'medoids',
      sectors: q === 'hue-groups',
      fraction: q === 'mmcq',
      separation: s !== 'population',
      dark: s === 'lightness',
      light: s === 'lightness',
      edge: p === 'edge-weighted',
      regions: p === 'slic',
      dimension: p === 'slic',
      compactness: p === 'slic',
      'slic-iterations': p === 'slic',
      'min-k': strategy === 'adaptive-k',
      'max-k': strategy === 'adaptive-k',
      gain: strategy === 'adaptive-k',
      relaxed: value('missing') === 'relax-separation',
    };
    for (const [key, isEnabled] of Object.entries(enabled)) {
      controls.get(key)!.disabled = !isEnabled;
      controls.get(key)!.parentElement!.hidden = !isEnabled;
    }
    const select = controls.get('strategy') as HTMLSelectElement;
    for (const option of select.options)
      option.disabled =
        (option.value === 'adaptive-k' && !q.startsWith('kmeans')) ||
        (option.value === 'stratified' && s !== 'lightness');
  }
  function change() {
    visibility();
    try {
      const q = value('quantizer');
      const quantization: QuantizerConfig = q.startsWith('kmeans')
        ? {
            kind: 'kmeans',
            space: q === 'kmeans-rgb' ? 'rgb' : 'oklab',
            candidates: number('budget'),
            iterations: number('iterations'),
          }
        : q === 'medoids'
          ? {
              kind: 'medoids',
              candidates: number('budget'),
              maxSamples: number('pool'),
              iterations: number('iterations'),
            }
          : q === 'mmcq'
            ? { kind: 'mmcq', candidates: number('budget'), populationFraction: number('fraction') }
            : q === 'octree'
              ? { kind: 'octree', candidates: number('budget') }
              : q === 'hue-groups'
                ? { kind: 'hue-groups', sectors: number('sectors') }
                : { kind: 'original-samples' };
      const p = value('preprocessing');
      const preprocessing: PreprocessingConfig =
        p === 'none'
          ? { kind: 'none' }
          : p === 'edge-weighted'
            ? { kind: 'edge-weighted', strength: number('edge') }
            : {
                kind: 'slic',
                regions: number('regions'),
                maxDimension: number('dimension'),
                compactness: number('compactness'),
                iterations: number('slic-iterations'),
              };
      const s = value('selection');
      const selection: SelectionConfig =
        s === 'population'
          ? { kind: 'population' }
          : s === 'lightness'
            ? {
                kind: 'lightness',
                boundaries: [number('dark'), number('light')],
                minWithinBandSeparation: number('separation'),
              }
            : {
                kind: s as 'dominance-separated' | 'farthest-point',
                minSeparation: number('separation'),
              };
      const strategy: StrategyConfig =
        value('strategy') === 'adaptive-k'
          ? {
              kind: 'adaptive-k',
              minK: number('min-k'),
              maxK: number('max-k'),
              improvementThreshold: number('gain'),
            }
          : { kind: value('strategy') as 'standard' | 'stratified' };
      const requested: PipelineConfig = {
        ...current,
        preprocessing,
        quantization,
        selection,
        strategy,
        sampling: { maxSamples: number('samples'), alphaThreshold: number('alpha') },
        postprocessing: {
          snapping: value('snapping') as PipelineConfig['postprocessing']['snapping'],
          missingColors:
            value('missing') === 'return-fewer'
              ? { kind: 'return-fewer' }
              : { kind: 'relax-separation', minimum: number('relaxed') },
        },
      };
      const resolved = resolveConfiguration(requested);
      current = requested;
      if (resolved.resolutions.length) {
        set('strategy', 'stratified');
        current = resolved.effective;
        error.textContent = 'Lightness selection enabled per-band quantization.';
      } else
        error.textContent =
          (quantization.kind === 'medoids' && preprocessing.kind !== 'slic') ||
          (quantization.kind === 'original-samples' && preprocessing.kind !== 'slic')
            ? 'Sampled colors are already preserved.'
            : 'Valid composition.';
      visibility();
      onChange(current);
    } catch (e) {
      error.textContent = e instanceof Error ? e.message : String(e);
    }
  }
  function populate(c: PipelineConfig, clearMessage = true) {
    current = c;
    const q = c.quantization,
      p = c.preprocessing,
      s = c.selection,
      t = c.strategy;
    set('preprocessing', p.kind);
    set('quantizer', q.kind === 'kmeans' ? `kmeans-${q.space}` : q.kind);
    set('budget', 'candidates' in q ? q.candidates : c.count * 3);
    set('iterations', 'iterations' in q ? q.iterations : 12);
    set('pool', q.kind === 'medoids' ? q.maxSamples : 600);
    set('sectors', q.kind === 'hue-groups' ? q.sectors : 12);
    set('fraction', q.kind === 'mmcq' ? q.populationFraction : 0.75);
    set('selection', s.kind);
    set(
      'separation',
      s.kind === 'population'
        ? 0
        : s.kind === 'lightness'
          ? s.minWithinBandSeparation
          : s.minSeparation,
    );
    set('dark', s.kind === 'lightness' ? s.boundaries[0] : 0.4);
    set('light', s.kind === 'lightness' ? s.boundaries[1] : 0.7);
    set('strategy', t.kind);
    set('min-k', t.kind === 'adaptive-k' ? t.minK : c.count);
    set('max-k', t.kind === 'adaptive-k' ? t.maxK : 'candidates' in q ? q.candidates : 18);
    set('gain', t.kind === 'adaptive-k' ? t.improvementThreshold : 0.11);
    set('edge', p.kind === 'edge-weighted' ? p.strength : 1);
    set('regions', p.kind === 'slic' ? p.regions : 200);
    set('dimension', p.kind === 'slic' ? p.maxDimension : 160);
    set('compactness', p.kind === 'slic' ? p.compactness : 10);
    set('slic-iterations', p.kind === 'slic' ? p.iterations : 10);
    set('samples', c.sampling.maxSamples);
    set('alpha', c.sampling.alphaThreshold);
    set('snapping', c.postprocessing.snapping);
    set('missing', c.postprocessing.missingColors.kind);
    set(
      'relaxed',
      c.postprocessing.missingColors.kind === 'relax-separation'
        ? c.postprocessing.missingColors.minimum
        : 0.015,
    );
    if (clearMessage) error.textContent = '';
    visibility();
  }
  populate(current);
  return {
    populate,
    select: (kind: string) => {
      set('selection', kind);
      if (value('strategy') === 'stratified' && kind !== 'lightness') set('strategy', 'standard');
      change();
    },
    preset: (id: PresetId) => populate(presetConfig(id, 5)),
    get: () => current,
  };
}

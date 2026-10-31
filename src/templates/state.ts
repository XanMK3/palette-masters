import { DEFAULT_THEME } from '../theme.service.js';

export type TemplateId = 'landing' | 'magazine' | 'poster';
export interface PreviewState {
  template: TemplateId;
  tokens: Record<string, string>;
  image: { url: string | null; title: string; key?: string };
  title: string;
  artist: string;
  algorithmLabel: string;
}
export const DEFAULT_PREVIEW: PreviewState = {
  template: 'landing',
  tokens: DEFAULT_THEME,
  image: { url: null, title: 'Selected artwork' },
  title: 'Selected artwork',
  artist: '',
  algorithmLabel: '',
};

export function isPreviewState(value: unknown): value is PreviewState {
  if (!value || typeof value !== 'object') return false;
  const s = value as PreviewState;
  return (
    ['landing', 'magazine', 'poster'].includes(s.template) &&
    !!s.tokens &&
    typeof s.tokens === 'object' &&
    Object.entries(s.tokens).every(
      ([key, value]) => key.startsWith('--') && typeof value === 'string',
    ) &&
    !!s.image &&
    (s.image.url === null || typeof s.image.url === 'string') &&
    typeof s.image.title === 'string' &&
    (s.image.key === undefined || typeof s.image.key === 'string') &&
    [s.title, s.artist, s.algorithmLabel].every((value) => typeof value === 'string')
  );
}

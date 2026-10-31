import contract from './tailwind.css?raw';

/** The CSS consumed by Tailwind is also the source of truth for exported token names. */
export function resolveTailwindColors(tokens: Record<string, string>): Record<string, string> {
  const colors: Record<string, string> = {};
  for (const match of contract.matchAll(/(--color-[\w-]+):\s*var\((--art-[\w-]+)\);/g)) {
    const source = match[2].replace('--art-', '--color-');
    const value = tokens[source];
    if (!value || !/^#[0-9a-f]{6}$/i.test(value)) {
      throw new TypeError(`Missing or invalid theme color: ${source}`);
    }
    colors[match[1]] = value;
  }
  if (!Object.keys(colors).length) throw new Error('Tailwind theme contract is empty');
  return colors;
}

export function exportTailwindTheme(tokens: Record<string, string>): string {
  const colors = resolveTailwindColors(tokens);
  return `/* Palette Masters — Tailwind CSS v4 color theme
 * In your app stylesheet:
 *   @import "tailwindcss";
 *   @import "./theme.css";
 * Usage: bg-surface text-on-surface, bg-accent text-on-accent.
 * Pair on-* foregrounds with their named background; muted and contextual
 * accent foregrounds are contrast-corrected. Pigment is the original text
 * swatch for decorative details, not a universally readable foreground.
 * Colors extend your theme; fonts, spacing and other defaults stay intact.
 */
@theme static {
${Object.entries(colors)
  .map(([name, value]) => `  ${name}: ${value};`)
  .join('\n')}
}
`;
}

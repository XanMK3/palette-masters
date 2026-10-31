/** Keep mapper tokens available for diagnostics and supply isolated Tailwind bindings. */
export function applyThemeTokens(element: HTMLElement, tokens: Record<string, string>): void {
  for (let i = 1; i <= 6; i++) element.style.removeProperty(`--palette-${i}`);
  for (const [key, value] of Object.entries(tokens)) {
    element.style.setProperty(key, value);
    if (key.startsWith('--color-'))
      element.style.setProperty(key.replace('--color-', '--art-'), value);
  }
}

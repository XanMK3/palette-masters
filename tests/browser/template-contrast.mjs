// Inspect the actual computed foreground and its nearest opaque background.
// Transparent text backgrounds inherit their surrounding panel, never an assumed theme color.
export async function textContrastFailures(page) {
  return page.evaluate(() => {
    const parse = (color) => color.match(/[\d.]+/g)?.map(Number) ?? [];
    const luminance = ([r, g, b]) =>
      [r, g, b]
        .map((c) => c / 255)
        .map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
        .reduce((sum, c, i) => sum + c * [0.2126, 0.7152, 0.0722][i], 0);
    const failures = [];
    for (const element of document.querySelectorAll('body *')) {
      if (
        !element.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true }) ||
        element.closest('[aria-hidden="true"]')
      )
        continue;
      const text = [...element.childNodes]
        .filter((n) => n.nodeType === Node.TEXT_NODE)
        .map((n) => n.textContent)
        .join('')
        .trim();
      if (!text || ['SCRIPT', 'STYLE', 'OPTION'].includes(element.tagName)) continue;
      const style = getComputedStyle(element);
      let background,
        parent = element;
      while (parent) {
        const parentStyle = getComputedStyle(parent);
        const rgba = parse(parentStyle.backgroundColor);
        if (parentStyle.backgroundImage !== 'none') {
          failures.push({
            text: text.slice(0, 50),
            issue: 'Text over a gradient/image',
            className: parent.className,
          });
          break;
        }
        if (rgba.length === 3 || rgba[3] === 1) {
          background = rgba;
          break;
        }
        parent = parent.parentElement;
      }
      if (!background) continue;
      const fg = luminance(parse(style.color)),
        bg = luminance(background);
      const ratio = (Math.max(fg, bg) + 0.05) / (Math.min(fg, bg) + 0.05);
      if (ratio < 4.5)
        failures.push({
          text: text.slice(0, 50),
          ratio,
          foreground: style.color,
          background,
          className: element.className,
        });
    }
    return failures;
  });
}

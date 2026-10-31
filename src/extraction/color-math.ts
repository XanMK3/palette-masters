/** Pure sRGB/Oklab color math. No extraction, UI or browser dependencies. */
import type { RGB, Lab } from './types.js';

const clamp = (n: number, a = 0, b = 255) => Math.max(a, Math.min(b, n));
const srgb = (v: number) => {
  v /= 255;
  return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
};
const encode = (v: number) =>
  Math.round(
    clamp((v <= 0.0031308 ? 12.92 * v : 1.055 * Math.max(0, v) ** (1 / 2.4) - 0.055) * 255),
  );
export const rgbToHex = (v: RGB) =>
  '#' +
  v
    .map((c) => Math.round(clamp(c)).toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase();
export const hexToRgb = (hex: string): RGB => {
  const m = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!m) throw new TypeError('Expected #RRGGBB');
  return [0, 2, 4].map((i) => parseInt(m[1].slice(i, i + 2), 16)) as RGB;
};
export function relativeLuminance(rgb: RGB): number {
  return 0.2126 * srgb(rgb[0]) + 0.7152 * srgb(rgb[1]) + 0.0722 * srgb(rgb[2]);
}
export function contrastRatio(a: string, b: string): number {
  let x = relativeLuminance(hexToRgb(a)),
    y = relativeLuminance(hexToRgb(b));
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}
export function rgbToOklab(v: RGB): Lab {
  const r = srgb(v[0]),
    g = srgb(v[1]),
    b = srgb(v[2]);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}
export function oklabToRgb([l, a, b]: Lab): RGB {
  const L = (l + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const M = (l - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const S = (l - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [
    encode(4.0767416621 * L - 3.3077115913 * M + 0.2309699292 * S),
    encode(-1.2684380046 * L + 2.6097574011 * M - 0.3413193965 * S),
    encode(-0.0041960863 * L - 0.7034186147 * M + 1.707614701 * S),
  ];
}

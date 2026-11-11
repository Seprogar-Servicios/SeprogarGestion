/** Paleta alineada con backend/src/utils/tecnicoColors.js (ángulo áureo). */

const GOLDEN_ANGLE = 137.508;

function hslToHex(h: number, s: number, l: number): string {
  const sat = s / 100;
  const light = l / 100;
  const c = (1 - Math.abs(2 * light - 1)) * sat;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = light - c / 2;
  let r = 0;
  let g = 0;
  let b = 0;

  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];

  const toHex = (n: number) =>
    Math.round((n + m) * 255)
      .toString(16)
      .padStart(2, '0');

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
}

function buildPalette(count = 180): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  const layers = [
    { s: 72, l: 42 },
    { s: 65, l: 52 },
    { s: 78, l: 36 },
    { s: 58, l: 48 },
    { s: 70, l: 58 },
  ];
  let i = 0;
  while (out.length < count && i < count * 3) {
    const layer = layers[i % layers.length];
    const hue = (i * GOLDEN_ANGLE) % 360;
    const hex = hslToHex(hue, layer.s, layer.l);
    if (!seen.has(hex)) {
      seen.add(hex);
      out.push(hex);
    }
    i += 1;
  }
  return out;
}

export const TECNICO_COLOR_PALETTE = buildPalette(180);

export const normalizeColor = (value?: string | null): string | null => {
  if (!value) return null;
  const v = value.trim();
  if (!/^#[0-9A-Fa-f]{6}$/.test(v)) return null;
  return v.toUpperCase();
};

export const nextAvailableColor = (used: Iterable<string>): string | null => {
  const taken = new Set(
    [...used].map((c) => c.toUpperCase()).filter(Boolean)
  );
  for (const c of TECNICO_COLOR_PALETTE) {
    if (!taken.has(c)) return c;
  }
  return null;
};

/** Contraste simple para texto sobre el color del técnico */
export const textColorForBg = (hex: string): string => {
  const h = hex.replace('#', '');
  if (h.length !== 6) return '#ffffff';
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq >= 160 ? '#111827' : '#ffffff';
};

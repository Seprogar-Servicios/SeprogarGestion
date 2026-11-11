/** Paleta alineada con backend/src/utils/tecnicoColors.js (hues equiespaciados). */

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

function colorDistance(a: string, b: string): number {
  const parse = (hex: string) => [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ];
  const [r1, g1, b1] = parse(a);
  const [r2, g2, b2] = parse(b);
  return Math.sqrt((r1 - r2) ** 2 + (g1 - g2) ** 2 + (b1 - b2) ** 2);
}

function isFarEnough(hex: string, existing: string[], minDist: number): boolean {
  for (const other of existing) {
    if (colorDistance(hex, other) < minDist) return false;
  }
  return true;
}

function buildPalette(count = 180): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  const bands = [
    { n: 24, s: 82, l: 42, offset: 0, minDist: 72 },
    { n: 24, s: 70, l: 52, offset: 7.5, minDist: 58 },
    { n: 24, s: 78, l: 32, offset: 15, minDist: 52 },
    { n: 30, s: 60, l: 46, offset: 3.5, minDist: 45 },
    { n: 30, s: 85, l: 58, offset: 11, minDist: 42 },
    { n: 36, s: 55, l: 38, offset: 19, minDist: 38 },
    { n: 36, s: 68, l: 55, offset: 23, minDist: 35 },
  ];

  for (const band of bands) {
    for (let i = 0; i < band.n && out.length < count; i++) {
      const hue = (i * (360 / band.n) + band.offset) % 360;
      const hex = hslToHex(hue, band.s, band.l);
      if (seen.has(hex)) continue;
      if (!isFarEnough(hex, out, band.minDist)) continue;
      seen.add(hex);
      out.push(hex);
    }
  }

  let guard = 0;
  while (out.length < count && guard < 4000) {
    const hue = (guard * 13.7 + 4) % 360;
    const s = 50 + (guard % 5) * 7;
    const l = 32 + (guard % 6) * 5;
    const hex = hslToHex(hue, s, l);
    guard += 1;
    if (seen.has(hex) || !isFarEnough(hex, out, 32)) continue;
    seen.add(hex);
    out.push(hex);
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

export const textColorForBg = (hex: string): string => {
  const h = hex.replace('#', '');
  if (h.length !== 6) return '#ffffff';
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq >= 160 ? '#111827' : '#ffffff';
};

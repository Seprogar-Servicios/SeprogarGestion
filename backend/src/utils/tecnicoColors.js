/**
 * Paleta de colores bien separados a ojo para técnicos (calendario).
 *
 * Estrategia:
 * 1) Primera tanda: hues equiespaciados (máxima diferencia).
 * 2) Segundas tandas: mismos pasos con otra luminosidad/saturación
 *    y un offset de hue, para llegar a ~180 sin “hermanos” casi iguales.
 */

function hslToHex(h, s, l) {
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

  const toHex = (n) =>
    Math.round((n + m) * 255)
      .toString(16)
      .padStart(2, '0');

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
}

/**
 * Distancia perceptual burda (RGB) para filtrar casi-duplicados.
 */
function colorDistance(a, b) {
  const parse = (hex) => [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ];
  const [r1, g1, b1] = parse(a);
  const [r2, g2, b2] = parse(b);
  return Math.sqrt((r1 - r2) ** 2 + (g1 - g2) ** 2 + (b1 - b2) ** 2);
}

function isFarEnough(hex, existing, minDist = 55) {
  for (const other of existing) {
    if (colorDistance(hex, other) < minDist) return false;
  }
  return true;
}

/** @returns {string[]} */
function buildTecnicoPalette(count = 180) {
  const out = [];
  const seen = new Set();

  const bands = [
    { n: 24, s: 82, l: 42, offset: 0, minDist: 72 }, // máxima separación
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

  // Relleno hasta count
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

const TECNICO_COLOR_PALETTE = buildTecnicoPalette(180);

const HEX_RE = /^#[0-9A-Fa-f]{6}$/;

function normalizeColor(value) {
  if (value == null || value === '') return null;
  const v = String(value).trim();
  if (!HEX_RE.test(v)) return null;
  return v.toUpperCase();
}

/**
 * @param {Set<string>|string[]} used
 */
function nextAvailableColor(used) {
  const taken = used instanceof Set ? used : new Set(used);
  for (const c of TECNICO_COLOR_PALETTE) {
    if (!taken.has(c.toUpperCase())) return c;
  }
  for (let attempt = 0; attempt < 80; attempt++) {
    const h = Math.floor(Math.random() * 360);
    const hex = hslToHex(h, 70, 44);
    if (!taken.has(hex)) return hex;
  }
  return null;
}

module.exports = {
  TECNICO_COLOR_PALETTE,
  normalizeColor,
  nextAvailableColor,
  HEX_RE,
  hslToHex,
};

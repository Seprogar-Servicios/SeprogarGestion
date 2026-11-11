/**
 * Paleta de colores distintivos para técnicos (calendario).
 * Generada por HSL con ángulo áureo: ~180 colores bien separados a ojo.
 */

const GOLDEN_ANGLE = 137.508;

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

/** @returns {string[]} */
function buildTecnicoPalette(count = 180) {
  const out = [];
  const seen = new Set();
  // Variar saturación/luminosidad en capas para > ~60 colores
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

const TECNICO_COLOR_PALETTE = buildTecnicoPalette(180);

const HEX_RE = /^#[0-9A-Fa-f]{6}$/;

function normalizeColor(value) {
  if (value == null || value === '') return null;
  const v = String(value).trim();
  if (!HEX_RE.test(v)) return null;
  return v.toUpperCase();
}

/**
 * Primer color libre de la paleta (o null si se agotó).
 * @param {Set<string>|string[]} used
 */
function nextAvailableColor(used) {
  const taken = used instanceof Set ? used : new Set(used);
  for (const c of TECNICO_COLOR_PALETTE) {
    if (!taken.has(c.toUpperCase())) return c;
  }
  // Fallback: generar uno random no usado (muy raro con 180)
  for (let attempt = 0; attempt < 50; attempt++) {
    const h = Math.floor(Math.random() * 360);
    const hex = hslToHex(h, 68, 44);
    if (!taken.has(hex)) return hex;
  }
  return null;
}

module.exports = {
  TECNICO_COLOR_PALETTE,
  normalizeColor,
  nextAvailableColor,
  HEX_RE,
};

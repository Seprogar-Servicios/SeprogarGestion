/**
 * Geocodificación y sugerencias — solo Buenos Aires (CABA / AMBA).
 * Prioridad: USIG (GCBA) → Georef. Cache en memoria para respuestas instantáneas.
 */

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';
const USIG_URL = 'https://servicios.usig.buenosaires.gob.ar/normalizar/';
const GEOREF_URL = 'https://apis.datos.gob.ar/georef/api/direcciones';

/** BBox AMBA: west,south,east,north */
const BA_BBOX = '-59.15,-35.05,-57.75,-34.05';

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

let lastNominatimAt = 0;

async function throttleNominatim() {
  const wait = 1100 - (Date.now() - lastNominatimAt);
  if (wait > 0) await delay(wait);
  lastNominatimAt = Date.now();
}

/** CABA + AMBA */
function inBaArea(lat, lng) {
  return lat >= -35.05 && lat <= -34.05 && lng >= -59.15 && lng <= -57.75;
}

function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((resolve) => setTimeout(() => resolve([]), ms)),
  ]);
}

function haversineKm(a, b) {
  if (!a || !b || a.lat == null || a.lng == null || b.lat == null || b.lng == null) {
    return null;
  }
  const toRad = (d) => (d * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

/** Cache sugerencias (evita reconsultar al teclear / reabrir). */
const suggestCache = new Map();
const CACHE_TTL_MS = 10 * 60 * 1000;
const CACHE_MAX = 400;

function cacheGet(key) {
  const hit = suggestCache.get(key);
  if (!hit) return null;
  if (Date.now() - hit.at > CACHE_TTL_MS) {
    suggestCache.delete(key);
    return null;
  }
  return hit.data;
}

function cacheSet(key, data) {
  if (suggestCache.size >= CACHE_MAX) {
    const first = suggestCache.keys().next().value;
    suggestCache.delete(first);
  }
  suggestCache.set(key, { at: Date.now(), data });
}

/** Localidades / typos frecuentes AMBA → forma canónica para buscar. */
const LOCALITY_FIXES = [
  { re: /\bonzalez\s*catan\b/gi, to: 'Gonzalez Catan' },
  { re: /\bgonzalez\s*catan\b/gi, to: 'Gonzalez Catan' },
  { re: /\bgonzález\s*catán\b/gi, to: 'Gonzalez Catan' },
  { re: /\bg\.?\s*catan\b/gi, to: 'Gonzalez Catan' },
  { re: /\blomas\s*de\s*zamora\b/gi, to: 'Lomas de Zamora' },
  { re: /\bquilmes\b/gi, to: 'Quilmes' },
  { re: /\bmoron\b/gi, to: 'Moron' },
  { re: /\bla\s*matanza\b/gi, to: 'La Matanza' },
  { re: /\bsan\s*justo\b/gi, to: 'San Justo' },
  { re: /\bramos\s*mejia\b/gi, to: 'Ramos Mejia' },
  { re: /\bcapital\s*federal\b/gi, to: 'CABA' },
  { re: /\bciudad\s*autonoma\s*de\s*buenos\s*aires\b/gi, to: 'CABA' },
];

/** Tokens de localidad en el query → boost en ranking. */
const LOCALITY_HINTS = [
  { tokens: ['catan', 'gonzalez', 'onzalez', 'matanza'], boost: ['matanza', 'catan', 'gonzalez'], penCaba: true },
  { tokens: ['lomas', 'zamora'], boost: ['lomas', 'zamora'], penCaba: true },
  { tokens: ['quilmes'], boost: ['quilmes'], penCaba: true },
  { tokens: ['moron', 'morón'], boost: ['moron', 'morón'], penCaba: true },
  { tokens: ['caba', 'capital'], boost: ['caba', 'comuna', 'ciudad'], penCaba: false },
];

/** Normaliza query corta para USIG/Georef (abrevs + typos + formato). */
function normalizeQuery(raw) {
  let q = String(raw || '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!q) return '';

  // "Inca, 5328 onzalez catan" → "Inca 5328, onzalez catan"
  q = q.replace(/^([^,]+),\s*(\d{1,5})\s+(.+)$/i, '$1 $2, $3');
  // "Inca 5328 onzalez catan" (sin coma) se deja; locality fixes abajo

  // Abreviaturas militares / calles (el punto no siempre hace \b)
  q = q.replace(/\bmcal\.?\s*/gi, 'Mariscal ');
  q = q.replace(/\bgral\.?\s*/gi, 'General ');
  q = q.replace(/\bcnel\.?\s*/gi, 'Coronel ');
  q = q.replace(/\bdr\.?\s*/gi, 'Doctor ');
  q = q.replace(/\bav\.?\s*/gi, 'Avenida ');
  q = q.replace(/\bpje\.?\s*/gi, 'Pasaje ');
  q = q.replace(/\bc\.?\s*(?=\d)/gi, 'Calle ');

  for (const { re, to } of LOCALITY_FIXES) {
    q = q.replace(re, to);
  }

  return q.replace(/\s+/g, ' ').trim();
}

/**
 * Variantes de búsqueda para direcciones “sucias”.
 * Ej: "Mcal. Sucre 1180 caba" → también "Antonio Jose de Sucre 1180", "Sucre 1180 CABA"
 */
function buildQueryVariants(raw) {
  const primary = normalizeQuery(raw);
  if (!primary) return [];

  const variants = [primary];
  const add = (v) => {
    const t = String(v || '').replace(/\s+/g, ' ').trim();
    if (t && t.length >= 3 && !variants.some((x) => x.toLowerCase() === t.toLowerCase())) {
      variants.push(t);
    }
  };

  // Sin "Mariscal/General" delante del apellido
  add(primary.replace(/\b(Mariscal|General|Doctor|Coronel|Teniente)\s+/gi, ''));

  // Solo "Apellido 1234" si hay nombre compuesto + número
  const m = primary.match(
    /(?:Mariscal|General|Doctor)?\s*(?:Antonio\s+Jos[eé]\s+de\s+)?(Sucre)\s+(\d{1,5})/i
  );
  if (m) add(`${m[1]} ${m[2]}`);

  // Calle + número (sin localidad) para Georef/USIG
  const streetNum = primary.match(/^(.+?)\s+(\d{1,5})(?:\s*,?\s*.*)?$/);
  if (streetNum) {
    add(`${streetNum[1].trim()} ${streetNum[2]}`);
  }

  // Forzar CABA si el usuario lo escribió
  if (/\bcaba\b/i.test(raw) || /\bcapital\b/i.test(raw)) {
    const base = primary.replace(/\b(caba|capital\s*federal)\b/gi, '').replace(/,\s*$/, '').trim();
    add(`${base}, CABA`);
    add(base);
  }

  // González Catán explícito
  if (/catan|onzalez|gonzalez/i.test(raw)) {
    const base = primary
      .replace(/,?\s*(Gonzalez Catan|La Matanza)\b/gi, '')
      .trim();
    add(`${base}, Gonzalez Catan`);
    add(`${base}, La Matanza`);
  }

  return variants.slice(0, 5);
}

function cacheKey(q, limit) {
  return `${q.toLowerCase()}|${limit}`;
}

function hasStreetNumber(label) {
  return /\b\d{1,5}\b/.test(String(label || ''));
}

function localityHintsFromQuery(query) {
  const q = String(query || '').toLowerCase();
  return LOCALITY_HINTS.filter((h) => h.tokens.some((t) => q.includes(t)));
}

function rankAndDedupe(items, query, limit) {
  const q = String(query || '').toLowerCase();
  const qNum = (q.match(/\b(\d{1,5})\b/) || [])[1] || '';
  const hints = localityHintsFromQuery(query);
  const seen = new Set();
  const scored = [];

  for (const item of items) {
    if (!item?.label) continue;
    const key = item.label.toLowerCase().replace(/\s+/g, ' ').trim();
    if (seen.has(key)) continue;
    seen.add(key);

    const labelLow = key;
    let score = 0;
    if (hasStreetNumber(item.label)) score += 40;
    if (qNum && String(item.label).includes(qNum)) score += 35;
    if (item.source === 'usig') score += 15;

    const isCaba = /caba|comuna|ciudad aut[oó]noma/i.test(labelLow);
    // Bonus CABA solo si el usuario pidió CABA
    if (isCaba && /\bcaba\b|capital/i.test(q)) score += 25;
    // Preferir matches con "MCAL" / "Mariscal" / nombre completo si el query lo trae
    if (/mariscal|mcal|sucre/i.test(q) && /sucre|mariscal|mcal/i.test(labelLow)) {
      score += 20;
    }
    if (/antonio|jos[eé]/i.test(q) && /antonio|jos/i.test(labelLow)) score += 15;

    for (const h of hints) {
      if (h.boost.some((b) => labelLow.includes(b))) score += 50;
      if (h.penCaba && isCaba) score -= 50;
    }

    // Prefer shorter precise labels
    score += Math.max(0, 20 - Math.floor(item.label.length / 12));

    scored.push({ ...item, _score: score });
  }

  scored.sort((a, b) => b._score - a._score);
  return scored.slice(0, limit).map(({ _score, ...rest }) => rest);
}

function buildUsigLabel(d) {
  const base = String(d.direccion || '').trim();
  if (!base) return '';
  const partido = String(d.nombre_partido || d.partido || '').trim();
  const localidad = String(d.nombre_localidad || d.localidad || '').trim();
  const extras = [];
  if (localidad && !base.toLowerCase().includes(localidad.toLowerCase())) {
    extras.push(localidad);
  }
  if (
    partido &&
    !base.toLowerCase().includes(partido.toLowerCase()) &&
    !extras.some((e) => e.toLowerCase() === partido.toLowerCase())
  ) {
    extras.push(partido);
  }
  // Solo etiquetar CABA si el partido lo indica (no asumir CABA en GBA)
  const isCabaPartido = /caba|capital|ciudad aut/i.test(partido || '');
  if (isCabaPartido && !/caba|capital|ciudad aut/i.test(base)) {
    extras.push('CABA');
  }
  return extras.length ? `${base}, ${extras.join(', ')}` : base;
}

async function suggestFromUsig(query, limit) {
  try {
    const url = new URL(USIG_URL);
    url.searchParams.set('direccion', query);
    url.searchParams.set('geocodificar', 'true');
    url.searchParams.set('maxOptions', String(Math.min(limit, 10)));

    const response = await fetch(url.toString(), {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'SeprogarGestion/1.0 (address-suggest-usig)',
      },
    });
    if (!response.ok) {
      console.warn('USIG error:', response.status);
      return [];
    }

    const data = await response.json();
    const list = Array.isArray(data?.direccionesNormalizadas)
      ? data.direccionesNormalizadas
      : [];

    return list
      .map((d) => {
        const label = buildUsigLabel(d);
        if (!label) return null;
        const lng = Number(d.coordenadas?.x);
        const lat = Number(d.coordenadas?.y);
        if (Number.isNaN(lat) || Number.isNaN(lng)) return null;
        if (!inBaArea(lat, lng)) return null;
        return { label, lat, lng, source: 'usig' };
      })
      .filter(Boolean);
  } catch (error) {
    console.error('Error USIG suggest:', error.message);
    return [];
  }
}

async function suggestFromGeorefProvince(query, limit, provincia) {
  try {
    const url = new URL(GEOREF_URL);
    url.searchParams.set('direccion', query);
    url.searchParams.set('provincia', provincia);
    url.searchParams.set('max', String(Math.min(limit, 10)));
    url.searchParams.set('campos', 'estandar');

    const response = await fetch(url.toString(), {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'SeprogarGestion/1.0 (address-suggest-georef)',
      },
    });
    if (!response.ok) return [];

    const data = await response.json();
    const list = Array.isArray(data?.direcciones) ? data.direcciones : [];
    const results = [];
    for (const d of list) {
      const label = String(d.nomenclatura || '').trim();
      const lat = Number(d.ubicacion?.lat);
      const lng = Number(d.ubicacion?.lon);
      if (!label || Number.isNaN(lat) || Number.isNaN(lng)) continue;
      if (!inBaArea(lat, lng)) continue;
      results.push({ label, lat, lng, source: 'georef' });
    }
    return results;
  } catch (error) {
    console.error('Error Georef suggest:', error.message);
    return [];
  }
}

async function suggestFromGeoref(query, limit) {
  // Paralelo CABA + Provincia BA (antes era secuencial → más lento)
  const [caba, ba] = await Promise.all([
    suggestFromGeorefProvince(query, limit, 'Ciudad Autónoma de Buenos Aires'),
    suggestFromGeorefProvince(query, limit, 'Buenos Aires'),
  ]);
  return [...caba, ...ba];
}

/**
 * @param {string} address
 * @returns {Promise<{ lat: number, lng: number } | null>}
 */
async function geocodeAddress(address) {
  if (!address || typeof address !== 'string' || !address.trim()) {
    return null;
  }

  const suggestions = await suggestAddresses(address, 3);
  // Preferir resultado con altura si el query trae número
  const qNum = (address.match(/\b(\d{1,5})\b/) || [])[1];
  const best =
    (qNum && suggestions.find((s) => String(s.label).includes(qNum))) || suggestions[0];
  if (best) {
    return { lat: best.lat, lng: best.lng };
  }

  let query = address.trim();
  if (!/buenos\s*aires|argentina|caba|capital|amba/i.test(query)) {
    query = `${query}, Buenos Aires, Argentina`;
  }

  try {
    await throttleNominatim();

    const url = new URL(NOMINATIM_URL);
    url.searchParams.set('q', query);
    url.searchParams.set('format', 'json');
    url.searchParams.set('limit', '1');
    url.searchParams.set('countrycodes', 'ar');
    url.searchParams.set('viewbox', BA_BBOX);
    url.searchParams.set('bounded', '1');

    const response = await fetch(url.toString(), {
      headers: {
        'User-Agent': 'SeprogarGestion/1.0 (mapa-en-vivo)',
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      console.warn('Nominatim error:', response.status);
      return null;
    }

    const data = await response.json();
    if (!Array.isArray(data) || data.length === 0) return null;

    const lat = parseFloat(data[0].lat);
    const lng = parseFloat(data[0].lon);
    if (Number.isNaN(lat) || Number.isNaN(lng)) return null;
    if (!inBaArea(lat, lng)) return null;

    return { lat, lng };
  } catch (error) {
    console.error('Error geocodificando dirección:', error.message);
    return null;
  }
}

/** Dedup de requests concurrentes iguales (tecleo rápido / doble fetch). */
const inflightSuggest = new Map();

function isGoodEnoughSuggest(items, query) {
  if (!items || items.length === 0) return false;
  const qNum = (String(query || '').match(/\b(\d{1,5})\b/) || [])[1] || '';
  if (qNum && items.some((s) => String(s.label || '').includes(qNum))) return true;
  return items.length >= 4;
}

/**
 * Sugerencias acotadas a BA / AMBA.
 * Fast-path: primary USIG(+Georef si hace falta). Variantes solo si faltan resultados.
 */
async function suggestAddresses(query, limit = 6) {
  if (!query || typeof query !== 'string' || query.trim().length < 3) {
    return [];
  }

  const variants = buildQueryVariants(query);
  const primary = variants[0] || normalizeQuery(query);
  const key = cacheKey(`v3:${primary}`, limit);
  const cached = cacheGet(key);
  if (cached) return cached;

  if (inflightSuggest.has(key)) {
    return inflightSuggest.get(key);
  }

  const run = (async () => {
    // 1) Fast path: solo query primaria
    let usig = await withTimeout(suggestFromUsig(primary, limit), 1400);
    let merged = rankAndDedupe(usig, primary, limit);

    // Si USIG no alcanza, Georef en paralelo sobre la primaria
    if (!isGoodEnoughSuggest(merged, primary)) {
      const georef = await withTimeout(suggestFromGeoref(primary, limit), 1400);
      merged = rankAndDedupe([...usig, ...georef], primary, limit);
    }

    // 2) Variantes extra solo si sigue flojo (typos / abrevs)
    if (!isGoodEnoughSuggest(merged, primary) && variants.length > 1) {
      const extra = variants.slice(1, 3);
      const batches = await Promise.all(
        extra.map(async (q) => {
          const [u, g] = await Promise.all([
            withTimeout(suggestFromUsig(q, limit), 1200),
            withTimeout(suggestFromGeoref(q, limit), 1200),
          ]);
          return [...u, ...g];
        })
      );
      merged = rankAndDedupe([...merged, ...batches.flat()], primary, limit);
    }

    cacheSet(key, merged);
    return merged;
  })();

  inflightSuggest.set(key, run);
  try {
    return await run;
  } finally {
    inflightSuggest.delete(key);
  }
}

module.exports = {
  geocodeAddress,
  suggestAddresses,
  haversineKm,
  normalizeQuery,
  buildQueryVariants,
};

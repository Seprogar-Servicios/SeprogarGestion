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

/** Normaliza query corta para USIG (Av. → Avenida, etc.). */
function normalizeQuery(raw) {
  let q = String(raw || '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!q) return '';
  q = q.replace(/\bav\.?\b/gi, 'Avenida');
  q = q.replace(/\bpje\.?\b/gi, 'Pasaje');
  q = q.replace(/\bc\.?\b(?=\s+\d)/gi, 'Calle');
  return q;
}

function cacheKey(q, limit) {
  return `${q.toLowerCase()}|${limit}`;
}

function hasStreetNumber(label) {
  return /\b\d{1,5}\b/.test(String(label || ''));
}

function rankAndDedupe(items, query, limit) {
  const q = String(query || '').toLowerCase();
  const qNum = (q.match(/\b(\d{1,5})\b/) || [])[1] || '';
  const seen = new Set();
  const scored = [];

  for (const item of items) {
    if (!item?.label) continue;
    const key = item.label.toLowerCase().replace(/\s+/g, ' ').trim();
    if (seen.has(key)) continue;
    seen.add(key);

    let score = 0;
    if (hasStreetNumber(item.label)) score += 40;
    if (qNum && String(item.label).includes(qNum)) score += 30;
    if (/caba|capital|ciudad aut[oó]noma/i.test(item.label)) score += 8;
    if (item.source === 'usig') score += 15;
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
    !/caba|capital|ciudad aut/i.test(partido) &&
    !base.toLowerCase().includes(partido.toLowerCase()) &&
    !extras.some((e) => e.toLowerCase() === partido.toLowerCase())
  ) {
    extras.push(partido);
  }
  if (!/caba|buenos aires|capital|amba/i.test(base) && extras.length === 0) {
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

/**
 * Sugerencias acotadas a BA / AMBA.
 * USIG + Georef en paralelo; ranking prioriza altura + USIG.
 */
async function suggestAddresses(query, limit = 8) {
  if (!query || typeof query !== 'string' || query.trim().length < 3) {
    return [];
  }

  const q = normalizeQuery(query);
  const key = cacheKey(q, limit);
  const cached = cacheGet(key);
  if (cached) return cached;

  // Paralelo: USIG (preciso) + Georef (cobertura). Timeouts cortos.
  const [usig, georef] = await Promise.all([
    withTimeout(suggestFromUsig(q, limit), 1800),
    withTimeout(suggestFromGeoref(q, limit), 1800),
  ]);

  const merged = rankAndDedupe([...usig, ...georef], q, limit);
  cacheSet(key, merged);
  return merged;
}

module.exports = {
  geocodeAddress,
  suggestAddresses,
  haversineKm,
};

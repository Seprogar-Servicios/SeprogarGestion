/**
 * Cliente mínimo Geoapify Autocomplete (solo backend).
 * Devuelve el mismo shape que USIG/Georef: { label, lat, lng, source }.
 * Si no hay GEOAPIFY_API_KEY, retorna [] (el caller hace fallback).
 */

const GEOAPIFY_URL = 'https://api.geoapify.com/v1/geocode/autocomplete';

/** Bias AMBA (proximity) */
const AMBA_CENTER = { lat: -34.68, lng: -58.56 };

function inBaArea(lat, lng) {
  return lat >= -35.05 && lat <= -34.05 && lng >= -59.15 && lng <= -57.75;
}

function getApiKey() {
  const key = String(process.env.GEOAPIFY_API_KEY || '').trim();
  return key || null;
}

/**
 * @param {string} query
 * @param {number} limit
 * @returns {Promise<Array<{ label: string, lat: number, lng: number, source: string }>>}
 */
async function suggestFromGeoapify(query, limit = 6) {
  const apiKey = getApiKey();
  if (!apiKey) return [];

  const q = String(query || '').trim();
  if (q.length < 3) return [];

  const url = new URL(GEOAPIFY_URL);
  url.searchParams.set('text', q);
  url.searchParams.set('limit', String(Math.min(Math.max(limit, 1), 10)));
  url.searchParams.set('format', 'json');
  url.searchParams.set('lang', 'es');
  url.searchParams.set('filter', 'countrycode:ar');
  url.searchParams.set('bias', `proximity:${AMBA_CENTER.lng},${AMBA_CENTER.lat}`);
  url.searchParams.set('apiKey', apiKey);

  const response = await fetch(url.toString(), {
    headers: { Accept: 'application/json' },
  });

  if (!response.ok) {
    // No loguear body (puede incluir detalles de la key / cuenta)
    console.warn('Geoapify suggest HTTP', response.status);
    return [];
  }

  const data = await response.json();
  const list = Array.isArray(data?.results) ? data.results : [];

  return list
    .map((r) => {
      const lat = Number(r.lat);
      const lng = Number(r.lon);
      const label = String(
        r.formatted ||
          [r.address_line1, r.address_line2, r.city, r.county, r.state]
            .filter(Boolean)
            .join(', ')
      ).trim();
      if (!label || Number.isNaN(lat) || Number.isNaN(lng)) return null;
      if (!inBaArea(lat, lng)) return null;
      return { label, lat, lng, source: 'geoapify' };
    })
    .filter(Boolean);
}

module.exports = {
  suggestFromGeoapify,
  getApiKey,
};

/**
 * Geocodificación gratuita vía Nominatim (OpenStreetMap).
 * Uso moderado: 1 req/s; cachear resultados en la tarea.
 */

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

let lastRequestAt = 0;

async function throttle() {
  const wait = 1100 - (Date.now() - lastRequestAt);
  if (wait > 0) await delay(wait);
  lastRequestAt = Date.now();
}

/**
 * @param {string} address
 * @returns {Promise<{ lat: number, lng: number } | null>}
 */
async function geocodeAddress(address) {
  if (!address || typeof address !== 'string' || !address.trim()) {
    return null;
  }

  let query = address.trim();
  if (!/buenos\s*aires|argentina|caba|capital/i.test(query)) {
    query = `${query}, Buenos Aires, Argentina`;
  }

  try {
    await throttle();

    const url = new URL(NOMINATIM_URL);
    url.searchParams.set('q', query);
    url.searchParams.set('format', 'json');
    url.searchParams.set('limit', '1');

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
    if (!Array.isArray(data) || data.length === 0) {
      return null;
    }

    const lat = parseFloat(data[0].lat);
    const lng = parseFloat(data[0].lon);
    if (Number.isNaN(lat) || Number.isNaN(lng)) return null;

    return { lat, lng };
  } catch (error) {
    console.error('Error geocodificando dirección:', error.message);
    return null;
  }
}

module.exports = { geocodeAddress };

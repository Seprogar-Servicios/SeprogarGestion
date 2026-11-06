/**
 * Geocodificación y sugerencias (Buenos Aires / Argentina).
 * Nominatim para geocode puntual; Photon (Komoot) para autocomplete.
 * Uso moderado: ~1 req/s a Nominatim.
 */

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';
const PHOTON_URL = 'https://photon.komoot.io/api/';

/** BBox aprox. AMBA / Provincia BA: west,south,east,north */
const BA_BBOX = '-59.2,-35.2,-57.8,-34.0';
const BA_CENTER = { lat: -34.6037, lon: -58.3816 };

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

let lastNominatimAt = 0;

async function throttleNominatim() {
  const wait = 1100 - (Date.now() - lastNominatimAt);
  if (wait > 0) await delay(wait);
  lastNominatimAt = Date.now();
}

/**
 * Distancia en km (Haversine).
 */
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

/**
 * @param {string} address
 * @returns {Promise<{ lat: number, lng: number } | null>}
 */
async function geocodeAddress(address) {
  if (!address || typeof address !== 'string' || !address.trim()) {
    return null;
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

/**
 * Sugerencias de dirección (Photon), acotadas a BA.
 * @param {string} query
 * @param {number} [limit=6]
 * @returns {Promise<Array<{ label: string, lat: number, lng: number }>>}
 */
async function suggestAddresses(query, limit = 6) {
  if (!query || typeof query !== 'string' || query.trim().length < 3) {
    return [];
  }

  try {
    const url = new URL(PHOTON_URL);
    url.searchParams.set('q', query.trim());
    url.searchParams.set('lang', 'es');
    url.searchParams.set('limit', String(Math.min(limit, 10)));
    url.searchParams.set('lat', String(BA_CENTER.lat));
    url.searchParams.set('lon', String(BA_CENTER.lon));
    // bbox: minLon,minLat,maxLon,maxLat
    url.searchParams.set('bbox', '-59.2,-35.2,-57.8,-34.0');

    const response = await fetch(url.toString(), {
      headers: {
        'User-Agent': 'SeprogarGestion/1.0 (address-suggest)',
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      console.warn('Photon error:', response.status);
      return [];
    }

    const data = await response.json();
    const features = Array.isArray(data?.features) ? data.features : [];

    return features
      .map((f) => {
        const p = f.properties || {};
        const coords = f.geometry?.coordinates;
        if (!Array.isArray(coords) || coords.length < 2) return null;

        const lng = Number(coords[0]);
        const lat = Number(coords[1]);
        if (Number.isNaN(lat) || Number.isNaN(lng)) return null;

        // Filtrar fuera de Argentina / muy lejos de BA
        if (lat < -36 || lat > -33 || lng < -60 || lng > -57) return null;

        const parts = [
          p.name,
          p.street && p.housenumber ? `${p.street} ${p.housenumber}` : p.street,
          p.district || p.suburb || p.city || p.town || p.county,
          p.state,
        ].filter(Boolean);

        // Deduplicar partes consecutivas iguales
        const label = [...new Set(parts)].join(', ');
        if (!label) return null;

        return { label, lat, lng };
      })
      .filter(Boolean)
      .slice(0, limit);
  } catch (error) {
    console.error('Error en sugerencias de dirección:', error.message);
    return [];
  }
}

/**
 * Orden nearest-neighbor partiendo del punto más al oeste/norte o de un origen.
 * @param {Array<{ id: string, lat: number, lng: number }>} points
 * @param {{ lat: number, lng: number } | null} [origin]
 */
function nearestNeighborOrder(points, origin = null) {
  if (!Array.isArray(points) || points.length === 0) return [];
  const remaining = [...points];
  const ordered = [];

  let current = origin;
  if (!current) {
    remaining.sort((a, b) => a.lng - b.lng || a.lat - b.lat);
    current = remaining.shift();
    ordered.push(current);
  }

  while (remaining.length > 0) {
    let bestIdx = 0;
    let bestDist = Infinity;
    for (let i = 0; i < remaining.length; i++) {
      const d = haversineKm(current, remaining[i]);
      if (d != null && d < bestDist) {
        bestDist = d;
        bestIdx = i;
      }
    }
    current = remaining.splice(bestIdx, 1)[0];
    ordered.push({ ...current, kmFromPrev: bestDist === Infinity ? null : Math.round(bestDist * 10) / 10 });
  }

  return ordered;
}

module.exports = {
  geocodeAddress,
  suggestAddresses,
  haversineKm,
  nearestNeighborOrder,
};

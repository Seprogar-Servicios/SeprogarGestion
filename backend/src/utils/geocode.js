/**
 * Geocodificación y sugerencias (Buenos Aires / AMBA / Argentina).
 * USIG (GCBA) como fuente principal de autocomplete; Georef y Photon como fallback.
 * Nominatim para geocode puntual.
 */

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';
const PHOTON_URL = 'https://photon.komoot.io/api/';
const USIG_URL = 'https://servicios.usig.buenosaires.gob.ar/normalizar/';
const GEOREF_URL = 'https://apis.datos.gob.ar/georef/api/direcciones';

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

function inBaArea(lat, lng) {
  return lat >= -36 && lat <= -33 && lng >= -60 && lng <= -57;
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

function dedupeSuggestions(items, limit) {
  const seen = new Set();
  const out = [];
  for (const item of items) {
    if (!item?.label) continue;
    const key = item.label.toLowerCase().replace(/\s+/g, ' ').trim();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
    if (out.length >= limit) break;
  }
  return out;
}

/**
 * Autocomplete oficial GCBA / AMBA (calle + altura + partido).
 */
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
        const label = String(d.direccion || '').trim();
        if (!label) return null;
        const lng = Number(d.coordenadas?.x);
        const lat = Number(d.coordenadas?.y);
        if (Number.isNaN(lat) || Number.isNaN(lng)) {
          // Sin coords aún: devolver label con 0,0 filtrado abajo
          return null;
        }
        if (!inBaArea(lat, lng)) return null;
        return { label, lat, lng };
      })
      .filter(Boolean);
  } catch (error) {
    console.error('Error USIG suggest:', error.message);
    return [];
  }
}

/**
 * Georef (datos.gob.ar) — buena cobertura CABA / provincia.
 */
async function suggestFromGeoref(query, limit) {
  try {
    const provinces = [
      'Ciudad Autónoma de Buenos Aires',
      'Buenos Aires',
    ];
    const results = [];

    for (const provincia of provinces) {
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
      if (!response.ok) continue;

      const data = await response.json();
      const list = Array.isArray(data?.direcciones) ? data.direcciones : [];
      for (const d of list) {
        const label = String(d.nomenclatura || '').trim();
        const lat = Number(d.ubicacion?.lat);
        const lng = Number(d.ubicacion?.lon);
        if (!label || Number.isNaN(lat) || Number.isNaN(lng)) continue;
        if (!inBaArea(lat, lng)) continue;
        results.push({ label, lat, lng });
      }
      if (results.length >= limit) break;
    }

    return results;
  } catch (error) {
    console.error('Error Georef suggest:', error.message);
    return [];
  }
}

async function suggestFromPhoton(query, limit) {
  try {
    const url = new URL(PHOTON_URL);
    url.searchParams.set('q', query.trim());
    url.searchParams.set('lang', 'es');
    url.searchParams.set('limit', String(Math.min(limit, 10)));
    url.searchParams.set('lat', String(BA_CENTER.lat));
    url.searchParams.set('lon', String(BA_CENTER.lon));
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
        if (!inBaArea(lat, lng)) return null;

        const parts = [
          p.name,
          p.street && p.housenumber ? `${p.street} ${p.housenumber}` : p.street,
          p.district || p.suburb || p.city || p.town || p.county,
          p.state,
        ].filter(Boolean);

        const label = [...new Set(parts)].join(', ');
        if (!label) return null;

        return { label, lat, lng };
      })
      .filter(Boolean);
  } catch (error) {
    console.error('Error Photon suggest:', error.message);
    return [];
  }
}

/**
 * @param {string} address
 * @returns {Promise<{ lat: number, lng: number } | null>}
 */
async function geocodeAddress(address) {
  if (!address || typeof address !== 'string' || !address.trim()) {
    return null;
  }

  // Preferir USIG / Georef para direcciones locales
  const suggestions = await suggestAddresses(address, 1);
  if (suggestions[0]) {
    return { lat: suggestions[0].lat, lng: suggestions[0].lng };
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
 * Sugerencias de dirección acotadas a BA / AMBA.
 * @param {string} query
 * @param {number} [limit=6]
 * @returns {Promise<Array<{ label: string, lat: number, lng: number }>>}
 */
async function suggestAddresses(query, limit = 6) {
  if (!query || typeof query !== 'string' || query.trim().length < 3) {
    return [];
  }

  const q = query.trim();
  const usig = await suggestFromUsig(q, limit);
  if (usig.length >= limit) {
    return dedupeSuggestions(usig, limit);
  }

  const [georef, photon] = await Promise.all([
    suggestFromGeoref(q, limit),
    suggestFromPhoton(q, limit),
  ]);

  return dedupeSuggestions([...usig, ...georef, ...photon], limit);
}

module.exports = {
  geocodeAddress,
  suggestAddresses,
  haversineKm,
};

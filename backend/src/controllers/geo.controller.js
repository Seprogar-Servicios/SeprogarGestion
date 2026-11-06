const { suggestAddresses, geocodeAddress } = require('../utils/geocode');

const MAX_Q_LEN = 200;
/** Rate limit simple en memoria por usuario/IP */
const hits = new Map();
const WINDOW_MS = 60_000;
const MAX_HITS = 40;

function allowGeoRequest(key) {
  const now = Date.now();
  const entry = hits.get(key) || { count: 0, start: now };
  if (now - entry.start > WINDOW_MS) {
    entry.count = 0;
    entry.start = now;
  }
  entry.count += 1;
  hits.set(key, entry);
  return entry.count <= MAX_HITS;
}

exports.suggest = async (req, res) => {
  try {
    const key = String(req.user?._id || req.ip || 'anon');
    if (!allowGeoRequest(key)) {
      return res.status(429).json({ success: false, message: 'Demasiadas consultas de dirección' });
    }
    const q = String(req.query.q || '').trim().slice(0, MAX_Q_LEN);
    const limit = Math.min(parseInt(req.query.limit, 10) || 6, 10);
    const suggestions = await suggestAddresses(q, limit);
    res.json({ success: true, data: suggestions });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error al sugerir direcciones', error: err.message });
  }
};

exports.geocode = async (req, res) => {
  try {
    const key = String(req.user?._id || req.ip || 'anon');
    if (!allowGeoRequest(key)) {
      return res.status(429).json({ success: false, message: 'Demasiadas consultas de dirección' });
    }
    const address = String(req.body?.address || req.query?.q || '')
      .trim()
      .slice(0, MAX_Q_LEN);
    if (!address) {
      return res.status(400).json({ success: false, message: 'address requerido' });
    }
    const coords = await geocodeAddress(address);
    res.json({ success: true, data: coords });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error al geocodificar', error: err.message });
  }
};

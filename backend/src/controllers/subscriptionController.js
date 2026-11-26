const Subscription = require('../models/Subscription');

/**
 * @desc    Registrar suscripción push del dispositivo para el usuario autenticado
 * @route   POST /api/subscribe
 * @access  Private
 */
exports.subscribe = async (req, res) => {
  const { endpoint, keys, expirationTime } = req.body || {};
  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    return res.status(400).json({ message: 'Suscripción inválida' });
  }

  try {
    // Upsert por endpoint: si el mismo dispositivo cambia de usuario, la suscripción se reasigna.
    await Subscription.findOneAndUpdate(
      { endpoint },
      {
        endpoint,
        keys: { p256dh: keys.p256dh, auth: keys.auth },
        expirationTime: expirationTime ?? null,
        user: req.user._id,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    res.status(201).json({ message: 'Suscripción guardada' });
  } catch (error) {
    console.error('Error saving subscription:', error.message);
    res.status(500).json({ message: 'Error al guardar la suscripción' });
  }
};

/**
 * @desc    Eliminar suscripción push de este dispositivo (logout)
 * @route   DELETE /api/subscribe
 * @access  Private
 */
exports.unsubscribe = async (req, res) => {
  const endpoint = String(req.body?.endpoint || '');
  if (!endpoint) return res.status(400).json({ message: 'endpoint requerido' });

  try {
    // Solo borra si la suscripción pertenece al usuario autenticado
    await Subscription.deleteOne({ endpoint, user: req.user._id });
    res.json({ message: 'Suscripción eliminada' });
  } catch (error) {
    console.error('Error deleting subscription:', error.message);
    res.status(500).json({ message: 'Error al eliminar la suscripción' });
  }
};

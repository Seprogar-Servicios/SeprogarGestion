const webpush = require('web-push');

// Configurar las claves VAPID
webpush.setVapidDetails(
  'mailto:your-email@example.com', // Reemplazar con un email de contacto
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

/**
 * Sends a push notification to a given subscription.
 * @param {object} subscription The push subscription object.
 * @param {object} payload The notification payload.
 */
const sendNotification = async (subscription, payload) => {
  try {
    await webpush.sendNotification(subscription, JSON.stringify(payload));
    console.log('Push notification sent successfully.');
  } catch (error) {
    console.error('Error sending push notification:', error);
    // Si la suscripción no es válida (e.g., el usuario revocó el permiso), la eliminamos
    if (error.statusCode === 410 || error.statusCode === 404) {
      console.log('Subscription has expired or is no longer valid. Deleting...');
      const Subscription = require('../models/Subscription');
      await Subscription.deleteOne({ endpoint: subscription.endpoint });
    }
  }
};

module.exports = { sendNotification };

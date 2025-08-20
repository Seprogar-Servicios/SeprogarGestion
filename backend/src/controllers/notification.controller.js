const webpush = require('web-push');
const nodemailer = require('nodemailer');
const Usuario = require('../models/User');
const config = require('../config');

// Inicializar web-push solo si las claves VAPID están configuradas
if (config.vapid.publicKey && config.vapid.privateKey && config.vapid.publicKey !== 'your_vapid_public_key') {
  try {
    webpush.setVapidDetails(
      'mailto:' + (config.email.user || 'admin@example.com'),
      config.vapid.publicKey,
      config.vapid.privateKey
    );
    console.log('Web Push VAPID details configured');
  } catch (error) {
    console.warn('Error configuring Web Push VAPID details:', error.message);
    console.warn('Push notifications will be disabled');
  }
} else {
  console.warn('VAPID keys not configured. Push notifications will be disabled.');
}

// Config nodemailer
const transporter = nodemailer.createTransport({
  host: config.email.host,
  port: config.email.port,
  secure: false,
  auth: {
    user: config.email.user,
    pass: config.email.pass
  }
});

// Guardar token de suscripción push
exports.subscribe = async (req, res) => {
  const { userId, subscription } = req.body;
  if (!userId || !subscription) return res.status(400).json({ message: 'userId y subscription requeridos' });
  try {
    await Usuario.findByIdAndUpdate(userId, { notificationToken: JSON.stringify(subscription) });
    res.status(201).json({ message: 'Suscripción registrada' });
  } catch (err) {
    res.status(500).json({ message: 'Error al guardar suscripción', error: err.message });
  }
};

// Enviar notificación push a un usuario
exports.sendPush = async (userId, payload) => {
  try {
    // Verificar si web-push está configurado
    if (webpush.setVapidDetails === null) {
      console.warn('Web push is not configured. Push notification not sent.');
      return;
    }
    
    const user = await Usuario.findById(userId);
    if (!user || !user.notificationToken) return;
    
    await webpush.sendNotification(
      JSON.parse(user.notificationToken),
      JSON.stringify(payload)
    );
  } catch (error) {
    console.error('Error sending push notification:', error.message);
    // No lanzar el error para no romper el flujo de la aplicación
  }
};

// Enviar email a un usuario
exports.sendEmail = async (to, subject, text) => {
  try {
    await transporter.sendMail({ from: config.email.user, to, subject, text });
  } catch (err) {
    // Log error, pero no interrumpe
  }
};

/**
 * Middleware para autenticación mediante API Key
 * Usado principalmente por el worker de WhatsApp
 */
const config = require('../config');

/**
 * Middleware para validar API Key
 * @param {Object} req - Objeto de solicitud Express
 * @param {Object} res - Objeto de respuesta Express
 * @param {Function} next - Función para continuar al siguiente middleware
 */
const validateApiKey = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'API Key requerida' });
  }
  
  const apiKey = authHeader.split(' ')[1];
  
  // Verificar que la API Key coincida con la configurada
  if (apiKey !== process.env.API_KEY) {
    return res.status(403).json({ message: 'API Key inválida' });
  }
  
  // Si la API Key es válida, continuar
  next();
};

module.exports = { validateApiKey };

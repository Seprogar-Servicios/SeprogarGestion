/**
 * Módulo para manejar la autenticación con el backend
 */
const axios = require('axios');
const logger = require('./utils/logger');

/**
 * Configura axios para incluir el token de autenticación en todas las solicitudes
 * @param {string} apiKey - Clave API para autenticación
 */
function setupApiAuth(apiKey) {
  if (!apiKey) {
    logger.warn('No se ha proporcionado API_KEY. Las solicitudes a la API pueden fallar.');
    return;
  }

  // Configurar interceptor para añadir el token a todas las solicitudes
  axios.interceptors.request.use(
    config => {
      config.headers['Authorization'] = `Bearer ${apiKey}`;
      return config;
    },
    error => {
      return Promise.reject(error);
    }
  );

  logger.info('Autenticación API configurada correctamente');
}

module.exports = {
  setupApiAuth
};

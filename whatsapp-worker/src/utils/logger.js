/**
 * Módulo simple para registro de logs
 */

// Niveles de log
const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3
};

// Nivel actual (se puede cambiar con una variable de entorno)
const currentLevel = process.env.LOG_LEVEL ? 
  (LOG_LEVELS[process.env.LOG_LEVEL.toUpperCase()] || LOG_LEVELS.INFO) : 
  LOG_LEVELS.INFO;

/**
 * Formatea la fecha y hora actual para los logs
 * @returns {string} - Fecha y hora formateada
 */
function getTimestamp() {
  return new Date().toISOString();
}

/**
 * Registra un mensaje de debug
 * @param {string} message - Mensaje a registrar
 * @param {any} data - Datos adicionales (opcional)
 */
function debug(message, data = null) {
  if (currentLevel <= LOG_LEVELS.DEBUG) {
    console.log(`[${getTimestamp()}] [DEBUG] ${message}`);
    if (data) console.log(data);
  }
}

/**
 * Registra un mensaje informativo
 * @param {string} message - Mensaje a registrar
 * @param {any} data - Datos adicionales (opcional)
 */
function info(message, data = null) {
  if (currentLevel <= LOG_LEVELS.INFO) {
    console.log(`[${getTimestamp()}] [INFO] ${message}`);
    if (data) console.log(data);
  }
}

/**
 * Registra una advertencia
 * @param {string} message - Mensaje a registrar
 * @param {any} data - Datos adicionales (opcional)
 */
function warn(message, data = null) {
  if (currentLevel <= LOG_LEVELS.WARN) {
    console.warn(`[${getTimestamp()}] [WARN] ${message}`);
    if (data) console.warn(data);
  }
}

/**
 * Registra un error
 * @param {string} message - Mensaje a registrar
 * @param {Error|any} error - Error o datos adicionales (opcional)
 */
function error(message, error = null) {
  if (currentLevel <= LOG_LEVELS.ERROR) {
    console.error(`[${getTimestamp()}] [ERROR] ${message}`);
    if (error) {
      if (error instanceof Error) {
        console.error(error.stack || error.message);
      } else {
        console.error(error);
      }
    }
  }
}

module.exports = {
  debug,
  info,
  warn,
  error
};

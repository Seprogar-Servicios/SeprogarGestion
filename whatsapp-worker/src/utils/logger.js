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

// Nivel actual - Por defecto DEBUG para ver todos los mensajes
// Se puede sobreescribir con la variable de entorno LOG_LEVEL
const currentLevel = process.env.LOG_LEVEL 
  ? (LOG_LEVELS[process.env.LOG_LEVEL.toUpperCase()] || LOG_LEVELS.DEBUG) 
  : LOG_LEVELS.DEBUG; // Mostrar todos los mensajes por defecto

// Configuración de colores para la consola
const COLORS = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m'
};

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
    console.log(`${COLORS.dim}[${getTimestamp()}] ${COLORS.blue}[DEBUG]${COLORS.reset} ${message}`);
    if (data) {
      if (typeof data === 'object') {
        console.log(JSON.stringify(data, null, 2));
      } else {
        console.log(data);
      }
    }
  }
}

/**
 * Registra un mensaje informativo
 * @param {string} message - Mensaje a registrar
 * @param {any} data - Datos adicionales (opcional)
 */
function info(message, data = null) {
  if (currentLevel <= LOG_LEVELS.INFO) {
    console.log(`${COLORS.dim}[${getTimestamp()}] ${COLORS.green}[INFO] ${COLORS.reset}${message}`);
    if (data) {
      if (typeof data === 'object') {
        console.log(JSON.stringify(data, null, 2));
      } else {
        console.log(data);
      }
    }
  }
}

/**
 * Registra una advertencia
 * @param {string} message - Mensaje a registrar
 * @param {any} data - Datos adicionales (opcional)
 */
function warn(message, data = null) {
  if (currentLevel <= LOG_LEVELS.WARN) {
    console.log(`${COLORS.dim}[${getTimestamp()}] ${COLORS.yellow}[WARN] ${COLORS.reset}${message}`);
    if (data) {
      if (data instanceof Error) {
        console.error(`${COLORS.yellow}${data.stack}${COLORS.reset}`);
      } else if (typeof data === 'object') {
        console.log(JSON.stringify(data, null, 2));
      } else {
        console.log(data);
      }
    }
  }
}

/**
 * Registra un error
 * @param {string} message - Mensaje a registrar
 * @param {Error|any} error - Error o datos adicionales (opcional)
 */
function error(message, error = null) {
  if (currentLevel <= LOG_LEVELS.ERROR) {
    console.error(`${COLORS.dim}[${getTimestamp()}] ${COLORS.red}[ERROR]${COLORS.reset} ${message}`);
    if (error) {
      if (error instanceof Error) {
        console.error(`${COLORS.red}${error.stack}${COLORS.reset}`);
      } else if (typeof error === 'object') {
        console.error(JSON.stringify(error, null, 2));
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

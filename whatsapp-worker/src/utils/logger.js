/**
 * Logger mejorado con colores y emojis
 */
const chalk = require('chalk');

// Niveles de log
const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3
};

// Nivel actual (definido por variable de entorno)
const currentLevel = process.env.LOG_LEVEL
  ? (LOG_LEVELS[process.env.LOG_LEVEL.toUpperCase()] || LOG_LEVELS.INFO)
  : LOG_LEVELS.INFO;

/**
 * Genera timestamp uniforme
 */
function getTimestamp() {
  return chalk.gray(`[${new Date().toISOString()}]`);
}

/**
 * DEBUG
 */
function debug(message, data = null) {
  if (currentLevel <= LOG_LEVELS.DEBUG) {
    console.log(`${getTimestamp()} ${chalk.magenta('🔍 DEBUG')} ${message}`);
    if (data) console.log(chalk.magenta(JSON.stringify(data, null, 2)));
  }
}

/**
 * INFO
 */
function info(message, data = null) {
  if (currentLevel <= LOG_LEVELS.INFO) {
    console.log(`${getTimestamp()} ${chalk.blue('ℹ INFO')}  ${message}`);
    if (data) console.log(chalk.blue(JSON.stringify(data, null, 2)));
  }
}

/**
 * WARN
 */
function warn(message, data = null) {
  if (currentLevel <= LOG_LEVELS.WARN) {
    console.warn(`${getTimestamp()} ${chalk.yellow('⚠ WARN')}  ${message}`);
    if (data) console.warn(chalk.yellow(JSON.stringify(data, null, 2)));
  }
}

/**
 * ERROR
 */
function error(message, err = null) {
  if (currentLevel <= LOG_LEVELS.ERROR) {
    console.error(`${getTimestamp()} ${chalk.red('❌ ERROR')} ${message}`);
    if (err) {
      if (err instanceof Error) {
        console.error(chalk.red(err.stack || err.message));
      } else {
        console.error(chalk.red(JSON.stringify(err, null, 2)));
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

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const logger = require('../src/utils/logger');

// Ruta de la sesión
const sessionPath = path.resolve('./.wwebjs_auth');

// Verificar si la carpeta de sesión existe
if (!fs.existsSync(sessionPath)) {
  logger.error(`La carpeta de sesión no existe: ${sessionPath}`);
  process.exit(1);
}

// Verificar la estructura de carpetas
logger.info('Verificando estructura de carpetas de sesión...');
const sessionDir = path.join(sessionPath, 'session');
const defaultDir = path.join(sessionDir, 'Default');

if (!fs.existsSync(sessionDir)) {
  logger.error(`Carpeta 'session' no encontrada en: ${sessionPath}`);
  process.exit(1);
}

if (!fs.existsSync(defaultDir)) {
  logger.error(`Carpeta 'Default' no encontrada en: ${sessionDir}`);
  process.exit(1);
}

// Verificar archivos críticos
logger.info('Verificando archivos críticos de sesión...');
const criticalFiles = [
  path.join(defaultDir, 'Platform Notifications'),
  path.join(defaultDir, 'Local Storage'),
  path.join(defaultDir, 'Service Worker')
];

let missingFiles = false;
criticalFiles.forEach(file => {
  if (!fs.existsSync(file)) {
    logger.error(`Archivo crítico no encontrado: ${file}`);
    missingFiles = true;
  }
});

// Verificar permisos
logger.info('Verificando permisos de archivos...');
exec(`ls -la ${sessionPath}`, (error, stdout, stderr) => {
  if (error) {
    logger.error(`Error al verificar permisos: ${error.message}`);
    return;
  }
  
  logger.info('Permisos de carpeta de sesión:');
  logger.info(stdout);
  
  // Corregir permisos si es necesario
  logger.info('Aplicando permisos correctos a todos los archivos...');
  exec(`chmod -R 777 ${sessionPath}`, (error, stdout, stderr) => {
    if (error) {
      logger.error(`Error al corregir permisos: ${error.message}`);
      return;
    }
    
    logger.info('Permisos corregidos correctamente');
    
    if (missingFiles) {
      logger.warn('Se encontraron archivos críticos faltantes. La sesión podría no funcionar correctamente.');
    } else {
      logger.info('Todos los archivos críticos están presentes.');
      logger.info('La estructura de la sesión parece correcta.');
    }
  });
});

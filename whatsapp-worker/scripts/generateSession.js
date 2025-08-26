require('dotenv').config();
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const fs = require('fs');
const path = require('path');
const logger = require('../src/utils/logger');

// Ruta de la sesión
const sessionPath = path.resolve('./.wwebjs_auth');

// Verificar si ya existe una sesión
if (fs.existsSync(sessionPath)) {
  logger.info(`Carpeta de sesión encontrada en: ${sessionPath}`);
  logger.info('Eliminando sesión anterior para crear una nueva...');
  
  try {
    // Eliminar solo los archivos de sesión, no la estructura de carpetas
    const sessionDir = path.join(sessionPath, 'session');
    if (fs.existsSync(sessionDir)) {
      fs.rmSync(sessionDir, { recursive: true, force: true });
      logger.info('Sesión anterior eliminada correctamente');
    }
  } catch (error) {
    logger.error(`Error al eliminar sesión anterior: ${error.message}`);
    process.exit(1);
  }
}

logger.info('Iniciando generación de nueva sesión de WhatsApp...');

// Inicializar cliente de WhatsApp con autenticación local
const client = new Client({
  authStrategy: new LocalAuth({
    dataPath: sessionPath
  }),
  puppeteer: {
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--disable-gpu'
    ],
    headless: true,
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined
  }
});

// Evento cuando se genera el código QR para autenticación
client.on('qr', (qr) => {
  logger.info('===========================================');
  logger.info('ESCANEA ESTE CÓDIGO QR CON TU WHATSAPP');
  logger.info('===========================================');
  qrcode.generate(qr, { small: true });
  
  // Guardar el QR en un archivo para acceso remoto si es necesario
  const qrFilePath = path.join(__dirname, '../public/qr.txt');
  fs.writeFileSync(qrFilePath, qr);
  logger.info(`QR guardado en: ${qrFilePath}`);
});

// Evento cuando el cliente está listo
client.on('ready', () => {
  logger.info('===========================================');
  logger.info('SESIÓN INICIADA CORRECTAMENTE - WHATSAPP CONECTADO');
  logger.info('===========================================');
  
  // Aplicar permisos correctos a la carpeta de sesión
  try {
    const command = `chmod -R 777 ${sessionPath}`;
    require('child_process').execSync(command);
    logger.info(`Permisos aplicados correctamente a: ${sessionPath}`);
  } catch (error) {
    logger.error(`Error al aplicar permisos: ${error.message}`);
  }
  
  // Esperar un tiempo para asegurar que todo se guarde correctamente
  setTimeout(() => {
    logger.info('Sesión generada y guardada correctamente');
    logger.info('Cerrando el proceso...');
    process.exit(0);
  }, 5000);
});

// Manejar errores de autenticación
client.on('auth_failure', (error) => {
  logger.error('===========================================');
  logger.error('ERROR DE AUTENTICACIÓN');
  logger.error('===========================================');
  logger.error(error);
  process.exit(1);
});

// Inicializar el cliente
client.initialize();

// Establecer un tiempo máximo de espera
setTimeout(() => {
  logger.error('Tiempo de espera agotado. No se pudo generar la sesión.');
  process.exit(1);
}, 5 * 60 * 1000); // 5 minutos

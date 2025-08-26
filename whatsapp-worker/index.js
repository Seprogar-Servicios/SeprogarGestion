require('dotenv').config();
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const axios = require('axios');
const { parsePedidoMessage, parseTareaMessage } = require('./src/parsers');
const { checkDuplicateTask, createTask } = require('./src/api');
const logger = require('./src/utils/logger');
const { setupApiAuth } = require('./src/auth');

// Lista de grupos permitidos desde variables de entorno
const GRUPOS_PERMITIDOS = process.env.GRUPOS_PERMITIDOS 
  ? process.env.GRUPOS_PERMITIDOS.split(',').map(grupo => grupo.trim())
  : [];

logger.info('Iniciando servicio de WhatsApp...');
logger.info(`Grupos permitidos: ${GRUPOS_PERMITIDOS.join(', ')}`);

// Configurar autenticación API
setupApiAuth(process.env.API_KEY);

// Inicializar cliente de WhatsApp con autenticación local
const client = new Client({
  authStrategy: new LocalAuth({
    dataPath: './.wwebjs_auth'
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
    headless: true
  }
});

// Evento cuando se genera el código QR para autenticación
client.on('qr', (qr) => {
  logger.info('QR Code generado. Escanee con WhatsApp:');
  qrcode.generate(qr, { small: true });
});

// Evento cuando el cliente está listo
client.on('ready', () => {
  logger.info('Cliente de WhatsApp conectado y listo!');
});

// Evento cuando se recibe un mensaje
client.on('message', async (message) => {
  try {
    // Verificar si el mensaje viene de un grupo permitido
    const chat = await message.getChat();
    
    if (!chat.isGroup) {
      logger.debug('Mensaje recibido fuera de un grupo, ignorando...');
      return;
    }
    
    const groupName = chat.name;
    
    if (!GRUPOS_PERMITIDOS.includes(groupName)) {
      logger.debug(`Mensaje recibido del grupo "${groupName}" que no está en la lista de permitidos, ignorando...`);
      return;
    }
    
    const messageContent = message.body.trim();
    logger.info(`Mensaje recibido del grupo "${groupName}": ${messageContent.substring(0, 50)}...`);
    
    let taskData = null;
    
    // Determinar el tipo de mensaje y parsearlo
    if (messageContent.startsWith('Pedido')) {
      logger.info('Detectado formato de Pedido, procesando...');
      taskData = parsePedidoMessage(messageContent);
    } else if (messageContent.startsWith('TAREA:')) {
      logger.info('Detectado formato de TAREA, procesando...');
      taskData = parseTareaMessage(messageContent);
    } else {
      logger.debug('Formato de mensaje no reconocido, ignorando...');
      return;
    }
    
    if (!taskData) {
      logger.warn('No se pudo extraer información de la tarea del mensaje');
      return;
    }
    
    // Verificar si la tarea ya existe
    const isDuplicate = await checkDuplicateTask(taskData.numero);
    
    if (isDuplicate) {
      logger.warn(`Tarea con número ${taskData.numero} ya existe, ignorando...`);
      return;
    }
    
    // Crear la tarea
    const createdTask = await createTask(taskData);
    logger.info(`Tarea creada exitosamente: ${createdTask.titulo} (ID: ${createdTask._id})`);
    
  } catch (error) {
    logger.error('Error al procesar mensaje:', error);
  }
});

// Manejar errores de autenticación
client.on('auth_failure', (error) => {
  logger.error('Error de autenticación:', error);
});

// Manejar desconexiones
client.on('disconnected', (reason) => {
  logger.warn(`Cliente desconectado: ${reason}`);
  // Reiniciar el cliente después de un tiempo
  setTimeout(() => {
    logger.info('Intentando reconectar...');
    client.initialize();
  }, 5000);
});

// Inicializar el cliente
client.initialize();

// Manejar señales de terminación para cerrar correctamente
process.on('SIGINT', async () => {
  logger.info('Cerrando cliente de WhatsApp...');
  await client.destroy();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('Cerrando cliente de WhatsApp...');
  await client.destroy();
  process.exit(0);
});

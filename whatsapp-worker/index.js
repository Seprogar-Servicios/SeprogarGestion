require('dotenv').config();
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
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

// Configuración de ruta para la autenticación local
const AUTH_FOLDER = path.join(__dirname, '.wwebjs_auth');
logger.info(`Usando carpeta de autenticación: ${AUTH_FOLDER}`);

// Inicializar cliente de WhatsApp con LocalAuth
const client = new Client({
  authStrategy: new LocalAuth({
    dataPath: AUTH_FOLDER
  }),
  puppeteer: {
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--disable-gpu',
      '--disable-background-timer-throttling',
      '--disable-backgrounding-occluded-windows',
      '--disable-renderer-backgrounding',
      '--disable-features=TranslateUI',
      '--disable-ipc-flooding-protection',
      '--disable-background-networking',
      '--disable-default-apps',
      '--disable-extensions',
      '--disable-sync',
      '--disable-translate',
      '--hide-scrollbars',
      '--mute-audio',
      '--no-default-browser-check',
      '--no-pings',
      '--single-process',
      '--memory-pressure-off',
      '--max_old_space_size=256'
    ],
    headless: true,
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined
  }
});

// Evento cuando se genera el código QR para autenticación
client.on('qr', (qr) => {
  logger.info('===========================================');
  logger.info('QR CODE GENERADO - NECESITA ESCANEAR CON WHATSAPP');
  logger.info('===========================================');
  
  // Mostrar QR grande en ASCII en los logs
  qrcode.generate(qr, { small: false });
  
  // También mostrar el string del QR para usar en generadores online
  logger.info('STRING DEL QR (copia y pega en qr-code-generator.com):');
  logger.info(qr);
  logger.info('===========================================');
});

// Evento cuando el cliente está listo
client.on('ready', async () => {
  logger.info('===========================================');
  logger.info('SESIÓN INICIADA CORRECTAMENTE - WHATSAPP CONECTADO');
  logger.info('===========================================');
  
  // Aplicar permisos correctos a la carpeta de sesión
  try {
    const sessionPath = path.resolve('./.wwebjs_auth');
    const command = `chmod -R 777 ${sessionPath}`;
    require('child_process').execSync(command);
    logger.info(`Permisos aplicados correctamente a: ${sessionPath}`);
  } catch (error) {
    logger.error(`Error al aplicar permisos: ${error.message}`);
  }
  
  // Mostrar información de los chats
  try {
    const chats = await client.getChats();
    const groups = chats.filter(chat => chat.isGroup);
    logger.info(`📱 Total de chats: ${chats.length}`);
    logger.info(`👥 Total de grupos: ${groups.length}`);
    
    if (groups.length > 0) {
      logger.info('📋 Grupos disponibles:');
      groups.forEach(group => {
        logger.info(`  - "${group.name}"`);
      });
    }
    
    logger.info('🔍 Escuchando mensajes...');
  } catch (error) {
    logger.error('Error al obtener información de chats:', error);
  }
});

// Evento para cualquier mensaje (debug)
client.on('message_create', async (message) => {
  logger.info('🔔 EVENTO message_create detectado');
  logger.info(`   - Tipo: ${message.type}`);
  logger.info(`   - De: ${message.from}`);
  logger.info(`   - Contenido: ${message.body?.substring(0, 50) || 'Sin contenido'}...`);
});

// Evento para mensajes recibidos (alternativo)
client.on('message_received', async (message) => {
  logger.info('📨 EVENTO message_received detectado');
});

// Evento cuando se recibe un mensaje
client.on('message', async (message) => {
  try {
    logger.info('=== MENSAJE RECIBIDO ===');
    logger.info(`Tipo de mensaje: ${message.type}`);
    logger.info(`De: ${message.from}`);
    logger.info(`Contenido: ${message.body}`);
    
    // Verificar si el mensaje viene de un grupo permitido
    const chat = await message.getChat();
    
    if (!chat.isGroup) {
      logger.info('Mensaje recibido fuera de un grupo, ignorando...');
      return;
    }
    
    const groupName = chat.name;
    logger.info(`Grupo: "${groupName}"`);
    logger.info(`Grupos permitidos: ${GRUPOS_PERMITIDOS.join(', ')}`);
    
    if (!GRUPOS_PERMITIDOS.includes(groupName)) {
      logger.info(`❌ Grupo "${groupName}" NO está en la lista de permitidos, ignorando...`);
      return;
    }
    
    logger.info(`✅ Grupo "${groupName}" está permitido, procesando mensaje...`);
    
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
  logger.error('===========================================');
  logger.error('ERROR DE AUTENTICACIÓN - SESIÓN NO VÁLIDA');
  logger.error('===========================================');
  logger.error(error);
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

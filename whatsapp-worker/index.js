require('dotenv').config();
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const chromium = require('@sparticuz/chromium'); // Chromium compatible contenedores

// Parsers
const { parsePedidoMessage, parseTareaMessage, parseExpedienteMessage } = require('./src/parsers');
const logger = require('./src/utils/logger');

// Grupos permitidos
const GRUPOS_PERMITIDOS = process.env.GRUPOS_PERMITIDOS
  ? process.env.GRUPOS_PERMITIDOS.split(',').map((g) => g.trim())
  : [];

logger.info('Iniciando servicio de WhatsApp...');
logger.info(`Grupos permitidos: ${GRUPOS_PERMITIDOS.join(', ')}`);

// === Autenticación local ===
const AUTH_FOLDER = path.join(__dirname, '.wwebjs_auth');
if (!fs.existsSync(AUTH_FOLDER)) {
  fs.mkdirSync(AUTH_FOLDER, { recursive: true });
  logger.info(`✅ Carpeta de autenticación creada en: ${AUTH_FOLDER}`);
}

// === Cliente ===
let client;
let initializationAttempts = 0;
const MAX_INIT_ATTEMPTS = 3;

async function initializeClient() {
  try {
    logger.info('='.repeat(60));
    logger.info('🚀 INICIANDO CLIENTE WHATSAPP');
    logger.info('='.repeat(60));

    const executablePath = await chromium.executablePath();

    client = new Client({
      authStrategy: new LocalAuth({
        dataPath: AUTH_FOLDER,
        clientId: 'futurgas-worker',
      }),
      puppeteer: {
        headless: true,
        args: chromium.args,
        executablePath,
        defaultViewport: chromium.defaultViewport,
      },
      takeoverOnConflict: true,
      takeoverTimeoutMs: 30000,
      qrTimeout: 0,
      restartOnAuthFail: true,
    });

    setupEventHandlers();
    client.initialize().catch((err) => handleInitializationError(err));
  } catch (err) {
    handleInitializationError(err);
  }
}

function handleInitializationError(error) {
  initializationAttempts++;
  logger.error('❌ Error al inicializar el cliente:', error);

  if (initializationAttempts >= MAX_INIT_ATTEMPTS) {
    logger.error('Se alcanzó el máximo de intentos. Verifica configuración.');
    return;
  }

  const retryDelay = initializationAttempts * 5000;
  logger.warn(`Reintentando en ${retryDelay / 1000} segundos...`);
  setTimeout(initializeClient, retryDelay);
}

function setupEventHandlers() {
  client.on('qr', (qr) => {
    logger.info('📱 Escanea este QR para iniciar sesión:');
    qrcode.generate(qr, { small: true });
  });

  client.on('authenticated', () => {
    logger.info('✅ Autenticación exitosa');
  });

  client.on('ready', async () => {
    logger.info('🚀 Cliente listo y conectado a WhatsApp');
    try {
      const chats = await client.getChats();
      const groups = chats.filter((c) => c.isGroup);
      logger.info(`📱 Chats cargados: ${chats.length}`);
      logger.info(`👥 Grupos detectados: ${groups.length}`);
      groups.forEach((g, i) => {
        const allowed = GRUPOS_PERMITIDOS.includes(g.name.trim()) ? '✅' : '❌';
        logger.info(` ${i + 1}. ${g.name} ${allowed}`);
      });
      logger.info('👂 Escuchando mensajes...');
    } catch (err) {
      logger.error('Error al cargar chats:', err);
    }
  });

  client.on('message_create', processMessage);
  client.on('message', logIncomingMessage);

  client.on('auth_failure', (err) => {
    logger.error('🔥 Error crítico de autenticación:', err.message);
    logger.error('Elimina la carpeta .wwebjs_auth y vuelve a iniciar.');
    process.exit(1);
  });

  client.on('disconnected', (reason) => {
    logger.warn(`Cliente desconectado: ${reason}`);
    setTimeout(() => {
      logger.info('Intentando reconectar...');
      initializeClient();
    }, 5000);
  });
}

// === Logging de mensajes entrantes ===
async function logIncomingMessage(message) {
  const chat = await message.getChat();
  if (!chat.isGroup) return;
  logger.debug(`MENSAJE RECIBIDO [GRUPO: ${chat.name}] De: ${message.from} Contenido: ${message.body || '<SIN TEXTO>'}`);
}

// === Procesamiento de mensajes ===
async function processMessage(message) {
  try {
    const chat = await message.getChat();

    // Solo procesar mensajes de grupos permitidos
    if (!chat.isGroup) return;
    const groupName = chat.name.trim();
    const isAllowed = GRUPOS_PERMITIDOS.includes(groupName);
    if (!isAllowed) return;

    logger.info('=== NUEVO MENSAJE ===');
    logger.info(`De: ${message.from}`);
    logger.info(`Grupo: ${groupName}`);
    logger.info(`Contenido: ${message.body || '<SIN TEXTO>'}`);

    if (!message.body || message.body.trim() === '') {
      logger.info('Mensaje vacío o no texto, ignorando...');
      return;
    }

    const cleanContent = message.body.replace(/\*/g, '').trim();
    let taskData = null;
    let messageType = 'desconocido';

    if (cleanContent.startsWith('Pedido')) {
      messageType = 'pedido';
      taskData = parsePedidoMessage(message.body);
    } else if (cleanContent.startsWith('TAREA:')) {
      messageType = 'tarea';
      taskData = parseTareaMessage(message.body);
    } else if (cleanContent.startsWith('Expediente:')) {
      messageType = 'expediente';
      taskData = parseExpedienteMessage(message.body);
    } else {
      logger.info('Formato de mensaje no reconocido, ignorando...');
      return;
    }

    if (!taskData) {
      logger.error('No se pudo extraer información del mensaje');
      return;
    }

    logger.info(`Datos extraídos (${messageType}): ${JSON.stringify(taskData, null, 2)}`);

    const isDuplicate = await checkDuplicateTask(taskData.numero);
    if (isDuplicate) {
      logger.warn(`Tarea #${taskData.numero} ya existe, ignorando...`);
      return;
    }

    const success = await sendToAPI(taskData);
    if (success) logger.info(`Tarea #${taskData.numero} creada exitosamente`);
    else logger.error('Error al crear la tarea en la API');

  } catch (error) {
    logger.error('Error crítico al procesar mensaje:', error);
    logger.error('Stack trace:', error.stack);
  } finally {
    logger.info('='.repeat(50));
  }
}

// === Funciones auxiliares ===
async function checkDuplicateTask(numero) {
  try {
    const url = `${process.env.CHECK_DUPLICATE_URL}/${numero}`;
    const apiKey = process.env.API_KEY || '';
    const res = await axios.get(url, { headers: { Authorization: `Bearer ${apiKey}` } });
    return res.data?.exists || false;
  } catch {
    logger.warn(`No se pudo verificar duplicado para ${numero}, asumiendo existente.`);
    return true;
  }
}

async function sendToAPI(taskData) {
  try {
    const url = process.env.CREATE_TASK_URL;
    const apiKey = process.env.API_KEY || '';
    const response = await axios.post(url, taskData, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    logger.info(`Tarea enviada, ID: ${response.data?._id || 'desconocido'}`);
    return true;
  } catch (err) {
    logger.error('Error al enviar tarea:', err.message);
    return false;
  }
}

// === Inicializar cliente ===
initializeClient();

// === Cierre limpio ===
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

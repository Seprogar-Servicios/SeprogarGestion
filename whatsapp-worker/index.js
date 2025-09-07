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
    
    // Configuración mejorada de Puppeteer
    const puppeteerOptions = {
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--single-process',
        '--disable-gpu',
        ...chromium.args
      ],
      executablePath,
      defaultViewport: chromium.defaultViewport,
      ignoreHTTPSErrors: true,
      ignoreDefaultArgs: ['--disable-extensions'],
    };

    logger.info('Configurando cliente de WhatsApp...');
    
    client = new Client({
      authStrategy: new LocalAuth({
        dataPath: AUTH_FOLDER,
        clientId: 'futurgas-worker',
      }),
      puppeteer: puppeteerOptions,
      session: null, // Forzar nueva sesión
      qrTimeout: 0, // Deshabilitar timeout del QR
      authTimeout: 0, // Deshabilitar timeout de autenticación
      takeoverOnConflict: true,
      takeoverTimeoutMs: 60000, // Aumentar tiempo de espera
      restartOnAuthFail: true,
      disableWelcome: true, // Deshabilitar mensaje de bienvenida
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Safari/537.36'
    });

    logger.info('Configurando manejadores de eventos...');
    setupEventHandlers();
    
    logger.info('Inicializando cliente...');
    await client.initialize();
    
  } catch (err) {
    logger.error('Error durante la inicialización:', err);
    handleInitializationError(err);
  }
}

async function handleInitializationError(error) {
  initializationAttempts++;
  
  // Limpiar cliente anterior si existe
  try {
    if (client) {
      await client.destroy();
      client = null;
    }
  } catch (cleanupError) {
    logger.warn('Error al limpiar cliente anterior:', cleanupError);
  }

  // Analizar el error para dar mensajes más descriptivos
  const errorMessage = error.message || 'Error desconocido';
  let errorDetails = '';
  
  if (errorMessage.includes('Execution context was destroyed')) {
    errorDetails = 'El contexto de ejecución de Puppeteer fue destruido. Esto puede pasar por problemas de memoria o tiempo de espera.';
  } else if (errorMessage.includes('Failed to launch the browser process')) {
    errorDetails = 'No se pudo iniciar el navegador. Verifica la configuración de Chromium.';
  } else if (errorMessage.includes('Navigation timeout')) {
    errorDetails = 'Tiempo de espera agotado al cargar WhatsApp Web. Verifica tu conexión a internet.';
  } else if (errorMessage.includes('Failed to authenticate')) {
    errorDetails = 'Error de autenticación. Intenta eliminar la carpeta de autenticación y escanear el código QR nuevamente.';
  }

  logger.error(`❌ [Intento ${initializationAttempts}/${MAX_INIT_ATTEMPTS}] Error al inicializar el cliente:`);
  logger.error(`🔍 ${errorMessage}`);
  if (errorDetails) {
    logger.error(`ℹ️ ${errorDetails}`);
  }
  
  if (error.stack) {
    logger.debug('Stack trace:', error.stack);
  }

  if (initializationAttempts >= MAX_INIT_ATTEMPTS) {
    logger.error('🚨 Se alcanzó el máximo de intentos. Se requiere intervención manual.');
    logger.info('Sugerencias para solucionar el problema:');
    logger.info('1. Verifica que no haya otra instancia del bot en ejecución');
    logger.info('2. Elimina la carpeta .wwebjs_auth para forzar nueva autenticación');
    logger.info('3. Verifica que el puerto 3000 no esté en uso');
    logger.info('4. Revisa los logs anteriores para más detalles');
    process.exit(1);
  }

  // Aumentar el tiempo de espera progresivamente
  const retryDelay = Math.min(initializationAttempts * 10000, 60000); // Máximo 1 minuto
  logger.warn(`🔄 Reintentando en ${retryDelay / 1000} segundos...`);
  
  setTimeout(() => {
    logger.info('Reiniciando inicialización...');
    initializeClient().catch(err => {
      logger.error('Error en el reintento de inicialización:', err);
    });
  }, retryDelay);
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

  // Usar solo message_create que se dispara para todos los mensajes
  client.on('message_create', (message) => {
    logIncomingMessage(message);
    processMessage(message);
  });

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
  try {
    const chat = await message.getChat();
    if (!chat.isGroup) return;
    
    const contact = await message.getContact();
    const contactName = contact?.pushname || contact?.name || 'Desconocido';
    const timestamp = new Date().toISOString();
    
    logger.info('\n' + '='.repeat(60));
    logger.info(`📩 NUEVO MENSAJE - ${timestamp}`);
    logger.info('='.repeat(60));
    logger.info(`👥 Grupo: ${chat.name}`);
    logger.info(`👤 De: ${contactName} (${message.from})`);
    logger.info(`💬 Contenido: ${message.body || '<SIN TEXTO>'}`);
    logger.info('='.repeat(60) + '\n');
    
  } catch (error) {
    logger.error('Error en logIncomingMessage:', error);
  }
}

// === Procesamiento de mensajes ===
async function processMessage(message) {
  try {
    const chat = await message.getChat();

    if (!chat.isGroup) return;
    const groupName = chat.name.trim();
    if (!GRUPOS_PERMITIDOS.includes(groupName)) return;

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
    if (success) {
      logger.info(`Tarea #${taskData.numero} creada exitosamente`);
    } else {
      logger.error('Error al crear la tarea en la API');
    }

    // Separador solo cuando hay un procesamiento válido
    logger.info('='.repeat(50));

  } catch (error) {
    logger.error('Error crítico al procesar mensaje:', error);
    logger.error('Stack trace:', error.stack);
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
    const createTaskUrl = process.env.CREATE_TASK_URL || 'http://localhost:3000/api/worker/tareas';
    const apiKey = process.env.API_KEY || '';

    const dataToSend = { ...taskData };
    const camposPermitidos = [
      'numero', 'titulo', 'descripcion', 'estado', 'tecnicos',
      'fechaEjecucion', 'franja_horaria', 'cliente', 'numeroTitular', 'direccion'
    ];

    const datosLimpios = {};
    camposPermitidos.forEach(campo => {
      if (dataToSend[campo] !== undefined) {
        datosLimpios[campo] = dataToSend[campo];
      }
    });

    const camposEliminados = Object.keys(dataToSend).filter(campo => !camposPermitidos.includes(campo));
    if (camposEliminados.length > 0) {
      logger.info(`Campos eliminados para cumplir con la validación de la API: ${camposEliminados.join(', ')}`);
    }

    logger.info(`Enviando datos a la API: ${createTaskUrl}`);

    const response = await axios.post(createTaskUrl, datosLimpios, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      }
    });

    logger.info(`Tarea creada exitosamente en la API con ID: ${response.data._id || response.data.id || 'desconocido'}`);
    return true;
  } catch (error) {
    if (error.response) {
      logger.error(`Error al crear tarea en la API: ${error.response.status}`);
      logger.error(`Detalles: ${JSON.stringify(error.response.data)}`);
    } else if (error.request) {
      logger.error('Error: No se recibió respuesta de la API');
    } else {
      logger.error('Error al configurar la solicitud:', error.message);
    }
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

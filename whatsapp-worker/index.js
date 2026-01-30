require('dotenv').config();
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { performance } = require('perf_hooks');
const chromium = require('@sparticuz/chromium'); // Chromium compatible contenedores

// Memory monitoring
const MEMORY_THRESHOLD = 0.7; // 70% of available memory
const MEMORY_CHECK_INTERVAL = 300000; // 5 minutes instead of 30 seconds

function getMemoryUsage() {
  const usage = process.memoryUsage();
  
  // For container environments, focus on process memory, not system memory
  const heapUsedMB = Math.round(usage.heapUsed / 1024 / 1024 * 100) / 100;
  const heapTotalMB = Math.round(usage.heapTotal / 1024 / 1024 * 100) / 100;
  const rssMB = Math.round(usage.rss / 1024 / 1024 * 100) / 100;
  const externalMB = Math.round(usage.external / 1024 / 1024 * 100) / 100;
  
  // Estimate container memory usage (512MB limit)
  const containerLimitMB = 512;
  const estimatedUsagePercent = Math.round((rssMB / containerLimitMB) * 100);
  
  return {
    heapUsed: heapUsedMB,
    heapTotal: heapTotalMB,
    external: externalMB,
    rss: rssMB,
    containerLimit: containerLimitMB,
    estimatedUsagePercent: estimatedUsagePercent
  };
}

function monitorMemory() {
  const memory = getMemoryUsage();
  
  // Only log if memory usage is concerning (>60%)
  if (memory.estimatedUsagePercent > 60) {
    logger.warn('📊 Memory Usage:', {
      heap: `${memory.heapUsed}MB / ${memory.heapTotal}MB`,
      rss: `${memory.rss}MB / ${memory.containerLimit}MB (${memory.estimatedUsagePercent}%)`,
      external: `${memory.external}MB`
    });
  }
  
  // Alert if memory usage is high
  if (memory.estimatedUsagePercent > MEMORY_THRESHOLD * 100) {
    logger.warn('⚠️  High memory usage detected!', {
      usage: `${memory.estimatedUsagePercent}%`,
      threshold: `${MEMORY_THRESHOLD * 100}%`
    });
    
    // Force garbage collection if available
    if (global.gc) {
      global.gc();
      logger.info('🧹 Forced garbage collection');
    }
    
    // Check if we need to restart
    if (memory.estimatedUsagePercent > 0.85) {
      logger.error('🚨 Critical memory usage! Consider restarting the service');
    }
  }
}

// Start memory monitoring
setInterval(monitorMemory, MEMORY_CHECK_INTERVAL);

// Error handling with controlled restart
process.on('uncaughtException', (error) => {
  logger.error('🚨 Uncaught Exception:', error);
  logger.error('Stack trace:', error.stack);
  
  // Log memory usage before crash
  const memory = getMemoryUsage();
  logger.error('Memory at crash:', {
    heap: `${memory.heapUsed}MB / ${memory.heapTotal}MB`,
    rss: `${memory.rss}MB / ${memory.containerLimit}MB (${memory.estimatedUsagePercent}%)`,
    external: `${memory.external}MB`
  });
  
  // Attempt graceful shutdown
  try {
    if (client) {
      client.destroy().then(() => {
        logger.info('Client destroyed gracefully');
        process.exit(1);
      }).catch(() => {
        process.exit(1);
      });
    } else {
      process.exit(1);
    }
  } catch (e) {
    logger.error('Error during shutdown:', e);
    process.exit(1);
  }
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('🚨 Unhandled Rejection at:', promise, 'reason:', reason);
  
  // Log memory usage
  const memory = getMemoryUsage();
  logger.error('Memory at rejection:', {
    heap: `${memory.heapUsed}MB / ${memory.heapTotal}MB`,
    rss: `${memory.rss}MB / ${memory.containerLimit}MB (${memory.estimatedUsagePercent}%)`,
    external: `${memory.external}MB`
  });
  
  // Force garbage collection
  if (global.gc) {
    global.gc();
    logger.info('🧹 Forced garbage collection after rejection');
  }
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('📴 SIGTERM received, shutting down gracefully');
  if (client) {
    client.destroy().then(() => {
      logger.info('Client destroyed on SIGTERM');
      process.exit(0);
    }).catch(() => {
      process.exit(0);
    });
  } else {
    process.exit(0);
  }
});

process.on('SIGINT', () => {
  logger.info('📴 SIGINT received, shutting down gracefully');
  if (client) {
    client.destroy().then(() => {
      logger.info('Client destroyed on SIGINT');
      process.exit(0);
    }).catch(() => {
      process.exit(0);
    });
  } else {
    process.exit(0);
  }
});

// Configuración de cola de procesamiento (p-queue es ESM, se carga con import dinámico)
let queue;
async function initializeQueue() {
  if (queue) return queue;
  const { default: PQueue } = await import('p-queue');
  queue = new PQueue({
    concurrency: 1, // Procesar un mensaje a la vez
    timeout: 30000, // 30 segundos máximo por tarea
    throwOnTimeout: true
  });
  return queue;
}

// Configuración de axios
const http = axios.create({
  timeout: 10000, // 10 segundos de timeout por defecto
  maxContentLength: 100000, // 100KB máximo
  maxBodyLength: 100000,   // 100KB máximo
  validateStatus: function (status) {
    return status >= 200 && status < 300; // Solo resolver si el código de estado es menor que 300
  }
});

// Parsers
const { parsePedidoMessage, parseTareaMessage, parseExpedienteMessage } = require('./src/parsers');
const logger = require('./src/utils/logger');

// Grupos permitidos (convertidos a lowercase para comparación consistente)
const GRUPOS_PERMITIDOS = process.env.GRUPOS_PERMITIDOS
  ? process.env.GRUPOS_PERMITIDOS.split(',').map((g) => g.trim().toLowerCase())
  : [];

// Cache para grupos permitidos (optimización de rendimiento)
const allowedGroupsCache = new Set(GRUPOS_PERMITIDOS);

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

    await initializeQueue();

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
    logger.info('📱 NUEVO QR GENERADO');
    qrcode.generate(qr, { small: true });
  });

  client.on('authenticated', () => logger.info('✅ AUTENTICACIÓN EXITOSA'));

  client.on('ready', () => {
    logger.info('🚀 Cliente listo. Escuchando mensajes en grupos permitidos...');
    // Eliminado: loadChatsWithRetry para evitar errores de memoria/contexto
  });

  // Evento unificado de mensajes
  client.on('message_create', async (message) => {
    if (!message.body && !message.hasMedia) return;

    // Usar la cola para procesar de a uno
    if (queue) {
      queue.add(() => handleIncomingFlow(message)).catch(e => logger.error('Error en cola:', e.message));
    } else {
      handleIncomingFlow(message);
    }
  });

  client.on('disconnected', (reason) => {
    logger.warn(`❌ Cliente desconectado: ${reason}`);
    setTimeout(initializeClient, 5000);
  });
}

// --- NUEVO FLUJO DE ENTRADA RESILIENTE ---
async function handleIncomingFlow(message) {
  try {
    // 1. Obtener chat con timeout para que no bloquee Puppeteer
    const chat = await Promise.race([
      message.getChat(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout Chat')), 8000))
    ]).catch(() => null);

    if (!chat || !chat.isGroup) return;

    // 2. Validar grupo contra la lista permitida
    const groupName = chat.name?.trim().toLowerCase();
    if (!allowedGroupsCache.has(groupName)) return;

    // 3. Loguear visualmente (Tu función original logIncomingMessage)
    await logIncomingMessage(message, chat);

    // 4. Procesar la lógica de negocio (Tu función original processMessage)
    await processMessage(message, chat);

  } catch (error) {
    logger.error('Error en handleIncomingFlow:', error.message);
  }
}

// === Logging de mensajes entrantes ===
async function logIncomingMessage(message, chat) {
  try {
    const contact = await message.getContact().catch(() => null);
    const contactInfo = contact?.pushname || contact?.name || 'Desconocido';
    const timestamp = new Date().toLocaleString('es-AR');

    logger.info('\n' + '='.repeat(80));
    logger.info(`📩 MENSAJE DETECTADO - ${timestamp}`);
    logger.info(`👥 GRUPO: ${chat.name} | 👤: ${contactInfo}`);
    logger.info(`� CONTENIDO: ${message.body?.substring(0, 100)}${message.body?.length > 100 ? '...' : ''}`);
    logger.info('='.repeat(80));
  } catch (e) { 
    logger.error('Error en log:', e.message); 
  }
}

// Función para verificar si un mensaje es de un grupo permitido
function isFromAllowedGroup(chat) {
  if (!chat?.isGroup) return false;
  const groupName = chat.name?.trim() || '';
  return allowedGroupsCache.has(groupName.toLowerCase());
}

// Función para limpiar memoria
function cleanupMemory() {
  if (global.gc) {
    global.gc();
    logger.debug('Limpieza de memoria forzada');
  }
}

// === Procesamiento de mensajes ===
async function processMessage(message, chat) {
  const startTime = performance.now();
  try {
    const cleanContent = message.body.replace(/\*/g, '').replace(/\s+/g, ' ').trim();
    let parser = null;

    if (cleanContent.startsWith('TAREA:')) parser = parseTareaMessage;
    else if (cleanContent.toLowerCase().includes('pedido') || cleanContent.includes('TURNO')) parser = parsePedidoMessage;
    else if (cleanContent.toLowerCase().includes('expediente:')) parser = parseExpedienteMessage;

    if (!parser) return;

    const taskData = parser(cleanContent);
    if (!taskData) return;

    taskData.grupoOrigen = chat.name;
    taskData.fechaRecepcion = new Date().toISOString();
    taskData.origen = 'whatsapp';

    const isDuplicate = await checkDuplicateTask(taskData.numero);
    if (isDuplicate) {
      logger.warn(`⚠️ Tarea #${taskData.numero} duplicada.`);
      return;
    }

    const success = await sendToAPI(taskData);
    if (success) logger.info(`✅ Tarea #${taskData.numero} enviada.`);

  } catch (error) {
    logger.error('Error en processMessage:', error.message);
  }
}

// === Funciones auxiliares ===
async function checkDuplicateTask(numero) {
  if (!numero) return true;
  try {
    const expediente = numero.toString().trim().replace(/\D/g, '');
    const url = `${process.env.CHECK_DUPLICATE_URL}/${expediente}`;
    const res = await http.get(url, { headers: { 'Authorization': `Bearer ${process.env.API_KEY}` } });
    return res.data?.exists || false;
  } catch (e) { 
    return false; 
  }
}

async function sendToAPI(taskData) {
  try {
    await http.post(process.env.CREATE_TASK_URL, taskData, {
      headers: { 'Authorization': `Bearer ${process.env.API_KEY}` }
    });
    return true;
  } catch (error) {
    logger.error(`Error API Tarea #${taskData.numero}: ${error.message}`);
    return false;
  }
}

// Inicializar el cliente
initializeClient();

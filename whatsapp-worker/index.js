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
      qrTimeout: 60000, // 60 segundos para QR
      authTimeout: 60000, // 60 segundos para autenticación
      takeoverOnConflict: true,
      takeoverTimeoutMs: 30000, // Reducir tiempo de espera
      restartOnAuthFail: false, // No reiniciar automáticamente
      disableWelcome: true,
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
  logger.info('🧩 setupEventHandlers: handlers registrados');
  let readyFired = false;
  let postAuthFlowStarted = false;
  let firstMessageLogged = false;

  // Flujo post-auth: verificar grupos permitidos y dejar el worker listo
  const runPostAuthFlow = async (source) => {
    if (postAuthFlowStarted) return;
    postAuthFlowStarted = true;

    logger.info(`🧭 Iniciando flujo post-auth (source=${source})`);

    // Esperar un momento para asegurar que el cliente esté completamente listo
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Función para verificar si el cliente está listo
    const isClientReady = () => {
      try {
        return client &&
               client.info &&
               client.pupPage &&
               typeof client.pupPage.isClosed === 'function' &&
               !client.pupPage.isClosed();
      } catch (error) {
        logger.warn('Error en isClientReady:', error.message);
        return false;
      } finally {
        if (global.gc) global.gc();
      }
    };

    // Función para limpiar memoria
    const cleanupMemory = () => {
      try {
        if (global.gc) {
          global.gc();
          logger.debug('Recolección de basura forzada');
        }
        Object.keys(require.cache).forEach(key => {
          if (!key.includes('node_modules') && !key.includes('whatsapp-web.js')) {
            delete require.cache[key];
          }
        });
      } catch (error) {
        logger.warn('Error durante limpieza de memoria:', error.message);
      }
    };

    // Función asíncrona para cargar chats con reintentos
    const loadChatsWithRetry = async () => {
      const maxRetries = 5;
      const delay = 2000; // 2 segundos entre reintentos
      let lastError = null;

      logger.info('🔍 Cargando chats para verificar grupos permitidos...');

      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        let chats = [];
        let groupChats = [];

        try {
          logger.info(`🔍 Intentando cargar chats (intento ${attempt}/${maxRetries})...`);

          if (!isClientReady()) {
            throw new Error('El cliente de WhatsApp no está completamente inicializado');
          }

          chats = await client.getChats();
          logger.info(`✅ Chats cargados: ${chats.length} chats encontrados`);

          groupChats = chats.filter(c => c.isGroup);
          logger.info(`👥 Grupos encontrados: ${groupChats.length}`);

          const allowedGroups = groupChats.filter(c =>
            GRUPOS_PERMITIDOS.some(allowed =>
              c.name?.trim().toLowerCase() === allowed.trim().toLowerCase()
            )
          );

          if (allowedGroups.length > 0) {
            logger.info(`✅ Grupos permitidos configurados: ${allowedGroups.map(g => g.name).join(', ')}`);
            allowedGroups.length = 0;
          } else {
            logger.warn('⚠️  No se encontraron los grupos permitidos. Verifica los nombres en GRUPOS_PERMITIDOS');
            logger.info('Grupos configurados:', GRUPOS_PERMITIDOS.join(', '));

            if (groupChats.length > 0) {
              logger.info('📋 Grupos disponibles (mostrando 5 de ' + groupChats.length + '):');
              for (let i = 0; i < Math.min(5, groupChats.length); i++) {
                logger.info(`   ${i + 1}. ${groupChats[i].name}`);
              }
            }
          }

          cleanupMemory();
          return;
        } catch (error) {
          lastError = error;
          const errorMessage = error.message || 'Error desconocido';
          const stackTrace = error.stack ? `\n${error.stack}` : '';

          // Error conocido: whatsapp-web.js puede romperse al enumerar chats en algunos despliegues
          // (incompatibilidad con la versión de WhatsApp Web / Store interno no listo).
          // En ese caso, no vale la pena reintentar mucho: seguimos escuchando y validamos grupos
          // cuando llega cada mensaje (message.getChat()).
          const isKnownGetChatsBug =
            errorMessage.includes('window.WWebJS.getChatModel') ||
            errorMessage.includes("Cannot read properties of undefined (reading 'update')") ||
            errorMessage.includes("Cannot read properties of undefined (reading \"update\")");

          if (isKnownGetChatsBug) {
            logger.error('🚨 Error conocido al ejecutar client.getChats(); se omitirá la verificación inicial de grupos.');
            logger.error('📌 El worker seguirá escuchando mensajes y validará grupos al recibirlos.');
            logger.error('✅ Recomendación: actualizar whatsapp-web.js a una versión más nueva/compatible y redeploy.');
            logger.error(`Detalles: ${errorMessage}`);
            cleanupMemory();
            return;
          }

          logger.warn(`⚠️  Intento ${attempt} fallido: ${errorMessage}${stackTrace}`);

          if (attempt < maxRetries) {
            const retryDelay = Math.min(delay * attempt, 10000);
            logger.info(`⏳ Reintentando en ${retryDelay / 1000} segundos...`);
            cleanupMemory();
            await new Promise(resolve => setTimeout(resolve, retryDelay));
          }
        } finally {
          if (chats && chats.length > 0) chats.length = 0;
          if (groupChats && groupChats.length > 0) groupChats.length = 0;
          if (global.gc) global.gc();
        }
      }

      logger.error('❌ No se pudieron cargar los chats después de varios intentos');

      if (lastError) {
        logger.error('Detalles del error:', {
          message: lastError.message || 'Sin mensaje de error',
          stack: lastError.stack || 'Sin stack trace',
          code: lastError.code || 'Código no disponible'
        });
      }

      cleanupMemory();
    };

    await loadChatsWithRetry();
    logger.info('\n👂 ESCUCHANDO MENSAJES...\n');
  };

  // Evento QR
  client.on('qr', (qr) => {
    logger.info('\n' + '='.repeat(60));
    logger.info('📱 ESCANEA ESTE CÓDIGO QR CON WHATSAPP');
    logger.info('='.repeat(60));
    qrcode.generate(qr, { small: true });
    logger.info('='.repeat(60) + '\n');
  });

  // Evento de autenticación exitosa
  client.on('authenticated', (session) => {
    logger.info('\n' + '='.repeat(60));
    logger.info('✅ AUTENTICACIÓN EXITOSA');
    logger.info('='.repeat(60) + '\n');

    // En algunos entornos el evento `ready` puede demorar o no disparar.
    // Iniciar la verificación de grupos poco después de la autenticación.
    setTimeout(() => {
      if (postAuthFlowStarted) return;
      logger.info('⏳ Post-auth: iniciando verificación de grupos (trigger=authenticated)');
      runPostAuthFlow('authenticated').catch((err) => {
        logger.error('Error en flujo post-auth (authenticated):', err?.message || err);
      });
    }, 3000);

    // Fallback: si `ready` no se dispara, igual ejecutar el flujo post-auth.
    // En condiciones normales, `ready` debería disparar en segundos.
    setTimeout(() => {
      if (readyFired || postAuthFlowStarted) return;
      logger.warn('⏳ Pasaron 15s desde authenticated y no llegó el evento ready. Ejecutando flujo post-auth por fallback...');
      runPostAuthFlow('authenticated-fallback').catch((err) => {
        logger.error('Error en flujo post-auth (fallback):', err?.message || err);
      });
    }, 15000);
  });

  // Evento de cliente listo
  client.on('ready', async () => {
    logger.info('🚀 Cliente listo y conectado a WhatsApp');
    readyFired = true;

    runPostAuthFlow('ready').catch((err) => {
      logger.error('Error en flujo post-auth (ready):', err?.message || err);
    });
  });

  // Evento de remoto guardado de sesión
  client.on('remote_session_saved', () => {
    logger.info('💾 Sesión remota guardada');
  });

  // Evento de cambio de estado
  client.on('change_state', (state) => {
    logger.info(`🔄 Estado del cliente cambiado: ${state}`);
  });

  const handleIncoming = (message, sourceEvent) => {
    try {
      if (!firstMessageLogged) {
        const messageId = message?.id?.id || message?.id?._serialized || 'unknown';
        logger.info(`📨 Primer mensaje recibido (event=${sourceEvent}) id=${messageId} from=${message?.from || 'unknown'} type=${message?.type || 'unknown'}`);
        firstMessageLogged = true;
      }

      logIncomingMessage(message);

      if (!queue) {
        processMessage(message);
        return;
      }

      queue
        .add(() => processMessage(message))
        .catch((error) => {
          logger.error('Error en la cola de procesamiento:', error?.message || error);
        });
    } catch (err) {
      logger.error('Error inesperado en handler de mensaje:', err?.message || err);
    }
  };

  // Evento recomendado para mensajes entrantes
  client.on('message', (message) => {
    handleIncoming(message, 'message');
  });

  // Mantener message_create pero evitar duplicados: procesar solo los mensajes propios
  client.on('message_create', (message) => {
    if (!message?.fromMe) return;
    handleIncoming(message, 'message_create');
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
  // Verificar si el mensaje es válido de manera temprana
  if (!message?.id) {
    logger.debug('🔍 Mensaje inválido: sin ID');
    return; // No registrar mensajes inválidos
  }

  try {
    // Obtener información del chat de manera eficiente
    let chat = await message.getChat().catch(() => null);
    logger.debug('🔍 Chat encontrado:', { 
      isGroup: chat?.isGroup, 
      name: chat?.name, 
      from: message.from 
    });
    
    if (!chat?.isGroup) {
      logger.debug('🔍 Mensaje ignorado: no es de grupo');
      return; // Ignorar mensajes que no son de grupo
    }

    // Verificar rápidamente si el grupo está permitido
    const groupName = chat.name?.trim() || '';
    const isGroupAllowed = GRUPOS_PERMITIDOS.some(
      g => g.trim().toLowerCase() === groupName.toLowerCase()
    );

    logger.debug('🔍 Verificación de grupo:', {
      groupName,
      gruposPermitidos: GRUPOS_PERMITIDOS,
      isGroupAllowed
    });

    // Si el grupo no está permitido, salir sin hacer nada
    if (!isGroupAllowed) {
      logger.warn(`🚫 Grupo no permitido: "${groupName}"`);
      return;
    }

    // Solo para grupos permitidos: Obtener información del contacto
    const contactInfo = await Promise.resolve()
      .then(async () => {
        const contact = await message.getContact().catch(() => null);
        return contact?.pushname || contact?.name || contact?.number || 'Desconocido';
      })
      .catch(() => 'Desconocido');

    // Formatear timestamp
    const timestamp = new Date().toLocaleString('es-AR', {
      timeZone: 'America/Argentina/Buenos_Aires',
      hour12: false
    });

    // Mostrar el mensaje completo para grupos permitidos
    logger.info('\n' + '='.repeat(80));
    logger.info(`📩 MENSAJE DE GRUPO PERMITIDO - ${timestamp}`);
    logger.info('='.repeat(80));
    logger.info(`👥 GRUPO: ${groupName}`);
    logger.info(`👤 REMITENTE: ${contactInfo} (${message.from})`);
    logger.info(`📌 TIPO: ${message.type || 'texto'}`);
    
    // Mostrar el contenido completo del mensaje
    if (message.body) {
      logger.info('💬 CONTENIDO:');
      logger.info(message.body);
    } else if (message.hasMedia) {
      logger.info('📎 El mensaje contiene medios adjuntos');
    } else {
      logger.info('ℹ️  Mensaje sin contenido de texto');
    }
    
    logger.info('='.repeat(80) + '\n');
    
    // Limpiar referencias (solo si no se usan más)
    // message = null;
    // chat = null;
    
  } catch (error) {
    // Solo registrar errores inesperados, no fallar silenciosamente
    if (error.message !== 'Chat not found') {
      logger.error('Error en logIncomingMessage:', {
        error: error.message,
        stack: error.stack,
        messageId: message?.id?.id || 'desconocido'
      });
    }
  }
}

// Cache para grupos permitidos (optimización de rendimiento)
const allowedGroupsCache = new Set(
  GRUPOS_PERMITIDOS.map(g => g.trim().toLowerCase())
);

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
async function processMessage(message) {
  const startTime = performance.now();
  const messageId = message?.id?.id || 'unknown';
  
  try {
    logger.debug(`🔍 Iniciando procesamiento del mensaje ${messageId}`);
    
    // Validación temprana del mensaje
    if (!message || !message.body) {
      logger.debug(`🔍 Mensaje ${messageId} inválido: sin cuerpo`);
      return;
    }

    // Obtener información del chat
    let chat;
    try {
      chat = await message.getChat();
    } catch (error) {
      logger.debug(`🔍 No se pudo obtener el chat para mensaje ${messageId}: ${error.message}`);
      return;
    }

    // Verificar si es un grupo permitido
    if (!chat.isGroup) {
      logger.debug(`🔍 Mensaje ${messageId} ignorado: no es de grupo`);
      return;
    }

    const groupName = chat.name?.trim() || '';
    const isGroupAllowed = GRUPOS_PERMITIDOS.some(
      g => g.trim().toLowerCase() === groupName.toLowerCase()
    );

    if (!isGroupAllowed) {
      logger.debug(`🔍 Mensaje ${messageId} ignorado: grupo "${groupName}" no permitido`);
      return;
    }

    logger.debug(`🔍 Mensaje ${messageId} de grupo permitido: "${groupName}"`);
    
    // Limitar el tamaño del mensaje
    let messageBody = message.body || '';
    const MAX_MESSAGE_SIZE = 10000; // 10KB máximo
    
    if (messageBody.length > MAX_MESSAGE_SIZE) {
      logger.warn(`Mensaje ${messageId} demasiado grande (${messageBody.length} caracteres), truncando...`);
      messageBody = messageBody.substring(0, MAX_MESSAGE_SIZE);
    }

    if (!messageBody.trim()) {
      logger.debug(`Mensaje ${messageId} sin contenido, ignorando...`);
      return;
    }

    // Limpiar memoria periódicamente
    if (Math.random() < 0.1) {
      cleanupMemory();
    }
    
    const cleanContent = messageBody
      .replace(/\*/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    logger.debug('Contenido limpio del mensaje:', cleanContent);

    // Determinar el tipo de mensaje y procesarlo
    let taskData = null;
    let messageType = 'desconocido';
    let parser = null;

    // Verificación más eficiente del tipo de mensaje
    const firstWord = cleanContent.trim().split(/\s+/)[0] || '';
    const lowerContent = cleanContent.toLowerCase();
    
    if (firstWord === 'TAREA:') {
      messageType = 'tarea';
      parser = parseTareaMessage;
    } else if (firstWord === 'Pedido' || cleanContent.includes('TURNO')) {
      messageType = 'pedido';
      parser = parsePedidoMessage;
    } else if (lowerContent.includes('expediente:')) {
      messageType = 'expediente';
      parser = parseExpedienteMessage;
    }

    logger.debug(`🔍 Tipo de mensaje detectado: ${messageType}`);

    // Si no se reconoció el formato, registrar y salir
    if (!parser) {
      logger.info('⚠️  Formato de mensaje no reconocido');
      logger.info('Formatos soportados:');
      logger.info('1. Pedido: Debe comenzar con "Pedido" o contener "TURNO"');
      logger.info('2. Tarea: Debe comenzar con "TAREA:"');
      logger.info('3. Expediente: Debe comenzar con "Expediente:"');
      logger.info('='.repeat(80) + '\n');
      return;
    }

    // Procesar el mensaje con el parser correspondiente
    logger.info(`📋 Tipo de mensaje detectado: ${messageType}`);
    taskData = parser(cleanContent);

    // Verificar si se pudo extraer información
    if (!taskData) {
      logger.error('❌ No se pudo extraer información del mensaje');
      logger.info('='.repeat(80) + '\n');
      return;
    }

    // Agregar solo los metadatos necesarios
    taskData.grupoOrigen = groupName;
    taskData.fechaRecepcion = new Date().toISOString();
    taskData.origen = 'whatsapp';
    
    // No almacenar el mensaje original completo para ahorrar memoria
    // En su lugar, guardar solo los primeros 500 caracteres si es necesario para depuración
    if (process.env.NODE_ENV === 'development') {
      taskData.mensajeOriginal = cleanContent.length > 500 
        ? cleanContent.substring(0, 500) + '...' 
        : cleanContent;
    }

    // Log más eficiente en producción
    if (process.env.NODE_ENV === 'development') {
      logger.info('✅ Datos extraídos correctamente:', JSON.stringify({
        numero: taskData.numero,
        tipo: taskData.tipo || messageType,
        cliente: taskData.cliente || 'Sin cliente',
        direccion: taskData.direccion ? `${taskData.direccion.substring(0, 50)}...` : 'Sin dirección'
      }, null, 2));
    } else {
      logger.info(`✅ Tarea ${taskData.numero} procesada correctamente`);
    }

    // Verificar si la tarea ya existe (con manejo de memoria)
    const isDuplicate = await checkDuplicateTask(taskData.numero).catch(err => {
      logger.error('Error al verificar duplicados:', err.message);
      return false; // Continuar con el procesamiento aunque falle la verificación
    });
    if (isDuplicate) {
      logger.warn(`⚠️  Tarea #${taskData.numero} ya existe, ignorando...`);
      logger.info('='.repeat(80) + '\n');
      return;
    }

    // Enviar a la API
    logger.info('📤 Enviando tarea a la API...');
    const success = await sendToAPI(taskData);
    
    if (success) {
      logger.info(`✅ Tarea #${taskData.numero} procesada exitosamente`);
    } else {
      logger.error(`❌ Error al procesar la tarea #${taskData.numero}`);
    }
    
    // Limpiar referencias para el recolector de basura
    taskData = null;
    message = null;

    logger.info('='.repeat(80) + '\n');

  } catch (error) {
    logger.error('🔥 ERROR CRÍTICO al procesar mensaje:', {
      error: error.message,
      stack: error.stack,
      messageId: message?.id?.id || 'desconocido',
      from: message?.from || 'desconocido'
    });
    
    // Intentar forzar la recolección de basura en caso de error
    if (typeof global.gc === 'function') {
      global.gc();
    }
  }
}

// === Funciones auxiliares ===
async function checkDuplicateTask(numero) {
  const startTime = performance.now();
  
  try {
    // Si el número ya está vacío o no es válido, asumir que es un duplicado para evitar errores
    if (!numero || typeof numero !== 'string' || numero.trim() === '') {
      logger.warn('Número de expediente no válido, asumiendo duplicado');
      return true;
    }

    // Limpiar el número de expediente (eliminar espacios y caracteres no numéricos)
    const expedienteNumero = numero.toString().trim().replace(/\D/g, '');
    
    // Si después de limpiar no hay número, asumir duplicado
    if (!expedienteNumero) {
      logger.warn('No se pudo extraer número de expediente, asumiendo duplicado');
      return true;
    }

    const url = `${process.env.CHECK_DUPLICATE_URL}/${expedienteNumero}`;
    const apiKey = process.env.API_KEY || '';
    
    if (process.env.NODE_ENV === 'development') {
      logger.debug(`Verificando duplicado para expediente: ${expedienteNumero}`);
    }
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 segundos máximo
    
    try {
      const res = await http.get(url, { 
        signal: controller.signal,
        headers: { 
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      });
      
      clearTimeout(timeoutId);
      
      const isDuplicate = res.data?.exists || false;
      
      if (process.env.NODE_ENV === 'development') {
        const elapsed = (performance.now() - startTime).toFixed(2);
        logger.debug(`Verificación de duplicado completada en ${elapsed}ms`);
      }
      
      return isDuplicate;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  } catch (error) {
    const errorMsg = error.response 
      ? `Error ${error.response.status}: ${error.response.statusText}`
      : error.message;
      
    logger.warn(`No se pudo verificar duplicado para ${numero}: ${errorMsg}`);
    // En caso de error, asumir que es un duplicado para evitar duplicados
    return true;
  }
}

async function sendToAPI(taskData) {
  const startTime = performance.now();
  const taskNumber = taskData.numero || 'desconocido';
  
  try {
    const createTaskUrl = process.env.CREATE_TASK_URL || 'http://localhost:3000/api/worker/tareas';
    const apiKey = process.env.API_KEY || '';

    // Limitar el tamaño de los datos que se envían
    const dataToSend = { ...taskData };
    const camposPermitidos = [
      'numero', 'titulo', 'descripcion', 'estado', 'tecnicos',
      'fechaEjecucion', 'franja_horaria', 'cliente', 'numeroTitular', 'direccion',
      'origen', 'grupoOrigen', 'mensajeOriginal', 'fechaRecepcion'
    ];

    // Limpiar y validar datos
    const datosLimpios = {};
    let totalSize = 0;
    const MAX_DATA_SIZE = 100000; // 100KB
    
    for (const campo of camposPermitidos) {
      if (dataToSend[campo] !== undefined && dataToSend[campo] !== null) {
        let valor = dataToSend[campo];
        
        // Limpiar cadenas de texto
        if (typeof valor === 'string') {
          valor = valor.trim();
          // Estimar el tamaño del campo
          totalSize += valor.length * 2; // UTF-16 ocupa 2 bytes por carácter
        } else if (Array.isArray(valor)) {
          valor = valor.filter(Boolean); // Eliminar valores nulos/undefined
          totalSize += JSON.stringify(valor).length;
        } else if (typeof valor === 'object') {
          valor = JSON.parse(JSON.stringify(valor)); // Deep clone
          totalSize += JSON.stringify(valor).length;
        }
        
        // Verificar tamaño total
        if (totalSize > MAX_DATA_SIZE) {
          logger.warn(`Tamaño de datos excedido (${totalSize} bytes), truncando...`);
          break;
        }
        
        datosLimpios[campo] = valor;
      }
    }
    
    // Establecer valores por defecto
    if (!datosLimpios.estado) datosLimpios.estado = 'pendiente';
    if (!datosLimpios.titulo) datosLimpios.titulo = `Pedido ${datosLimpios.numero || 'Nuevo'}`;

    // Configurar timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 segundos máximo
    
    try {
      if (process.env.NODE_ENV === 'development') {
        logger.debug(`Enviando tarea #${taskNumber} a la API...`);
      }
      
      const response = await http.post(createTaskUrl, datosLimpios, {
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
          'X-Request-ID': `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
        },
        maxBodyLength: MAX_DATA_SIZE,
        maxContentLength: MAX_DATA_SIZE
      });
      
      clearTimeout(timeoutId);
      
      if (process.env.NODE_ENV === 'development') {
        const elapsed = (performance.now() - startTime).toFixed(2);
        logger.debug(`Tarea #${taskNumber} procesada en ${elapsed}ms`);
      }
      
      return true;
      
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
    
  } catch (error) {
    const errorDetails = error.response 
      ? `Error ${error.response.status}: ${JSON.stringify(error.response.data)}`
      : error.request
        ? 'No se recibió respuesta del servidor'
        : error.message;
    
    logger.error(`Error al enviar tarea #${taskNumber} a la API: ${errorDetails}`);
    
    // Intentar limpiar memoria en caso de error
    if (typeof global.gc === 'function') {
      global.gc();
    }
    
    return false;
  }
}

// Configurar manejo de memoria
setInterval(() => {
  const used = process.memoryUsage();
  logger.debug('Uso de memoria:', {
    rss: `${Math.round(used.rss / 1024 / 1024)} MB`,
    heapTotal: `${Math.round(used.heapTotal / 1024 / 1024)} MB`,
    heapUsed: `${Math.round(used.heapUsed / 1024 / 1024)} MB`,
    external: `${Math.round(used.external / 1024 / 1024)} MB`
  });
  
  // Forzar recolección de basura periódicamente
  cleanupMemory();
}, 300000); // Cada 5 minutos

// Manejo de errores no capturados
process.on('uncaughtException', (error) => {
  logger.error('Error no capturado:', error);
  // No salir del proceso para evitar reinicios en producción
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Promesa rechazada no manejada:', reason);
});

// Inicializar el cliente
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

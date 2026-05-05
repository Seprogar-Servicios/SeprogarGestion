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
logger.info(`Cantidad de grupos configurados: ${GRUPOS_PERMITIDOS.length}`);

// Cache para grupos permitidos (optimización de rendimiento)
const allowedGroupsCache = new Set(
  GRUPOS_PERMITIDOS.map(g => g.trim().toLowerCase())
);

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
    headless: process.env.NODE_ENV === 'production' ? 'new' : false, // headless en producción
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--disable-gpu',
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows',
        '--disable-renderer-backgrounding',
        '--disable-features=TranslateUI,BlinkGenPropertyTrees',
        ...chromium.args
      ],
      executablePath,
      defaultViewport: chromium.defaultViewport,
      ignoreHTTPSErrors: true,
      ignoreDefaultArgs: ['--disable-extensions'],
      protocolTimeout: 300000, // 5 minutos para llamadas al protocolo
      slowMo: process.env.NODE_ENV === 'production' ? 0 : 100 // Sin retraso en producción
    };

    logger.info('Configurando cliente de WhatsApp...');
    
    client = new Client({
      authStrategy: new LocalAuth({
        dataPath: AUTH_FOLDER,
        clientId: 'futurgas-worker',
      }),
      puppeteer: puppeteerOptions,
      qrTimeout: 0,
      authTimeout: 0,
      takeoverOnConflict: true,
      takeoverTimeoutMs: 120000, // 2 minutos
      restartOnAuthFail: true,
      disableWelcome: true,
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Safari/537.36',
      // Timeouts adicionales para operaciones lentas
      requestTimeout: 120000, // 2 minutos para requests
      puppeteerOptions: {
        ...puppeteerOptions,
        timeout: 300000, // 5 minutos para operaciones generales
        protocolTimeout: 300000 // 5 minutos para protocol timeout
      }
    });

    logger.info('Configurando manejadores de eventos...');
    setupEventHandlers();
    
    logger.info('Inicializando cliente...');
    
    // Agregar timeout global para inicialización
    const initPromise = client.initialize();
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Inicialización timeout después de 10 minutos')), 600000);
    });
    
    try {
      await Promise.race([initPromise, timeoutPromise]);
      logger.info('✅ Cliente inicializado exitosamente');
    } catch (initError) {
      logger.error('❌ Error en inicialización:', initError.message);
      throw initError;
    }
    
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
  });

  // Función para limpieza de memoria
  const cleanupMemory = () => {
    try {
      if (global.gc) {
        global.gc();
        logger.debug('Recolección de basura forzada');
      }
      // Limpiar caché de módulos si es necesario
      // Object.keys(require.cache).forEach(key => {
      //   if (!key.includes('node_modules') && !key.includes('whatsapp-web.js')) {
      //     delete require.cache[key];
      //   }
      // });
    } catch (error) {
      logger.warn('Error durante limpieza de memoria:', error.message);
    }
  };

  // Evento de cliente listo
  client.on('ready', async () => {
    logger.info('🚀 Cliente listo y conectado a WhatsApp');
    
    // Esperar un momento para asegurar que el cliente esté completamente listo
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Función para verificar si el cliente está listo
    const isClientReady = () => {
      try {
        // Verificar si el cliente y la página de Puppeteer están disponibles
        return client && 
               client.pupPage && 
               typeof client.pupPage === 'object' && 
               typeof client.pupPage.isClosed === 'function' &&
               !client.pupPage.isClosed();
      } catch (error) {
        logger.warn('Error en isClientReady:', error.message);
        return false;
      } finally {
        // Forzar limpieza de memoria en cada verificación
        cleanupMemory();
      }
    };

    // Función para cargar chats con manejo de memoria optimizado
    const loadChatsWithRetry = async (maxRetries = 3, delay = 2000) => {
      let lastError;
      
      // Limpiar memoria antes de comenzar
      cleanupMemory();
      
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        let chats = [];
        let groupChats = [];
        
        try {
          logger.info(`🔍 Intentando cargar chats (intento ${attempt}/${maxRetries})...`);
          
          // Verificar si el cliente está listo
          if (!isClientReady()) {
            throw new Error('El cliente de WhatsApp no está completamente inicializado');
          }
          
          // Cargar solo los chats necesarios
          chats = await client.getChats();
          
          // Filtrar solo grupos de manera eficiente
          groupChats = [];
          for (const chat of chats) {
            if (chat.isGroup) {
              groupChats.push({
                name: chat.name,
                id: chat.id._serialized
              });
              
              // Liberar memoria del objeto chat
              chat.delete = null;
            }
          }
          
          logger.info(`📂 Chats cargados: ${chats.length} (${groupChats.length} grupos)`);
          
          // Verificar grupos permitidos de manera eficiente
          const allowedGroups = [];
          const groupNames = new Set(GRUPOS_PERMITIDOS.map(g => g.trim().toLowerCase()));
          
          logger.info(`[DEBUG] Nombres de grupos permitidos configurados:`, Array.from(groupNames));
          
          for (const chat of groupChats) {
            const chatName = chat.name?.trim() || '';
            const isAllowed = chatName && groupNames.has(chatName.toLowerCase());
            
            logger.info(`[DEBUG] Evaluando chat: "${chatName}" - ¿Permitido? ${isAllowed}`);
            
            if (isAllowed) {
              allowedGroups.push(chat);
            }
          }
          
          // Limpiar memoria intermedia
          chats = null;
          
          // Mostrar resultados
          if (allowedGroups.length > 0) {
            logger.info('✅ Grupos permitidos encontrados:');
            for (const group of allowedGroups) {
              logger.info(`   - ${group.name} (${group.id})`);
            }
            
            // Limpiar memoria después de procesar
            allowedGroups.length = 0;
          } else {
            logger.warn('⚠️  No se encontraron los grupos permitidos. Verifica los nombres en GRUPOS_PERMITIDOS');
            logger.info('Grupos configurados:', GRUPOS_PERMITIDOS.join(', '));
            
            // Mostrar primeros 5 grupos disponibles para depuración
            if (groupChats.length > 0) {
              logger.info('📋 Grupos disponibles (mostrando 5 de ' + groupChats.length + '):');
              for (let i = 0; i < Math.min(5, groupChats.length); i++) {
                logger.info(`   ${i + 1}. ${groupChats[i].name}`);
              }
            }
          }
          
          // Limpiar memoria antes de salir
          cleanupMemory();
          return; // Éxito, salir de la función
          
        } catch (error) {
          lastError = error;
          const errorMessage = error.message || 'Error desconocido';
          const stackTrace = error.stack ? `\n${error.stack}` : '';
          
          logger.warn(`⚠️  Intento ${attempt} fallido: ${errorMessage}${stackTrace}`);
          
          if (attempt < maxRetries) {
            const retryDelay = Math.min(delay * attempt, 10000); // Backoff exponencial con máximo 10s
            logger.info(`⏳ Reintentando en ${retryDelay/1000} segundos...`);
            
            // Limpiar memoria antes de reintentar
            cleanupMemory();
            await new Promise(resolve => setTimeout(resolve, retryDelay));
          }
        } finally {
          // Limpiar referencias para liberar memoria
          if (chats && chats.length > 0) {
            chats.length = 0;
          }
          if (groupChats && groupChats.length > 0) {
            groupChats.length = 0;
          }
          
          // Forzar recolección de basura si está disponible
          if (global.gc) {
            global.gc();
          }
        }
      }
      
      // Si llegamos aquí, todos los intentos fallaron
      logger.error('❌ No se pudieron cargar los chats después de varios intentos');
      
      // Mostrar información detallada del error
      if (lastError) {
        logger.error('Detalles del error:', {
          message: lastError.message || 'Sin mensaje de error',
          stack: lastError.stack || 'Sin stack trace',
          code: lastError.code || 'Código no disponible'
        });
      }
      
      // Mostrar información de diagnóstico
      try {
        logger.info('\n🔍 INFORMACIÓN DE DIAGNÓSTICO');
        logger.info('='.repeat(60));
        
        // Mostrar grupos permitidos configurados
        logger.info('\n📋 GRUPOS PERMITIDOS CONFIGURADOS:');
        logger.info('='.repeat(30));
        if (GRUPOS_PERMITIDOS && GRUPOS_PERMITIDOS.length > 0) {
          GRUPOS_PERMITIDOS.forEach((g, i) => {
            logger.info(` ${i + 1}. ${g}`);
          });
        } else {
          logger.warn('No hay grupos permitidos configurados (GRUPOS_PERMITIDOS está vacío)');
        }
        
        // Mostrar información del cliente
        logger.info('\n📱 ESTADO DEL CLIENTE:');
        logger.info('='.repeat(30));
        logger.info(`Conectado: ${client ? 'Sí' : 'No'}`);
        if (client) {
          logger.info(`Página de Puppeteer: ${client.pupPage ? 'Disponible' : 'No disponible'}`);
          if (client.pupPage) {
            logger.info(`Página cerrada: ${client.pupPage.isClosed() ? 'Sí' : 'No'}`);
          }
        }
        
        logger.info('='.repeat(60));
      } catch (diagError) {
        logger.error('Error al generar diagnóstico:', diagError);
      }
      
      // Limpiar memoria antes de salir
      cleanupMemory();
    };
    
    // Iniciar la carga de chats
    loadChatsWithRetry().catch(error => {
      logger.error('Error en la carga de chats:', error);
    });
    
    logger.info('\n👂 ESCUCHANDO MENSAJES...\n');
  });

  // Usar solo message_create que se dispara para todos los mensajes
 // Cambiamos 'message' por 'message_create' para mayor fiabilidad
  client.on('message_create', async (message) => {
    // DEBUG: Ver si llegan mensajes
    console.log(`[DEBUG] Mensaje recibido de: ${message.from} - Body: ${message.body?.substring(0, 100)}...`);
    console.log(`[DEBUG] ¿Mensaje reenviado? ${message.forwardingScore > 0}`);
    console.log(`[DEBUG] fromMe: ${message.fromMe}`);
    console.log(`[DEBUG] Mensaje completo:`, message.body);
    console.log(`[DEBUG] Tipo de mensaje:`, message.type);
    console.log(`[DEBUG] ¿Tiene media?`, message.hasMedia);
    console.log(`[DEBUG] Atributos del mensaje:`, Object.keys(message));
    
    // Intentar obtener el contenido de diferentes formas
    if (!message.body || message.body.trim() === '') {
      console.log(`[DEBUG] Mensaje vacío, intentando obtener contenido...`);
      
      // 1. Intentar obtener quoted message (respuesta a otro mensaje)
      const quotedMsg = await message.getQuotedMessage().catch(() => null);
      if (quotedMsg && quotedMsg.body) {
        console.log(`[DEBUG] Quoted message body:`, quotedMsg.body);
        message.body = quotedMsg.body;
      } else {
        // 2. Para mensajes reenviados, intentar obtener el mensaje original
        console.log(`[DEBUG] Intentando obtener mensaje reenviado...`);
        try {
          // Obtener el mensaje del chat por ID si es reenviado
          if (message.forwardingScore > 0) {
            console.log(`[DEBUG] Mensaje reenviado detectado, score: ${message.forwardingScore}`);
            
            // Intentar obtener el contenido del mensaje citado
            const quotedMsg = await message.getQuotedMessage().catch(() => null);
            if (quotedMsg && quotedMsg.body) {
              console.log(`[DEBUG] Contenido del mensaje reenviado:`, quotedMsg.body);
              message.body = quotedMsg.body;
            } else {
              console.log(`[DEBUG] No se pudo obtener contenido del mensaje reenviado`);
            }
          }
        } catch (error) {
          console.log(`[DEBUG] Error al obtener mensaje reenviado:`, error.message);
        }
      }
    }
    
    // 1. Ignorar mensajes propios para evitar bucles infinitos
    // PERO permitir mensajes reenviados que puedan tener contenido útil
    if (message.fromMe && !message.forwardingScore) {
      console.log(`[DEBUG] Mensaje ignorado - es del bot y no es reenviado (fromMe: true, forwardingScore: 0)`);
      return;
    }
    
    if (message.fromMe && message.forwardingScore > 0) {
      console.log(`[DEBUG] Mensaje propio pero reenviado, permitiendo procesamiento (fromMe: true, forwardingScore: ${message.forwardingScore})`);
    }

    // 2. Obtener el chat de forma asíncrona ANTES de procesar
    try {
      console.log(`[DEBUG] Intentando obtener chat para mensaje de: ${message.from}`);
      const chat = await message.getChat();
      console.log(`[DEBUG] Chat obtenido - ID: ${chat.id._serialized} - Nombre: "${chat.name}" - Es grupo: ${chat.isGroup}`);
      
      // 3. Verificación de seguridad: ¿Es un grupo permitido?
      const groupName = chat.name?.trim() || '';
      console.log(`[DEBUG] Grupo detectado: "${groupName}"`);
      console.log(`[DEBUG] ¿Es grupo? ${chat.isGroup}`);
      
      // Si no es grupo, ignorar
      if (!chat.isGroup) {
        console.log(`[DEBUG] Mensaje ignorado - no es de grupo (es de ${message.from})`);
        return;
      }
      
      const isAllowed = allowedGroupsCache.has(groupName.toLowerCase());
      console.log(`[DEBUG] ¿Grupo permitido? ${isAllowed}`);
      console.log(`[DEBUG] Cache contiene:`, Array.from(allowedGroupsCache));
      console.log(`[DEBUG] Nombre del grupo normalizado: "${groupName.toLowerCase()}"`);

      if (!isAllowed) {
        console.log(`[DEBUG] Mensaje ignorado - grupo no permitido`);
        return;
      }

      // Log visual para confirmar que el bot "vio" el mensaje
      logger.info(`📩 Mensaje detectado en grupo permitido: [${groupName}]`);

      // 4. Procesar usando la cola (Queue)
      if (queue) {
        queue.add(() => processMessage(message)).catch(err => logger.error('Error en cola:', err));
      } else {
        processMessage(message);
      }
    } catch (error) {
      logger.error('Error al interceptar mensaje:', error);
    }
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
    return; // No registrar mensajes inválidos
  }

  try {
    // Obtener información del chat de manera eficiente
    let chat = await message.getChat().catch(() => null);
    if (!chat?.isGroup) {
      return; // Ignorar mensajes que no son de grupo
    }

    // Verificar rápidamente si el grupo está permitido
    const groupName = chat.name?.trim() || '';
    const isGroupAllowed = GRUPOS_PERMITIDOS.some(
      g => g.trim().toLowerCase() === groupName.toLowerCase()
    );

    // Si el grupo no está permitido, salir sin hacer nada
    if (!isGroupAllowed) {
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
    
    // Obtener información del chat (solo si es necesario)
    let chat = null;
    try {
      chat = await message.getChat();
      if (!chat?.isGroup) {
        logger.debug(`Mensaje ${messageId} no es de un grupo, ignorando...`);
        return;
      }
    } catch (error) {
      logger.error(`Error al obtener chat para mensaje ${messageId}:`, error.message);
      return;
    }

    // Verificación rápida de grupo permitido (sin procesamiento innecesario)
    const groupName = chat.name?.trim() || '';
    if (!groupName || !allowedGroupsCache.has(groupName.toLowerCase())) {
      logger.debug(`Mensaje de grupo no permitido: ${groupName}`);
      return;
    }

    // Limpiar y normalizar el contenido del mensaje (versión más eficiente)
    const cleanContent = messageBody
      .replace(/^"|"$/g, '') // Eliminar comillas al inicio y final
      .replace(/\*/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    
    // Debug para ver qué contenido llega
    logger.info(`[DEBUG] cleanContent: "${cleanContent}"`);
    
    // Verificación más eficiente del tipo de mensaje
    const firstWord = cleanContent.trim().split(/\s+/)[0] || '';
    const lowerContent = cleanContent.toLowerCase();
    
    logger.info(`[DEBUG] firstWord: "${firstWord}"`);
    logger.info(`[DEBUG] cleanContent.includes('TURNO'): ${cleanContent.includes('TURNO')}`);
    logger.info(`[DEBUG] messageBody original: "${messageBody.substring(0, 100)}..."`);
    
    let taskData = null;
    let messageType = 'desconocido';
    let parser = null;
    
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

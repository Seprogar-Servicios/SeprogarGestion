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

  // Configuración de limpieza de memoria
  const MEMORY_CLEANUP_CONFIG = {
    enabled: !!global.gc,
    interval: 5 * 60 * 1000, // 5 minutos
    lastCleanup: 0,
    minTimeBetweenCleanups: 60000, // 1 minuto
    maxModulesToClear: 20, // Límite de módulos a limpiar por ciclo
    cleanupCount: 0
  };

  // Función optimizada para limpieza de memoria
  const cleanupMemory = (force = false) => {
    if (!MEMORY_CLEANUP_CONFIG.enabled && !force) return;
    
    const now = Date.now();
    const timeSinceLastCleanup = now - MEMORY_CLEANUP_CONFIG.lastCleanup;
    
    // No limpiar muy frecuentemente a menos que sea forzado
    if (!force && timeSinceLastCleanup < MEMORY_CLEANUP_CONFIG.minTimeBetweenCleanups) {
      return;
    }
    
    try {
      const startTime = process.hrtime.bigint();
      
      // 1. Recolectar basura si está disponible
      if (global.gc) {
        global.gc();
        logger.debug('Recolección de basura forzada');
      }
      
      // 2. Limpiar caché de módulos de manera selectiva
      const moduleKeys = Object.keys(require.cache);
      let clearedModules = 0;
      
      for (const key of moduleKeys) {
        if (clearedModules >= MEMORY_CLEANUP_CONFIG.maxModulesToClear) break;
        
        // Solo limpiar módulos de la aplicación, no dependencias
        if (!key.includes('node_modules') && 
            !key.includes('whatsapp-web.js') &&
            !key.includes('puppeteer')) {
          delete require.cache[key];
          clearedModules++;
        }
      }
      
      // 3. Limpiar buffers grandes si existen
      if (global.gc && typeof Buffer !== 'undefined') {
        // Forzar limpieza de buffers grandes
        Buffer.alloc(1); // Asignación pequeña para forzar limpieza
      }
      
      MEMORY_CLEANUP_CONFIG.lastCleanup = now;
      MEMORY_CLEANUP_CONFIG.cleanupCount++;
      
      const endTime = process.hrtime.bigint();
      const durationMs = Number(endTime - startTime) / 1e6;
      
      logger.debug(`Limpieza de memoria completada en ${durationMs.toFixed(2)}ms. Módulos limpiados: ${clearedModules}/${moduleKeys.length}`);
      
    } catch (error) {
      logger.warn('Error durante limpieza de memoria:', error.message);
      // Deshabilitar limpieza si falla varias veces seguidas
      if (error.message.includes('out of memory') || MEMORY_CLEANUP_CONFIG.cleanupCount > 10) {
        MEMORY_CLEANUP_CONFIG.enabled = false;
        logger.error('Limpieza de memoria deshabilitada debido a errores frecuentes');
      }
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

    // Configuración de caché para grupos
    const GROUP_CACHE = {
      lastUpdate: 0,
      cacheDuration: 5 * 60 * 1000, // 5 minutos de caché
      groups: null,
      allowedGroups: null
    };
    
    // Función para cargar y cachear grupos permitidos
    const loadAllowedGroups = async () => {
      const now = Date.now();
      
      // Usar caché si está fresco
      if (GROUP_CACHE.allowedGroups && 
          now - GROUP_CACHE.lastUpdate < GROUP_CACHE.cacheDuration) {
        return GROUP_CACHE.allowedGroups;
      }
      
      // Limpiar caché anterior
      GROUP_CACHE.groups = null;
      GROUP_CACHE.allowedGroups = null;
      
      // Cargar chats
      const chats = await client.getChats();
      const groupNames = new Set(GRUPOS_PERMITIDOS.map(g => g.trim().toLowerCase()));
      
      const groups = [];
      const allowed = [];
      
      // Procesar en lotes para evitar picos de memoria
      const BATCH_SIZE = 20;
      for (let i = 0; i < chats.length; i += BATCH_SIZE) {
        const batch = chats.slice(i, i + BATCH_SIZE);
        
        for (const chat of batch) {
          if (chat.isGroup) {
            const groupInfo = {
              name: chat.name,
              id: chat.id._serialized
            };
            
            groups.push(groupInfo);
            
            // Verificar si es un grupo permitido
            if (groupInfo.name && groupNames.has(groupInfo.name.trim().toLowerCase())) {
              allowed.push(groupInfo);
            }
            
            // Liberar memoria
            chat.delete = null;
          }
        }
        
        // Forzar recolección de basura cada lote
        if (i % (BATCH_SIZE * 5) === 0) {
          cleanupMemory();
        }
      }
      
      // Actualizar caché
      GROUP_CACHE.groups = groups;
      GROUP_CACHE.allowedGroups = allowed;
      GROUP_CACHE.lastUpdate = now;
      
      return allowed;
    };
    
    // Función optimizada para cargar chats
    const loadChatsWithRetry = async (maxRetries = 3, initialDelay = 1000) => {
      let lastError;
      let delay = initialDelay;
      
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          logger.info(`🔍 Intentando cargar chats (intento ${attempt}/${maxRetries})...`);
          
          if (!isClientReady()) {
            throw new Error('El cliente de WhatsApp no está completamente inicializado');
          }
          
          // Cargar solo grupos permitidos
          const allowedGroups = await loadAllowedGroups();
          
          logger.info(`📂 Grupos permitidos cargados: ${allowedGroups.length}`);
          
          // Mostrar resultados
          if (allowedGroups.length > 0) {
            logger.info('✅ Grupos permitidos encontrados:');
            for (const group of allowedGroups) {
              logger.info(`   - ${group.name} (${group.id})`);
            }
          } else {
            logger.warn('⚠️  No se encontraron los grupos permitidos. Verifica los nombres en GRUPOS_PERMITIDOS');
            logger.info('Grupos configurados:', GRUPOS_PERMITIDOS.join(', '));
            
            // Mostrar primeros 5 grupos disponibles para depuración
            if (GROUP_CACHE.groups && GROUP_CACHE.groups.length > 0) {
              logger.info('📋 Grupos disponibles (mostrando 5 de ' + GROUP_CACHE.groups.length + '):');
              for (let i = 0; i < Math.min(5, GROUP_CACHE.groups.length); i++) {
                logger.info(`   ${i + 1}. ${GROUP_CACHE.groups[i].name}`);
              }
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
    // Verificar si el mensaje es válido
    if (!message) {
      logger.warn('Mensaje nulo recibido en logIncomingMessage');
      return;
    }

    // Obtener información del chat
    const chat = await message.getChat();
    if (!chat) {
      logger.warn('No se pudo obtener el chat del mensaje');
      return;
    }

    // Solo procesar mensajes de grupo
    if (!chat.isGroup) {
      logger.debug(`Mensaje de chat privado de ${message.from} ignorado`);
      return;
    }

    // Obtener información del contacto
    let contactInfo = 'Desconocido';
    try {
      const contact = await message.getContact();
      contactInfo = contact?.pushname || contact?.name || contact?.number || 'Desconocido';
    } catch (contactError) {
      logger.warn('Error al obtener información del contacto:', contactError);
    }

    // Mostrar información del mensaje
    const timestamp = new Date().toLocaleString('es-AR', {
      timeZone: 'America/Argentina/Buenos_Aires',
      hour12: false
    });

    logger.info('\n' + '='.repeat(80));
    logger.info(`📩 MENSAJE RECIBIDO - ${timestamp}`);
    logger.info('='.repeat(80));
    logger.info(`👥 GRUPO: ${chat.name} (${chat.id._serialized})`);
    logger.info(`👤 REMITENTE: ${contactInfo} (${message.from})`);
    logger.info(`📌 TIPO: ${message.type}`);
    logger.info('💬 CONTENIDO:');
    logger.info(message.body || '<SIN TEXTO>');
    logger.info('='.repeat(80) + '\n');
    
    // Registrar metadatos adicionales en modo debug
    logger.debug('Metadatos del mensaje:', {
      messageId: message.id.id,
      timestamp: message.timestamp,
      hasMedia: message.hasMedia,
      hasQuotedMsg: !!message.hasQuotedMsg,
      isForwarded: message.isForwarded,
      isStatus: message.isStatus,
      fromMe: message.fromMe,
      ack: message.ack
    });
    
  } catch (error) {
    logger.error('Error en logIncomingMessage:', {
      error: error.message,
      stack: error.stack,
      messageId: message?.id?.id || 'desconocido'
    });
  }
}

// Configuración de procesamiento de mensajes
const MESSAGE_PROCESSING = {
  inProgress: new Set(),
  MAX_CONCURRENT: 5,
  QUEUE: [],
  PROCESSING: false
};

// Función para procesar la cola de mensajes
async function processMessageQueue() {
  if (MESSAGE_PROCESSING.PROCESSING || MESSAGE_PROCESSING.QUEUE.length === 0) return;
  
  MESSAGE_PROCESSING.PROCESSING = true;
  
  try {
    while (MESSAGE_PROCESSING.QUEUE.length > 0 && 
           MESSAGE_PROCESSING.inProgress.size < MESSAGE_PROCESSING.MAX_CONCURRENT) {
      
      const { message, resolve, reject } = MESSAGE_PROCESSING.QUEUE.shift();
      const messageId = message?.id?.id || 'unknown';
      
      // Evitar procesar el mismo mensaje dos veces
      if (MESSAGE_PROCESSING.inProgress.has(messageId)) {
        logger.debug(`Mensaje ${messageId} ya en proceso, omitiendo...`);
        resolve();
        continue;
      }
      
      MESSAGE_PROCESSING.inProgress.add(messageId);
      
      // Procesar el mensaje en segundo plano
      _processSingleMessage(message)
        .then(result => {
          resolve(result);
        })
        .catch(error => {
          logger.error(`Error procesando mensaje ${messageId}:`, error);
          reject(error);
        })
        .finally(() => {
          MESSAGE_PROCESSING.inProgress.delete(messageId);
          
          // Forzar limpieza de memoria cada cierta cantidad de mensajes
          if (MESSAGE_PROCESSING.inProgress.size === 0) {
            cleanupMemory();
          }
          
          // Procesar siguiente mensaje en la cola
          setImmediate(processMessageQueue);
        });
    }
  } finally {
    MESSAGE_PROCESSING.PROCESSING = false;
  }
}

// Función para manejar un solo mensaje
async function _processSingleMessage(message) {
  if (!message) {
    logger.warn('Mensaje nulo recibido en _processSingleMessage');
    return;
  }

  const startTime = Date.now();
  const messageId = message.id?.id || 'unknown';
  
  try {
    logger.debug(`[${messageId}] Iniciando procesamiento...`);
    
    // Obtener información del chat
    const chat = await message.getChat().catch(err => {
      logger.error(`[${messageId}] Error al obtener chat:`, err);
      return null;
    });

    if (!chat) {
      logger.warn(`[${messageId}] No se pudo obtener el chat del mensaje`);
      return;
    }

    // Solo procesar mensajes de grupo
    if (!chat.isGroup) {
      logger.debug(`[${messageId}] Mensaje de chat privado de ${message.from} ignorado`);
      return;
    }

    if (!chat) {
      logger.warn('No se pudo obtener el chat del mensaje');
      return;
    }

    // Solo procesar mensajes de grupo
    if (!chat.isGroup) {
      logger.debug(`Mensaje de chat privado de ${message.from} ignorado`);
      return;
    }

    const groupName = chat.name?.trim() || '';
    
    // Verificar si el grupo está en la lista de permitidos de manera eficiente
    const isAllowedGroup = GRUPOS_PERMITIDOS.some(g => g.trim() === groupName);
    if (!isAllowedGroup) {
      logger.debug(`[${messageId}] Mensaje de grupo no permitido: ${groupName}`);
      return;
    }

    const logHeader = `[${messageId}]`;
    logger.info(`\n${logHeader} 🔄 PROCESANDO NUEVO MENSAJE`);
    logger.info(`${logHeader} GRUPO: ${groupName}`);
    
    // Verificar si el mensaje tiene contenido
    const messageBody = message.body?.trim() || '';
    if (!messageBody) {
      logger.info(`${logHeader} Mensaje vacío, ignorando...`);
      return;
    }

    // Limpiar y normalizar el contenido del mensaje de manera eficiente
    const cleanContent = messageBody.replace(/\s+/g, ' ').replace(/\*/g, '');
    
    // Determinar el parser a usar basado en el contenido
    let parser;
    let messageType;
    
    if (cleanContent.startsWith('Pedido') || cleanContent.includes('TURNO')) {
      messageType = 'pedido';
      parser = parsePedidoMessage;
    } else if (cleanContent.startsWith('TAREA:')) {
      messageType = 'tarea';
      parser = parseTareaMessage;
    } else if (cleanContent.startsWith('Expediente:')) {
      messageType = 'expediente';
      parser = parseExpedienteMessage;
    } else {
      logger.debug(`${logHeader} Formato de mensaje no reconocido`);
      return;
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
    logger.info(`${logHeader} 📋 Tipo de mensaje detectado: ${messageType}`);
    
    try {
      // Procesar el mensaje en un bloque try-catch separado para manejar errores específicos
      taskData = parser(cleanContent);
      
      // Verificar si se pudo extraer información
      if (!taskData || !taskData.numero) {
        throw new Error('No se pudo extraer información válida del mensaje');
      }
      
      // Agregar metadatos adicionales de manera eficiente
      const taskToSave = {
        ...taskData,
        grupoOrigen: groupName,
        mensajeOriginal: cleanContent,
        fechaRecepcion: new Date().toISOString(),
        origen: 'whatsapp',
        // Asegurarse de que los campos requeridos tengan valores por defecto
        estado: taskData.estado || 'pendiente',
        prioridad: taskData.prioridad || 'media'
      };
      
      // Limpiar campos vacíos o nulos
      Object.keys(taskToSave).forEach(key => {
        if (taskToSave[key] === undefined || taskToSave[key] === '') {
          delete taskToSave[key];
        }
      });
      
      logger.info(`${logHeader} ✅ Datos extraídos correctamente para tarea #${taskToSave.numero}`);
      
      // Verificar si la tarea ya existe con manejo de memoria optimizado
      const isDuplicate = await checkDuplicateTask(taskToSave.numero);
      if (isDuplicate) {
        logger.warn(`${logHeader} ⚠️  Tarea #${taskToSave.numero} ya existe, ignorando...`);
        return;
      }
      
      // Enviar a la API con manejo de memoria
      logger.info(`${logHeader} 📤 Enviando tarea #${taskToSave.numero} a la API...`);
      const success = await sendToAPI(taskToSave);
      
      if (success) {
        logger.info(`${logHeader} ✅ Tarea #${taskToSave.numero} creada exitosamente`);
      } else {
        logger.error(`${logHeader} ❌ Error al crear la tarea #${taskToSave.numero} en la API`);
      }
      
    } catch (parseError) {
      logger.error(`${logHeader} ❌ Error al procesar el mensaje:`, {
        error: parseError.message,
        stack: parseError.stack,
        messageType,
        cleanContent: cleanContent.substring(0, 100) + (cleanContent.length > 100 ? '...' : '')
      });
    }

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

// === Configuración de API ===
const API_CONFIG = {
  baseUrl: process.env.API_BASE_URL || 'http://localhost:3000',
  endpoints: {
    checkDuplicate: '/api/worker/tareas/check',
    createTask: '/api/worker/tareas'
  },
  timeout: 10000, // 10 segundos
  maxRetries: 3,
  retryDelay: 1000,
  rateLimit: 5, // Máximo de solicitudes por segundo
  rateWindow: 1000, // Ventana de tiempo en ms
  lastRequestTime: 0,
  requestQueue: [],
  processingQueue: false
};

// Cola de solicitudes con manejo de tasa de envío
async function processRequestQueue() {
  if (API_CONFIG.processingQueue || API_CONFIG.requestQueue.length === 0) return;
  
  API_CONFIG.processingQueue = true;
  
  try {
    while (API_CONFIG.requestQueue.length > 0) {
      const now = Date.now();
      const timeSinceLastRequest = now - API_CONFIG.lastRequestTime;
      
      // Respetar el límite de tasa de envío
      if (timeSinceLastRequest < API_CONFIG.rateWindow / API_CONFIG.rateLimit) {
        const delay = (API_CONFIG.rateWindow / API_CONFIG.rateLimit) - timeSinceLastRequest;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
      
      const { request, resolve, reject } = API_CONFIG.requestQueue.shift();
      API_CONFIG.lastRequestTime = Date.now();
      
      try {
        const result = await request();
        resolve(result);
      } catch (error) {
        reject(error);
      }
    }
  } finally {
    API_CONFIG.processingQueue = false;
  }
}

// Función para encolar solicitudes
function enqueueRequest(request) {
  return new Promise((resolve, reject) => {
    API_CONFIG.requestQueue.push({ request, resolve, reject });
    setImmediate(processRequestQueue);
  });
}

// Verificar duplicados con manejo de reintentos
async function checkDuplicateTask(taskNumber) {
  const apiKey = process.env.API_KEY || '';
  const url = `${API_CONFIG.baseUrl}${API_CONFIG.endpoints.checkDuplicate}/${taskNumber}`;
  
  const request = async (retryCount = 0) => {
    try {
      const response = await axios.get(url, {
        headers: { 'Authorization': `Bearer ${apiKey}` },
        timeout: API_CONFIG.timeout,
        // Reducir el tamaño de la respuesta
        maxContentLength: 1000,
        maxBodyLength: 1000
      });
      
      return response.data?.exists || false;
      
    } catch (error) {
      if (retryCount < API_CONFIG.maxRetries) {
        const delay = API_CONFIG.retryDelay * Math.pow(2, retryCount);
        logger.warn(`Reintentando verificación de duplicado (${retryCount + 1}/${API_CONFIG.maxRetries})...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        return request(retryCount + 1);
      }
      
      logger.warn(`No se pudo verificar duplicado para ${taskNumber}, asumiendo existente. Error: ${error.message}`);
      return true; // En caso de error, asumir que existe para evitar duplicados
    }
  };
  
  return enqueueRequest(request);
}

// Enviar tarea a la API con manejo de memoria optimizado
async function sendToAPI(taskData) {
  const apiKey = process.env.API_KEY || '';
  const url = `${API_CONFIG.baseUrl}${API_CONFIG.endpoints.createTask}`;
  
  // Definir solo los campos permitidos para reducir el tamaño de la solicitud
  const ALLOWED_FIELDS = new Set([
    'numero', 'titulo', 'descripcion', 'estado', 'tecnicos',
    'fechaEjecucion', 'franja_horaria', 'cliente', 'numeroTitular', 
    'direccion', 'grupoOrigen', 'origen', 'prioridad'
  ]);
  
  const request = async (retryCount = 0) => {
    try {
      // Crear objeto con solo los campos permitidos
      const payload = {};
      for (const key in taskData) {
        if (ALLOWED_FIELDS.has(key) && taskData[key] !== undefined) {
          payload[key] = taskData[key];
        }
      }
      
      // Limitar el tamaño de los campos de texto
      if (payload.descripcion && payload.descripcion.length > 1000) {
        payload.descripcion = payload.descripcion.substring(0, 1000) + '...';
      }
      
      const response = await axios.post(url, payload, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
          'X-Requested-With': 'XMLHttpRequest'
        },
        timeout: API_CONFIG.timeout,
        maxContentLength: 10000,
        maxBodyLength: 5000,
        // Comprimir la solicitud si es posible
        decompress: true,
        // No lanzar error para códigos de estado HTTP 4xx/5xx
        validateStatus: () => true
      });
      
      // Manejar la respuesta
      if (response.status >= 200 && response.status < 300) {
        logger.info(`Tarea #${taskData.numero} creada con ID: ${response.data?._id || response.data?.id || 'desconocido'}`);
        return true;
      } else {
        throw new Error(`Error ${response.status}: ${JSON.stringify(response.data || 'Sin detalles')}`);
      }
      
    } catch (error) {
      if (retryCount < API_CONFIG.maxRetries) {
        const delay = API_CONFIG.retryDelay * Math.pow(2, retryCount);
        logger.warn(`Reintentando envío de tarea #${taskData.numero} (${retryCount + 1}/${API_CONFIG.maxRetries})...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        return request(retryCount + 1);
      }
      
      logger.error(`Error al enviar tarea #${taskData.numero} a la API:`, {
        error: error.message,
        stack: error.stack,
        taskData: {
          numero: taskData.numero,
          titulo: taskData.titulo,
          cliente: taskData.cliente
        }
      });
      
      return false;
    }
  };
  
  return enqueueRequest(request);
}

// === Monitoreo de memoria ===
function setupMemoryMonitoring() {
  // Monitorear uso de memoria cada minuto
  const memoryMonitor = setInterval(() => {
    const memoryUsage = process.memoryUsage();
    const formatMemory = (bytes) => `${Math.round(bytes / 1024 / 1024 * 100) / 100} MB`;
    
    logger.debug('Uso de memoria:', {
      rss: formatMemory(memoryUsage.rss), // Resident Set Size
      heapTotal: formatMemory(memoryUsage.heapTotal),
      heapUsed: formatMemory(memoryUsage.heapUsed),
      external: formatMemory(memoryUsage.external),
      arrayBuffers: formatMemory(memoryUsage.arrayBuffers)
    });
    
    // Limpiar caché periódicamente si el uso de memoria es alto
    if (memoryUsage.heapUsed > 200 * 1024 * 1024) { // 200MB
      logger.warn('Uso de memoria alto, forzando limpieza...');
      cleanupMemory(true);
    }
  }, 60000); // Cada minuto
  
  // Limpiar intervalo al cerrar
  process.on('exit', () => {
    clearInterval(memoryMonitor);
  });
  
  return memoryMonitor;
}

// Inicializar monitoreo de memoria
setupMemoryMonitoring();

// === Inicializar cliente ===
initializeClient().catch(error => {
  logger.error('Error al inicializar el cliente:', error);
  process.exit(1);
});

// === Cierre limpio ===
async function gracefulShutdown() {
  logger.info('\nIniciando apagado controlado...');
  
  try {
    // 1. Detener la recepción de nuevos mensajes
    if (client) {
      logger.info('Desconectando cliente de WhatsApp...');
      await client.destroy().catch(e => 
        logger.warn('Error al desconectar el cliente:', e.message)
      );
    }
    
    // 2. Esperar a que terminen las operaciones pendientes
    logger.info('Esperando a que terminen las operaciones pendientes...');
    let pendingOperations = 0;
    
    // Esperar hasta que no haya más operaciones pendientes o se agote el tiempo
    const maxWaitTime = 30000; // 30 segundos máximo
    const startTime = Date.now();
    
    while ((MESSAGE_PROCESSING.inProgress.size > 0 || 
            API_CONFIG.requestQueue.length > 0 || 
            MESSAGE_PROCESSING.QUEUE.length > 0) && 
           (Date.now() - startTime < maxWaitTime)) {
      
      pendingOperations = MESSAGE_PROCESSING.inProgress.size + 
                         API_CONFIG.requestQueue.length + 
                         MESSAGE_PROCESSING.QUEUE.length;
      
      if (pendingOperations > 0) {
        logger.info(`Esperando a que terminen ${pendingOperations} operaciones...`);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    // 3. Forzar limpieza de memoria
    cleanupMemory(true);
    
    // 4. Cerrar conexiones abiertas
    logger.info('Cerrando conexiones...');
    
  } catch (error) {
    logger.error('Error durante el cierre controlado:', error);
  } finally {
    logger.info('Apagado completado. ¡Hasta luego! 👋');
    process.exit(0);
  }
}

// Manejadores de señales para cierre controlado
['SIGINT', 'SIGTERM', 'SIGQUIT', 'SIGHUP'].forEach(signal => {
  process.on(signal, () => {
    logger.info(`\nRecibida señal ${signal}, cerrando...`);
    gracefulShutdown();
  });
});

// Manejar errores no capturados
process.on('uncaughtException', (error) => {
  logger.error('Error no capturado:', {
    error: error.message,
    stack: error.stack
  });
  
  // Intentar cerrar de forma controlada
  gracefulShutdown().then(() => process.exit(1));
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Promesa rechazada no manejada:', {
    reason: reason?.message || reason,
    stack: reason?.stack
  });
});

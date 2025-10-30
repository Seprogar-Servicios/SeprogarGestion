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

  // Función para limpieza de memoria
  const cleanupMemory = () => {
    try {
      if (global.gc) {
        global.gc();
        logger.debug('Recolección de basura forzada');
      }
      // Limpiar caché de módulos si es necesario
      Object.keys(require.cache).forEach(key => {
        if (!key.includes('node_modules') && !key.includes('whatsapp-web.js')) {
          delete require.cache[key];
        }
      });
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
          
          for (const chat of groupChats) {
            if (chat.name && groupNames.has(chat.name.trim().toLowerCase())) {
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
      logger.debug('Mensaje nulo recibido en logIncomingMessage');
      return;
    }

    // Obtener información del chat
    const chat = await message.getChat();
    if (!chat) {
      logger.debug('No se pudo obtener el chat del mensaje');
      return;
    }

    // Solo procesar mensajes de grupo
    if (!chat.isGroup) {
      logger.debug(`Mensaje de chat privado de ${message.from} ignorado`);
      return;
    }

    // Verificar si el grupo está en la lista de permitidos
    const groupName = chat.name.trim();
    if (!GRUPOS_PERMITIDOS.some(g => g.trim().toLowerCase() === groupName.toLowerCase())) {
      logger.debug(`Mensaje de grupo no permitido: ${groupName}, ignorando...`);
      return;
    }

    // Obtener información básica del contacto (sin bloquear el evento)
    const contactInfo = await Promise.resolve().then(async () => {
      try {
        const contact = await message.getContact();
        return contact?.pushname || contact?.name || contact?.number || 'Desconocido';
      } catch (error) {
        logger.debug('No se pudo obtener información del contacto:', error.message);
        return 'Desconocido';
      }
    }).catch(() => 'Desconocido');

    // Mostrar información del mensaje (solo para grupos permitidos)
    const timestamp = new Date().toLocaleString('es-AR', {
      timeZone: 'America/Argentina/Buenos_Aires',
      hour12: false
    });

    // Usar un solo objeto para el log
    const logData = {
      timestamp,
      group: chat.name,
      groupId: chat.id._serialized,
      sender: contactInfo,
      from: message.from,
      type: message.type,
      content: message.body?.substring(0, 500) || '<SIN TEXTO>',
      messageId: message.id.id,
      hasMedia: message.hasMedia,
      isForwarded: message.isForwarded,
      fromMe: message.fromMe
    };

    logger.info('\n' + '='.repeat(80));
    logger.info(`📩 MENSAJE RECIBIDO - ${logData.timestamp}`);
    logger.info('='.repeat(80));
    logger.info(`👥 GRUPO: ${logData.group} (${logData.groupId})`);
    logger.info(`👤 REMITENTE: ${logData.sender} (${logData.from})`);
    logger.info(`📌 TIPO: ${logData.type}`);
    logger.info('💬 CONTENIDO:');
    logger.info(logData.content);
    logger.info('='.repeat(80) + '\n');
    
    // Solo registrar metadatos adicionales si es necesario (en nivel debug)
    if (logger.level === 'debug') {
      logger.debug('Metadatos del mensaje:', {
        messageId: logData.messageId,
        timestamp: message.timestamp,
        hasMedia: logData.hasMedia,
        hasQuotedMsg: !!message.hasQuotedMsg,
        isForwarded: logData.isForwarded,
        isStatus: message.isStatus,
        fromMe: logData.fromMe,
        ack: message.ack
      });
    }
  } catch (error) {
    logger.error('Error en logIncomingMessage:', {
      error: error.message,
      stack: error.stack,
      messageId: message?.id?.id || 'desconocido'
    });
  }
}

// === Procesamiento de mensajes ===
async function processMessage(message) {
  // Verificar si el mensaje es válido
  if (!message) {
    logger.warn('Mensaje nulo recibido en processMessage');
    return;
  }

  try {
    logger.debug('Iniciando procesamiento de mensaje...');
    
    // Obtener información del chat
    const chat = await message.getChat().catch(err => {
      logger.error('Error al obtener información del chat:', err);
      return null;
    });

    if (!chat) {
      logger.warn('No se pudo obtener el chat del mensaje');
      return;
    }

    // Solo procesar mensajes de grupo
    if (!chat.isGroup) {
      logger.debug(`Mensaje de chat privado de ${message.from} ignorado`);
      return;
    }

    const groupName = chat.name.trim();
    
    // Verificar si el grupo está en la lista de permitidos
    if (!GRUPOS_PERMITIDOS.includes(groupName)) {
      logger.debug(`Mensaje de grupo no permitido: ${groupName}`);
      return;
    }

    logger.info('\n' + '='.repeat(80));
    logger.info('🔄 PROCESANDO NUEVO MENSAJE');
    logger.info('='.repeat(80));
    
    // Verificar si el mensaje tiene contenido
    if (!message.body || message.body.trim() === '') {
      logger.info('Mensaje vacío o sin texto, ignorando...');
      logger.info('='.repeat(80) + '\n');
      return;
    }

    // Limpiar y normalizar el contenido del mensaje
    const cleanContent = message.body
      .replace(/\*/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    logger.debug('Contenido limpio del mensaje:', cleanContent);

    // Determinar el tipo de mensaje y procesarlo
    let taskData = null;
    let messageType = 'desconocido';
    let parser = null;

    // Verificar el tipo de mensaje
    if (cleanContent.startsWith('Pedido') || cleanContent.includes('TURNO')) {
      messageType = 'pedido';
      parser = parsePedidoMessage;
    } else if (cleanContent.startsWith('TAREA:')) {
      messageType = 'tarea';
      parser = parseTareaMessage;
    } else if (cleanContent.toLowerCase().includes('expediente:')) {
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

    // Agregar metadatos adicionales
    taskData = {
      ...taskData,
      grupoOrigen: groupName,
      mensajeOriginal: cleanContent,
      fechaRecepcion: new Date().toISOString(),
      origen: 'whatsapp'
    };

    logger.info('✅ Datos extraídos correctamente:', JSON.stringify(taskData, null, 2));

    // Verificar si la tarea ya existe
    const isDuplicate = await checkDuplicateTask(taskData.numero);
    if (isDuplicate) {
      logger.warn(`⚠️  Tarea #${taskData.numero} ya existe, ignorando...`);
      logger.info('='.repeat(80) + '\n');
      return;
    }

    // Enviar a la API
    logger.info('📤 Enviando tarea a la API...');
    const success = await sendToAPI(taskData);
    
    if (success) {
      logger.info(`✅ Tarea #${taskData.numero} creada exitosamente`);
    } else {
      logger.error('❌ Error al crear la tarea en la API');
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

// === Funciones auxiliares ===
async function checkDuplicateTask(numero) {
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
    
    logger.debug(`Verificando duplicado para expediente: ${expedienteNumero}`);
    
    const res = await axios.get(url, { 
      headers: { 
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      timeout: 10000 // 10 segundos de timeout
    });
    
    const isDuplicate = res.data?.exists || false;
    logger.debug(`Resultado verificación duplicado para ${expedienteNumero}: ${isDuplicate ? 'DUPLICADO' : 'NUEVO'}`);
    
    return isDuplicate;
  } catch (error) {
    logger.warn(`No se pudo verificar duplicado para ${numero}: ${error.message}`);
    // En caso de error, asumir que es un duplicado para evitar duplicados
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
      'fechaEjecucion', 'franja_horaria', 'cliente', 'numeroTitular', 'direccion',
      'origen', 'grupoOrigen', 'mensajeOriginal', 'fechaRecepcion'
    ];

    const datosLimpios = {};
    camposPermitidos.forEach(campo => {
      if (dataToSend[campo] !== undefined && dataToSend[campo] !== null) {
        // Asegurarse de que los campos de texto no estén vacíos
        if (typeof dataToSend[campo] === 'string') {
          datosLimpios[campo] = dataToSend[campo].trim();
        } else {
          datosLimpios[campo] = dataToSend[campo];
        }
      }
    });
    
    // Asegurar que los campos obligatorios tengan valores por defecto
    if (!datosLimpios.estado) datosLimpios.estado = 'pendiente';
    if (!datosLimpios.titulo) datosLimpios.titulo = `Pedido ${datosLimpios.numero || 'Nuevo'}`;

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

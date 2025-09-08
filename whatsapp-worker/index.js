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

  // Evento de cliente listo
  client.on('ready', async () => {
    logger.info('\n' + '='.repeat(60));
    logger.info('🚀 CLIENTE LISTO Y CONECTADO A WHATSAPP');
    logger.info('='.repeat(60));
    
    try {
      // Obtener información de los chats
      const chats = await client.getChats();
      const groups = chats.filter((c) => c.isGroup);
      
      logger.info(`📱 Chats cargados: ${chats.length}`);
      logger.info(`👥 Grupos detectados: ${groups.length}`);
      
      // Mostrar información de grupos
      if (groups.length > 0) {
        logger.info('\n📋 LISTA DE GRUPOS:');
        logger.info('='.repeat(60));
        groups.forEach((g, i) => {
          const allowed = GRUPOS_PERMITIDOS.includes(g.name.trim()) ? '✅' : '❌';
          logger.info(` ${i + 1}. ${g.name} ${allowed} (${g.id._serialized})`);
        });
        logger.info('='.repeat(60));
      }
      
      // Verificar si hay grupos permitidos
      if (GRUPOS_PERMITIDOS.length === 0) {
        logger.warn('⚠️  No hay grupos configurados en GRUPOS_PERMITIDOS');
        logger.warn('El bot no procesará mensajes hasta que se configuren grupos permitidos');
      } else {
        logger.info('\n🔍 GRUPOS PERMITIDOS CONFIGURADOS:');
        logger.info('='.repeat(60));
        GRUPOS_PERMITIDOS.forEach((g, i) => {
          const found = groups.some(grp => grp.name.trim() === g);
          logger.info(` ${i + 1}. ${g} ${found ? '✅' : '❌ (No encontrado)'}`);
        });
        logger.info('='.repeat(60));
      }
      
      logger.info('\n👂 ESCUCHANDO MENSAJES...\n');
      
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
    } else if (cleanContent.startsWith('Expediente:')) {
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

require('dotenv').config();
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Configuración de logger simple
const logger = {
  info: (message, ...args) => console.log(`[INFO] ${message}`, ...args),
  warn: (message, ...args) => console.warn(`[WARN] ${message}`, ...args),
  error: (message, ...args) => console.error(`[ERROR] ${message}`, ...args),
  debug: (message, ...args) => console.debug(`[DEBUG] ${message}`, ...args)
};

// Lista de grupos permitidos desde variables de entorno
const GRUPOS_PERMITIDOS = process.env.GRUPOS_PERMITIDOS 
  ? process.env.GRUPOS_PERMITIDOS.split(',').map(grupo => grupo.trim())
  : [];

logger.info('Iniciando servicio de WhatsApp...');
logger.info(`Grupos permitidos: ${GRUPOS_PERMITIDOS.join(', ')}`);

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

// Evento para cualquier mensaje (debug y procesamiento principal)
client.on('message_create', async (message) => {
  try {
    logger.info('🔔 EVENTO message_create detectado');
    logger.info(`   - Tipo: ${message.type}`);
    logger.info(`   - De: ${message.from}`);
    logger.info(`   - Contenido: ${message.body?.substring(0, 50) || 'Sin contenido'}...`);
    
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
    logger.info(`Mensaje completo: ${messageContent}`);
    
    let taskData = null;
    
    // Determinar el tipo de mensaje y parsearlo
    const cleanContent = messageContent.replace(/^["']/, '').trim(); // Eliminar comillas iniciales
    
    if (cleanContent.startsWith('Pedido')) {
      logger.info('Detectado formato de Pedido, procesando...');
      taskData = parsePedidoMessage(cleanContent);
    } else if (cleanContent.startsWith('TAREA:')) {
      logger.info('Detectado formato de TAREA, procesando...');
      taskData = parseTareaMessage(cleanContent);
    } else {
      logger.info('Formato de mensaje no reconocido, ignorando...');
      logger.info(`Contenido limpio: "${cleanContent}"`);
      return;
    }
    
    if (taskData) {
      logger.info('Datos parseados correctamente:', JSON.stringify(taskData, null, 2));
      
      // Verificar si la tarea ya existe
      const isDuplicate = await checkDuplicateTask(taskData.numero);
      
      if (isDuplicate) {
        logger.warn(`⚠️ Tarea con número ${taskData.numero} ya existe, ignorando...`);
        return;
      }
      
      // Enviar a la API
      const success = await sendToAPI(taskData);
      if (success) {
        logger.info('✅ Tarea creada exitosamente en la API');
      } else {
        logger.error('❌ Error al crear la tarea en la API');
      }
    } else {
      logger.error('❌ Error al parsear el mensaje');
    }
    
  } catch (error) {
    logger.error('Error procesando mensaje:', error);
  }
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

// Función para parsear mensajes de pedido
function parsePedidoMessage(message) {
  try {
    // Eliminar comillas si existen
    const cleanMessage = message.replace(/^["']|["']$/g, '').trim();
    
    // Extraer número de pedido
    const numeroMatch = cleanMessage.match(/Pedido\s+(\d+)/i);
    const numero = numeroMatch ? numeroMatch[1] : null;
    
    if (!numero) {
      logger.error('No se pudo extraer el número de pedido');
      return null;
    }
    
    // Extraer cliente
    const clienteMatch = cleanMessage.match(/Cliente:\s+([^\n]+)/i);
    const cliente = clienteMatch ? clienteMatch[1].trim() : 'Sin especificar';
    
    // Extraer WhatsApp
    const whatsappMatch = cleanMessage.match(/Whatsapp\s+titular:\s+([^\n]+)/i);
    const whatsapp = whatsappMatch ? whatsappMatch[1].trim() : 'Sin especificar';
    
    // Extraer descripción
    const descripcionMatch = cleanMessage.match(/Descripción\s+del\s+servicio:\s+([\s\S]*?)(?=Dirección|$)/i);
    const descripcion = descripcionMatch ? descripcionMatch[1].trim() : 'Sin especificar';
    
    // Extraer dirección
    const direccionMatch = cleanMessage.match(/Dirección\s+póliza:\s+([^\n]+)/i);
    const direccion = direccionMatch ? direccionMatch[1].trim() : 'Sin especificar';
    
    // Extraer barrio
    const barrioMatch = cleanMessage.match(/Barrio:\s+([^\n]+)/i);
    const barrio = barrioMatch ? barrioMatch[1].trim() : 'Sin especificar';
    
    // Extraer turno
    const turnoMatch = cleanMessage.match(/TURNO\s+confirmado\s+fecha\s+([^\n]+)/i);
    const turno = turnoMatch ? turnoMatch[1].trim() : 'Sin especificar';
    
    // Crear objeto de tarea
    const taskData = {
      // Campos requeridos
      numero,
      titulo: `Pedido ${numero} - ${cliente}`,
      
      // Campos opcionales pero importantes
      descripcion: descripcion || 'Sin descripción',
      estado: 'pendiente',
      tecnicos: [], // Array vacío para asignar técnicos después
      cliente: cliente || 'Cliente sin especificar',
      numeroTitular: whatsapp || '',
      direccion: direccion || '',
      
      // Campos adicionales para el negocio
      whatsapp,
      barrio,
      turno,
      origen: 'WhatsApp',
      grupo: 'PEDIDOS PENDIENTES SEGURO',
      fechaCreacion: new Date().toISOString(),
      // Omitir fechaEjecucion si no podemos crear una fecha válida
      ...(turno && turno !== 'Sin especificar' ? { fechaEjecucion: new Date().toISOString() } : {})
    };
    
    logger.info('Datos extraídos del pedido:', JSON.stringify(taskData, null, 2));
    return taskData;
  } catch (error) {
    logger.error('Error al parsear mensaje de pedido:', error);
    return null;
  }
}

// Función para parsear mensajes de tarea
function parseTareaMessage(message) {
  // Implementar según formato de TAREA
  logger.info('Formato TAREA no implementado aún');
  return null;
}

// Función para verificar si una tarea ya existe
async function checkDuplicateTask(numero) {
  try {
    const checkUrl = process.env.CHECK_DUPLICATE_URL || 'http://localhost:3000/api/worker/tareas/check-duplicate';
    const apiKey = process.env.API_KEY || '';
    const axios = require('axios');
    
    logger.info(`Verificando si la tarea ${numero} ya existe...`);
    
    const response = await axios.get(`${checkUrl}/${numero}`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`
      }
    });
    
    const exists = response.data && response.data.exists;
    
    if (exists) {
      logger.warn(`La tarea con número ${numero} ya existe en el sistema`);
    } else {
      logger.info(`La tarea con número ${numero} no existe, se puede crear`);
    }
    
    return exists;
  } catch (error) {
    logger.error('Error al verificar tarea duplicada:', error.message);
    // En caso de error, asumimos que no existe para intentar crearla
    return false;
  }
}

// Función para enviar datos a la API
async function sendToAPI(taskData) {
  try {
    // Usar la URL específica para crear tareas desde el worker
    const createTaskUrl = process.env.CREATE_TASK_URL || 'http://localhost:3000/api/worker/tareas';
    const apiKey = process.env.API_KEY || '';
    const axios = require('axios');
    
    logger.info(`Enviando datos a la API: ${createTaskUrl}`);
    
    // Configurar la solicitud con axios
    const response = await axios.post(createTaskUrl, taskData, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      }
    });
    
    logger.info(`Tarea creada exitosamente en la API con ID: ${response.data._id || response.data.id || 'desconocido'}`);
    return true;
  } catch (error) {
    if (error.response) {
      // La solicitud fue hecha y el servidor respondió con un código de estado fuera del rango 2xx
      logger.error(`Error al crear tarea en la API: ${error.response.status}`);
      logger.error(`Detalles: ${JSON.stringify(error.response.data)}`);
    } else if (error.request) {
      // La solicitud fue hecha pero no se recibió respuesta
      logger.error('Error: No se recibió respuesta de la API');
    } else {
      // Ocurrió un error al configurar la solicitud
      logger.error('Error al configurar la solicitud:', error.message);
    }
    return false;
  }
}

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

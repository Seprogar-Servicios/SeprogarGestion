require('dotenv').config();
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Importar los parsers desde el módulo dedicado
const { parsePedidoMessage, parseTareaMessage, parseExpedienteMessage } = require('./src/parsers');

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
    // Aplicar limpieza previa para extraer contenido de logs y normalizar formato
    let cleanContent = messageContent;
    
    // Extraer contenido limpio de logs si existe
    if (cleanContent.includes('[INFO]')) {
      const cleanContentMatch = cleanContent.match(/\[INFO\] Contenido limpio: "([\s\S]*)"/i);
      if (cleanContentMatch && cleanContentMatch[1]) {
        cleanContent = cleanContentMatch[1];
        logger.info('Contenido limpio extraído de logs');
      } else {
        // Si no hay contenido limpio, intentar extraer el mensaje completo
        const fullMessageMatch = cleanContent.match(/\[INFO\] Mensaje completo: "([\s\S]*)"/i);
        if (fullMessageMatch && fullMessageMatch[1]) {
          cleanContent = fullMessageMatch[1];
          logger.info('Mensaje completo extraído de logs');
        }
      }
    }
    
    // Eliminar asteriscos y normalizar saltos de línea
    cleanContent = cleanContent.replace(/\*/g, '').trim();
    
    // Eliminar comillas iniciales y finales si existen
    cleanContent = cleanContent.replace(/^["']|["']$/g, '').trim();
    
    logger.info(`Contenido limpio para detección: ${cleanContent.substring(0, 50)}...`);
    
    if (cleanContent.trim().startsWith('Pedido')) {
      logger.info('Detectado formato de Pedido, procesando...');
      taskData = parsePedidoMessage(messageContent); // Pasamos el mensaje original al parser que ya tiene la lógica de limpieza
    } else if (cleanContent.trim().startsWith('TAREA:')) {
      logger.info('Detectado formato de TAREA, procesando...');
      taskData = parseTareaMessage(messageContent);
    } else if (cleanContent.trim().startsWith('Expediente:')) {
      logger.info('Detectado formato de Expediente, procesando...');
      taskData = parseExpedienteMessage(messageContent);
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
    // Aplicar limpieza previa para extraer contenido de logs y normalizar formato
    let cleanContent = messageContent;
    
    // Extraer contenido limpio de logs si existe
    if (cleanContent.includes('[INFO]')) {
      const cleanContentMatch = cleanContent.match(/\[INFO\] Contenido limpio: "([\s\S]*)"/i);
      if (cleanContentMatch && cleanContentMatch[1]) {
        cleanContent = cleanContentMatch[1];
        logger.info('Contenido limpio extraído de logs');
      } else {
        // Si no hay contenido limpio, intentar extraer el mensaje completo
        const fullMessageMatch = cleanContent.match(/\[INFO\] Mensaje completo: "([\s\S]*)"/i);
        if (fullMessageMatch && fullMessageMatch[1]) {
          cleanContent = fullMessageMatch[1];
          logger.info('Mensaje completo extraído de logs');
        }
      }
    }
    
    // Eliminar asteriscos y normalizar saltos de línea
    cleanContent = cleanContent.replace(/\*/g, '').trim();
    
    // Eliminar comillas iniciales y finales si existen
    cleanContent = cleanContent.replace(/^["']|["']$/g, '').trim();
    
    logger.info(`Contenido limpio para detección: ${cleanContent.substring(0, 50)}...`);
    
    if (cleanContent.trim().startsWith('Pedido')) {
      logger.info('Detectado formato de Pedido, procesando...');
      taskData = parsePedidoMessage(messageContent); // Pasamos el mensaje original al parser que ya tiene la lógica de limpieza
    } else if (cleanContent.trim().startsWith('TAREA:')) {
      logger.info('Detectado formato de TAREA, procesando...');
      taskData = parseTareaMessage(messageContent);
    } else if (cleanContent.trim().startsWith('Expediente:')) {
      logger.info('Detectado formato de Expediente, procesando...');
      taskData = parseExpedienteMessage(messageContent);
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
    
    // Crear la tarea usando la función sendToAPI
    const success = await sendToAPI(taskData);
    if (success) {
      logger.info(`Tarea creada exitosamente: ${taskData.titulo}`);
    }
    
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

// Función para extraer y formatear la fecha de un texto de turno
function extraerFechaDelTurno(turnoText) {
  try {
    // Buscar patrones de fecha en el texto del turno (dd/mm/yyyy o dd-mm-yyyy)
    const fechaMatch = turnoText.match(/([0-9]{1,2}[\/\-][0-9]{1,2}[\/\-][0-9]{2,4})/i);
    
    if (!fechaMatch) {
      logger.warn(`No se encontró fecha en el texto del turno: ${turnoText}`);
      return null;
    }
    
    // Extraer la fecha encontrada
    const fechaStr = fechaMatch[1];
    const fechaParts = fechaStr.split(/[\/\-]/);
    
    if (fechaParts.length !== 3) {
      logger.warn(`Formato de fecha incorrecto: ${fechaStr}`);
      return null;
    }
    
    let dia = parseInt(fechaParts[0], 10);
    let mes = parseInt(fechaParts[1], 10) - 1; // Meses en JS son 0-11
    let anio = parseInt(fechaParts[2], 10);
    
    // Si el año tiene 2 dígitos, asumimos 20XX
    if (anio < 100) {
      anio += 2000;
    }
    
    // Crear fecha con la zona horaria local
    const fecha = new Date(anio, mes, dia);
    
    if (isNaN(fecha.getTime())) {
      logger.warn(`Fecha inválida: ${fechaStr}`);
      return null;
    }
    
    // Formato YYYY-MM-DD sin componente de tiempo para evitar problemas de zona horaria
    const anioStr = fecha.getFullYear();
    const mesStr = (fecha.getMonth() + 1).toString().padStart(2, '0');
    const diaStr = fecha.getDate().toString().padStart(2, '0');
    
    const fechaFormateada = `${anioStr}-${mesStr}-${diaStr}`;
    logger.info(`Fecha extraída del turno: ${fechaFormateada}`);
    
    return fechaFormateada;
  } catch (error) {
    logger.error('Error al extraer fecha del turno:', error);
    return null;
  }
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
    
    // Crear una copia de los datos para no modificar el objeto original
    const dataToSend = { ...taskData };
    
    // Lista de campos permitidos según el esquema de validación del backend
    const camposPermitidos = [
      'numero', 'titulo', 'descripcion', 'estado', 'tecnicos',
      'fechaEjecucion', 'franja_horaria', 'cliente', 'numeroTitular', 'direccion'
    ];
    
    // Filtrar solo los campos permitidos
    const datosLimpios = {};
    camposPermitidos.forEach(campo => {
      if (dataToSend[campo] !== undefined) {
        datosLimpios[campo] = dataToSend[campo];
      }
    });
    
    // Registrar los campos eliminados
    const camposEliminados = Object.keys(dataToSend).filter(campo => !camposPermitidos.includes(campo));
    if (camposEliminados.length > 0) {
      logger.info(`Campos eliminados para cumplir con la validación de la API: ${camposEliminados.join(', ')}`);
    }
    
    logger.info(`Enviando datos a la API: ${createTaskUrl}`);
    
    // Configurar la solicitud con axios
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

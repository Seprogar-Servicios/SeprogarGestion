require('dotenv').config();
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Importar los parsers desde el módulo dedicado
const { parsePedidoMessage, parseTareaMessage, parseExpedienteMessage } = require('./src/parsers');

// Importar el logger personalizado
const logger = require('./src/utils/logger');

// Lista de grupos permitidos desde variables de entorno
const GRUPOS_PERMITIDOS = process.env.GRUPOS_PERMITIDOS 
  ? process.env.GRUPOS_PERMITIDOS.split(',').map(grupo => grupo.trim())
  : [];

logger.info('Iniciando servicio de WhatsApp...');
logger.info(`Grupos permitidos: ${GRUPOS_PERMITIDOS.join(', ')}`);

// Configuración de ruta para la autenticación local
const AUTH_FOLDER = path.join(__dirname, '.wwebjs_auth');
logger.info(`Usando carpeta de autenticación: ${AUTH_FOLDER}`);

// Inicializar el cliente
const client = new Client({
  puppeteer: {
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  },
  authStrategy: new LocalAuth({
    dataPath: path.join(__dirname, '.wwebjs_auth'),
  }),
  webVersionCache: {
    type: 'remote',
    remotePath: 'https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.2412.54.html',
  },
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
  
  // Mostrar información del entorno
  logger.info(`Entorno: ${process.env.NODE_ENV || 'development'}`);
  logger.info(`Nivel de logs: ${process.env.LOG_LEVEL || 'INFO'}`);
  
  // Mostrar información de los chats
  try {
    logger.info('Obteniendo lista de chats...');
    const chats = await client.getChats();
    const groups = chats.filter(chat => chat.isGroup);
    
    logger.info(` Total de chats: ${chats.length}`);
    logger.info(` Total de grupos: ${groups.length}`);
    
    if (groups.length > 0) {
      logger.info(' Grupos disponibles:');
      groups.forEach((group, index) => {
        const isAllowed = GRUPOS_PERMITIDOS.includes(group.name);
        logger.info(`  ${index + 1}. "${group.name}" ${isAllowed ? '✅' : '❌'}`);
      });
    }
    
    logger.info(' Escuchando mensajes...');
    logger.info('===========================================');
    
  } catch (error) {
    logger.error('Error al obtener información de chats:', error);
    logger.error('Stack trace:', error.stack);
  }
});

// Evento principal para procesar mensajes
client.on('message_create', async (message) => {
  try {
    // Verificar si el mensaje es del bot para evitar bucles
    if (message.fromMe) return;

    logger.info('\n=== NUEVO MENSAJE ===');
    logger.info(` De: ${message.from}`);
    logger.info(` Contenido: ${message.body?.substring(0, 100) || 'Sin contenido'}...`);
    
    // Verificar si el mensaje viene de un grupo
    const chat = await message.getChat();
    
    if (!chat.isGroup) {
      logger.info(' Mensaje recibido fuera de un grupo, ignorando...');
      return;
    }
    
    const groupName = chat.name;
    logger.info(` Grupo: "${groupName}"`);
    
    // Verificar si el grupo está permitido
    if (!GRUPOS_PERMITIDOS.includes(groupName)) {
      logger.info(` Grupo "${groupName}" no está en la lista de permitidos`);
      logger.debug(`Grupos permitidos: ${GRUPOS_PERMITIDOS.join(', ')}`);
      return;
    }
    
    logger.info(` Grupo permitido detectado, procesando mensaje...`);
    
    const messageContent = message.body.trim();
    let cleanContent = messageContent;
    
    // Limpieza del contenido
    cleanContent = cleanContent
      .replace(/\*/g, '')
      .replace(/^["']|["']$/g, '')
      .trim();
    
    logger.info(` Contenido limpio: ${cleanContent.substring(0, 100)}...`);
    
    // Determinar el tipo de mensaje
    let taskData = null;
    let messageType = 'desconocido';
    
    if (cleanContent.trim().startsWith('Pedido')) {
      messageType = 'pedido';
      logger.info(' Detectado formato de Pedido');
      taskData = parsePedidoMessage(messageContent);
    } 
    else if (cleanContent.trim().startsWith('TAREA:')) {
      messageType = 'tarea';
      logger.info(' Detectado formato de TAREA');
      taskData = parseTareaMessage(messageContent);
    } 
    else if (cleanContent.trim().startsWith('Expediente:')) {
      messageType = 'expediente';
      logger.info(' Detectado formato de Expediente');
      taskData = parseExpedienteMessage(messageContent);
    } 
    else {
      logger.info(' Formato de mensaje no reconocido');
      return;
    }
    
    // Verificar si se pudo parsear el mensaje
    if (!taskData) {
      logger.error(' No se pudo extraer información de la tarea');
      return;
    }
    
    logger.info(` Datos extraídos (${messageType}):`, JSON.stringify(taskData, null, 2));
    
    // Verificar duplicados
    const isDuplicate = await checkDuplicateTask(taskData.numero);
    if (isDuplicate) {
      logger.warn(` Tarea #${taskData.numero} ya existe, ignorando...`);
      return;
    }
    
    // Enviar a la API
    logger.info(' Enviando tarea a la API...');
    const success = await sendToAPI(taskData);
    
    if (success) {
      logger.info(` Tarea #${taskData.numero} creada exitosamente`);
    } else {
      logger.error(' Error al crear la tarea en la API');
    }
    
  } catch (error) {
    logger.error(' Error crítico al procesar mensaje:', error);
    logger.error('Stack trace:', error.stack);
  } finally {
    logger.info('='.repeat(50) + '\n');
  }
});

// Manejar eventos de mensajes entrantes (solo para logging)
client.on('message', async (message) => {
  try {
    if (message.fromMe) return;
    
    const chat = await message.getChat();
    const groupInfo = chat.isGroup ? `[GRUPO: ${chat.name}]` : '[PRIVADO]';
    
    logger.debug(`\n MENSAJE RECIBIDO ${groupInfo}`);
    logger.debug(` De: ${message.from}`);
    logger.debug(` Contenido: ${message.body?.substring(0, 50) || 'Sin contenido'}...`);
    
  } catch (error) {
    logger.error('Error en evento message:', error);
  }
});

// Manejar errores de autenticación
client.on('auth_failure', (error) => {
  logger.error('\n' + '🔥'.repeat(50));
  logger.error(' ERROR CRÍTICO DE AUTENTICACIÓN');
  logger.error('🔥'.repeat(50));
  logger.error('Se ha producido un error al autenticar con WhatsApp Web');
  logger.error(`Mensaje: ${error.message}`);
  
  if (error.message.includes('session')) {
    logger.error('\n💡 Posible solución:');
    logger.error('1. Elimina la carpeta .wwebjs_auth');
    logger.error('2. Reinicia la aplicación');
    logger.error('3. Escanea el código QR nuevamente');
  }
  
  logger.error('\nStack trace:');
  logger.error(error.stack || 'No hay stack trace disponible');
  logger.error('🔥'.repeat(50) + '\n');
  
  // Forzar salida con código de error
  process.exit(1);
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
    
    // Intentar verificar con el endpoint específico
    try {
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
    } catch (checkError) {
      // Si falla la verificación específica, intentar buscar la tarea directamente
      logger.warn(`Error al verificar con endpoint específico: ${checkError.message}`);
      logger.info(`Intentando verificar existencia de tarea ${numero} por método alternativo...`);
      
      const tasksUrl = process.env.GET_TASKS_URL || 'http://localhost:3000/api/worker/tareas';
      const tasksResponse = await axios.get(`${tasksUrl}?numero=${numero}`, {
        headers: {
          'Authorization': `Bearer ${apiKey}`
        }
      });
      
      // Si encontramos al menos una tarea con ese número, consideramos que existe
      const exists = tasksResponse.data && Array.isArray(tasksResponse.data) && tasksResponse.data.length > 0;
      
      if (exists) {
        logger.warn(`La tarea con número ${numero} ya existe en el sistema (verificación alternativa)`);
      } else {
        logger.info(`La tarea con número ${numero} no existe, se puede crear (verificación alternativa)`);
      }
      
      return exists;
    }
  } catch (error) {
    logger.error('Error al verificar tarea duplicada:', error.message);
    // En caso de error en ambos métodos, asumimos que existe para prevenir duplicados
    logger.warn(`Por precaución, asumiendo que la tarea ${numero} ya existe para evitar duplicados`);
    return true;
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
    
    // Filtrar solo los campos permitidos y formatear fechas
    const datosLimpios = {};
    camposPermitidos.forEach(campo => {
      if (dataToSend[campo] !== undefined) {
        // Formatear fechaEjecucion si existe
        if (campo === 'fechaEjecucion' && dataToSend[campo]) {
          try {
            // Si ya está en formato YYYY-MM-DD, mantenerlo
            if (/^\d{4}-\d{2}-\d{2}$/.test(dataToSend[campo])) {
              datosLimpios[campo] = dataToSend[campo];
            } 
            // Si está en formato DD/MM/YYYY, convertirlo
            else if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(dataToSend[campo])) {
              const [day, month, year] = dataToSend[campo].split('/');
              datosLimpios[campo] = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
            }
            // Si es una fecha ISO o similar, formatearla a YYYY-MM-DD
            else {
              const date = new Date(dataToSend[campo]);
              if (!isNaN(date.getTime())) {
                datosLimpios[campo] = date.toISOString().split('T')[0];
              } else {
                logger.warn(`Formato de fecha no reconocido: ${dataToSend[campo]}`);
                datosLimpios[campo] = dataToSend[campo];
              }
            }
            logger.info(`Fecha de ejecución formateada: ${dataToSend[campo]} -> ${datosLimpios[campo]}`);
          } catch (error) {
            logger.error(`Error al formatear fechaEjecucion: ${error.message}`);
            // En caso de error, mantener el valor original
            datosLimpios[campo] = dataToSend[campo];
          }
        } else {
          datosLimpios[campo] = dataToSend[campo];
        }
      }
    });
    
    // Registrar los campos eliminados
    const camposEliminados = Object.keys(dataToSend).filter(campo => !camposPermitidos.includes(campo));
    if (camposEliminados.length > 0) {
      logger.info(`Campos eliminados para cumplir con la validación de la API: ${camposEliminados.join(', ')}`);
    }
    
    // Verificar nuevamente si la tarea ya existe justo antes de enviarla
    // Esto es una doble verificación para evitar errores de duplicación
    const isDuplicate = await checkDuplicateTask(datosLimpios.numero);
    if (isDuplicate) {
      logger.warn(`⚠️ Cancelando envío: La tarea con número ${datosLimpios.numero} ya existe (verificación final)`);
      return false;
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
    // Detectar errores de duplicación
    const isDuplicateError = 
      (error.response && 
       error.response.status === 500 && 
       error.response.data && 
       (error.response.data.error?.includes('duplicate key error') || 
        error.response.data.error?.includes('dup key')));
    
    if (isDuplicateError) {
      logger.warn(`⚠️ Error de duplicación detectado para la tarea ${taskData.numero}`);
      logger.warn('La tarea ya existe en la base de datos, ignorando...');
      // No es realmente un error, la tarea ya existe
      return true;
    }
    
    if (error.response) {
      logger.error(`Error al crear tarea en la API: ${error.response.status}`);
      logger.error(`Detalles: ${JSON.stringify(error.response.data)}`);
    } else {
      logger.error('Error al crear tarea en la API:', error.message);
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

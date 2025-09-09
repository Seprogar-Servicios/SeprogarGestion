/**
 * Parsers para extraer información de tareas de diferentes formatos de mensajes
 * Optimizado para reducir el uso de memoria
 */

// Patrones de expresiones regulares reutilizables
const PEDIDO_PATTERNS = {
  CLEAN_CONTENT: /\[INFO\] Contenido limpio: "([\s\S]*?)"/i,
  FULL_MESSAGE: /\[INFO\] Mensaje completo: ([\s\S]*?)(?=\[INFO\]|$)/i,
  PEDIDO_NUM: /Pedido\s+(\d+)/i,
  CLIENTE: /Cliente:\s*([^\n]+?)(?=\s*Whatsapp|$)/i,
  WHATSAPP_TITULAR: /[Ww]hatsapp\s+titular:\s*([^\n]+?)(?=\s*Descripción|$)/i,
  TELEFONO: /tel[ée]fono[^:]*:\s*([^\n]+)/i,
  ANY_PHONE: /(?:tel[ée]fono|celular|contacto|llamar)[^\d]*(\d{8,})/i,
  DESCRIPCION: /Descripción del servicio:\s*([^\n]+?)(?=\s*Dirección|$)/i,
  DIRECCION_POLIZA: /Dirección póliza:\s*([^\n]+?)(?=\s*TURNO|$)/i,
  DIRECCION_PEDIDO: /Dirección pedido:\s*([^\n]+?)(?=\s*TURNO|$)/i,
  TURNO: /(TURNO[\s\S]*?)(?=\s*$|\s*Recuerde|\.\.\.)/i
};

// Patrones de fecha/hora precompilados
const DATE_PATTERNS = [
  // Formato 1: TURNO confirmado fecha DD/MM/AAAA HH:MM-HH:MM
  {
    pattern: /TURNO\s+confirmado\s+fecha\s+(\d{1,2}\/\d{1,2}\/\d{4})\s+(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})/i,
    handler: (match) => ({
      date: match[1].split('/').reverse().join('-'),
      time: `${match[2]} - ${match[3]}`
    })
  },
  // Formato 2: TURNO...fecha...DD/MM/AAAA...HH:MM...-...HH:MM
  {
    pattern: /TURNO[^\n]*fecha[^\n]*(\d{1,2}\/\d{1,2}\/\d{4})[^\n]*(\d{1,2}:\d{2})[^\n]*-[^\n]*(\d{1,2}:\d{2})/i,
    handler: (match) => ({
      date: match[1].split('/').reverse().join('-'),
      time: `${match[2]} - ${match[3]}`
    })
  },
  // Formato 3: DD/MM/AAAA HH:MM-HH:MM
  {
    pattern: /(\d{1,2}\/\d{1,2}\/\d{4})\s+(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})/i,
    handler: (match) => ({
      date: match[1].split('/').reverse().join('-'),
      time: `${match[2]} - ${match[3]}`
    })
  },
  // Formato 4: TURNO...fecha DD/MM/AAAA franja horaria H a H hs
  {
    pattern: /TURNO[^\n]*fecha\s+(\d{1,2}\/\d{1,2}\/\d{4})\s+franja\s+horaria\s+(\d{1,2})\s+a\s+(\d{1,2})\s+hs/i,
    handler: (match) => ({
      date: match[1].split('/').reverse().join('-'),
      time: `${match[2].padStart(2, '0')}:00 - ${match[3].padStart(2, '0')}:00`
    })
  },
  // Formato 5: DD/MM DE H A H HS
  {
    pattern: /(\d{1,2})\s*\/\s*(\d{1,2})\s+DE\s+(\d+)\s+A\s+(\d+)\s+HS/i,
    handler: (match) => {
      const year = new Date().getFullYear();
      return {
        date: `${year}-${match[2].padStart(2, '0')}-${match[1].padStart(2, '0')}`,
        time: `${match[3].padStart(2, '0')}:00 - ${match[4].padStart(2, '0')}:00`
      };
    }
  }
];

/**
 * Limita el tamaño de un mensaje para evitar consumo excesivo de memoria
 * @param {string} message - Mensaje a limitar
 * @param {number} maxLength - Longitud máxima (por defecto 2000 caracteres)
 * @returns {string} - Mensaje truncado si es necesario
 */
function limitMessageSize(message, maxLength = 2000) {
  return typeof message === 'string' ? message.substring(0, maxLength) : '';
}

/**
 * Parsea un mensaje en formato Pedido
 * @param {string} message - Contenido del mensaje
 * @returns {Object|null} - Datos de la tarea o null si no se pudo parsear
 */
function parsePedidoMessage(message) {
  try {
    // Limitar el tamaño del mensaje para evitar consumo excesivo de memoria
    message = limitMessageSize(message);
    
    // Verificar si el mensaje contiene logs del sistema
    if (message.includes('[INFO]')) {
      // Buscar el mensaje limpio si está disponible
      const cleanContentMatch = PEDIDO_PATTERNS.CLEAN_CONTENT.exec(message);
      if (cleanContentMatch && cleanContentMatch[1]) {
        message = cleanContentMatch[1];
      } else {
        // Si no hay contenido limpio, intentar extraer el mensaje completo
        const fullMessageMatch = PEDIDO_PATTERNS.FULL_MESSAGE.exec(message);
        if (fullMessageMatch && fullMessageMatch[1]) {
          message = fullMessageMatch[1];
        }
      }
    }
    
    // Limpiar el mensaje: eliminar asteriscos y normalizar saltos de línea
    message = message
      .replace(/\*/g, '') // Eliminar asteriscos
      .replace(/\n\s*\n/g, '\n') // Normalizar múltiples saltos de línea
      .trim();
      
    // Extraer el número de pedido (con o sin asteriscos)
    const numeroMatch = PEDIDO_PATTERNS.PEDIDO_NUM.exec(message);
    const numero = numeroMatch ? numeroMatch[1] : null;
    
    if (!numero) {
      return null; // Si no hay número de pedido, no podemos continuar
    }
    
    // Extraer el título (será "Pedido" + número)
    const titulo = `Pedido ${numero}`;
    
    // Extraer cliente
    const clienteMatch = PEDIDO_PATTERNS.CLIENTE.exec(message);
    const cliente = clienteMatch ? clienteMatch[1].trim() : null;
    
    // Extraer número de WhatsApp del titular
    let numeroTitular = '';
    
    // Patrón principal: "Whatsapp titular: 123456789"
    const numeroTitularMatch = PEDIDO_PATTERNS.WHATSAPP_TITULAR.exec(message);
    if (numeroTitularMatch && numeroTitularMatch[1]?.trim()) {
      numeroTitular = numeroTitularMatch[1].trim();
    } else {
      // Patrón alternativo: "teléfono de la persona que los recibe: 123456789"
      const telefonoMatch = PEDIDO_PATTERNS.TELEFONO.exec(message);
      if (telefonoMatch && telefonoMatch[1]?.trim()) {
        numeroTitular = telefonoMatch[1].trim();
      }
    }
    
    // Si aún no se encontró, buscar cualquier número de teléfono en el mensaje
    if (!numeroTitular) {
      const anyPhoneMatch = PEDIDO_PATTERNS.ANY_PHONE.exec(message);
      if (anyPhoneMatch?.[1]) {
        numeroTitular = anyPhoneMatch[1].trim();
      }
    }
    
    // Extraer la descripción del servicio
    let descripcion = '';
    const descripcionMatch = PEDIDO_PATTERNS.DESCRIPCION.exec(message);
    if (descripcionMatch?.[1]) {
      descripcion = descripcionMatch[1].trim();
    }
    
    // Extraer dirección (puede ser "Dirección póliza" o "Dirección pedido")
    let direccion = '';
    const direccionMatch = PEDIDO_PATTERNS.DIRECCION_POLIZA.exec(message) || 
                          PEDIDO_PATTERNS.DIRECCION_PEDIDO.exec(message);
    if (direccionMatch?.[1]) {
      direccion = direccionMatch[1].trim();
    }
    
    // Extraer fecha de ejecución y franja horaria
    let fechaEjecucion = '';
    let franja_horaria = '';
    
    // Intentar extraer la sección de TURNO primero para un análisis más preciso
    const turnoMatch = PEDIDO_PATTERNS.TURNO.exec(message);
    const turnoText = turnoMatch ? turnoMatch[0] : message;
    
    // Probar cada patrón hasta encontrar una coincidencia
    for (const { pattern, handler } of DATE_PATTERNS) {
      const match = pattern.exec(turnoText);
      if (match) {
        const result = handler(match);
        fechaEjecucion = result.date;
        franja_horaria = result.time;
        break;
      }
    }
    
    // Crear objeto de tarea con tipos garantizados
    const taskData = {
      numero: numero || '',
      titulo: titulo || '',
      cliente: cliente || '',
      numeroTitular: numeroTitular || '',
      descripcion: descripcion || '',
      direccion: direccion || '',
      fechaEjecucion: fechaEjecucion || '',
      franja_horaria: franja_horaria || '',
      estado: 'pendiente',
      tecnicos: [],
      creadoPor: process.env.DEFAULT_USER_ID || null,
      fechaCreacion: new Date().toISOString(),
      fechaModificacion: new Date().toISOString(),
      origen: 'whatsapp'
    };
    
    // Limpiar referencias a objetos grandes
    message = null;
    
    return taskData;
  } catch (error) {
    console.error('Error al parsear mensaje de Pedido:', error);
    // Forzar recolección de basura si está disponible
    if (typeof global.gc === 'function') {
      global.gc();
    }
    return null;
  }
}

// Patrones para parsear mensajes de tarea
const TAREA_PATTERNS = {
  NUMERO: /Numero:\s*([^\n]+)/i,
  TITULO: /Titulo:\s*([^\n]+)/i,
  CLIENTE: /Cliente:\s*([^\n]+)/i,
  DESCRIPCION: /Descripción:[\s\n]+([^]*?)(?=\n\S+:|$)/i,
  DIRECCION: /Dirección:[\s\n]+([^\n]+)/i,
  TELEFONO: /Tel[ée]fono:[\s\n]+([^\n]+)/i,
  FECHA_HORA: /(\d{1,2}\/\d{1,2}\/\d{4})\s+de\s+(\d{1,2}:\d{1,2})\s+a\s+(\d{1,2}:\d{1,2})/i
};

/**
 * Parsea un mensaje en formato TAREA
 * @param {string} message - Contenido del mensaje
 * @returns {Object|null} - Datos de la tarea o null si no se pudo parsear
 */
function parseTareaMessage(message) {
  try {
    // Limitar el tamaño del mensaje
    message = limitMessageSize(message)
      .replace(/\*/g, '')
      .trim();

    // Extraer número de tarea
    const numeroMatch = TAREA_PATTERNS.NUMERO.exec(message);
    const numero = numeroMatch?.[1]?.trim() || null;
    
    if (!numero) {
      return null; // Si no hay número, no podemos continuar
    }

    // Extraer otros campos
    const tituloMatch = TAREA_PATTERNS.TITULO.exec(message);
    const clienteMatch = TAREA_PATTERNS.CLIENTE.exec(message);
    const descripcionMatch = TAREA_PATTERNS.DESCRIPCION.exec(message);
    const direccionMatch = TAREA_PATTERNS.DIRECCION.exec(message);
    const telefonoMatch = TAREA_PATTERNS.TELEFONO.exec(message);
    
    // Extraer fecha y hora si están presentes
    let fechaEjecucion = '';
    let franja_horaria = '';
    const fechaHoraMatch = TAREA_PATTERNS.FECHA_HORA.exec(message);
    
    if (fechaHoraMatch) {
      const [_, date, startTime, endTime] = fechaHoraMatch;
      const [day, month, year] = date.split('/');
      fechaEjecucion = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      franja_horaria = `${startTime} - ${endTime}`;
    }

    // Crear objeto de tarea
    const taskData = {
      numero: numero,
      titulo: tituloMatch?.[1]?.trim() || `Tarea ${numero}`,
      cliente: clienteMatch?.[1]?.trim() || '',
      descripcion: descripcionMatch?.[1]?.trim() || '',
      direccion: direccionMatch?.[1]?.trim() || '',
      numeroTitular: telefonoMatch?.[1]?.trim() || '',
      fechaEjecucion: fechaEjecucion,
      franja_horaria: franja_horaria,
      estado: 'pendiente',
      tecnicos: [],
      creadoPor: process.env.DEFAULT_USER_ID || null,
      fechaCreacion: new Date().toISOString(),
      fechaModificacion: new Date().toISOString(),
      origen: 'whatsapp'
    };

    // Limpiar referencias
    message = null;
    
    return taskData;
  } catch (error) {
    console.error('Error al parsear mensaje de Tarea:', error);
    if (typeof global.gc === 'function') global.gc();
    return null;
  }
}

// Patrones para parsear mensajes de expediente
const EXPEDIENTE_PATTERNS = {
  EXPEDIENTE: /Expediente:\s*([^\n]+)/i,
  CLIENTE: /Cliente:[\s\n]+([^\n]+)/i,
  DETALLE: /Detalle:[\s\n]+([^]*?)(?=\n\S+:|$)/i,
  DOMICILIO: /Domicilio:[\s\n]+([^\n]+)/i,
  CONTACTO: /Contacto:[\s\n]+([^\n]+)/i,
  FECHA: /(\d{1,2}\/\d{1,2}\/\d{4})/i
};

/**
 * Parsea un mensaje en formato Expediente
 * @param {string} message - Contenido del mensaje
 * @returns {Object|null} - Datos de la tarea o null si no se pudo parsear
 */
function parseExpedienteMessage(message) {
  try {
    // Limitar el tamaño del mensaje
    message = limitMessageSize(message)
      .replace(/\*/g, '')
      .trim();

    // Extraer número de expediente
    const expedienteMatch = EXPEDIENTE_PATTERNS.EXPEDIENTE.exec(message);
    const numero = expedienteMatch?.[1]?.trim() || null;
    
    if (!numero) {
      return null; // Si no hay número, no podemos continuar
    }

    // Extraer otros campos
    const clienteMatch = EXPEDIENTE_PATTERNS.CLIENTE.exec(message);
    const detalleMatch = EXPEDIENTE_PATTERNS.DETALLE.exec(message);
    const domicilioMatch = EXPEDIENTE_PATTERNS.DOMICILIO.exec(message);
    const contactoMatch = EXPEDIENTE_PATTERNS.CONTACTO.exec(message);
    
    // Extraer fecha si existe
    let fechaEjecucion = '';
    const fechaMatch = EXPEDIENTE_PATTERNS.FECHA.exec(message);
    if (fechaMatch?.[1]) {
      const [day, month, year] = fechaMatch[1].split('/');
      fechaEjecucion = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }

    // Crear objeto de tarea
    const taskData = {
      numero: numero,
      titulo: `Expediente ${numero}`,
      cliente: clienteMatch?.[1]?.trim() || '',
      descripcion: detalleMatch?.[1]?.trim() || '',
      direccion: domicilioMatch?.[1]?.trim() || '',
      numeroTitular: contactoMatch?.[1]?.trim() || '',
      fechaEjecucion: fechaEjecucion,
      estado: 'pendiente',
      tecnicos: [],
      creadoPor: process.env.DEFAULT_USER_ID || null,
      fechaCreacion: new Date().toISOString(),
      fechaModificacion: new Date().toISOString(),
      origen: 'whatsapp'
    };

    // Limpiar referencias
    message = null;
    
    return taskData;
  } catch (error) {
    console.error('Error al parsear mensaje de Expediente:', error);
    if (typeof global.gc === 'function') global.gc();
    return null;
  }
}

module.exports = {
  parsePedidoMessage,
  parseTareaMessage,
  parseExpedienteMessage
};

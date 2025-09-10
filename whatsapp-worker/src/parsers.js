const PEDIDO_PATTERNS = {
  CLEAN_CONTENT: /\[INFO\] Contenido limpio: "([\s\S]*?)"/i,
  FULL_MESSAGE: /\[INFO\] Mensaje completo: ([\s\S]*?)(?=\[INFO\]|$)/i,
  PEDIDO_NUM: /Pedido\s+(\d+)/i,
  CLIENTE: /Cliente:\s*([^\n]+?)(?=\s*Telefono|$)/i,
  TELEFONO: /Telefono alt:\s*([^\n]+?)(?=\s*Descripción|$)/i,
  WHATSAPP_TITULAR: /[Ww]hatsapp\s+titular:\s*([^\n]+?)(?=\s*Descripción|$)/i,
  DESCRIPCION: /Descripción del servicio:\s*([^\n]+?)(?=\s*Dirección|$)/i,
  DIRECCION_POLIZA: /Dirección póliza:\s*([^\n]+?)(?=\s*Barrio|$)/i,
  BARRIO: /Barrio:\s*([^\n]+?)(?=\s*TURNO|$)/i,
  TURNO: /TURNO\s+confirmado\s+fecha\s+(\d{2}\/\d{2}\/\d{4})\s+(\d{1,2}:\d{2}-\d{1,2}:\d{2})/i
};

const DATE_PATTERNS = [
  {
    pattern: /TURNO\s+confirmado\s+fecha\s+(\d{1,2}\/\d{1,2}\/\d{4})\s+(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})/i,
    handler: (match) => ({
      date: match[1].split('/').reverse().join('-'),
      time: `${match[2]} - ${match[3]}`
    })
  },
  {
    pattern: /TURNO[^\n]*fecha[^\n]*(\d{1,2}\/\d{1,2}\/\d{4})[^\n]*(\d{1,2}:\d{2})[^\n]*-[^\n]*(\d{1,2}:\d{2})/i,
    handler: (match) => ({
      date: match[1].split('/').reverse().join('-'),
      time: `${match[2]} - ${match[3]}`
    })
  },
  {
    pattern: /(\d{1,2}\/\d{1,2}\/\d{4})\s+(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})/i,
    handler: (match) => ({
      date: match[1].split('/').reverse().join('-'),
      time: `${match[2]} - ${match[3]}`
    })
  },
  {
    pattern: /TURNO[^\n]*fecha\s+(\d{1,2}\/\d{1,2}\/\d{4})\s+franja\s+horaria\s+(\d{1,2})\s+a\s+(\d{1,2})\s+hs/i,
    handler: (match) => ({
      date: match[1].split('/').reverse().join('-'),
      time: `${match[2].padStart(2, '0')}:00 - ${match[3].padStart(2, '0')}:00`
    })
  },
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
/**
 * Parsea un mensaje de WhatsApp en formato Pedido
 * @param {string} message - Contenido del mensaje a parsear
 * @returns {Object|null} - Datos de la tarea o null si no se pudo parsear
 */
function parsePedidoMessage(message) {
  try {
    // Limitar el tamaño del mensaje para evitar consumo excesivo de memoria
    message = limitMessageSize(message);
    
    // Extraer el mensaje limpio si está en formato de log
    if (message.includes('[INFO]')) {
      const cleanContentMatch = PEDIDO_PATTERNS.CLEAN_CONTENT.exec(message);
      if (cleanContentMatch?.[1]) {
        message = cleanContentMatch[1].trim();
      } else {
        const fullMessageMatch = PEDIDO_PATTERNS.FULL_MESSAGE.exec(message);
        if (fullMessageMatch?.[1]) {
          message = fullMessageMatch[1].trim();
        }
      }
    }
    
    // Limpiar formato del mensaje
    message = message
      .replace(/\*/g, '')        // Eliminar asteriscos
      .replace(/\n\s*\n/g, '\n')  // Normalizar saltos de línea
      .trim();
    
    // Extraer número de pedido (obligatorio)
    const numeroMatch = PEDIDO_PATTERNS.PEDIDO_NUM.exec(message);
    const numero = numeroMatch?.[1]?.trim();
    if (!numero) {
      console.log('No se encontró número de pedido en el mensaje');
      return null;
    }
    
    // Extraer información del cliente
    const clienteMatch = PEDIDO_PATTERNS.CLIENTE.exec(message);
    const cliente = clienteMatch?.[1]?.trim() || 'Cliente no especificado';
    
    // Extraer número de teléfono (intentar múltiples patrones)
    let numeroTitular = '';
    const telefonoMatch = PEDIDO_PATTERNS.TELEFONO.exec(message);
    if (telefonoMatch?.[1]?.trim()) {
      numeroTitular = telefonoMatch[1].trim();
    }
    
    // Extraer descripción del servicio
    let descripcion = '';
    const descripcionMatch = PEDIDO_PATTERNS.DESCRIPCION.exec(message);
    if (descripcionMatch?.[1]) {
      descripcion = descripcionMatch[1].trim();
    }
    
    // Extraer dirección (probar ambos formatos)
    let direccion = '';
    const direccionMatch = PEDIDO_PATTERNS.DIRECCION_POLIZA.exec(message) || 
                          PEDIDO_PATTERNS.DIRECCION_PEDIDO.exec(message);
    if (direccionMatch?.[1]) {
      direccion = direccionMatch[1].trim();
    }
    
    let barrio = '';
    const barrioMatch = PEDIDO_PATTERNS.BARRIO.exec(message);
    if (barrioMatch?.[1]) {
      barrio = barrioMatch[1].trim();
    }
    
    let fechaEjecucion = '';
    let franjaHoraria = '';
    const turnoMatch = PEDIDO_PATTERNS.TURNO.exec(message);
    
    // 1. Intentar con el patrón TURNO directo
    if (turnoMatch?.[1] && turnoMatch[2]) {
      try {
        const [day, month, year] = turnoMatch[1].split('/');
        if (day && month && year) {
          fechaEjecucion = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
          franjaHoraria = turnoMatch[2];
        }
      } catch (e) {
        console.error('Error al parsear fecha de turno:', e);
      }
    }
    
    // 2. Si no se encontró, intentar con DATE_PATTERNS
    if (!franjaHoraria) {
      const turnoText = turnoMatch?.[0] || message;
      
      for (const { pattern, handler } of DATE_PATTERNS) {
        try {
          const match = pattern.exec(turnoText);
          if (match) {
            const result = handler(match);
            if (result?.date) fechaEjecucion = result.date;
            if (result?.time) franjaHoraria = result.time;
            if (fechaEjecucion && franjaHoraria) break;
          }
        } catch (e) {
          console.error('Error al procesar patrón de fecha:', e);
        }
      }
    }
    
    // 3. Si no hay fecha, usar la fecha actual
    if (!fechaEjecucion) {
      const today = new Date();
      fechaEjecucion = today.toISOString().split('T')[0];
    }
    
    // 4. Si no hay franja horaria, usar horario por defecto
    if (!franjaHoraria) {
      franjaHoraria = '09:00 - 18:00';
    }
    
    // Crear objeto de tarea con valores por defecto
    const taskData = {
      numero: numero,
      titulo: `Pedido ${numero}`,
      cliente: cliente,
      numeroTitular: numeroTitular.replace(/\D/g, '').substring(0, 15), // Limpiar y limitar teléfono
      descripcion: descripcion || 'Sin descripción',
      direccion: direccion || 'Dirección no especificada',
      barrio: barrio || '',
      fechaEjecucion: fechaEjecucion,
      franja_horaria: franjaHoraria,
      estado: 'pendiente',
      tecnicos: [],
      creadoPor: process.env.DEFAULT_USER_ID || null,
      fechaCreacion: new Date().toISOString(),
      fechaModificacion: new Date().toISOString(),
      origen: 'whatsapp',
      metadata: {
        parsedAt: new Date().toISOString(),
        parserVersion: '1.2.0'
      }
    };
    
    message = null;
    
    return taskData;
  } catch (error) {
    console.error('Error al parsear mensaje de Pedido:', error);
    if (typeof global.gc === 'function') {
      global.gc();
    }
    return null;
  }
}

const TAREA_PATTERNS = {
  NUMERO: /Numero:\s*([^\n]+)/i,
  TITULO: /Titulo:\s*([^\n]+)/i,
  CLIENTE: /Cliente:\s*([^\n]+)/i,
  DESCRIPCION: /Descripción:[\s\n]+([^]*?)(?=\n\S+:|$)/i,
  DIRECCION: /Dirección:[\s\n]+([^\n]+)/i,
  TELEFONO: /Tel[ée]fono:[\s\n]+([^\n]+)/i,
  FECHA_HORA: /(\d{1,2}\/\d{1,2}\/\d{4})\s+de\s+(\d{1,2}:\d{1,2})\s+a\s+(\d{1,2}:\d{1,2})/i
};

function parseTareaMessage(message) {
  try {
    message = limitMessageSize(message)
      .replace(/\*/g, '')
      .trim();

    const numeroMatch = TAREA_PATTERNS.NUMERO.exec(message);
    const numero = numeroMatch?.[1]?.trim() || null;
    
    if (!numero) {
      return null;
    }

    const tituloMatch = TAREA_PATTERNS.TITULO.exec(message);
    const clienteMatch = TAREA_PATTERNS.CLIENTE.exec(message);
    const descripcionMatch = TAREA_PATTERNS.DESCRIPCION.exec(message);
    const direccionMatch = TAREA_PATTERNS.DIRECCION.exec(message);
    const telefonoMatch = TAREA_PATTERNS.TELEFONO.exec(message);
    
    let fechaEjecucion = '';
    let franja_horaria = '';
    const fechaHoraMatch = TAREA_PATTERNS.FECHA_HORA.exec(message);
    
    if (fechaHoraMatch) {
      const [_, date, startTime, endTime] = fechaHoraMatch;
      const [day, month, year] = date.split('/');
      fechaEjecucion = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      franja_horaria = `${startTime} - ${endTime}`;
    }

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

    message = null;
    
    return taskData;
  } catch (error) {
    console.error('Error al parsear mensaje de Tarea:', error);
    if (typeof global.gc === 'function') global.gc();
    return null;
  }
}

const EXPEDIENTE_PATTERNS = {
  EXPEDIENTE: /Expediente:\s*([^\n]+)/i,
  CLIENTE: /Cliente:[\s\n]+([^\n]+)/i,
  DETALLE: /Detalle:[\s\n]+([^]*?)(?=\n\S+:|$)/i,
  DOMICILIO: /Domicilio:[\s\n]+([^\n]+)/i,
  CONTACTO: /Contacto:[\s\n]+([^\n]+)/i,
  FECHA: /(\d{1,2}\/\d{1,2}\/\d{4})/i
};

function parseExpedienteMessage(message) {
  try {
    message = limitMessageSize(message)
      .replace(/\*/g, '')
      .trim();
    const expedienteMatch = EXPEDIENTE_PATTERNS.EXPEDIENTE.exec(message);
    const numero = expedienteMatch?.[1]?.trim() || null;
    
    if (!numero) {
      return null;
    }

    const clienteMatch = EXPEDIENTE_PATTERNS.CLIENTE.exec(message);
    const detalleMatch = EXPEDIENTE_PATTERNS.DETALLE.exec(message);
    const domicilioMatch = EXPEDIENTE_PATTERNS.DOMICILIO.exec(message);
    const contactoMatch = EXPEDIENTE_PATTERNS.CONTACTO.exec(message);
    
    let fechaEjecucion = '';
    const fechaMatch = EXPEDIENTE_PATTERNS.FECHA.exec(message);
    if (fechaMatch?.[1]) {
      const [day, month, year] = fechaMatch[1].split('/');
      fechaEjecucion = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }

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

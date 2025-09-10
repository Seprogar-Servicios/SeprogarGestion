const PEDIDO_PATTERNS = {
  CLEAN_CONTENT: /\[INFO\] Contenido limpio: "([\s\S]*?)"/i,
  FULL_MESSAGE: /\[INFO\] Mensaje completo: ([\s\S]*?)(?=\[INFO\]|$)/i,
  PEDIDO_NUM: /Pedido\s+(\d+)/i,
  CLIENTE: /Cliente:\s*([^\n]+?)(?=\s*(?:Telefono|Whatsapp|$))/i,
  TELEFONO: /Telefono\s*(?:alt\.?)?\s*:?\s*([^\n\d]*\d[^\n]*?)(?=\s*(?:Descripción|$))/i,
  WHATSAPP_TITULAR: /[Ww]hatsapp\s*titular\s*:?\s*([^\n\d]*\d[^\n]*?)(?=\s*(?:Descripción|$))/i,
  DESCRIPCION: /Descripción\s*(?:del servicio)?\s*:?\s*([^\n]+?)(?=\s*(?:Dirección|Domicilio|Barrio|TURNO|$))/i,
  DIRECCION: /(?:Dirección\s*(?:póliza|pedido)|Domicilio)\s*:?\s*([^\n]+?)(?=\s*(?:Barrio|TURNO|$))/i,
  BARRIO: /Barrio\s*:?\s*([^\n]+?)(?=\s*TURNO|$)/i,
  TURNO: /TURNO\s+confirmado\s+fecha\s+(\d{1,2}\/\d{1,2}\/\d{2,4})\s+(\d{1,2}:\d{2}\s*-\s*\d{1,2}:\d{2})/i
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
    
    // 1. Intentar con el patrón WHATSAPP_TITULAR primero
    const whatsappMatch = PEDIDO_PATTERNS.WHATSAPP_TITULAR.exec(message);
    if (whatsappMatch?.[1]?.trim()) {
      numeroTitular = whatsappMatch[1].trim();
    } 
    // 2. Si no se encontró, intentar con el patrón TELEFONO
    else {
      const telefonoMatch = PEDIDO_PATTERNS.TELEFONO.exec(message);
      if (telefonoMatch?.[1]?.trim()) {
        numeroTitular = telefonoMatch[1].trim();
      }
    }
    
    // Limpiar el número de teléfono (solo mantener dígitos)
    if (numeroTitular) {
      numeroTitular = numeroTitular.replace(/\D/g, '');
    }
    
    // Extraer descripción del servicio
    let descripcion = '';
    const descripcionMatch = PEDIDO_PATTERNS.DESCRIPCION.exec(message);
    if (descripcionMatch?.[1]) {
      descripcion = descripcionMatch[1].trim();
    }
    
    // Extraer dirección
    let direccion = '';
    try {
      const direccionMatch = PEDIDO_PATTERNS.DIRECCION.exec(message);
      if (direccionMatch?.[1]) {
        direccion = direccionMatch[1].trim();
      }
    } catch (error) {
      console.error('Error al extraer dirección:', error);
    }
    
    let barrio = '';
    const barrioMatch = PEDIDO_PATTERNS.BARRIO.exec(message);
    if (barrioMatch?.[1]) {
      barrio = barrioMatch[1].trim();
    }
    
    let fechaEjecucion = '';
    let franjaHoraria = '';
    const turnoMatch = PEDIDO_PATTERNS.TURNO.exec(message);
    
    // 1. Intentar con el patrón TURNO directo primero
    if (turnoMatch?.[1] && turnoMatch[2]) {
      try {
        const [day, month, year] = turnoMatch[1].split('/');
        if (day && month && year) {
          // Validar que los componentes de la fecha sean números válidos
          const dayNum = parseInt(day, 10);
          const monthNum = parseInt(month, 10);
          const yearNum = parseInt(year, 10);
          
          if (!isNaN(dayNum) && !isNaN(monthNum) && !isNaN(yearNum) && 
              monthNum >= 1 && monthNum <= 12 && 
              dayNum >= 1 && dayNum <= 31) {
            
            // Formato estándar: YYYY-MM-DD
            fechaEjecucion = `${yearNum}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
            
            // Validar formato de franja horaria (HH:MM-HH:MM)
            const horarioMatch = turnoMatch[2].match(/(\d{1,2}):(\d{2})-(\d{1,2}):(\d{2})/);
            if (horarioMatch) {
              franjaHoraria = turnoMatch[2];
            } else {
              console.warn('Formato de franja horaria inválido, usando valor por defecto');
              franjaHoraria = '09:00 - 18:00';
            }
          }
        }
      } catch (e) {
        console.error('Error al parsear fecha de turno:', e);
      }
    }
    
    // 2. Si no se pudo extraer con el patrón directo, intentar con DATE_PATTERNS
    if (!franjaHoraria) {
      const turnoText = turnoMatch?.[0] || message;
      
      for (const { pattern, handler } of DATE_PATTERNS) {
        try {
          const match = pattern.exec(turnoText);
          if (match) {
            try {
              const result = handler(match);
              if (result?.date) {
                // Validar formato de fecha resultante
                const dateParts = result.date.split('-');
                if (dateParts.length === 3) {
                  fechaEjecucion = result.date;
                }
              }
              if (result?.time) {
                // Validar formato de hora
                if (result.time.includes(':') && result.time.includes('-')) {
                  franjaHoraria = result.time;
                }
              }
              if (fechaEjecucion && franjaHoraria) break;
            } catch (e) {
              console.error('Error en el manejador de fecha:', e);
            }
          }
        } catch (e) {
          console.error('Error al procesar patrón de fecha:', e);
        }
      }
    }
    
    // 3. Validar y asegurar formato correcto de fecha
    if (!fechaEjecucion) {
      // Intentar extraer cualquier fecha del mensaje como último recurso
      const dateMatch = message.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
      if (dateMatch) {
        try {
          let [_, day, month, year] = dateMatch;
          year = year.length === 2 ? `20${year}` : year; // Asumir siglo 21 para años de 2 dígitos
          
          // Validar rangos de fecha
          const dayNum = parseInt(day, 10);
          const monthNum = parseInt(month, 10);
          
          if (monthNum >= 1 && monthNum <= 12 && dayNum >= 1 && dayNum <= 31) {
            fechaEjecucion = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
          }
        } catch (e) {
          console.error('Error al procesar fecha alternativa:', e);
        }
      }
      
      // Si después de todo no hay fecha, usar la actual
      if (!fechaEjecucion) {
        const today = new Date();
        fechaEjecucion = today.toISOString().split('T')[0];
      }
    }
    
    // 4. Validar y asegurar formato correcto de franja horaria
    if (!franjaHoraria) {
      // Intentar extraer cualquier horario del mensaje
      const timeMatch = message.match(/(\d{1,2}:\d{2})\s*[-a]\s*(\d{1,2}:\d{2})/i);
      if (timeMatch) {
        franjaHoraria = `${timeMatch[1].trim()} - ${timeMatch[2].trim()}`;
      } else {
        franjaHoraria = '09:00 - 18:00'; // Valor por defecto
      }
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

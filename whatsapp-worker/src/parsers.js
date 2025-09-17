const PEDIDO_PATTERNS = {
  CLEAN_CONTENT: /\[INFO\] Contenido limpio: "([\s\S]*?)"/i,
  FULL_MESSAGE: /\[INFO\] Mensaje completo: ([\s\S]*?)(?=\[INFO\]|$)/i,
  PEDIDO_NUM: /Pedido\s+(\d+)/i,
  CLIENTE: /^Cliente[\s:]+([^\n]+?)(?=\s*(?:Whatsapp|Tel[ée]fono|Descripci[óo]n|Direcci[óo]n|Domicilio|Barrio|TURNO|$)|\n\s*\n)/im,
  TELEFONO: /(?:Telefono|Teléfono|Whatsapp)[\s:]*(?:titular)?[\s:]*([\d\s+()-]+)/i,
  WHATSAPP_TITULAR: /(?:Whatsapp|Tel[ée]fono)[\s:]*(?:titular)?[\s:]*([\d\s+()-]+)/i,
  DESCRIPCION: /Descripción\s*(?:del servicio)?\s*:?\s*([\s\S]*?)(?=\s*(?:Dirección|Domicilio|Barrio|TURNO|$)|\n\s*\n)/i,
  DIRECCION: /(?:Dirección\s*(?:póliza|pedido|pedido:)|Domicilio)\s*:?\s*([^\n]+?)(?=\s*(?:Barrio|TURNO|$)|\n\s*\n)/i,
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
 * Parsea un mensaje de WhatsApp en formato Pedido
 * @param {string} message - Contenido del mensaje a parsear
 * @returns {Object|null} - Datos de la tarea o null si no se pudo parsear
 */
function parsePedidoMessage(message) {
  let cleanContentMatch = null;
  let fullMessageMatch = null;
  
  try {
    message = limitMessageSize(message);
    
    if (message.includes('[INFO]')) {
      cleanContentMatch = PEDIDO_PATTERNS.CLEAN_CONTENT.exec(message);
      if (cleanContentMatch?.[1]) {
        message = cleanContentMatch[1].trim();
      } else {
        fullMessageMatch = PEDIDO_PATTERNS.FULL_MESSAGE.exec(message);
        if (fullMessageMatch?.[1]) {
          message = fullMessageMatch[1].trim();
        }
      }
    }
    
    const cleanMessage = message
      .replace(/\*/g, '')        
      .replace(/\n\s*\n/g, '\n')  
      .trim();
    
    const lines = cleanMessage.split('\n').map(line => line.trim()).filter(line => line);
    
    // Buscar número de pedido
    const pedidoNumMatch = PEDIDO_PATTERNS.PEDIDO_NUM.exec(cleanMessage);
    if (!pedidoNumMatch) {
      console.log('No se encontró número de pedido en el mensaje');
      return null;
    }
    const numero = pedidoNumMatch[1].trim();
    
    let cliente = '';
    let numeroTitular = '';
    let descripcion = '';
    let direccion = '';
    
    // Buscar cliente y teléfono en el mensaje
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Buscar línea de cliente
      const clienteMatch = line.match(/^Cliente[\s:]+(.+)/i);
      if (clienteMatch && clienteMatch[1]) {
        cliente = clienteMatch[1]
          .replace(/[\s\u00A0\u202F\u2007\u2060\uFEFF]+/g, ' ')
          .replace(/\s*,\s*/g, ', ')
          .trim();
        
        // Verificar si en la misma línea hay un número de teléfono
        const telefonoEnLinea = line.match(/(?:Whatsapp|Tel[ée]fono)[\s:]+([\d\s+()-]+)/i);
        if (telefonoEnLinea && telefonoEnLinea[1]) {
          numeroTitular = telefonoEnLinea[1].trim();
        }
        
        // Si no se encontró teléfono, buscar en la siguiente línea
        if (!numeroTitular && i + 1 < lines.length) {
          const nextLine = lines[i + 1];
          const telefonoSiguienteLinea = nextLine.match(/(?:Whatsapp|Tel[ée]fono)[\s:]+([\d\s+()-]+)/i);
          if (telefonoSiguienteLinea && telefonoSiguienteLinea[1]) {
            numeroTitular = telefonoSiguienteLinea[1].trim();
            i++; // Saltar la línea del teléfono
          }
        }
        
        break; // Salir del bucle una vez encontrado el cliente
      }
      
      // Buscar teléfono si no se encontró con el cliente
      if (!numeroTitular) {
        const whatsappMatch = line.match(/Whatsapp\s*(?:titular)?\s*[\s:]+([\d\s+()-]+)/i);
        if (whatsappMatch && whatsappMatch[1]) {
          numeroTitular = whatsappMatch[1].trim();
          continue;
        }
        
        const telefonoMatch = line.match(/Telefono\s*(?:alt\.?)?\s*:?\s*([\d\s+()-]+)/i);
        if (telefonoMatch && telefonoMatch[1]) {
          numeroTitular = telefonoMatch[1].trim();
          continue;
        }
      }
    }
    
    if (numeroTitular) {
      numeroTitular = numeroTitular.replace(/\D/g, '');
    }
    
    let descripcionStart = -1;
    
    descripcionMatch = PEDIDO_PATTERNS.DESCRIPCION.exec(cleanMessage);
    
    if (!descripcionMatch || !descripcionMatch[1]?.trim()) {
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].toLowerCase();
        if (line.includes('descripción') || line.includes('descripcion') || line.includes('servicio:')) {
          descripcionStart = i;
          const descMatch = lines[i].split(/[:\-]\s*/);
          if (descMatch.length > 1) {
            const descText = descMatch.slice(1).join(':').trim();
            if (descText) {
              descripcion = descText;
              descripcionStart = i + 1;
            }
          }
          break;
        }
      }
    }
    
    if (descripcionMatch?.[1]?.trim()) {
      descripcion = descripcionMatch[1].trim();
    } else if (descripcionStart >= 0) {
      const descripcionLines = [];
      for (let i = descripcionStart; i < lines.length; i++) {
        const line = lines[i];
        if (line.match(/^(Dirección|Domicilio|Barrio|TURNO|Pedido|Cliente|Whatsapp|Tel[ée]fono)/i)) {
          break;
        }
        if (line.trim()) {
          descripcionLines.push(line.trim());
        }
      }
      
      if (descripcionLines.length > 0) {
        const newDesc = descripcionLines.join('\n').trim();
        if (newDesc) {
          descripcion = newDesc;
        }
      }
    }
    
    if (descripcionMatch && descripcionMatch[1]) {
      descripcion = descripcionMatch[1]
        .split('\n')  
        .map(line => line.trim())  
        .filter(line => {  
          const lowerLine = line.toLowerCase();
          return line && 
                 !lowerLine.startsWith('dirección') && 
                 !lowerLine.startsWith('domicilio') &&
                 !lowerLine.startsWith('turno');
        })
        .join('\n')  
        .replace(/\s*\n\s*/g, '\n')  
        .replace(/\s+/g, ' ')  
        .trim();
    }
    
    if (clienteMatch && clienteMatch[1]) {
      cliente = clienteMatch[1]
        .replace(/^\s*:\s*/, '')  
        .replace(/\s+/g, ' ')     
        .trim();
        
      const cleanCliente = cliente.split('\n')[0].trim();
      if (cleanCliente) {
        cliente = cleanCliente;
      }
    }
    
    try {
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const direccionMatch = line.match(/(?:Dirección\s*(?:póliza|pedido)|Domicilio)\s*:?\s*(.+)/i);
        if (direccionMatch) {
          let direccionText = direccionMatch[1].split(/\s+TURNO\s+/i)[0].trim();
          direccion = direccionText;
          
          let j = i + 1;
          const direccionLines = [direccion];
          
          while (j < lines.length) {
            if (lines[j].match(/^(TURNO|Barrio|Whatsapp|Telefono|Descripción|Cliente|Pedido)/i)) {
              break;
            }
            const lineText = lines[j].trim();
            if (lineText) {
              if (lineText.match(/\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/) || 
                  lineText.match(/\d{1,2}:\d{2}\s*[-–]\s*\d{1,2}:\d{2}/)) {
                break;
              }
              direccionLines.push(lineText);
            }
            j++;
          }
          
          direccion = direccionLines.join(', ')
            .replace(/\s*,\s*,/g, ', ')  
            .replace(/\s{2,}/g, ' ')     
            .trim()
            .replace(/\s*,\s*$/, '');   
            
          break;
        }
      }
      
      if (!direccion) {
        const direccionMatch = message.match(/Dirección[^\n]*\n([^\n]+)/i);
        if (direccionMatch) {
          direccion = direccionMatch[1].split(/\s+TURNO\s+/i)[0].trim();
        }
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
    
    if (turnoMatch?.[1] && turnoMatch[2]) {
      try {
        const [day, month, year] = turnoMatch[1].split('/');
        if (day && month && year) {
          const dayNum = parseInt(day, 10);
          const monthNum = parseInt(month, 10);
          const yearNum = parseInt(year, 10);
          
          if (!isNaN(dayNum) && !isNaN(monthNum) && !isNaN(yearNum) && 
              monthNum >= 1 && monthNum <= 12 && 
              dayNum >= 1 && dayNum <= 31) {
            
            fechaEjecucion = `${yearNum}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
            
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
    
    if (!franjaHoraria) {
      const turnoText = turnoMatch?.[0] || message;
      
      for (const { pattern, handler } of DATE_PATTERNS) {
        try {
          const match = pattern.exec(turnoText);
          if (match) {
            try {
              const result = handler(match);
              if (result?.date) {
                const dateParts = result.date.split('-');
                if (dateParts.length === 3) {
                  fechaEjecucion = result.date;
                }
              }
              if (result?.time) {
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
    
    if (!fechaEjecucion) {
      const dateMatch = message.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
      if (dateMatch) {
        try {
          let [_, day, month, year] = dateMatch;
          year = year.length === 2 ? `20${year}` : year;
          
          const dayNum = parseInt(day, 10);
          const monthNum = parseInt(month, 10);
          
          if (monthNum >= 1 && monthNum <= 12 && dayNum >= 1 && dayNum <= 31) {
            
            fechaEjecucion = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
            fechaEjecucion = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
          }
        } catch (e) {
          console.error('Error al procesar fecha alternativa:', e);
        }
      }
      
      if (!fechaEjecucion) {
        const today = new Date();
        fechaEjecucion = today.toISOString().split('T')[0];
      }
    }
    
    if (!franjaHoraria) {
      const timeMatch = message.match(/(\d{1,2}:\d{2})\s*[-a]\s*(\d{1,2}:\d{2})/i);
      if (timeMatch) {
        franjaHoraria = `${timeMatch[1].trim()} - ${timeMatch[2].trim()}`;
      } else {
        franjaHoraria = '09:00 - 18:00'; 
      }
    }
    
    if (!cliente || cliente.trim() === '') {
      cliente = 'Cliente no especificado';
    }
    
    const taskData = {
      numero: numero,
      titulo: `Pedido ${numero}`,
      cliente: cliente,
      numeroTitular: numeroTitular.replace(/\D/g, '').substring(0, 15), 
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
    let clienteMatch = PEDIDO_PATTERNS.CLIENTE.exec(message);
    
    if (!clienteMatch) {
      clienteMatch = [/Cliente:\s*([^\n]+)/i, /Cliente:[\s\n]+([^\n]+)/i]
        .map(regex => regex.exec(message))
        .find(match => match !== null);
    }
    
    const telefonoMatch = PEDIDO_PATTERNS.TELEFONO.exec(message);
    const whatsappMatch = PEDIDO_PATTERNS.WHATSAPP_TITULAR.exec(message);
    
    let direccionMatch = PEDIDO_PATTERNS.DIRECCION.exec(message);
    
    let descripcionMatch = PEDIDO_PATTERNS.DESCRIPCION.exec(message);
    
    if (!descripcionMatch || !descripcionMatch[1]?.trim()) {
      const descripcionRegex = /Descripción\s*(?:del servicio)?\s*:?\s*([\s\S]*?)(?=\s*(?:Dirección|Domicilio|Barrio|TURNO|$)|\n\s*\n)/i;
      descripcionMatch = descripcionRegex.exec(message);
    }
    
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

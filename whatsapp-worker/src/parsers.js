const PEDIDO_PATTERNS = {
  CLEAN_CONTENT: /\[INFO\] Contenido limpio: "([\s\S]*?)"/i,
  FULL_MESSAGE: /\[INFO\] Mensaje completo: ([\s\S]*?)(?=\[INFO\]|$)/i,
  PEDIDO_NUM: /Pedido\s+(\d+)/i,
  CLIENTE: /Cliente[\s:]*(.+?)(?=\s+(Whatsapp|Dirección|Descripcion|TURNO|Barrio|$))/is,
  TELEFONO: /(?:Telefono|Teléfono|Whatsapp)[\s:]*(?:titular)?[\s:]*([\d\s+()-]+)/i,
  WHATSAPP_TITULAR: /(?:Whatsapp|Tel[ée]fono)[\s:]*(?:titular)?[\s:]*([\d\s+()-]+)/i,
  DESCRIPCION: /Descripción\s*(?:del servicio)?\s*:?\s*([\s\S]*?)(?=\s*(?:Dirección|Domicilio|Barrio|TURNO|$)|\n\s*\n)/i,
  DIRECCION: /(?:Dirección\s*(?:póliza|pedido|pedido:)|Domicilio)\s*:?\s*([^\n]+?)(?=\s*(?:Barrio|TURNO|$)|\n\s*\n)/i,
  BARRIO: /Barrio\s*:?\s*([^\n]+?)(?=\s*(?:Recuerde|TURNO|\.|$))/i,
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
 * Limita el tamaño del mensaje para evitar problemas de memoria
 * @param {string} message - Mensaje original
 * @param {number} maxLength - Longitud máxima (por defecto 1000 caracteres)
 * @returns {string} - Mensaje truncado si es necesario
 */
function limitMessageSize(message, maxLength = 1000) {
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
    
    // Si el mensaje no tiene formato [INFO], procesarlo directamente
    if (!message.includes('[INFO]')) {
      console.log('Procesando mensaje directo sin formato [INFO]');
      return parseDirectMessage(message);
    }
    
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
    let barrio = '';
    
    // Buscar cliente y teléfono en el mensaje
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Buscar línea de cliente (formato: "Cliente: NOMBRE" o con texto en negrita)
      const clienteMatch = line.match(/^Cliente[\s:]+(.+)/i) || 
                         line.match(/^\*?Cliente[\s:]+\*?([^*\n]+)/i) ||
                         line.match(/^Cliente:\s*(.+)/i);
      
      if (clienteMatch && clienteMatch[1]) {
        cliente = clienteMatch[1]
          .replace(/[\s\u00A0\u202F\u2007\u2060\uFEFF\*]+/g, ' ') // Eliminar asteriscos y espacios especiales
          .replace(/\s*,\s*/g, ', ')
          .replace(/\s{2,}/g, ' ') // Reemplazar múltiples espacios por uno solo
          .trim();
        
        // Verificar si en la misma línea o la siguiente está el teléfono
        let telefonoEncontrado = false;
        
        // Buscar en la misma línea
        const telefonoEnLinea = line.match(/(?:Whatsapp|Tel[ée]fono|Whatsapp titular)[\s:]+([\d\s+()-]+)/i);
        if (telefonoEnLinea && telefonoEnLinea[1]) {
          numeroTitular = telefonoEnLinea[1].trim();
          telefonoEncontrado = true;
        }
        
        // Si no se encontró teléfono, buscar en la línea siguiente
        if (!telefonoEncontrado && i + 1 < lines.length) {
          const nextLine = lines[i + 1];
          const telefonoSiguienteLinea = nextLine.match(/(?:Whatsapp|Tel[ée]fono|Whatsapp titular)[\s:]+([\d\s+()-]+)/i);
          if (telefonoSiguienteLinea && telefonoSiguienteLinea[1]) {
            numeroTitular = telefonoSiguienteLinea[1].trim();
            i++; // Saltar la línea del teléfono
            telefonoEncontrado = true;
          }
        }
        
        // Si aún no se encontró, buscar en cualquier parte del mensaje
        if (!telefonoEncontrado) {
          const telefonoEnCualquierLinea = cleanMessage.match(/(?:Whatsapp|Tel[ée]fono|Whatsapp titular)[\s:]+([\d\s+()-]+)/i);
          if (telefonoEnCualquierLinea && telefonoEnCualquierLinea[1]) {
            numeroTitular = telefonoEnCualquierLinea[1].trim();
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
    
    if (direccionMatch && direccionMatch[1]) {
      direccion = direccionMatch[1]
        .replace(/^\s*:\s*/, '')
        .replace(/\s+/g, ' ')
        .replace(/(?<=\d)\s*\([^)]+\)/g, '') // Eliminar texto entre paréntesis después de números
        .replace(/,\s*undefined/g, '') // Eliminar ', undefined' de la dirección
        .replace(/\s*Descripción dirección póliza:.*/i, '') // Eliminar descripción de póliza si existe
        .replace(/\s*Dirección pedido:.*/i, '') // Eliminar etiqueta si quedó
        .replace(/\s*Dirección póliza:.*/i, '') // Eliminar etiqueta si quedó
        .replace(/\s{2,}/g, ' ') // Normalizar espacios múltiples
        .trim();
        
      // Si la dirección parece estar vacía o es muy corta, intentar con la descripción de la póliza
      if (direccion.length < 10) {
        const descripcionMatch = cleanMessage.match(/Descripción dirección póliza:\s*([^\n]+)/i);
        if (descripcionMatch && descripcionMatch[1]) {
          direccion = descripcionMatch[1]
            .replace(/^\s*:\s*/, '')
            .replace(/\s+/g, ' ')
            .replace(/undefined/g, '')
            .trim();
        }
      }
    }
    
    // Buscar descripción
    let descripcionMatch = PEDIDO_PATTERNS.DESCRIPCION.exec(cleanMessage);
    
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
    
    // Clean up client name if it contains multiple lines
    if (cliente) {
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
  // Format: Expediente: 3207230 or expediente: 3207230 (can be anywhere in the message)
  EXPEDIENTE: /(?:^|\n|\s)(?:Expediente|expediente):[\s\n]*([^\n\s]+)/i,
  CUENTA: /(?:^|\n|\s)(?:Cuenta|cuenta):[\s\n]*([^\n]+)/i,
  CLIENTE: /(?:^|\n|\s)(?:Cliente|cliente|Usuario|usuario):[\s\n]*([^\n]+)/i,
  TELEFONO: /(?:^|\n|\s)(?:Tel[ée]fono|tel[ée]fono|telefono):[\s\n]*([^\n]+)/i,
  DIRECCION: /(?:^|\n|\s)(?:Direccion|direccion|Domicilio|domicilio):[\s\n]*([^\n]+)/i,
  PROBLEMA: /(?:^|\n|\s)(?:Problema|problema):[\s\n]*([^]+?)(?=\n\s*(?:[a-zA-ZáéíóúÁÉÍÓÚ]+:|$))/i,
  // Date formats:
  // - Cita: Martes 30/09 de 14hs a 16hs
  // - cita: viernes 10/10 de 9 a 12 hs
  // - Cita: lunes 29/12/ de 11 a 14 hs
  FECHA_HORA: /(?:Cita|cita):[\s\n]*[a-zA-ZáéíóúÁÉÍÓÚ]*[\s\n]*(\d{1,2}[\/\s-]\d{1,2}(?:[\/\s-]\d{2,4})?)[\s\/]*(?:de)?[\s\n]*(\d{1,2}):?(\d{2})?[\s-]*(?:a|y)[\s-]*(\d{1,2}):?(\d{2})?[\s\n]*(?:hs)?/i,
  // Alternative time format: de 9 a 12 hs
  FECHA_HORA_ALT: /(?:Cita|cita):[\s\n]*[a-zA-ZáéíóúÁÉÍÓÚ]*[\s\n]*(\d{1,2}[\/\s-]\d{1,2}(?:[\/\s-]\d{2,4})?)[\s\/]*(?:de)?[\s\n]*(\d{1,2})\s*(?:a|y)\s*(\d{1,2})[\s\n]*(?:hs)?/i,
  // Fallback date pattern
  FECHA_SIMPLE: /(\d{1,2}[\/\s-]\d{1,2}(?:[\/\s-]\d{2,4})?)/i
};

function parseExpedienteMessage(message) {
  try {
    // Clean and normalize the message
    message = limitMessageSize(message)
      .replace(/\*/g, '')  // Remove asterisks
      .replace(/[\u00A0\u1680\u2000-\u200D\u202F\u205F\u3000\uFEFF]/g, ' ') // Replace different space characters with normal space
      .replace(/\s+/g, ' ') // Replace multiple spaces with single space
      .trim();
    
    // Parse expediente number - now it can be anywhere in the message
    const expedienteMatch = EXPEDIENTE_PATTERNS.EXPEDIENTE.exec(message);
    if (!expedienteMatch?.[1]?.trim()) {
      console.error('No se encontró número de expediente en el mensaje');
      return null;
    }
    
    // Remove any text before the expediente number to avoid false positives
    const messageStart = message.indexOf(expedienteMatch[0]);
    const cleanMessage = messageStart > 0 ? message.substring(messageStart) : message;
    
    const numero = expedienteMatch[1].trim();
    
    // Parse other fields using the cleaned message
    const cuentaMatch = EXPEDIENTE_PATTERNS.CUENTA.exec(cleanMessage) || EXPEDIENTE_PATTERNS.CUENTA.exec(message);
    const clienteMatch = EXPEDIENTE_PATTERNS.CLIENTE.exec(cleanMessage) || EXPEDIENTE_PATTERNS.CLIENTE.exec(message);
    const telefonoMatch = EXPEDIENTE_PATTERNS.TELEFONO.exec(cleanMessage) || EXPEDIENTE_PATTERNS.TELEFONO.exec(message);
    const direccionMatch = EXPEDIENTE_PATTERNS.DIRECCION.exec(cleanMessage) || EXPEDIENTE_PATTERNS.DIRECCION.exec(message);
    const problemaMatch = EXPEDIENTE_PATTERNS.PROBLEMA.exec(cleanMessage) || EXPEDIENTE_PATTERNS.PROBLEMA.exec(message);
    
    // Parse date and time
    let fechaEjecucion = '';
    let franjaHoraria = '';
    
    // Try different date patterns in both cleaned and original message
    let fechaHoraMatch = EXPEDIENTE_PATTERNS.FECHA_HORA.exec(cleanMessage) || 
                        EXPEDIENTE_PATTERNS.FECHA_HORA_ALT.exec(cleanMessage) ||
                        EXPEDIENTE_PATTERNS.FECHA_HORA.exec(message) || 
                        EXPEDIENTE_PATTERNS.FECHA_HORA_ALT.exec(message);
    
    if (fechaHoraMatch) {
      try {
        // Parse date (handle different date formats: DD/MM/YYYY, DD/MM/YY, DD/MM/)
        let dateStr = fechaHoraMatch[1].replace(/[\s-]/g, '/');
        dateStr = dateStr.replace(/\/+$/, ''); // Remove trailing slash
        const dateParts = dateStr.split('/');
        
        let day = dateParts[0].padStart(2, '0');
        let month = dateParts[1].padStart(2, '0');
        let year = dateParts[2] || new Date().getFullYear().toString();
        
        // Handle 2-digit year
        if (year.length === 2) {
          const currentYear = new Date().getFullYear();
          const century = Math.floor(currentYear / 100) * 100;
          year = (parseInt(year) > (currentYear % 100) + 1) ? century - 100 + parseInt(year) : century + parseInt(year);
        }
        
        // Validate date
        const parsedDate = new Date(`${year}-${month}-${day}`);
        if (isNaN(parsedDate.getTime())) {
          console.warn('Fecha inválida detectada, usando fecha actual');
          fechaEjecucion = new Date().toISOString().split('T')[0];
        } else {
          fechaEjecucion = `${year}-${month}-${day}`;
        }
        
        // Parse time - check which pattern matched
        let startHour, startMinute, endHour, endMinute;
        
        if (fechaHoraMatch[0].includes(' a ') && !fechaHoraMatch[0].includes(':')) {
          // Format: "de 9 a 12 hs"
          startHour = (fechaHoraMatch[2] || '').padStart(2, '0');
          startMinute = '00';
          endHour = (fechaHoraMatch[3] || '').padStart(2, '0');
          endMinute = '00';
        } else {
          // Standard format with colons
          startHour = fechaHoraMatch[2] || '';
          startMinute = fechaHoraMatch[3] || '00';
          endHour = fechaHoraMatch[4] || '';
          endMinute = fechaHoraMatch[5] || '00';
        }
        
        if (startHour) {
          const formattedStartTime = `${startHour.padStart(2, '0')}:${startMinute}`;
          const formattedEndTime = endHour 
            ? `${endHour.padStart(2, '0')}:${endMinute}`
            : `${(parseInt(startHour) + 1).toString().padStart(2, '0')}:00`;
          
          franjaHoraria = `${formattedStartTime} - ${formattedEndTime}`;
        }
      } catch (error) {
        console.error('Error al parsear fecha/hora:', error);
        // Set default values
        fechaEjecucion = new Date().toISOString().split('T')[0];
        franjaHoraria = '';
      }
    } else {
      // Try to find any date pattern as fallback
      const fallbackDateMatch = EXPEDIENTE_PATTERNS.FECHA_SIMPLE.exec(message);
      if (fallbackDateMatch) {
        try {
          let dateStr = fallbackDateMatch[1].replace(/[\s-]/g, '/');
          dateStr = dateStr.replace(/\/+$/, ''); // Remove trailing slash
          const dateParts = dateStr.split('/');
          
          let day = dateParts[0].padStart(2, '0');
          let month = dateParts[1].padStart(2, '0');
          let year = dateParts[2] || new Date().getFullYear().toString();
          
          // Handle 2-digit year
          if (year.length === 2) {
            const currentYear = new Date().getFullYear();
            const century = Math.floor(currentYear / 100) * 100;
            year = (parseInt(year) > (currentYear % 100) + 1) ? century - 100 + parseInt(year) : century + parseInt(year);
          }
          
          fechaEjecucion = `${year}-${month}-${day}`;
        } catch (error) {
          fechaEjecucion = new Date().toISOString().split('T')[0];
        }
      } else {
        // Default to today if no date found
        fechaEjecucion = new Date().toISOString().split('T')[0];
      }
    }
    
    // Clean and format the problem/description
    let problema = '';
    if (problemaMatch?.[1]) {
      problema = problemaMatch[1]
        .replace(/\s+/g, ' ')
        .replace(/^\s*[\n\r]+|[\.\,\;\s]+$/g, '')
        .trim();
      
      // Remove any trailing time or date patterns that might have been included
      problema = problema.replace(/\s*\d{1,2}[\/\s-]\d{1,2}(?:[\/\s-]\d{2,4})?.*$/, '').trim();
    }
    
    // Build description from available information
    const descripcion = [];
    if (problema) descripcion.push(`Problema: ${problema}`);
    if (cuentaMatch?.[1]?.trim()) descripcion.push(`Cuenta: ${cuentaMatch[1].trim()}`);
    
    const taskData = {
      numero: numero,
      titulo: `Expediente ${numero}${clienteMatch?.[1] ? ` - ${clienteMatch[1].trim()}` : ''}`,
      cliente: clienteMatch?.[1]?.trim() || 'Sin nombre',
      descripcion: descripcion.join('\n') || 'Sin descripción',
      direccion: direccionMatch?.[1]?.trim() || 'Sin dirección',
      numeroTitular: telefonoMatch?.[1]?.trim().replace(/[^\d+]/g, '') || '',
      fechaEjecucion: fechaEjecucion,
      franja_horaria: franjaHoraria,
      estado: 'pendiente',
      tecnicos: [],
      creadoPor: process.env.DEFAULT_USER_ID || null,
      fechaCreacion: new Date().toISOString(),
      fechaModificacion: new Date().toISOString(),
      origen: 'whatsapp',
      mensajeOriginal: message // Keep original message for debugging
    };
    
    console.log('Datos extraídos del mensaje:', JSON.stringify(taskData, null, 2));
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

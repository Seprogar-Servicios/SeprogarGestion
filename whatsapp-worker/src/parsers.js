/**
 * Parsers para extraer información de tareas de diferentes formatos de mensajes
 */

/**
 * Parsea un mensaje en formato Pedido
 * @param {string} message - Contenido del mensaje
 * @returns {Object|null} - Datos de la tarea o null si no se pudo parsear
 */
function parsePedidoMessage(message) {
  try {
    // Verificar si el mensaje contiene logs del sistema
    if (message.includes('[INFO]')) {
      // Buscar el mensaje limpio si está disponible
      const cleanContentMatch = message.match(/\[INFO\] Contenido limpio: "([\s\S]*)"/i);
      if (cleanContentMatch && cleanContentMatch[1]) {
        message = cleanContentMatch[1];
      } else {
        // Si no hay contenido limpio, intentar extraer el mensaje completo
        const fullMessageMatch = message.match(/\[INFO\] Mensaje completo: ([\s\S]*?)(?=\[INFO\]|$)/i);
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
    const numeroMatch = message.match(/Pedido\s+(\d+)/i);
    const numero = numeroMatch ? numeroMatch[1] : null;
    
    if (!numero) {
      return null; // Si no hay número de pedido, no podemos continuar
    }
    
    // Extraer el título (será "Pedido" + número)
    const titulo = `Pedido ${numero}`;
    
    // Extraer cliente
    const clienteMatch = message.match(/Cliente:\s*([^\n]+)/i);
    const cliente = clienteMatch ? clienteMatch[1].trim() : null;
    
    // Extraer número de WhatsApp del titular (más flexible con mayúsculas/minúsculas)
    let numeroTitular = '';
    
    // Patrón principal: "Whatsapp titular: 123456789"
    const numeroTitularMatch = message.match(/[Ww]hatsapp\s+titular:\s*([^\n]+)/i);
    if (numeroTitularMatch && numeroTitularMatch[1].trim()) {
      numeroTitular = numeroTitularMatch[1].trim();
    } else {
      // Patrón alternativo: "teléfono de la persona que los recibe: 123456789"
      const telefonoMatch = message.match(/tel[eé]fono[^:]*:\s*([^\n]+)/i);
      if (telefonoMatch && telefonoMatch[1].trim()) {
        numeroTitular = telefonoMatch[1].trim();
      }
    }
    
    // Si aún no se encontró, buscar cualquier número de teléfono en el mensaje
    if (!numeroTitular) {
      const anyPhoneMatch = message.match(/(?:tel[eé]fono|celular|contacto|llamar)[^\d]*(\d{8,})/i);
      if (anyPhoneMatch) {
        numeroTitular = anyPhoneMatch[1].trim();
      } else {
        // Si no se encuentra ningún número, usar un string vacío
        numeroTitular = '';
      }
    }
    
    // Extraer la descripción del servicio
    let descripcion = null;
    const descripcionMatch = message.match(/Descripción del servicio:\s*([^\n]+)/i);
    if (descripcionMatch) {
      descripcion = descripcionMatch[1].trim();
    }
    
    // Si no se encontró descripción, intentar con un patrón más flexible
    if (!descripcion || descripcion === '') {
      const lineas = message.split('\n');
      for (let i = 0; i < lineas.length; i++) {
        if (lineas[i].toLowerCase().includes('descripción del servicio')) {
          descripcion = lineas[i].split(':')[1]?.trim() || '';
          break;
        }
      }
    }
    
    // Si aún no se encontró descripción, buscar en el mensaje completo
    if (!descripcion || descripcion === '') {
      // Buscar cualquier texto entre "Descripción del servicio:" y la siguiente línea
      const fullDescMatch = message.match(/Descripción del servicio:([\s\S]*?)(?=Dirección|Barrio|TURNO|$)/i);
      if (fullDescMatch && fullDescMatch[1]) {
        descripcion = fullDescMatch[1].trim();
      }
    }
    
    // Extraer dirección (puede ser "Dirección póliza" o "Dirección pedido")
    let direccionMatch = message.match(/Dirección póliza:\s*([^\n]+)/i);
    if (!direccionMatch) {
      direccionMatch = message.match(/Dirección pedido:\s*([^\n]+)/i);
    }
    const direccion = direccionMatch ? direccionMatch[1].trim() : null;
    
    // Extraer fecha de ejecución y franja horaria
    let fechaEjecucion = null;
    let franja_horaria = null;
    
    // Intentar diferentes formatos de fecha y hora
    const datePatterns = [
      // Formato 1: TURNO confirmado fecha DD/MM/AAAA HH:MM-HH:MM
      {
        pattern: /TURNO\s+confirmado\s+fecha\s+(\d{1,2}\/\d{1,2}\/\d{4})\s+(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})/i,
        handler: (match) => {
          const [_, date, startTime, endTime] = match;
          const [day, month, year] = date.split('/');
          return {
            date: `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`,
            time: `${startTime} - ${endTime}`
          };
        }
      },
      // Formato 2: TURNO...fecha...DD/MM/AAAA...HH:MM...-...HH:MM
      {
        pattern: /TURNO[^\n]*fecha[^\n]*(\d{1,2}\/\d{1,2}\/\d{4})[^\n]*(\d{1,2}:\d{2})[^\n]*-[^\n]*(\d{1,2}:\d{2})/i,
        handler: (match) => {
          const [_, date, startTime, endTime] = match;
          const [day, month, year] = date.split('/');
          return {
            date: `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`,
            time: `${startTime} - ${endTime}`
          };
        }
      },
      // Formato 3: DD/MM/AAAA HH:MM-HH:MM
      {
        pattern: /(\d{1,2}\/\d{1,2}\/\d{4})\s+(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})/i,
        handler: (match) => {
          const [_, date, startTime, endTime] = match;
          const [day, month, year] = date.split('/');
          return {
            date: `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`,
            time: `${startTime} - ${endTime}`
          };
        }
      },
      // Formato 4: TURNO...fecha DD/MM/AAAA franja horaria H a H hs
      {
        pattern: /TURNO[^\n]*fecha\s+(\d{1,2}\/\d{1,2}\/\d{4})\s+franja\s+horaria\s+(\d{1,2})\s+a\s+(\d{1,2})\s+hs/i,
        handler: (match) => {
          const [_, date, startHour, endHour] = match;
          const [day, month, year] = date.split('/');
          return {
            date: `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`,
            time: `${startHour.padStart(2, '0')}:00 - ${endHour.padStart(2, '0')}:00`
          };
        }
      },
      // Formato 5: DD/MM DE H A H HS (nuevo formato)
      {
        pattern: /(\d{1,2})\s*\/\s*(\d{1,2})\s+DE\s+(\d+)\s+A\s+(\d+)\s+HS/i,
        handler: (match) => {
          const [_, day, month, startHour, endHour] = match;
          const year = new Date().getFullYear();
          return {
            date: `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`,
            time: `${startHour.padStart(2, '0')}:00 - ${endHour.padStart(2, '0')}:00`
          };
        }
      }
    ];

    // Probar cada patrón hasta encontrar una coincidencia
    for (const { pattern, handler } of datePatterns) {
      const match = message.match(pattern);
      if (match) {
        const result = handler(match);
        fechaEjecucion = result.date;
        franja_horaria = result.time;
        break;
      }
    }
    
    // Crear objeto de tarea con tipos garantizados
    return {
      numero: numero || '',
      titulo: titulo || '',
      cliente: cliente || '',
      numeroTitular: numeroTitular || '', // Garantizar que sea string
      descripcion: descripcion || '',
      direccion: direccion || '',
      fechaEjecucion: fechaEjecucion || '',
      franja_horaria: franja_horaria || '',
      estado: 'pendiente',
      tecnicos: [],
      creadoPor: process.env.DEFAULT_USER_ID || null,
      fechaCreacion: new Date(),
      fechaModificacion: new Date()
    };
  } catch (error) {
    console.error('Error al parsear mensaje de Pedido:', error);
    return null;
  }
}

/**
 * Parsea un mensaje en formato TAREA
 * @param {string} message - Contenido del mensaje
 * @returns {Object|null} - Datos de la tarea o null si no se pudo parsear
 */
function parseTareaMessage(message) {
  try {
    // Extraer campos usando expresiones regulares
    const numeroMatch = message.match(/Numero:\s*([^\n]+)/i);
    const numero = numeroMatch ? numeroMatch[1].trim() : null;
    
    if (!numero) {
      return null; // Si no hay número, no podemos continuar
    }
    
    const tituloMatch = message.match(/Titulo:\s*([^\n]+)/i);
    const titulo = tituloMatch ? tituloMatch[1].trim() : null;
    
    const descripcionMatch = message.match(/Descripcion:\s*([^\n]+)/i);
    const descripcion = descripcionMatch ? descripcionMatch[1].trim() : null;
    
    const clienteMatch = message.match(/Cliente:\s*([^\n]+)/i);
    const cliente = clienteMatch ? clienteMatch[1].trim() : null;
    
    const numeroTitularMatch = message.match(/NumeroTitular:\s*([^\n]+)/i);
    const numeroTitular = numeroTitularMatch ? numeroTitularMatch[1].trim() : null;
    
    const direccionMatch = message.match(/Direccion:\s*([^\n]+)/i);
    const direccion = direccionMatch ? direccionMatch[1].trim() : null;
    
    const franjaMatch = message.match(/Franja:\s*([^\n]+)/i);
    const franja_horaria = franjaMatch ? franjaMatch[1].trim() : null;
    
    const fechaEjecucionMatch = message.match(/FechaEjecucion:\s*([^\n]+)/i);
    let fechaEjecucion = null;
    
    if (fechaEjecucionMatch) {
      // La fecha ya debería estar en formato YYYY-MM-DD
      fechaEjecucion = fechaEjecucionMatch[1].trim();
    }
    
    // Crear objeto de tarea
    return {
      numero,
      titulo,
      descripcion,
      cliente,
      numeroTitular,
      direccion,
      fechaEjecucion,
      franja_horaria,
      estado: 'pendiente',
      tecnicos: [],
      creadoPor: process.env.DEFAULT_USER_ID || null,
      fechaCreacion: new Date(),
      fechaModificacion: new Date()
    };
  } catch (error) {
    console.error('Error al parsear mensaje de TAREA:', error);
    return null;
  }
}

/**
 * Parsea un mensaje en formato Expediente
 * @param {string} message - Contenido del mensaje
 * @returns {Object|null} - Datos de la tarea o null si no se pudo parsear
 */
function parseExpedienteMessage(message) {
  try {
    // Extraer el número de expediente
    const expedienteMatch = message.match(/Expediente:\s*(\d+)/i);
    const numero = expedienteMatch ? expedienteMatch[1] : null;
    
    if (!numero) {
      return null; // Si no hay número de expediente, no podemos continuar
    }
    
    // Extraer cliente (Cuenta)
    const cuentaMatch = message.match(/Cuenta:\s*([^\n]+)/i);
    const cliente = cuentaMatch ? cuentaMatch[1].trim() : null;
    
    // Extraer NU (Nombre del Usuario)
    const nuMatch = message.match(/NU:\s*([^\n]+)/i);
    const nombreUsuario = nuMatch ? nuMatch[1].trim() : null;
    
    // Extraer número de teléfono
    const telefonoMatch = message.match(/Teléfono:\s*([^\n]+)/i);
    const numeroTitular = telefonoMatch ? telefonoMatch[1].trim() : null;
    
    // Extraer servicio (título)
    const servicioMatch = message.match(/Servicio:\s*([^\n]+)/i);
    const titulo = servicioMatch ? servicioMatch[1].trim() : null;
    
    // Extraer sección Ocurrido
    const ocurridoMatch = message.match(/Ocurrido:\s*([^\n]+)/i);
    const ocurrido = ocurridoMatch ? ocurridoMatch[1].trim() : null;
    
    // Variables para almacenar los datos extraídos de Ocurrido
    let descripcion = null;
    let direccion = null;
    let fechaEjecucion = null;
    let franja_horaria = null;
    
    // Procesar la sección Ocurrido si existe
    if (ocurrido) {
      // Dividir usando //// como separador
      const partes = ocurrido.split('////').map(parte => parte.trim());
      
      // Primera parte es la descripción
      if (partes.length > 0) {
        descripcion = partes[0].trim();
      }
      
      // Segunda parte es la dirección
      if (partes.length > 1) {
        direccion = partes[1].trim();
      }
      
      // Cuarta parte contiene fecha y franja horaria
      if (partes.length > 3) {
        const fechaFranjaStr = partes[3].trim();
        
        // Extraer fecha y franja horaria
        // Formato esperado: "remedios de escalada, 28/08/2025 de 08:00 a 11:00"
        const fechaFranjaMatch = fechaFranjaStr.match(/(\d{1,2}\/\d{1,2}\/\d{4})\s+de\s+(\d{1,2}:\d{1,2})\s+a\s+(\d{1,2}:\d{1,2})/i);
        
        if (fechaFranjaMatch) {
          // Convertir fecha de formato DD/MM/YYYY a YYYY-MM-DD
          const fechaParts = fechaFranjaMatch[1].split('/');
          if (fechaParts.length === 3) {
            const dia = fechaParts[0].padStart(2, '0');
            const mes = fechaParts[1].padStart(2, '0');
            const anio = fechaParts[2];
            fechaEjecucion = `${anio}-${mes}-${dia}`;
          }
          
          // Extraer franja horaria
          franja_horaria = `${fechaFranjaMatch[2]} - ${fechaFranjaMatch[3]}`;
        }
      }
    }
    
    // Crear objeto de tarea
    return {
      numero,
      titulo,
      descripcion,
      cliente,
      numeroTitular,
      direccion,
      fechaEjecucion,
      franja_horaria,
      estado: 'pendiente',
      tecnicos: [],
      creadoPor: process.env.DEFAULT_USER_ID || null,
      fechaCreacion: new Date(),
      fechaModificacion: new Date()
    };
  } catch (error) {
    console.error('Error al parsear mensaje de Expediente:', error);
    return null;
  }
}

module.exports = {
  parsePedidoMessage,
  parseTareaMessage,
  parseExpedienteMessage
};

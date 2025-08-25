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
    // Extraer el número de pedido
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
    
    // Extraer número de WhatsApp del titular
    const numeroTitularMatch = message.match(/Whatsapp titular:\s*([^\n]+)/i);
    const numeroTitular = numeroTitularMatch ? numeroTitularMatch[1].trim() : null;
    
    // Extraer descripción del servicio (desde "Descripción del servicio:" hasta "Dirección" o "Barrio")
    let descripcion = null;
    const descripcionStartMatch = message.match(/Descripción del servicio:\s*([^\n]+)/i);
    
    if (descripcionStartMatch) {
      const startIndex = message.indexOf(descripcionStartMatch[0]) + descripcionStartMatch[0].length;
      
      // Buscar dónde termina la descripción (en "Dirección" o "Barrio")
      const direccionIndex = message.indexOf('Dirección', startIndex);
      const barrioIndex = message.indexOf('Barrio:', startIndex);
      
      let endIndex;
      if (direccionIndex !== -1 && barrioIndex !== -1) {
        endIndex = Math.min(direccionIndex, barrioIndex);
      } else if (direccionIndex !== -1) {
        endIndex = direccionIndex;
      } else if (barrioIndex !== -1) {
        endIndex = barrioIndex;
      } else {
        // Si no encuentra ninguno, buscar el siguiente campo o usar el final del mensaje
        const turnoIndex = message.indexOf('TURNO', startIndex);
        endIndex = turnoIndex !== -1 ? turnoIndex : message.length;
      }
      
      descripcion = message.substring(startIndex, endIndex).trim();
    }
    
    // Extraer dirección
    const direccionMatch = message.match(/Dirección póliza:\s*([^\n]+)/i);
    const direccion = direccionMatch ? direccionMatch[1].trim() : null;
    
    // Extraer fecha de ejecución y franja horaria
    let fechaEjecucion = null;
    let franja_horaria = null;
    
    const turnoMatch = message.match(/TURNO confirmado fecha\s+(\d{1,2}\/\d{1,2}\/\d{4})\s+(\d{1,2}:\d{2})-(\d{1,2}:\d{2})/i);
    
    if (turnoMatch) {
      // Convertir fecha de formato DD/MM/YYYY a YYYY-MM-DD
      const fechaParts = turnoMatch[1].split('/');
      if (fechaParts.length === 3) {
        const dia = fechaParts[0].padStart(2, '0');
        const mes = fechaParts[1].padStart(2, '0');
        const anio = fechaParts[2];
        fechaEjecucion = `${anio}-${mes}-${dia}`;
      }
      
      // Extraer franja horaria
      franja_horaria = `${turnoMatch[2]} - ${turnoMatch[3]}`;
    }
    
    // Crear objeto de tarea
    return {
      numero,
      titulo,
      cliente,
      numeroTitular,
      descripcion,
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

module.exports = {
  parsePedidoMessage,
  parseTareaMessage
};

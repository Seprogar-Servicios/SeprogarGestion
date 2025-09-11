const Tarea = require('../models/Tarea');
const { tareaSchema } = require('../utils/validators');

// Crear tarea desde el worker (sin requerir usuario autenticado)
exports.createTarea = async (req, res) => {
  try {
    // Validar los datos de entrada
    const { error, value: datosValidados } = tareaSchema.validate(req.body, { abortEarly: false });
    
    if (error) {
      const errors = error.details.map(detail => detail.message).join('; ');
      console.error('Error de validación:', errors);
      return res.status(400).json({ 
        success: false,
        message: `Error de validación: ${errors}`,
        errors: error.details
      });
    }
    
    // Procesar la fecha de ejecución para evitar problemas de zona horaria
    const datosAjustados = { ...datosValidados };
    
    // Asegurar que la fecha de ejecución esté en el formato correcto
    if (datosAjustados.fechaEjecucion) {
      if (datosAjustados.fechaEjecucion instanceof Date) {
        // Si es un objeto Date, convertirlo a string YYYY-MM-DD
        const date = new Date(datosAjustados.fechaEjecucion);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        datosAjustados.fechaEjecucion = `${year}-${month}-${day}`;
      } else if (typeof datosAjustados.fechaEjecucion === 'string') {
        // Si es un string, asegurarse de que esté en el formato correcto
        if (datosAjustados.fechaEjecucion.includes('T')) {
          // Si viene en formato ISO, extraer solo la parte de la fecha
          datosAjustados.fechaEjecucion = datosAjustados.fechaEjecucion.split('T')[0];
        }
        // Validar que tenga el formato YYYY-MM-DD
        if (!/^\d{4}-\d{2}-\d{2}$/.test(datosAjustados.fechaEjecucion)) {
          console.error('Formato de fecha inválido:', datosAjustados.fechaEjecucion);
          return res.status(400).json({
            success: false,
            message: 'Formato de fecha inválido. Use YYYY-MM-DD'
          });
        }
      }
      console.log('Worker - Fecha de ejecución procesada:', datosAjustados.fechaEjecucion);
    }
  
    // Crear la tarea sin asignar creadoPor
    const tarea = new Tarea({
      ...datosAjustados,
      // Usar un ID fijo para el sistema o null
      creadoPor: null,
      fechaCreacion: new Date(),
      fechaModificacion: new Date(),
      // Asegurar que los campos opcionales tengan valores por defecto
      descripcion: datosAjustados.descripcion || '',
      tecnicos: datosAjustados.tecnicos || [],
      estado: datosAjustados.estado || 'pendiente',
      origen: datosAjustados.origen || 'whatsapp',
      grupoOrigen: datosAjustados.grupoOrigen || '',
      mensajeOriginal: datosAjustados.mensajeOriginal || '',
    });
    
    // Guardar la tarea
    const tareaGuardada = await tarea.save();
    
    console.log('Tarea creada exitosamente:', {
      _id: tareaGuardada._id,
      numero: tareaGuardada.numero,
      titulo: tareaGuardada.titulo,
      cliente: tareaGuardada.cliente,
      fechaEjecucion: tareaGuardada.fechaEjecucion,
      origen: tareaGuardada.origen
    });
    
    res.status(201).json({ 
      success: true, 
      data: tareaGuardada, 
      message: 'Tarea creada exitosamente desde WhatsApp Worker' 
    });
  } catch (err) {
    console.error('Error al crear tarea desde worker:', err);
    res.status(500).json({ 
      message: 'Error al crear tarea', 
      error: err.message 
    });
  }
};

// Verificar si una tarea existe por número
exports.checkDuplicateTarea = async (req, res) => {
  try {
    const { numero } = req.params;
    const tarea = await Tarea.findOne({ numero });
    return res.json({ exists: !!tarea });
  } catch (error) {
    console.error('Error al verificar tarea duplicada:', error);
    return res.status(500).json({ message: 'Error al verificar tarea duplicada' });
  }
};

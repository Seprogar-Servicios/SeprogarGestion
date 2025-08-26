const Tarea = require('../models/Tarea');
const { tareaSchema } = require('../utils/validators');

// Crear tarea desde el worker (sin requerir usuario autenticado)
exports.createTarea = async (req, res) => {
  const { error } = tareaSchema.validate(req.body);
  if (error) return res.status(400).json({ message: error.details[0].message });
  
  try {
    // Crear la tarea sin asignar creadoPor
    const tarea = new Tarea({
      ...req.body,
      // Usar un ID fijo para el sistema o null
      creadoPor: null,
      fechaCreacion: new Date(),
      fechaModificacion: new Date(),
    });
    
    await tarea.save();
    
    res.status(201).json({ 
      success: true, 
      data: tarea, 
      message: 'Tarea creada desde WhatsApp Worker' 
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

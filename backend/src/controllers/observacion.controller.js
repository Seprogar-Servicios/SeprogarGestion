const Observacion = require('../models/Observacion');
const Tarea = require('../models/Tarea');

// @desc    Obtener todas las observaciones de una tarea
// @route   GET /api/observaciones/tarea/:tareaId
// @access  Privado
exports.getObservacionesByTarea = async (req, res, next) => {
  try {
    const { tareaId } = req.params;
    
    // Verificar que la tarea existe
    const tarea = await Tarea.findById(tareaId);
    if (!tarea) {
      return res.status(404).json({ message: 'Tarea no encontrada' });
    }

    const observaciones = await Observacion.find({ tarea: tareaId })
      .sort({ fechaCreacion: -1 });

    res.status(200).json({
      success: true,
      count: observaciones.length,
      data: observaciones
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Crear una nueva observación
// @route   POST /api/observaciones
// @access  Privado
exports.createObservacion = async (req, res, next) => {
  try {
    const { titulo, descripcion, tarea } = req.body;
    
    // Verificar que la tarea existe
    const tareaExistente = await Tarea.findById(tarea);
    if (!tareaExistente) {
      return res.status(404).json({ message: 'Tarea no encontrada' });
    }

    // Crear la observación
    const observacion = await Observacion.create({
      titulo,
      descripcion,
      tarea,
      creadoPor: req.user.id,
      modificadoPor: req.user.id
    });

    // Actualizar la fecha de modificación de la tarea
    await Tarea.findByIdAndUpdate(tarea, { fechaModificacion: Date.now() });

    res.status(201).json({
      success: true,
      data: observacion
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Actualizar una observación
// @route   PUT /api/observaciones/:id
// @access  Privado
exports.updateObservacion = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { titulo, descripcion } = req.body;

    // Buscar la observación
    let observacion = await Observacion.findById(id);
    
    if (!observacion) {
      return res.status(404).json({ message: 'Observación no encontrada' });
    }

    // Verificar que el usuario es el creador o es admin
    if (observacion.creadoPor.toString() !== req.user.id && req.user.rol !== 'admin') {
      return res.status(403).json({ message: 'No autorizado para actualizar esta observación' });
    }

    // Actualizar la observación
    observacion = await Observacion.findByIdAndUpdate(
      id,
      { 
        titulo,
        descripcion,
        modificadoPor: req.user.id,
        fechaModificacion: Date.now()
      },
      { new: true, runValidators: true }
    );

    // Actualizar la fecha de modificación de la tarea
    await Tarea.findByIdAndUpdate(observacion.tarea, { fechaModificacion: Date.now() });

    res.status(200).json({
      success: true,
      data: observacion
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Eliminar una observación
// @route   DELETE /api/observaciones/:id
// @access  Privado
exports.deleteObservacion = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Buscar la observación
    const observacion = await Observacion.findById(id);
    
    if (!observacion) {
      return res.status(404).json({ message: 'Observación no encontrada' });
    }

    // Verificar que el usuario es el creador o es admin
    if (observacion.creadoPor.toString() !== req.user.id && req.user.rol !== 'admin') {
      return res.status(403).json({ message: 'No autorizado para eliminar esta observación' });
    }

    // Guardar el ID de la tarea para actualizar su fecha de modificación
    const tareaId = observacion.tarea;
    
    // Eliminar la observación
    await observacion.remove();

    // Actualizar la fecha de modificación de la tarea
    await Tarea.findByIdAndUpdate(tareaId, { fechaModificacion: Date.now() });

    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (error) {
    next(error);
  }
};

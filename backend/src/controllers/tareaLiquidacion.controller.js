const TareaLiquidacion = require('../models/TareaLiquidacion');
const Tarea = require('../models/Tarea');
const { tareaLiquidacionSchema } = require('../utils/validators');

// Obtener todas las liquidaciones (solo de tareas con técnico asignado)
exports.getLiquidaciones = async (req, res) => {
  try {
    const liquidaciones = await TareaLiquidacion
      .find({})
      .populate({
        path: 'tarea',
        match: { tecnicos: { $exists: true, $ne: [] } },
        populate: {
          path: 'tecnicos',
          select: 'nombre email porcentajeTecnico'
        }
      });

    // Filtrar liquidaciones donde la tarea existe (match funciona como filtro)
    const liquidacionesFiltradas = liquidaciones.filter(l => l.tarea !== null);

    res.json({ data: liquidacionesFiltradas });
  } catch (err) {
    res.status(500).json({ message: 'Error al obtener liquidaciones', error: err.message });
  }
};

// Obtener liquidación por ID
exports.getLiquidacionById = async (req, res) => {
  try {
    const liquidacion = await TareaLiquidacion
      .findById(req.params.id)
      .populate({
        path: 'tarea',
        populate: {
          path: 'tecnicos',
          select: 'nombre email porcentajeTecnico'
        }
      });

    if (!liquidacion) {
      return res.status(404).json({ message: 'Liquidación no encontrada' });
    }

    res.json({ data: liquidacion });
  } catch (err) {
    res.status(500).json({ message: 'Error al obtener liquidación', error: err.message });
  }
};

// Crear liquidación
exports.createLiquidacion = async (req, res) => {
  const { error } = tareaLiquidacionSchema.validate(req.body);
  if (error) return res.status(400).json({ message: error.details[0].message });

  try {
    const liquidacion = new TareaLiquidacion(req.body);
    await liquidacion.save();
    const populated = await TareaLiquidacion
      .findById(liquidacion._id)
      .populate({
        path: 'tarea',
        populate: {
          path: 'tecnicos',
          select: 'nombre email porcentajeTecnico'
        }
      });
    res.status(201).json({ data: populated });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ message: 'Ya existe una liquidación para esta tarea' });
    }
    res.status(500).json({ message: 'Error al crear liquidación', error: err.message });
  }
};

// Actualizar liquidación
exports.updateLiquidacion = async (req, res) => {
  const { error } = tareaLiquidacionSchema.validate(req.body);
  if (error) return res.status(400).json({ message: error.details[0].message });

  try {
    const liquidacion = await TareaLiquidacion.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    ).populate({
      path: 'tarea',
      populate: {
        path: 'tecnicos',
        select: 'nombre email porcentajeTecnico'
      }
    });

    if (!liquidacion) {
      return res.status(404).json({ message: 'Liquidación no encontrada' });
    }

    res.json({ data: liquidacion });
  } catch (err) {
    res.status(500).json({ message: 'Error al actualizar liquidación', error: err.message });
  }
};

// Eliminar liquidación
exports.deleteLiquidacion = async (req, res) => {
  try {
    const liquidacion = await TareaLiquidacion.findByIdAndDelete(req.params.id);
    if (!liquidacion) {
      return res.status(404).json({ message: 'Liquidación no encontrada' });
    }
    res.json({ message: 'Liquidación eliminada' });
  } catch (err) {
    res.status(500).json({ message: 'Error al eliminar liquidación', error: err.message });
  }
};

// Obtener liquidaciones por técnico
exports.getLiquidacionesByTecnico = async (req, res) => {
  try {
    const { tecnicoId } = req.params;

    const liquidaciones = await TareaLiquidacion
      .find({})
      .populate({
        path: 'tarea',
        match: { tecnicos: tecnicoId },
        populate: {
          path: 'tecnicos',
          select: 'nombre email porcentajeTecnico'
        }
      });

    // Filtrar liquidaciones donde la tarea existe y tiene el técnico
    const liquidacionesFiltradas = liquidaciones.filter(l => l.tarea !== null);

    res.json({ data: liquidacionesFiltradas });
  } catch (err) {
    res.status(500).json({ message: 'Error al obtener liquidaciones por técnico', error: err.message });
  }
};

// Obtener liquidación por tarea
exports.getLiquidacionByTarea = async (req, res) => {
  try {
    const { tareaId } = req.params;

    const liquidacion = await TareaLiquidacion
      .findOne({ tarea: tareaId })
      .populate({
        path: 'tarea',
        populate: {
          path: 'tecnicos',
          select: 'nombre email porcentajeTecnico'
        }
      });

    if (!liquidacion) {
      return res.status(404).json({ message: 'Liquidación no encontrada para esta tarea' });
    }

    res.json({ data: liquidacion });
  } catch (err) {
    res.status(500).json({ message: 'Error al obtener liquidación por tarea', error: err.message });
  }
};

// Obtener liquidación por número de tarea
exports.getLiquidacionByNumeroTarea = async (req, res) => {
  try {
    const { numero } = req.params;
    
    // Buscar tarea por número
    const tarea = await Tarea.findOne({ numero });
    
    if (!tarea) {
      return res.status(404).json({ message: 'Tarea no encontrada' });
    }

    // Buscar liquidación por _id de tarea
    const liquidacion = await TareaLiquidacion
      .findOne({ tarea: tarea._id })
      .populate({
        path: 'tarea',
        populate: {
          path: 'tecnicos',
          select: 'nombre email porcentajeTecnico'
        }
      });

    if (!liquidacion) {
      return res.status(404).json({ message: 'Liquidación no encontrada' });
    }

    res.json({ data: liquidacion });
  } catch (err) {
    res.status(500).json({ message: 'Error al obtener liquidación por número de tarea', error: err.message });
  }
};

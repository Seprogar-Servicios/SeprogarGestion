const Especialidad = require('../models/Especialidad');
const { especialidadSchema } = require('../utils/validators');

// Crear especialidad
exports.createEspecialidad = async (req, res) => {
  const { error } = especialidadSchema.validate(req.body);
  if (error) return res.status(400).json({ message: error.details[0].message });
  try {
    const exists = await Especialidad.findOne({ nombre: req.body.nombre });
    if (exists) return res.status(409).json({ message: 'Especialidad ya existe' });
    const especialidad = new Especialidad(req.body);
    await especialidad.save();
    res.status(201).json({ message: 'Especialidad creada', especialidad });
  } catch (err) {
    res.status(500).json({ message: 'Error al crear especialidad', error: err.message });
  }
};

// Listar especialidades
exports.getEspecialidades = async (req, res) => {
  try {
    const especialidades = await Especialidad.find();
    res.json(especialidades);
  } catch (err) {
    res.status(500).json({ message: 'Error al obtener especialidades', error: err.message });
  }
};

// Actualizar especialidad
exports.updateEspecialidad = async (req, res) => {
  const { error } = especialidadSchema.validate(req.body);
  if (error) return res.status(400).json({ message: error.details[0].message });
  try {
    const especialidad = await Especialidad.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!especialidad) return res.status(404).json({ message: 'Especialidad no encontrada' });
    res.json({ message: 'Especialidad actualizada', especialidad });
  } catch (err) {
    res.status(500).json({ message: 'Error al actualizar especialidad', error: err.message });
  }
};

// Eliminar especialidad
exports.deleteEspecialidad = async (req, res) => {
  try {
    const especialidad = await Especialidad.findByIdAndDelete(req.params.id);
    if (!especialidad) return res.status(404).json({ message: 'Especialidad no encontrada' });
    res.json({ message: 'Especialidad eliminada' });
  } catch (err) {
    res.status(500).json({ message: 'Error al eliminar especialidad', error: err.message });
  }
};

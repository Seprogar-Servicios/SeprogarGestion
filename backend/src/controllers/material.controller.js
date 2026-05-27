const Material = require('../models/Material');
const { materialSchema } = require('../utils/validators');

// Crear material
exports.createMaterial = async (req, res) => {
  const { error } = materialSchema.validate(req.body);
  if (error) return res.status(400).json({ message: error.details[0].message });
  try {
    const material = new Material(req.body);
    await material.save();
    res.status(201).json({ data: material });
  } catch (err) {
    res.status(500).json({ message: 'Error al crear material', error: err.message });
  }
};

// Listar materiales
exports.getMateriales = async (req, res) => {
  try {
    const materiales = await Material.find();
    res.json({ data: materiales });
  } catch (err) {
    res.status(500).json({ message: 'Error al obtener materiales', error: err.message });
  }
};

// Actualizar material
exports.updateMaterial = async (req, res) => {
  const { error } = materialSchema.validate(req.body);
  if (error) return res.status(400).json({ message: error.details[0].message });
  try {
    const material = await Material.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!material) return res.status(404).json({ message: 'Material no encontrado' });
    res.json({ data: material });
  } catch (err) {
    res.status(500).json({ message: 'Error al actualizar material', error: err.message });
  }
};

// Eliminar material
exports.deleteMaterial = async (req, res) => {
  try {
    const material = await Material.findByIdAndDelete(req.params.id);
    if (!material) return res.status(404).json({ message: 'Material no encontrado' });
    res.json({ message: 'Material eliminado' });
  } catch (err) {
    res.status(500).json({ message: 'Error al eliminar material', error: err.message });
  }
};

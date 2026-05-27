const CategoriaMaterial = require('../models/CategoriaMaterial');
const { categoriaMaterialSchema } = require('../utils/validators');

// Crear categoría de material
exports.createCategoriaMaterial = async (req, res) => {
  const { error } = categoriaMaterialSchema.validate(req.body);
  if (error) return res.status(400).json({ message: error.details[0].message });
  try {
    const categoriaMaterial = new CategoriaMaterial(req.body);
    await categoriaMaterial.save();
    res.status(201).json({ data: categoriaMaterial });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ message: 'Ya existe una categoría con ese nombre' });
    }
    res.status(500).json({ message: 'Error al crear categoría de material', error: err.message });
  }
};

// Listar categorías de materiales
exports.getCategoriasMateriales = async (req, res) => {
  try {
    const categorias = await CategoriaMaterial.find().sort({ nombre: 1 });
    res.json({ data: categorias });
  } catch (err) {
    res.status(500).json({ message: 'Error al obtener categorías de materiales', error: err.message });
  }
};

// Actualizar categoría de material
exports.updateCategoriaMaterial = async (req, res) => {
  const { error } = categoriaMaterialSchema.validate(req.body);
  if (error) return res.status(400).json({ message: error.details[0].message });
  try {
    const categoriaMaterial = await CategoriaMaterial.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!categoriaMaterial) return res.status(404).json({ message: 'Categoría de material no encontrada' });
    res.json({ data: categoriaMaterial });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ message: 'Ya existe una categoría con ese nombre' });
    }
    res.status(500).json({ message: 'Error al actualizar categoría de material', error: err.message });
  }
};

// Eliminar categoría de material
exports.deleteCategoriaMaterial = async (req, res) => {
  try {
    const categoriaMaterial = await CategoriaMaterial.findByIdAndDelete(req.params.id);
    if (!categoriaMaterial) return res.status(404).json({ message: 'Categoría de material no encontrada' });
    res.json({ message: 'Categoría de material eliminada' });
  } catch (err) {
    res.status(500).json({ message: 'Error al eliminar categoría de material', error: err.message });
  }
};

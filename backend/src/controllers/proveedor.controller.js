const Proveedor = require('../models/Proveedor');
const { proveedorSchema } = require('../utils/validators');

exports.createProveedor = async (req, res) => {
  const { error } = proveedorSchema.validate(req.body);
  if (error) return res.status(400).json({ message: error.details[0].message });
  try {
    const nombre = String(req.body.nombre || '').trim();
    const exists = await Proveedor.findOne({
      nombre: { $regex: new RegExp(`^${nombre.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
    });
    if (exists) return res.status(409).json({ message: 'Proveedor ya existe' });

    const proveedor = await Proveedor.create({
      nombre,
      descripcion: req.body.descripcion || '',
      activo: req.body.activo !== false,
    });
    res.status(201).json({ message: 'Proveedor creado', proveedor });
  } catch (err) {
    res.status(500).json({ message: 'Error al crear proveedor', error: err.message });
  }
};

exports.getProveedores = async (req, res) => {
  try {
    const onlyActive = String(req.query.activo || '') === 'true';
    const filtro = onlyActive ? { activo: true } : {};
    const proveedores = await Proveedor.find(filtro).sort({ nombre: 1 });
    res.json(proveedores);
  } catch (err) {
    res.status(500).json({ message: 'Error al obtener proveedores', error: err.message });
  }
};

exports.updateProveedor = async (req, res) => {
  const { error } = proveedorSchema.validate(req.body);
  if (error) return res.status(400).json({ message: error.details[0].message });
  try {
    const data = {
      nombre: String(req.body.nombre || '').trim(),
      descripcion: req.body.descripcion || '',
    };
    if (typeof req.body.activo === 'boolean') data.activo = req.body.activo;

    const proveedor = await Proveedor.findByIdAndUpdate(req.params.id, data, {
      new: true,
      runValidators: true,
    });
    if (!proveedor) return res.status(404).json({ message: 'Proveedor no encontrado' });
    res.json({ message: 'Proveedor actualizado', proveedor });
  } catch (err) {
    res.status(500).json({ message: 'Error al actualizar proveedor', error: err.message });
  }
};

exports.deleteProveedor = async (req, res) => {
  try {
    const proveedor = await Proveedor.findByIdAndDelete(req.params.id);
    if (!proveedor) return res.status(404).json({ message: 'Proveedor no encontrado' });
    res.json({ message: 'Proveedor eliminado' });
  } catch (err) {
    res.status(500).json({ message: 'Error al eliminar proveedor', error: err.message });
  }
};

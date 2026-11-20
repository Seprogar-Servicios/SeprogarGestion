const mongoose = require('mongoose');

const proveedorSchema = new mongoose.Schema(
  {
    nombre: { type: String, required: true, unique: true, trim: true },
    descripcion: { type: String, default: '' },
    activo: { type: Boolean, default: true },
  },
  { timestamps: true }
);

proveedorSchema.index({ activo: 1, nombre: 1 });

module.exports = mongoose.model('Proveedor', proveedorSchema);

const mongoose = require('mongoose');

const materialSchema = new mongoose.Schema({
  nombre: { type: String, required: true },
  descripcion: { type: String },
  cantidad: { type: String, default: '' }, // campo libre para cantidad
  unidad: { type: String, required: true }, // kg, m, unidades, etc.
  precio: { type: Number, default: 0 },
  categoria: { type: mongoose.Schema.Types.ObjectId, ref: 'CategoriaMaterial' },
  codigo: { type: String }, // código alfanumérico con símbolos
}, { timestamps: true });

module.exports = mongoose.model('Material', materialSchema);

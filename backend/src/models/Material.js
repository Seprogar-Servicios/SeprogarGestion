const mongoose = require('mongoose');

const materialSchema = new mongoose.Schema({
  nombre: { type: String, required: true },
  descripcion: { type: String },
  cantidadDisponible: { type: Number, default: 0 },
}, { timestamps: true });

module.exports = mongoose.model('Material', materialSchema);

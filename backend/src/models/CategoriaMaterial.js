const mongoose = require('mongoose');

const categoriaMaterialSchema = new mongoose.Schema({
  nombre: { type: String, required: true, unique: true },
  descripcion: { type: String },
}, { timestamps: true });

module.exports = mongoose.model('CategoriaMaterial', categoriaMaterialSchema);

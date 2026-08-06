const mongoose = require('mongoose');

const motivoPagoSchema = new mongoose.Schema({
  nombre: { type: String, required: true, unique: true, trim: true },
  descripcion: { type: String, default: '' },
  activo: { type: Boolean, default: true },
}, { timestamps: true });

motivoPagoSchema.index({ activo: 1 });

module.exports = mongoose.model('MotivoPago', motivoPagoSchema);

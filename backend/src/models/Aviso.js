const mongoose = require('mongoose');

/**
 * Avisos internos para administración (ej. "Técnico X no trabaja mañana").
 * Duración en horas o días; `venceAt` se calcula al guardar.
 */
const avisoSchema = new mongoose.Schema(
  {
    titulo: { type: String, required: true, trim: true, maxlength: 120 },
    mensaje: { type: String, required: true, trim: true, maxlength: 1000 },
    duracionValor: { type: Number, required: true, min: 1 },
    duracionUnidad: { type: String, enum: ['horas', 'dias'], required: true },
    venceAt: { type: Date, required: true, index: true },
    creadoPor: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario', default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Aviso', avisoSchema);

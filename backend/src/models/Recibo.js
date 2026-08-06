const mongoose = require('mongoose');

const reciboSchema = new mongoose.Schema({
  tecnico: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario', required: true },
  motivo: { type: mongoose.Schema.Types.ObjectId, ref: 'MotivoPago', default: null },
  mes: { type: Number, required: true },
  anio: { type: Number, required: true },
  url: { type: String, required: true },
  estadoFirma: { type: String, enum: ['firmado', 'no firmado'], default: 'no firmado' },
  firma: {
    imagen: { type: String },
    fecha: { type: Date },
  },
}, { timestamps: true });

reciboSchema.index({ motivo: 1 });

module.exports = mongoose.model('Recibo', reciboSchema);

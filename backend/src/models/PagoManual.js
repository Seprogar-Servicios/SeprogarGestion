const mongoose = require('mongoose');

const pagoManualSchema = new mongoose.Schema({
  monto: {
    type: Number,
    required: true,
    min: [0.01, 'El monto debe ser mayor a 0'],
  },
  fechaEmision: { type: Date, required: true },
  tecnico: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Usuario',
    required: true,
  },
  motivo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MotivoPago',
    required: true,
  },
  tareas: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tarea',
  }],
  observaciones: { type: String, default: '' },
  creadoPor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Usuario',
  },
}, { timestamps: true });

pagoManualSchema.index({ tecnico: 1 });
pagoManualSchema.index({ fechaEmision: -1 });
pagoManualSchema.index({ motivo: 1 });

module.exports = mongoose.model('PagoManual', pagoManualSchema);

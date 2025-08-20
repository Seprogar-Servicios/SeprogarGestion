const mongoose = require('mongoose');

const tareaSchema = new mongoose.Schema({
  numero: { type: String, required: true, unique: true },
  titulo: { type: String, required: true },
  descripcion: { type: String },
  estado: { type: String, enum: ['pendiente', 'en progreso', 'completada'], default: 'pendiente' },
  tecnicos: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Usuario' }],
  fechaCreacion: { type: Date, default: Date.now },
  fechaModificacion: { type: Date, default: Date.now },
  fechaEjecucion: { type: Date },
  creadoPor: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario' },
  cliente: { type: String },
  numeroTitular: { type: String },
  direccion: { type: String },
}, { timestamps: true });

tareaSchema.pre('save', function(next) {
  this.fechaModificacion = new Date();
  next();
});

module.exports = mongoose.model('Tarea', tareaSchema);

const mongoose = require('mongoose');

const tareaSchema = new mongoose.Schema({
  numero: { type: String, required: true, unique: true },
  titulo: { type: String, required: true },
  descripcion: { type: String },
  estado: { type: String, enum: ['pendiente', 'en progreso', 'completada', 'cancelada'], default: 'pendiente' },
  tecnicos: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Usuario' }],
  fechaCreacion: { type: Date, default: Date.now },
  fechaModificacion: { type: Date, default: Date.now },
  // Cambiamos el tipo a String para evitar problemas de zona horaria
  // Esto nos permite almacenar fechas en formato YYYY-MM-DD sin conversión automática a UTC
  fechaEjecucion: { type: String },
  franja_horaria: { type: String },
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

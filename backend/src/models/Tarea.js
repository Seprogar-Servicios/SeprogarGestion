const mongoose = require('mongoose');

const tareaSchema = new mongoose.Schema({
  numero: { type: String, required: true, unique: true },
  titulo: { type: String, required: true },
  descripcion: { type: String, default: '' },
  estado: { type: String, enum: ['pendiente', 'en progreso', 'completada', 'cancelada'], default: 'pendiente' },
  tecnicos: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Usuario' }],
  fechaCreacion: { type: Date, default: Date.now },
  fechaModificacion: { type: Date, default: Date.now },
  // Cambiamos el tipo a String para evitar problemas de zona horaria
  // Esto nos permite almacenar fechas en formato YYYY-MM-DD sin conversión automática a UTC
  fechaEjecucion: { type: String },
  franja_horaria: { type: String, default: '' },
  creadoPor: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario' },
  cliente: { type: String, default: '' },
  numeroTitular: { type: String, default: '' },
  direccion: { type: String, default: '' },
  // Nuevos campos para integración con WhatsApp
  origen: { 
    type: String, 
    enum: ['whatsapp', 'sistema', 'web'], 
    default: 'sistema' 
  },
  grupoOrigen: { type: String, default: '' },  // Nombre del grupo de WhatsApp de origen
  mensajeOriginal: { type: String, default: '' }, // Mensaje original de WhatsApp
  fechaRecepcion: { type: Date }, // Fecha de recepción del mensaje
}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

tareaSchema.pre('save', function(next) {
  this.fechaModificacion = new Date();
  next();
});

module.exports = mongoose.model('Tarea', tareaSchema);

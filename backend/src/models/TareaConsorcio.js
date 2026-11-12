const mongoose = require('mongoose');

const tareaConsorcioSchema = new mongoose.Schema({
  // Campos base (iguales a Tarea)
  numero: { type: String, required: true, unique: true },
  titulo: { type: String, required: true },
  descripcion: { type: String, default: '' },
  estado: { 
    type: String, 
    enum: [
      'presupuesto',    // Estado inicial cuando Admin crea tarea
      'confirmado',     // Cuando AdminConsorcio acepta presupuesto
      'pendiente',      // Estado tradicional para asignación
      'en_progreso',    // Estado tradicional
      'completada',     // Estado tradicional
      'cancelada',      // Estado tradicional
      'PENDIENTE_PAGO', // Esperando comprobante
      'FACTURADO',     // Comprobante validado, factura generada
      'PAGADO'         // Pago confirmado
    ], 
    default: 'presupuesto' 
  },
  tecnicos: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Usuario' }],
  fechaCreacion: { type: Date, default: Date.now },
  fechaModificacion: { type: Date, default: Date.now },
  fechaEjecucion: { type: String },
  franja_horaria: { type: String, default: '' },
  creadoPor: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario' },
  cliente: { type: String, default: '' },
  numeroTitular: { type: String, default: '' },
  direccion: { type: String, default: '' },
  
  // Campos de integración con WhatsApp
  origen: { 
    type: String, 
    enum: ['whatsapp', 'sistema', 'web'], 
    default: 'sistema' 
  },
  grupoOrigen: { type: String, default: '' },
  mensajeOriginal: { type: String, default: '' },
  fechaRecepcion: { type: Date },
  
  // Nuevos campos específicos para Tarea de Consorcio
  precio: { 
    type: Number, 
    required: true,
    min: 0,
    default: 0
  },
  fotos: [{
    filename: { type: String, required: true },
    originalName: { type: String, required: true },
    path: { type: String, required: true },
    mimetype: { type: String, required: true },
    size: { type: Number, required: true },
    uploadDate: { type: Date, default: Date.now }
  }],
  comprobantePago: {
    filename: { type: String },
    originalName: { type: String },
    path: { type: String },
    mimetype: { type: String },
    size: { type: Number },
    uploadDate: { type: Date },
    estadoValidacion: {
      type: String,
      enum: ['pendiente', 'aprobado', 'rechazado'],
      default: 'pendiente'
    },
    fechaValidacion: { type: Date },
    validadoPor: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario' }
  },
  administradorConsorcio: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Usuario', 
    required: true 
  },
  
  // Campos de trazabilidad
  historialEstados: [{
    estado: { type: String, required: true },
    fecha: { type: Date, default: Date.now },
    usuario: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario' },
    observaciones: { type: String, default: '' }
  }]
}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Índices para mejor rendimiento
tareaConsorcioSchema.index({ numero: 1 });
tareaConsorcioSchema.index({ administradorConsorcio: 1 });
tareaConsorcioSchema.index({ estado: 1 });
tareaConsorcioSchema.index({ creadoPor: 1 });
tareaConsorcioSchema.index({ fechaCreacion: -1 });
tareaConsorcioSchema.index({ fechaEjecucion: 1 });
tareaConsorcioSchema.index({ estado: 1, fechaCreacion: -1 });
tareaConsorcioSchema.index({ administradorConsorcio: 1, estado: 1 });
tareaConsorcioSchema.index({ estado: 1, fechaEjecucion: 1 });

// Middleware para actualizar fechaModificacion
tareaConsorcioSchema.pre('save', function(next) {
  this.fechaModificacion = new Date();
  next();
});

// Middleware para registrar cambios de estado
tareaConsorcioSchema.pre('save', function(next) {
  if (this.isModified('estado') && !this.isNew) {
    this.historialEstados.push({
      estado: this.estado,
      fecha: new Date(),
      usuario: this.creadoPor // Esto se puede ajustar según el contexto
    });
  }
  next();
});

// Virtuals para facilitar consultas
tareaConsorcioSchema.virtual('tieneComprobante').get(function() {
  return this.comprobantePago && this.comprobantePago.filename;
});

tareaConsorcioSchema.virtual('cantidadFotos').get(function() {
  return this.fotos ? this.fotos.length : 0;
});

tareaConsorcioSchema.virtual('esEstadoFinal').get(function() {
  return ['PAGADO', 'cancelada'].includes(this.estado);
});

module.exports = mongoose.model('TareaConsorcio', tareaConsorcioSchema);

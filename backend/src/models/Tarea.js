const mongoose = require('mongoose');

// Schema para materiales asociados a una tarea
const materialTareaSchema = new mongoose.Schema({
  material: { type: mongoose.Schema.Types.ObjectId, ref: 'Material' }, // Referencia opcional a material existente
  // Datos del material (pueden ser de un material existente o manual)
  nombre: { type: String, required: true },
  descripcion: { type: String, default: '' },
  cantidad: { type: Number, required: true, default: 1 },
  unidad: { type: String, default: 'un' },
  precio: { type: Number, required: true, default: 0 },
  // Origen del material
  agregadoPor: { type: String, enum: ['admin', 'tecnico'], required: true },
  tecnico: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario' }, // Técnico que lo agregó
  // Comprobante (para materiales agregados por técnico)
  comprobante: {
    filename: { type: String },
    originalName: { type: String },
    path: { type: String },
    mimetype: { type: String },
    size: { type: Number },
    uploadDate: { type: Date }
  },
  // Estado de validación del comprobante
  estadoValidacion: { type: String, enum: ['pendiente', 'aprobado', 'rechazado'], default: 'pendiente' },
  observaciones: { type: String, default: '' },
  fechaValidacion: { type: Date },
  validadoPor: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario' },
}, { timestamps: true });

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
  // Materiales asociados a la tarea
  materialesTarea: [materialTareaSchema],
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

tareaSchema.pre('save', function(next) {
  this.fechaModificacion = new Date();
  next();
});

// Middleware post-save para auto-crear liquidación
tareaSchema.post('save', async function(doc) {
  try {
    const TareaLiquidacion = mongoose.model('TareaLiquidacion');

    // Verificar si ya existe liquidación para esta tarea
    const existing = await TareaLiquidacion.findOne({ tarea: doc._id });

    if (!existing) {
      await TareaLiquidacion.create({ tarea: doc._id });
    }
  } catch (error) {
    console.error('Error creando liquidación automática:', error);
    // No romper el flujo de la tarea si falla la creación de liquidación
  }
});

module.exports = mongoose.model('Tarea', tareaSchema);

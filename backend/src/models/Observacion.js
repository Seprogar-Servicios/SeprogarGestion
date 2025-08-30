const mongoose = require('mongoose');

const observacionSchema = new mongoose.Schema({
  titulo: { 
    type: String, 
    required: [true, 'El título es obligatorio'],
    trim: true,
    maxlength: [100, 'El título no puede tener más de 100 caracteres']
  },
  descripcion: { 
    type: String, 
    required: [true, 'La descripción es obligatoria'],
    trim: true,
    maxlength: [1000, 'La descripción no puede tener más de 1000 caracteres']
  },
  tarea: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Tarea',
    required: [true, 'La tarea asociada es obligatoria']
  },
  creadoPor: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Usuario',
    required: [true, 'El usuario que crea la observación es obligatorio']
  },
  fechaCreacion: {
    type: Date,
    default: Date.now
  },
  modificadoPor: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Usuario'
  },
  fechaModificacion: {
    type: Date
  }
}, { 
  timestamps: { 
    createdAt: 'fechaCreacion',
    updatedAt: 'fechaModificacion' 
  },
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Índices para mejorar el rendimiento de las consultas frecuentes
observacionSchema.index({ tarea: 1, fechaCreacion: -1 });
observacionSchema.index({ creadoPor: 1 });

// Middleware para registrar quién modificó la observación
observacionSchema.pre('save', function(next) {
  const user = this.model('Usuario');
  // Aquí podríamos agregar lógica para obtener el usuario actual
  // Por ahora, asumimos que se establece en el controlador
  next();
});

// Middleware para popular referencias cuando se consulta una observación
observacionSchema.pre(/^find/, function(next) {
  this.populate({
    path: 'creadoPor',
    select: 'nombre apellido'
  }).populate({
    path: 'modificadoPor',
    select: 'nombre apellido'
  });
  next();
});

const Observacion = mongoose.model('Observacion', observacionSchema);

module.exports = Observacion;

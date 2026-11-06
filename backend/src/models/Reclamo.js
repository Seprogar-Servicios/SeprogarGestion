const mongoose = require('mongoose');

/**
 * Reclamos / calidad de servicio.
 * Todos los vínculos son opcionales para no romper tareas históricas.
 */
const reclamoSchema = new mongoose.Schema(
  {
    tarea: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tarea',
      default: null,
    },
    /** Texto libre (puede coincidir con Tarea.cliente) */
    cliente: { type: String, default: '', trim: true },
    /**
     * Cuenta normalizada opcional (IKE, VAITTY, etc.).
     * Si no se carga, Analytics puede inferirla desde cliente.
     */
    cuentaCliente: {
      type: String,
      enum: ['', 'IKE', 'VAITTY', 'MDO', 'Particular', 'Consorcio', 'Otro'],
      default: '',
    },
    tecnicos: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Usuario' }],
    motivo: {
      type: String,
      enum: [
        'mala_atencion',
        'trabajo_incompleto',
        'problema_tecnico',
        'demora',
        'otro',
      ],
      required: true,
    },
    estado: {
      type: String,
      enum: ['abierto', 'resuelto', 'reabierto'],
      default: 'abierto',
    },
    descripcion: { type: String, default: '', trim: true, maxlength: 2000 },
    fechaReclamo: { type: Date, default: Date.now },
    fechaResolucion: { type: Date, default: null },
    creadoPor: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario' },
    resueltoPor: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario', default: null },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

reclamoSchema.index({ fechaReclamo: -1 });
reclamoSchema.index({ estado: 1, fechaReclamo: -1 });
reclamoSchema.index({ tarea: 1 });
reclamoSchema.index({ tecnicos: 1 });

module.exports = mongoose.model('Reclamo', reclamoSchema);

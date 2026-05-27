const mongoose = require('mongoose');

const tareaLiquidacionSchema = new mongoose.Schema({
  tarea: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tarea',
    required: true,
    unique: true
  },
  manoObra: { type: Number, default: 0 },
  materiales: { type: Number, default: 0 },
  cobertura: { type: Number, default: 0 },
  excedente: { type: Number, default: 0 },
  materialReal: { type: Number, default: 0 },
  boletasMateriales: { type: Number, default: 0 },
  observacionesFinancieras: { type: String, default: '' }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Índice único para evitar duplicados
tareaLiquidacionSchema.index({ tarea: 1 }, { unique: true });

// Middleware para calcular automáticamente materiales y excedente desde los materialesTarea
tareaLiquidacionSchema.pre('save', async function(next) {
  try {
    const Tarea = mongoose.model('Tarea');
    const tarea = await Tarea.findById(this.tarea).populate('materialesTarea');

    if (tarea && tarea.materialesTarea) {
      // Calcular materiales: suma de materiales agregados por admin
      const materialesAdmin = tarea.materialesTarea
        .filter(m => m.agregadoPor === 'admin')
        .reduce((sum, m) => sum + (m.cantidad * m.precio), 0);

      // Calcular excedente: suma de materiales agregados por técnico que estén aprobados
      const materialesTecnico = tarea.materialesTarea
        .filter(m => m.agregadoPor === 'tecnico' && m.estadoValidacion === 'aprobado')
        .reduce((sum, m) => sum + (m.cantidad * m.precio), 0);

      // Actualizar campos solo si no están ya establecidos manualmente
      // Esto permite que el admin pueda sobrescribir los valores si es necesario
      if (this.materiales === 0) {
        this.materiales = materialesAdmin;
      }
      if (this.excedente === 0) {
        this.excedente = materialesTecnico;
      }
    }
    next();
  } catch (error) {
    console.error('Error calculando materiales y excedente:', error);
    next();
  }
});

// Virtuals para cálculos financieros
tareaLiquidacionSchema.virtual('totalPresupuesto').get(function() {
  return this.manoObra + this.materiales;
});

tareaLiquidacionSchema.virtual('difExcedente').get(function() {
  return this.excedente - this.materiales;
});

tareaLiquidacionSchema.virtual('gananciaMaterial').get(function() {
  return this.materiales - this.materialReal;
});

tareaLiquidacionSchema.virtual('gananciaTotal').get(function() {
  return this.totalPresupuesto - this.materialReal;
});

tareaLiquidacionSchema.virtual('repartida').get(function() {
  return this.gananciaTotal - this.gananciaMaterial;
});

tareaLiquidacionSchema.virtual('pagoTecnico').get(function() {
  const porcentaje = this.tarea?.tecnicos?.[0]?.porcentajeTecnico || 0.7;
  return this.repartida * porcentaje;
});

tareaLiquidacionSchema.virtual('futurgas').get(function() {
  const porcentaje = this.tarea?.tecnicos?.[0]?.porcentajeTecnico || 0.7;
  return (this.repartida * (1 - porcentaje)) + this.gananciaMaterial;
});

tareaLiquidacionSchema.virtual('pago15Dias').get(function() {
  return this.cobertura +
         this.excedente -
         this.materialReal -
         this.difExcedente -
         this.futurgas -
         this.gananciaMaterial;
});

module.exports = mongoose.model('TareaLiquidacion', tareaLiquidacionSchema);

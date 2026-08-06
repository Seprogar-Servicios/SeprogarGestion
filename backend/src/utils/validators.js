const Joi = require('joi');

const userRegisterSchema = Joi.object({
  nombre: Joi.string().required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
  rol: Joi.string().valid('admin', 'usuario', 'adminConsorcio').required(),
  especialidad: Joi.string().optional().allow(null, ''),
  telefono: Joi.string().optional().allow(null, ''),
  direccion: Joi.string().optional().allow(null, ''),
  porcentajeTecnico: Joi.number().min(0).max(1).optional().default(0),
});

const userUpdateSchema = Joi.object({
  nombre: Joi.string().optional(),
  email: Joi.string().email().optional(),
  password: Joi.string().min(6).optional(),
  confirmPassword: Joi.string().min(6).optional(),
  rol: Joi.string().valid('admin', 'usuario', 'adminConsorcio').optional(),
  especialidad: Joi.string().optional().allow(null, ''),
  aprobado: Joi.boolean().optional(),
  telefono: Joi.string().optional().allow(null, ''),
  direccion: Joi.string().optional().allow(null, ''),
  porcentajeTecnico: Joi.number().min(0).max(1).optional(),
});

const especialidadSchema = Joi.object({
  nombre: Joi.string().required(),
  descripcion: Joi.string().allow('').optional(),
});

const categoriaMaterialSchema = Joi.object({
  nombre: Joi.string().required(),
  descripcion: Joi.string().allow('').optional(),
});

const materialSchema = Joi.object({
  nombre: Joi.string().required(),
  descripcion: Joi.string().allow('').optional(),
  cantidad: Joi.string().required(),
  unidad: Joi.string().required(),
  precio: Joi.number().min(0).optional(),
  categoria: Joi.string().optional().allow(null, ''),
  codigo: Joi.string().optional().allow(null, ''),
});

const tareaSchema = Joi.object({
  numero: Joi.string().required(),
  titulo: Joi.string().required(),
  descripcion: Joi.string().allow('').optional(),
  estado: Joi.string().valid('pendiente', 'en progreso', 'completada', 'cancelada').default('pendiente'),
  tecnicos: Joi.array().items(Joi.string()).default([]),
  fechaEjecucion: Joi.alternatives().try(
    Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/),
    Joi.date()
  ).optional(),
  franja_horaria: Joi.string().allow('').optional(),
  cliente: Joi.string().allow('').optional(),
  numeroTitular: Joi.string().allow('').optional(),
  direccion: Joi.string().allow('').optional(),
  origen: Joi.string().valid('whatsapp', 'sistema', 'web').default('sistema'),
  grupoOrigen: Joi.string().allow('').optional(),
  mensajeOriginal: Joi.string().allow('').optional(),
  fechaRecepcion: Joi.date().optional(),
}).unknown(false); // No permitir campos adicionales

const reciboSchema = Joi.object({
  tecnico: Joi.string().required(),
  motivo: Joi.string().required(),
  mes: Joi.number().integer().min(1).max(12).required(),
  anio: Joi.number().integer().min(2000).required(),
});

const firmaSchema = Joi.object({
  // No hay campos de texto para validar aquí, solo el archivo de firma
});

const tareaLiquidacionSchema = Joi.object({
  tarea: Joi.string().required(),
  manoObra: Joi.number().min(0).default(0),
  materiales: Joi.number().min(0).default(0),
  cobertura: Joi.number().min(0).default(0),
  excedente: Joi.number().min(0).default(0),
  materialReal: Joi.number().min(0).default(0),
  boletasMateriales: Joi.number().min(0).default(0),
  observacionesFinancieras: Joi.string().allow('').optional(),
  totalPresupuesto: Joi.number().min(0).optional(),
  gananciaMaterial: Joi.number().min(0).optional(),
  repartida: Joi.number().min(0).optional(),
  pagoTecnico: Joi.number().min(0).optional(),
  futurgas: Joi.number().min(0).optional(),
  pago15Dias: Joi.number().min(0).optional(),
});

const tareaLiquidacionUpdateSchema = Joi.object({
  manoObra: Joi.number().min(0).optional(),
  materiales: Joi.number().min(0).optional(),
  cobertura: Joi.number().min(0).optional(),
  excedente: Joi.number().min(0).optional(),
  materialReal: Joi.number().min(0).optional(),
  boletasMateriales: Joi.number().min(0).optional(),
  observacionesFinancieras: Joi.string().allow('').optional(),
  totalPresupuesto: Joi.number().min(0).optional(),
  gananciaMaterial: Joi.number().min(0).optional(),
  repartida: Joi.number().min(0).optional(),
  pagoTecnico: Joi.number().min(0).optional(),
  futurgas: Joi.number().min(0).optional(),
  pago15Dias: Joi.number().min(0).optional(),
}).min(1); // Al menos un campo debe estar presente

const tareaMaterialAdminSchema = Joi.object({
  materialId: Joi.string().required(),
  cantidad: Joi.number().min(1).required(),
  observaciones: Joi.string().allow('').optional(),
});

const tareaMaterialTecnicoSchema = Joi.object({
  nombre: Joi.string().required(),
  descripcion: Joi.string().allow('').optional(),
  cantidad: Joi.number().min(1).required(),
  unidad: Joi.string().allow('').optional(),
  precio: Joi.number().min(0).required(),
  observaciones: Joi.string().allow('').optional(),
});

const tareaMaterialUpdateSchema = Joi.object({
  cantidad: Joi.number().min(1).optional(),
  precio: Joi.number().min(0).optional(),
  observaciones: Joi.string().allow('').optional(),
});

const comprobanteValidacionSchema = Joi.object({
  estadoValidacion: Joi.string().valid('pendiente', 'aprobado', 'rechazado').required(),
  observacionesValidacion: Joi.string().allow('').optional(),
});

const motivoPagoSchema = Joi.object({
  nombre: Joi.string().required(),
  descripcion: Joi.string().allow('').optional(),
  activo: Joi.boolean().optional(),
});

const pagoManualSchema = Joi.object({
  monto: Joi.number().positive().required(),
  fechaEmision: Joi.alternatives().try(Joi.date(), Joi.string()).required(),
  tecnico: Joi.string().required(),
  motivo: Joi.string().required(),
  tareas: Joi.array().items(Joi.string()).default([]),
  observaciones: Joi.string().allow('').optional(),
});

const pagoManualUpdateSchema = Joi.object({
  monto: Joi.number().positive().optional(),
  fechaEmision: Joi.alternatives().try(Joi.date(), Joi.string()).optional(),
  tecnico: Joi.string().optional(),
  motivo: Joi.string().optional(),
  tareas: Joi.array().items(Joi.string()).optional(),
  observaciones: Joi.string().allow('').optional(),
}).min(1);

module.exports = {
  userRegisterSchema,
  userUpdateSchema,
  especialidadSchema,
  categoriaMaterialSchema,
  materialSchema,
  tareaSchema,
  reciboSchema,
  firmaSchema,
  tareaLiquidacionSchema,
  tareaLiquidacionUpdateSchema,
  tareaMaterialAdminSchema,
  tareaMaterialTecnicoSchema,
  tareaMaterialUpdateSchema,
  comprobanteValidacionSchema,
  motivoPagoSchema,
  pagoManualSchema,
  pagoManualUpdateSchema,
};

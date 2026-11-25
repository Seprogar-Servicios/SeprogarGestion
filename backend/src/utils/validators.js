const Joi = require('joi');

const ubicacionBaseSchema = Joi.object({
  lat: Joi.number().min(-90).max(90).required(),
  lng: Joi.number().min(-180).max(180).required(),
}).optional().allow(null);

const userRegisterSchema = Joi.object({
  nombre: Joi.string().required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
  rol: Joi.string().valid('super_admin', 'admin', 'usuario', 'adminConsorcio').required(),
  especialidad: Joi.string().optional().allow(null, ''),
  especialidades: Joi.array().items(Joi.string().allow('')).optional(),
  telefono: Joi.string().optional().allow(null, ''),
  direccion: Joi.string().optional().allow(null, ''),
  localidad: Joi.string().optional().allow(null, ''),
  ubicacionBase: ubicacionBaseSchema,
  porcentajeTecnico: Joi.number().min(0).max(1).optional().default(0),
  color: Joi.string().pattern(/^#[0-9A-Fa-f]{6}$/).optional().allow(null, ''),
});

const userUpdateSchema = Joi.object({
  nombre: Joi.string().optional(),
  email: Joi.string().email().optional(),
  password: Joi.string().min(6).optional(),
  confirmPassword: Joi.string().min(6).optional(),
  rol: Joi.string().valid('super_admin', 'admin', 'usuario', 'adminConsorcio').optional(),
  especialidad: Joi.string().optional().allow(null, ''),
  especialidades: Joi.array().items(Joi.string().allow('')).optional(),
  aprobado: Joi.boolean().optional(),
  telefono: Joi.string().optional().allow(null, ''),
  direccion: Joi.string().optional().allow(null, ''),
  localidad: Joi.string().optional().allow(null, ''),
  ubicacionBase: ubicacionBaseSchema,
  porcentajeTecnico: Joi.number().min(0).max(1).optional(),
  color: Joi.string().pattern(/^#[0-9A-Fa-f]{6}$/).optional().allow(null, ''),
});

const especialidadSchema = Joi.object({
  nombre: Joi.string().required(),
  descripcion: Joi.string().allow('').optional(),
});

const proveedorSchema = Joi.object({
  // Texto libre (mayoría letras; números permitidos)
  nombre: Joi.string().trim().min(1).max(120).required(),
  descripcion: Joi.string().allow('').optional(),
  activo: Joi.boolean().optional(),
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
  numero: Joi.string().trim().min(1).required().messages({
    'string.empty': 'El número de tarea es obligatorio',
    'any.required': 'El número de tarea es obligatorio',
  }),
  titulo: Joi.string().trim().min(1).required().messages({
    'string.empty': 'El título es obligatorio',
    'any.required': 'El título es obligatorio',
  }),
  descripcion: Joi.string().allow('').optional(),
  estado: Joi.string()
    .valid('pendiente', 'en progreso', 'completada', 'cancelada')
    .default('pendiente')
    .messages({
      'any.only': 'Estado inválido (pendiente, en progreso, completada o cancelada)',
    }),
  /** 0, 1 o N técnicos — nunca obligatorio */
  tecnicos: Joi.array().items(Joi.string().hex().length(24)).default([]).messages({
    'string.hex': 'Hay un técnico con ID inválido',
    'string.length': 'Hay un técnico con ID inválido',
  }),
  fechaEjecucion: Joi.alternatives()
    .try(
      Joi.string().allow(''),
      Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/),
      Joi.date()
    )
    .optional()
    .allow(null, '')
    .messages({
      'alternatives.match': 'Fecha de ejecución inválida (usá AAAA-MM-DD)',
    }),
  franja_horaria: Joi.string().allow('').optional(),
  cliente: Joi.string().allow('').optional(),
  cuentaCliente: Joi.string()
    .valid('', 'IKE', 'VAITTY', 'MDO', 'Particular', 'Consorcio', 'Otro')
    .optional()
    .allow(null, ''),
  fechaCompletado: Joi.date().optional().allow(null),
  numeroTitular: Joi.string().allow('').optional(),
  direccion: Joi.string().allow('').optional(),
  direccionExtra: Joi.string().allow('').optional(),
  entreCalles: Joi.string().allow('').optional(),
  especialidad: Joi.alternatives()
    .try(Joi.string().hex().length(24), Joi.string().valid(''), Joi.valid(null))
    .optional()
    .allow(null, ''),
  /** Proveedor (catálogo ABM). Opcional; no rompe históricas. */
  proveedor: Joi.alternatives()
    .try(Joi.string().hex().length(24), Joi.string().valid(''), Joi.valid(null))
    .optional()
    .allow(null, ''),
  /** Cliente VIP. Opcional; default false en modelo. */
  vip: Joi.boolean().optional(),
  origen: Joi.string().valid('whatsapp', 'sistema', 'web').default('sistema'),
  grupoOrigen: Joi.string().allow('').optional(),
  mensajeOriginal: Joi.string().allow('').optional(),
  fechaRecepcion: Joi.date().optional(),
  ubicacionMapa: Joi.object({
    lat: Joi.number().min(-90).max(90).required(),
    lng: Joi.number().min(-180).max(180).required(),
    fuente: Joi.string().valid('gps', 'direccion', 'tecnico').optional(),
    actualizadoAt: Joi.date().optional(),
  }).optional().allow(null),
  /** Coords fijas de la dirección (autocomplete); no se pisan con GPS en vivo */
  ubicacionDireccion: Joi.object({
    lat: Joi.number().min(-90).max(90).required(),
    lng: Joi.number().min(-180).max(180).required(),
    actualizadoAt: Joi.date().optional(),
  }).optional().allow(null),
}).unknown(false); // No permitir campos adicionales

/** Si viene populado `{ _id }`, dejar solo el id string. */
function refToId(value) {
  if (value == null || value === '') return null;
  if (typeof value === 'string') return value;
  if (typeof value === 'object' && value._id != null) return String(value._id);
  return value;
}

/** Normaliza body de tarea antes de Joi (vacíos / técnicos). */
function sanitizeTareaBody(body = {}) {
  const data = { ...(body || {}) };

  // Campos de documento/UI que a veces se reenvían al editar y rompen Joi (.unknown(false))
  delete data._id;
  delete data.id;
  delete data.__v;
  delete data.createdAt;
  delete data.updatedAt;
  delete data.fechaCreacion;
  delete data.fechaModificacion;
  delete data.materiales;
  delete data.creadoPor;

  if (Array.isArray(data.tecnicos)) {
    data.tecnicos = data.tecnicos
      .map((t) => (typeof t === 'string' ? t : t && t._id ? String(t._id) : ''))
      .filter((id) => id && /^[a-fA-F0-9]{24}$/.test(id));
  } else if (data.tecnicos == null) {
    data.tecnicos = [];
  }

  if (data.fechaEjecucion === '' || data.fechaEjecucion == null) {
    delete data.fechaEjecucion;
  } else if (typeof data.fechaEjecucion === 'string' && data.fechaEjecucion.includes('T')) {
    // ISO → YYYY-MM-DD (edición desde lista / popover)
    data.fechaEjecucion = data.fechaEjecucion.slice(0, 10);
  }

  data.especialidad = refToId(data.especialidad);
  data.proveedor = refToId(data.proveedor);
  if (data.especialidad === '') data.especialidad = null;
  if (data.proveedor === '') data.proveedor = null;
  if (data.cuentaCliente == null) data.cuentaCliente = '';
  if (data.origen === 'manual') data.origen = 'sistema';

  delete data.horaInicio;
  delete data.horaFin;

  return data;
}

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
  proveedorSchema,
  categoriaMaterialSchema,
  materialSchema,
  tareaSchema,
  sanitizeTareaBody,
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

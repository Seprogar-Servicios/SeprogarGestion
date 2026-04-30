const Joi = require('joi');

const userRegisterSchema = Joi.object({
  nombre: Joi.string().required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
  rol: Joi.string().valid('admin', 'usuario', 'adminConsorcio').required(),
  especialidad: Joi.string().optional().allow(null, ''),
  telefono: Joi.string().optional().allow(null, ''),
  direccion: Joi.string().optional().allow(null, ''),
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
});

const especialidadSchema = Joi.object({
  nombre: Joi.string().required(),
  descripcion: Joi.string().allow('').optional(),
});

const materialSchema = Joi.object({
  nombre: Joi.string().required(),
  descripcion: Joi.string().allow('').optional(),
  cantidadDisponible: Joi.number().integer().min(0).required(),
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
  mes: Joi.number().integer().min(1).max(12).required(),
  anio: Joi.number().integer().min(2000).required(),
});

const firmaSchema = Joi.object({
  // No hay campos de texto para validar aquí, solo el archivo de firma
});

module.exports = {
  userRegisterSchema,
  userUpdateSchema,
  especialidadSchema,
  materialSchema,
  tareaSchema,
  reciboSchema,
  firmaSchema,
};

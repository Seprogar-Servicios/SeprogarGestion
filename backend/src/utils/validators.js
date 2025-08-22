const Joi = require('joi');

const userRegisterSchema = Joi.object({
  nombre: Joi.string().required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
  rol: Joi.string().valid('admin', 'usuario').required(),
  especialidad: Joi.string().optional().allow(null, ''),
  telefono: Joi.string().optional().allow(null, ''),
});

const userUpdateSchema = Joi.object({
  nombre: Joi.string().optional(),
  email: Joi.string().email().optional(),
  password: Joi.string().min(6).optional(),
  rol: Joi.string().valid('admin', 'usuario').optional(),
  especialidad: Joi.string().optional().allow(null, ''),
  aprobado: Joi.boolean().optional(),
  telefono: Joi.string().optional().allow(null, ''),
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
  estado: Joi.string().valid('pendiente', 'en progreso', 'completada').optional(),
  tecnicos: Joi.array().items(Joi.string()),
  fechaEjecucion: Joi.date().optional(),
  franja_horaria: Joi.string().allow('').optional(),
  cliente: Joi.string().optional(),
  numeroTitular: Joi.string().allow('').optional(),
  direccion: Joi.string().allow('').optional(),
});

module.exports = {
  userRegisterSchema,
  userUpdateSchema,
  especialidadSchema,
  materialSchema,
  tareaSchema,
};

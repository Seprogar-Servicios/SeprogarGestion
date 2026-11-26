const mongoose = require('mongoose');
const Joi = require('joi');
const Aviso = require('../models/Aviso');
const Usuario = require('../models/User');
const Subscription = require('../models/Subscription');
const { sendNotification } = require('../utils/push');

const MS_POR_UNIDAD = {
  horas: 60 * 60 * 1000,
  dias: 24 * 60 * 60 * 1000,
};
const MAX_DURACION_DIAS = 365;

const avisoSchema = Joi.object({
  titulo: Joi.string().trim().min(1).max(120).required().messages({
    'string.empty': 'El título es obligatorio',
    'any.required': 'El título es obligatorio',
    'string.max': 'El título no puede superar 120 caracteres',
  }),
  mensaje: Joi.string().trim().min(1).max(1000).required().messages({
    'string.empty': 'El mensaje es obligatorio',
    'any.required': 'El mensaje es obligatorio',
    'string.max': 'El mensaje no puede superar 1000 caracteres',
  }),
  duracionValor: Joi.number().integer().min(1).required().messages({
    'number.base': 'La duración debe ser un número',
    'number.integer': 'La duración debe ser un número entero',
    'number.min': 'La duración debe ser al menos 1',
    'any.required': 'La duración es obligatoria',
  }),
  duracionUnidad: Joi.string().valid('horas', 'dias').required().messages({
    'any.only': 'La unidad de duración debe ser horas o días',
    'any.required': 'La unidad de duración es obligatoria',
  }),
}).unknown(false);

/** Valida y devuelve el valor normalizado, o un mensaje de error. */
const validarAviso = (body) => {
  const { error, value } = avisoSchema.validate(body || {}, { abortEarly: true });
  if (error) return { error: error.details[0].message };
  const dias = (value.duracionValor * MS_POR_UNIDAD[value.duracionUnidad]) / MS_POR_UNIDAD.dias;
  if (dias > MAX_DURACION_DIAS) {
    return { error: `La duración máxima es ${MAX_DURACION_DIAS} días` };
  }
  return { value };
};

const calcularVenceAt = (valor, unidad, desde = new Date()) =>
  new Date(desde.getTime() + valor * MS_POR_UNIDAD[unidad]);

/** Push a admins/super admins con suscripción (excepto quien crea el aviso). */
const notificarAdmins = async (aviso, creadorId) => {
  const admins = await Usuario.find({
    rol: { $in: ['admin', 'super_admin'] },
    aprobado: true,
    _id: { $ne: creadorId },
  }).select('_id');
  if (admins.length === 0) return;

  const subscriptions = await Subscription.find({ user: { $in: admins.map((a) => a._id) } });
  const payload = {
    title: 'Nuevo aviso',
    body: aviso.titulo,
    url: '/dashboard',
  };
  await Promise.allSettled(subscriptions.map((s) => sendNotification(s, payload)));
};

/** Avisos vigentes (no vencidos) — para la sección del dashboard */
exports.getActivos = async (req, res) => {
  try {
    const avisos = await Aviso.find({ venceAt: { $gt: new Date() } })
      .sort({ createdAt: -1 })
      .limit(20)
      .populate('creadoPor', 'nombre');
    res.json({ success: true, data: avisos });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error al obtener avisos', error: err.message });
  }
};

/** Todos los avisos (ABM) */
exports.getAvisos = async (req, res) => {
  try {
    const avisos = await Aviso.find()
      .sort({ createdAt: -1 })
      .populate('creadoPor', 'nombre');
    res.json({ success: true, data: avisos });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error al obtener avisos', error: err.message });
  }
};

exports.createAviso = async (req, res) => {
  const { error, value } = validarAviso(req.body);
  if (error) return res.status(400).json({ success: false, message: error });

  try {
    const aviso = new Aviso({
      ...value,
      venceAt: calcularVenceAt(value.duracionValor, value.duracionUnidad),
      creadoPor: req.user._id,
    });
    await aviso.save();

    // No bloquea la respuesta: el envío push es best-effort
    notificarAdmins(aviso, req.user._id).catch((err) =>
      console.error('Error notificando avisos:', err.message)
    );

    res.status(201).json({ success: true, data: aviso, message: 'Aviso creado' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error al crear aviso', error: err.message });
  }
};

exports.updateAviso = async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(400).json({ success: false, message: 'ID inválido' });
  }
  const { error, value } = validarAviso(req.body);
  if (error) return res.status(400).json({ success: false, message: error });

  try {
    const aviso = await Aviso.findById(req.params.id);
    if (!aviso) return res.status(404).json({ success: false, message: 'Aviso no encontrado' });

    const duracionCambio =
      aviso.duracionValor !== value.duracionValor || aviso.duracionUnidad !== value.duracionUnidad;

    aviso.titulo = value.titulo;
    aviso.mensaje = value.mensaje;
    aviso.duracionValor = value.duracionValor;
    aviso.duracionUnidad = value.duracionUnidad;
    // Solo recalcula el vencimiento si cambió la duración (no extiende al editar el texto)
    if (duracionCambio) {
      aviso.venceAt = calcularVenceAt(value.duracionValor, value.duracionUnidad);
    }
    await aviso.save();

    res.json({ success: true, data: aviso, message: 'Aviso actualizado' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error al actualizar aviso', error: err.message });
  }
};

exports.deleteAviso = async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(400).json({ success: false, message: 'ID inválido' });
  }
  try {
    const aviso = await Aviso.findByIdAndDelete(req.params.id);
    if (!aviso) return res.status(404).json({ success: false, message: 'Aviso no encontrado' });
    res.json({ success: true, message: 'Aviso eliminado' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error al eliminar aviso', error: err.message });
  }
};

module.exports.validarAviso = validarAviso;
module.exports.calcularVenceAt = calcularVenceAt;

const Usuario = require('../models/User');
const bcrypt = require('bcryptjs');
const { userRegisterSchema, userUpdateSchema } = require('../utils/validators');
const Joi = require('joi');
const { isSuperAdmin, isPrivilegedAdmin, MAX_SUPER_ADMINS } = require('../utils/roles');
const { geocodeAddress } = require('../utils/geocode');
const { normalizeColor, nextAvailableColor } = require('../utils/tecnicoColors');

const collectUsedColors = async (excludeUserId = null) => {
  const filtro = { color: { $type: 'string', $ne: '' } };
  if (excludeUserId) filtro._id = { $ne: excludeUserId };
  const rows = await Usuario.find(filtro).select('color').lean();
  return new Set(rows.map((r) => String(r.color).toUpperCase()));
};

const assertUniqueTecnicoColor = async (color, excludeUserId = null) => {
  const normalized = normalizeColor(color);
  if (!normalized) {
    return { ok: false, status: 400, message: 'color inválido (usar #RRGGBB)' };
  }
  const filtro = { color: new RegExp(`^${normalized}$`, 'i') };
  if (excludeUserId) filtro._id = { $ne: excludeUserId };
  const taken = await Usuario.findOne(filtro).select('_id nombre email');
  if (taken) {
    return {
      ok: false,
      status: 409,
      message: `Ese color ya lo usa ${taken.nombre || taken.email}`,
    };
  }
  return { ok: true, color: normalized };
};

const resolveUbicacionBase = async (localidad, direccionLegacy) => {
  const query = (localidad || direccionLegacy || '').trim();
  if (!query) return null;
  const coords = await geocodeAddress(query);
  if (!coords) return null;
  return { lat: coords.lat, lng: coords.lng, actualizadoAt: new Date() };
};

const countSuperAdmins = async (excludeId = null) => {
  const filter = { rol: 'super_admin' };
  if (excludeId) {
    filter._id = { $ne: excludeId };
  }
  return Usuario.countDocuments(filter);
};

const assertCanManageTarget = async (actor, target) => {
  if (!target) {
    return { ok: false, status: 404, message: 'Usuario no encontrado' };
  }

  // Nadie (excepto otro super_admin) tiene poder sobre un super_admin
  if (isSuperAdmin(target) && !isSuperAdmin(actor)) {
    return {
      ok: false,
      status: 403,
      message: 'No autorizado: no podés modificar un Super Admin',
    };
  }

  return { ok: true };
};

const assertSuperAdminQuota = async ({ creatingSuper, promotingToSuper, demotingSuper, targetId }) => {
  if (creatingSuper || promotingToSuper) {
    const current = await countSuperAdmins(promotingToSuper ? targetId : null);
    if (current >= MAX_SUPER_ADMINS) {
      return {
        ok: false,
        status: 400,
        message: `Solo puede haber un máximo de ${MAX_SUPER_ADMINS} Super Admins`,
      };
    }
  }

  if (demotingSuper) {
    const remaining = await countSuperAdmins(targetId);
    if (remaining < 1) {
      // Al demotar/eliminar este, no quedaría ninguno: permitir si hay otro; si es el último, bloquear demote accidental por admin (solo super puede) — ya filtrado.
      // Bloquear si sería el último super_admin del sistema
      const total = await countSuperAdmins();
      if (total <= 1) {
        return {
          ok: false,
          status: 400,
          message: 'Debe existir al menos un Super Admin en el sistema',
        };
      }
    }
  }

  return { ok: true };
};

// Crear usuario (admin / super_admin)
exports.createUser = async (req, res) => {
  const { error } = userRegisterSchema.validate(req.body);
  if (error) return res.status(400).json({ message: error.details[0].message });
  try {
    const requestedRol = req.body.rol;

    if (requestedRol === 'super_admin' && !isSuperAdmin(req.user)) {
      return res.status(403).json({ message: 'Solo un Super Admin puede crear otro Super Admin' });
    }

    if (requestedRol === 'super_admin') {
      const quota = await assertSuperAdminQuota({ creatingSuper: true });
      if (!quota.ok) return res.status(quota.status).json({ message: quota.message });
    }

    const exists = await Usuario.findOne({ email: req.body.email });
    if (exists) return res.status(409).json({ message: 'Email ya registrado' });
    const hash = await bcrypt.hash(req.body.password, 10);
    const payload = { ...req.body, password: hash, aprobado: true };

    // Color único solo para técnicos (rol usuario)
    if (requestedRol === 'usuario') {
      const requested = normalizeColor(payload.color);
      if (requested) {
        const check = await assertUniqueTecnicoColor(requested);
        if (!check.ok) return res.status(check.status).json({ message: check.message });
        payload.color = check.color;
      } else {
        const used = await collectUsedColors();
        const auto = nextAvailableColor(used);
        if (!auto) {
          return res.status(400).json({ message: 'No hay colores libres para asignar al técnico' });
        }
        payload.color = auto;
      }
    } else {
      payload.color = null;
    }

    if (payload.localidad || payload.direccion) {
      const base = await resolveUbicacionBase(payload.localidad, payload.direccion);
      if (base) payload.ubicacionBase = base;
    }
    const usuario = new Usuario(payload);
    await usuario.save();
    res.status(201).json({
      success: true,
      data: usuario,
      message: 'Usuario creado',
    });
  } catch (err) {
    if (err && err.code === 11000 && String(err.message || '').includes('color')) {
      return res.status(409).json({ message: 'Ese color ya está asignado a otro técnico' });
    }
    res.status(500).json({ message: 'Error al crear usuario', error: err.message });
  }
};

// Listar usuarios (admin / super_admin)
exports.getUsers = async (req, res) => {
  try {
    let usuarios = await Usuario.find().populate('especialidad');
    // Un admin normal no ve cuentas super_admin
    if (!isSuperAdmin(req.user)) {
      usuarios = usuarios.filter((u) => u.rol !== 'super_admin');
    }
    res.json({ success: true, data: usuarios });
  } catch (err) {
    res.status(500).json({ message: 'Error al obtener usuarios', error: err.message });
  }
};

// Actualizar usuario
exports.updateUser = async (req, res) => {
  const { error } = userUpdateSchema.validate(req.body);
  if (error) return res.status(400).json({ message: error.details[0].message });
  try {
    const target = await Usuario.findById(req.params.id);
    const canManage = await assertCanManageTarget(req.user, target);
    if (!canManage.ok) {
      return res.status(canManage.status).json({ message: canManage.message });
    }

    const newRol = req.body.rol;
    const promotingToSuper = newRol === 'super_admin' && target.rol !== 'super_admin';
    const demotingSuper = target.rol === 'super_admin' && newRol && newRol !== 'super_admin';

    if ((promotingToSuper || (newRol === 'super_admin')) && !isSuperAdmin(req.user)) {
      return res.status(403).json({ message: 'Solo un Super Admin puede asignar el rol Super Admin' });
    }

    if (demotingSuper && !isSuperAdmin(req.user)) {
      return res.status(403).json({ message: 'No autorizado' });
    }

    const quota = await assertSuperAdminQuota({
      promotingToSuper,
      demotingSuper,
      targetId: target._id,
    });
    if (!quota.ok) return res.status(quota.status).json({ message: quota.message });

    // Un super_admin no puede quitarse el rol a sí mismo si es el último
    if (
      demotingSuper &&
      String(req.user._id) === String(target._id)
    ) {
      const total = await countSuperAdmins();
      if (total <= 1) {
        return res.status(400).json({
          message: 'No podés quitarte el rol de Super Admin siendo el único',
        });
      }
    }

    const updatePayload = { ...req.body };
    if (updatePayload.password) {
      updatePayload.password = await bcrypt.hash(updatePayload.password, 10);
    }

    const effectiveRol = updatePayload.rol || target.rol;
    if (Object.prototype.hasOwnProperty.call(updatePayload, 'color') || effectiveRol === 'usuario') {
      if (effectiveRol === 'usuario') {
        const requested = normalizeColor(
          Object.prototype.hasOwnProperty.call(updatePayload, 'color')
            ? updatePayload.color
            : target.color
        );
        if (requested) {
          const check = await assertUniqueTecnicoColor(requested, target._id);
          if (!check.ok) return res.status(check.status).json({ message: check.message });
          updatePayload.color = check.color;
        } else if (!target.color) {
          const used = await collectUsedColors(target._id);
          const auto = nextAvailableColor(used);
          if (!auto) {
            return res.status(400).json({ message: 'No hay colores libres para asignar al técnico' });
          }
          updatePayload.color = auto;
        } else if (Object.prototype.hasOwnProperty.call(updatePayload, 'color') && !requested) {
          return res.status(400).json({ message: 'El técnico debe tener un color válido' });
        }
      } else {
        updatePayload.color = null;
      }
    }

    const localidadChanged =
      Object.prototype.hasOwnProperty.call(updatePayload, 'localidad') &&
      updatePayload.localidad !== target.localidad;
    const direccionChanged =
      Object.prototype.hasOwnProperty.call(updatePayload, 'direccion') &&
      updatePayload.direccion !== target.direccion;

    if (localidadChanged || (direccionChanged && !updatePayload.localidad && !target.localidad)) {
      const base = await resolveUbicacionBase(
        updatePayload.localidad ?? target.localidad,
        updatePayload.direccion ?? target.direccion
      );
      if (base) {
        updatePayload.ubicacionBase = base;
      } else if (localidadChanged && !String(updatePayload.localidad || '').trim()) {
        updatePayload.ubicacionBase = undefined;
      }
    }

    let usuario;
    try {
      usuario = await Usuario.findByIdAndUpdate(req.params.id, updatePayload, { new: true });
    } catch (err) {
      if (err && err.code === 11000 && String(err.message || '').includes('color')) {
        return res.status(409).json({ message: 'Ese color ya está asignado a otro técnico' });
      }
      throw err;
    }
    if (!usuario) return res.status(404).json({ message: 'Usuario no encontrado' });
    res.json({ message: 'Usuario actualizado', usuario });
  } catch (err) {
    res.status(500).json({ message: 'Error al actualizar usuario', error: err.message });
  }
};

// Eliminar usuario
exports.deleteUser = async (req, res) => {
  try {
    const target = await Usuario.findById(req.params.id);
    const canManage = await assertCanManageTarget(req.user, target);
    if (!canManage.ok) {
      return res.status(canManage.status).json({ message: canManage.message });
    }

    if (isSuperAdmin(target)) {
      if (!isSuperAdmin(req.user)) {
        return res.status(403).json({ message: 'No autorizado' });
      }
      const total = await countSuperAdmins();
      if (total <= 1) {
        return res.status(400).json({ message: 'No se puede eliminar el último Super Admin' });
      }
      if (String(req.user._id) === String(target._id)) {
        return res.status(400).json({ message: 'No podés eliminarte a vos mismo' });
      }
    }

    await Usuario.findByIdAndDelete(req.params.id);
    res.json({ message: 'Usuario eliminado' });
  } catch (err) {
    res.status(500).json({ message: 'Error al eliminar usuario', error: err.message });
  }
};

// Aprobar usuario
exports.approveUser = async (req, res) => {
  try {
    const target = await Usuario.findById(req.params.id);
    const canManage = await assertCanManageTarget(req.user, target);
    if (!canManage.ok) {
      return res.status(canManage.status).json({ message: canManage.message });
    }

    const updates = { aprobado: true };
    if (target.rol === 'usuario' && !normalizeColor(target.color)) {
      const used = await collectUsedColors(target._id);
      const auto = nextAvailableColor(used);
      if (auto) updates.color = auto;
    }

    const usuario = await Usuario.findByIdAndUpdate(req.params.id, updates, { new: true });
    if (!usuario) return res.status(404).json({ message: 'Usuario no encontrado' });
    res.json({ message: 'Usuario aprobado', usuario });
  } catch (err) {
    res.status(500).json({ message: 'Error al aprobar usuario', error: err.message });
  }
};

// Listar usuarios pendientes
exports.getPendingUsers = async (req, res) => {
  try {
    const usuarios = await Usuario.find({ aprobado: false }).populate('especialidad');
    res.json({ success: true, data: usuarios });
  } catch (err) {
    res.status(500).json({ message: 'Error al obtener usuarios pendientes', error: err.message });
  }
};

// Reset password
exports.resetUserPassword = async (req, res) => {
  try {
    const { id } = req.params;
    const target = await Usuario.findById(id);
    const canManage = await assertCanManageTarget(req.user, target);
    if (!canManage.ok) {
      return res.status(canManage.status).json({
        success: false,
        message: canManage.message,
      });
    }

    const generateRandomPassword = () => {
      const length = 10;
      const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
      let password = '';
      for (let i = 0; i < length; i++) {
        password += charset.charAt(Math.floor(Math.random() * charset.length));
      }
      return password;
    };

    const newPassword = generateRandomPassword();
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    const user = await Usuario.findByIdAndUpdate(
      id,
      { password: hashedPassword },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado',
      });
    }

    res.json({
      success: true,
      message: 'Contraseña restablecida exitosamente',
      data: {
        newPassword,
        user: {
          id: user._id,
          email: user.email,
          nombre: user.nombre,
        },
      },
    });
  } catch (error) {
    console.error('Error al restablecer contraseña:', error);
    res.status(500).json({
      success: false,
      message: 'Error al restablecer la contraseña',
      error: error.message,
    });
  }
};

exports.getCurrentUser = async (req, res) => {
  try {
    const user = await Usuario.findById(req.user.id || req.user._id).select('-password');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado',
      });
    }
    res.json({
      success: true,
      data: user,
    });
  } catch (error) {
    console.error('Error al obtener usuario actual:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener los datos del usuario',
      error: error.message,
    });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    // Solo campos de perfil; rol/aprobado/porcentaje jamás vía este endpoint
    const profileSchema = Joi.object({
      nombre: Joi.string().optional(),
      email: Joi.string().email().optional(),
      password: Joi.string().min(6).optional(),
      telefono: Joi.string().optional().allow(null, ''),
      direccion: Joi.string().optional().allow(null, ''),
      localidad: Joi.string().optional().allow(null, ''),
    });

    const { error, value } = profileSchema.validate(req.body, {
      stripUnknown: true,
      abortEarly: true,
    });
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
      });
    }

    const userId = req.user.id || req.user._id;
    const updateData = {};
    if (value.nombre !== undefined) updateData.nombre = value.nombre;
    if (value.email !== undefined) updateData.email = value.email;
    if (value.telefono !== undefined) updateData.telefono = value.telefono;
    if (value.direccion !== undefined) updateData.direccion = value.direccion;
    if (value.localidad !== undefined) updateData.localidad = value.localidad;
    if (value.password) {
      updateData.password = await bcrypt.hash(value.password, 10);
    }

    const current = await Usuario.findById(userId);
    if (!current) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado',
      });
    }

    const localidadChanged =
      Object.prototype.hasOwnProperty.call(updateData, 'localidad') &&
      updateData.localidad !== current.localidad;
    const direccionChanged =
      Object.prototype.hasOwnProperty.call(updateData, 'direccion') &&
      updateData.direccion !== current.direccion;

    if (localidadChanged || (direccionChanged && !updateData.localidad && !current.localidad)) {
      const base = await resolveUbicacionBase(
        updateData.localidad ?? current.localidad,
        updateData.direccion ?? current.direccion
      );
      if (base) {
        updateData.ubicacionBase = base;
      } else if (localidadChanged && !String(updateData.localidad || '').trim()) {
        updateData.ubicacionBase = null;
      }
    }

    const usuario = await Usuario.findByIdAndUpdate(userId, updateData, { new: true }).select(
      '-password'
    );

    res.json({
      success: true,
      message: 'Perfil actualizado exitosamente',
      data: usuario,
    });
  } catch (error) {
    console.error('Error al actualizar perfil:', error);
    res.status(500).json({
      success: false,
      message: 'Error al actualizar el perfil',
      error: error.message,
    });
  }
};

exports.changePassword = async (req, res) => {
  try {
    const schema = Joi.object({
      currentPassword: Joi.string().required(),
      newPassword: Joi.string().min(6).required(),
    });

    const { error } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
      });
    }

    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id || req.user._id;

    const user = await Usuario.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado',
      });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: 'La contraseña actual es incorrecta',
      });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    res.json({
      success: true,
      message: 'Contraseña actualizada exitosamente',
    });
  } catch (error) {
    console.error('Error al cambiar contraseña:', error);
    res.status(500).json({
      success: false,
      message: 'Error al cambiar la contraseña',
      error: error.message,
    });
  }
};

// Export helpers for tests if needed
exports._internal = { countSuperAdmins, assertCanManageTarget, isPrivilegedAdmin };

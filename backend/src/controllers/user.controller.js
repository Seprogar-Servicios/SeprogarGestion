const Usuario = require('../models/User');
const bcrypt = require('bcryptjs');
const { userRegisterSchema, userUpdateSchema } = require('../utils/validators');
const Joi = require('joi');

// Crear usuario (solo admin)
exports.createUser = async (req, res) => {
  const { error } = userRegisterSchema.validate(req.body);
  if (error) return res.status(400).json({ message: error.details[0].message });
  try {
    const exists = await Usuario.findOne({ email: req.body.email });
    if (exists) return res.status(409).json({ message: 'Email ya registrado' });
    const hash = await bcrypt.hash(req.body.password, 10);
    const usuario = new Usuario({ ...req.body, password: hash, aprobado: true });
    await usuario.save();
    // Return response in the expected format for the frontend
    res.status(201).json({ 
      success: true, 
      data: usuario,
      message: 'Usuario creado' 
    });
  } catch (err) {
    res.status(500).json({ message: 'Error al crear usuario', error: err.message });
  }
};

// Listar usuarios (solo admin)
exports.getUsers = async (req, res) => {
  try {
    const usuarios = await Usuario.find().populate('especialidad');
    res.json({ success: true, data: usuarios });
  } catch (err) {
    res.status(500).json({ message: 'Error al obtener usuarios', error: err.message });
  }
};

// Actualizar usuario (solo admin)
exports.updateUser = async (req, res) => {
  const { error } = userUpdateSchema.validate(req.body);
  if (error) return res.status(400).json({ message: error.details[0].message });
  try {
    if (req.body.password) {
      req.body.password = await bcrypt.hash(req.body.password, 10);
    }
    const usuario = await Usuario.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!usuario) return res.status(404).json({ message: 'Usuario no encontrado' });
    res.json({ message: 'Usuario actualizado', usuario });
  } catch (err) {
    res.status(500).json({ message: 'Error al actualizar usuario', error: err.message });
  }
};

// Eliminar usuario (solo admin)
exports.deleteUser = async (req, res) => {
  try {
    const usuario = await Usuario.findByIdAndDelete(req.params.id);
    if (!usuario) return res.status(404).json({ message: 'Usuario no encontrado' });
    res.json({ message: 'Usuario eliminado' });
  } catch (err) {
    res.status(500).json({ message: 'Error al eliminar usuario', error: err.message });
  }
};

// Aprobar usuario (solo admin)
exports.approveUser = async (req, res) => {
  try {
    const usuario = await Usuario.findByIdAndUpdate(req.params.id, { aprobado: true }, { new: true });
    if (!usuario) return res.status(404).json({ message: 'Usuario no encontrado' });
    res.json({ message: 'Usuario aprobado', usuario });
  } catch (err) {
    res.status(500).json({ message: 'Error al aprobar usuario', error: err.message });
  }
};

// Listar usuarios pendientes (solo admin)
exports.getPendingUsers = async (req, res) => {
  try {
    const usuarios = await Usuario.find({ aprobado: false }).populate('especialidad');
    res.json({ success: true, data: usuarios });
  } catch (err) {
    res.status(500).json({ message: 'Error al obtener usuarios pendientes', error: err.message });
  }
};

// Reset user password (admin only)
exports.resetUserPassword = async (req, res) => {
  try {
    const { id } = req.params;
    const { email } = req.body;
    
    // Generate a random password
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
        message: 'Usuario no encontrado' 
      });
    }

    // In a real application, you would send an email here with the new password
    // For now, we'll return the new password in the response (for demo purposes only)
    // In production, you should use a proper email service
    
    res.json({ 
      success: true,
      message: 'Contraseña restablecida exitosamente',
      data: {
        newPassword: newPassword, // Only for demo - remove in production
        user: {
          id: user._id,
          email: user.email,
          nombre: user.nombre
        }
      }
    });
  } catch (error) {
    console.error('Error al restablecer contraseña:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error al restablecer la contraseña', 
      error: error.message 
    });
  }
};

// Obtener usuario actual (usuario autenticado)
exports.getCurrentUser = async (req, res) => {
  try {
    const user = await Usuario.findById(req.user.id).select('-password');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }
    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('Error al obtener usuario actual:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener los datos del usuario',
      error: error.message
    });
  }
};

// Actualizar perfil propio (usuario autenticado)
exports.updateProfile = async (req, res) => {
  try {
    const { error } = userUpdateSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ 
        success: false, 
        message: error.details[0].message 
      });
    }

    const userId = req.user.id; // Obtenido del middleware de autenticación
    const { password, ...updateData } = req.body; // Separar contraseña de otros datos

    // Si se proporciona una nueva contraseña, hashearla
    if (password) {
      updateData.password = await bcrypt.hash(password, 10);
    }

    // Actualizar el usuario
    const usuario = await Usuario.findByIdAndUpdate(userId, updateData, { new: true }).select('-password');
    
    if (!usuario) {
      return res.status(404).json({ 
        success: false, 
        message: 'Usuario no encontrado' 
      });
    }

    res.json({ 
      success: true, 
      message: 'Perfil actualizado exitosamente',
      data: usuario
    });
  } catch (error) {
    console.error('Error al actualizar perfil:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error al actualizar el perfil', 
      error: error.message 
    });
  }
};

// Cambiar contraseña (usuario autenticado)
exports.changePassword = async (req, res) => {
  try {
    // Validar datos de entrada
    const schema = Joi.object({
      currentPassword: Joi.string().required(),
      newPassword: Joi.string().min(6).required()
    });

    const { error } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({ 
        success: false, 
        message: error.details[0].message 
      });
    }

    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id; // Obtenido del middleware de autenticación

    // Buscar el usuario
    const user = await Usuario.findById(userId);
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'Usuario no encontrado' 
      });
    }

    // Verificar la contraseña actual
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ 
        success: false, 
        message: 'La contraseña actual es incorrecta' 
      });
    }

    // Hashear la nueva contraseña
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Actualizar la contraseña
    user.password = hashedPassword;
    await user.save();

    res.json({ 
      success: true, 
      message: 'Contraseña actualizada exitosamente' 
    });
  } catch (error) {
    console.error('Error al cambiar contraseña:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error al cambiar la contraseña', 
      error: error.message 
    });
  }
};

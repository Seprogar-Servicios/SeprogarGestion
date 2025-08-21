const Usuario = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('../config');
const { userRegisterSchema } = require('../utils/validators');

// Registrar usuario (solo admin puede crear usuarios, pero endpoint público para solicitud)
exports.register = async (req, res) => {
  const { error } = userRegisterSchema.validate(req.body);
  if (error) return res.status(400).json({ message: error.details[0].message });
  try {
    const exists = await Usuario.findOne({ email: req.body.email });
    if (exists) return res.status(409).json({ message: 'Email ya registrado' });
    const hash = await bcrypt.hash(req.body.password, 10);
    const usuario = new Usuario({ ...req.body, password: hash, aprobado: false });
    await usuario.save();
    // Notificar admin aquí (por email/push)
    res.status(201).json({ message: 'Registro exitoso. Espera aprobación del administrador.' });
  } catch (err) {
    res.status(500).json({ message: 'Error en el registro', error: err.message });
  }
};

// Login
exports.login = async (req, res) => {
  const { email, password } = req.body;
  try {
    const usuario = await Usuario.findOne({ email });
    if (!usuario) return res.status(401).json({ message: 'Credenciales inválidas' });
    if (!usuario.aprobado) return res.status(403).json({ message: 'Cuenta pendiente de aprobación' });
    const valid = await bcrypt.compare(password, usuario.password);
    if (!valid) return res.status(401).json({ message: 'Credenciales inválidas' });
    const accessToken = jwt.sign({ id: usuario._id, rol: usuario.rol }, config.jwt.accessSecret, { expiresIn: config.jwt.accessExpiresIn });
    const refreshToken = jwt.sign({ id: usuario._id }, config.jwt.refreshSecret, { expiresIn: config.jwt.refreshExpiresIn });
    // Opcional: guardar refreshToken en DB o en memoria
    res.json({ 
      accessToken, 
      refreshToken, 
      user: { 
        id: usuario._id, 
        nombre: usuario.nombre, 
        email: usuario.email, 
        rol: usuario.rol,
        telefono: usuario.telefono || null 
      } 
    });
  } catch (err) {
    res.status(500).json({ message: 'Error en login', error: err.message });
  }
};

// Refresh token
exports.refreshToken = (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.status(400).json({ message: 'Refresh token requerido' });
  jwt.verify(refreshToken, config.jwt.refreshSecret, (err, decoded) => {
    if (err) return res.status(401).json({ message: 'Refresh token inválido o expirado' });
    const accessToken = jwt.sign({ id: decoded.id }, config.jwt.accessSecret, { expiresIn: config.jwt.accessExpiresIn });
    res.json({ accessToken });
  });
};

// Logout (solo frontend borra tokens, opcional invalidar refresh en DB)
exports.logout = (req, res) => {
  // Si se guarda refreshToken en DB, eliminar aquí
  res.json({ message: 'Logout exitoso' });
};

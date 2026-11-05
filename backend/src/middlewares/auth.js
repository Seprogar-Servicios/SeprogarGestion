const jwt = require('jsonwebtoken');
const config = require('../config');
const Usuario = require('../models/User');

// Middleware para verificar JWT y usuario aprobado
const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Token requerido' });
  try {
    const decoded = jwt.verify(token, config.jwt.accessSecret);
    const user = await Usuario.findById(decoded.id);
    if (!user) return res.status(401).json({ message: 'Usuario no encontrado' });
    if (!user.aprobado) return res.status(403).json({ message: 'Cuenta pendiente de aprobación' });
    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Token inválido o expirado' });
  }
};

// Middleware para verificar roles
// super_admin tiene acceso a todo (poder sobre el resto de roles)
const authorizeRoles = (...roles) => {
  // Aplanar el array de roles en caso de que venga anidado
  const flatRoles = roles.flat(Infinity);
  
  return (req, res, next) => {
    
    if (!req.user) {
      return res.status(401).json({ message: 'No autenticado' });
    }

    if (req.user.rol === 'super_admin') {
      return next();
    }
    
    if (!flatRoles.includes(req.user.rol)) {
      return res.status(403).json({ 
        message: 'No autorizado',
        userRole: req.user.rol,
        requiredRoles: flatRoles
      });
    }
    
    next();
  };
};

module.exports = { authenticateToken, authorizeRoles };

const express = require('express');
const router = express.Router();
const { subscribe, unsubscribe } = require('../controllers/subscriptionController');
const { authenticateToken, authorizeRoles } = require('../middlewares/auth');

// Push: por ahora solo admin y super admin (authorizeRoles deja pasar a super_admin)

// @route   POST /api/subscribe
// @desc    Registrar suscripción push del dispositivo
// @access  Admin / Super Admin
router.post('/', authenticateToken, authorizeRoles('admin'), subscribe);

// @route   DELETE /api/subscribe
// @desc    Eliminar suscripción push del dispositivo
// @access  Admin / Super Admin
router.delete('/', authenticateToken, authorizeRoles('admin'), unsubscribe);

module.exports = router;

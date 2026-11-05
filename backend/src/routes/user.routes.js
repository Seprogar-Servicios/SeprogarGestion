const express = require('express');
const router = express.Router();
const userCtrl = require('../controllers/user.controller');
const authCtrl = require('../controllers/auth.controller');
const { authenticateToken, authorizeRoles } = require('../middlewares/auth');

// Public routes (no authentication required)
router.post('/register', authCtrl.register);

// Protected routes (require authentication)
router.use(authenticateToken);

// User profile routes
router.get('/me', userCtrl.getCurrentUser);
router.post('/change-password', userCtrl.changePassword);
router.put('/profile', userCtrl.updateProfile);

// Admin-only routes (require admin role)
router.use(authorizeRoles('admin', 'super_admin'));
router.get('/', userCtrl.getUsers);
router.get('/pending', userCtrl.getPendingUsers);
router.post('/', userCtrl.createUser);
router.put('/:id', userCtrl.updateUser);
router.delete('/:id', userCtrl.deleteUser);
router.put('/aprobar/:id', userCtrl.approveUser);
router.post('/:id/reset-password', userCtrl.resetUserPassword);

module.exports = router;

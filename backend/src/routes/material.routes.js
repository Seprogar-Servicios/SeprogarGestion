const express = require('express');
const router = express.Router();
const materialCtrl = require('../controllers/material.controller');
const { authenticateToken, authorizeRoles } = require('../middlewares/auth');

// Todas las rutas requieren autenticación
router.use(authenticateToken);

// Solo admin puede crear, actualizar y eliminar materiales
router.post('/', authorizeRoles('admin'), materialCtrl.createMaterial);
router.put('/:id', authorizeRoles('admin'), materialCtrl.updateMaterial);
router.delete('/:id', authorizeRoles('admin'), materialCtrl.deleteMaterial);

// Admin y técnicos pueden ver materiales
router.get('/', authorizeRoles('admin', 'usuario'), materialCtrl.getMateriales);

module.exports = router;

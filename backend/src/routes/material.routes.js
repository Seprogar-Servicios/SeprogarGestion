const express = require('express');
const router = express.Router();
const materialCtrl = require('../controllers/material.controller');
const { authenticateToken, authorizeRoles } = require('../middlewares/auth');

// Solo admin tiene acceso a materiales
router.use(authenticateToken, authorizeRoles('admin'));

router.post('/', materialCtrl.createMaterial);
router.get('/', materialCtrl.getMateriales);
router.put('/:id', materialCtrl.updateMaterial);
router.delete('/:id', materialCtrl.deleteMaterial);

module.exports = router;

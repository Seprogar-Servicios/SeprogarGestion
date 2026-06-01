const express = require('express');
const router = express.Router();
const categoriaMaterialCtrl = require('../controllers/categoriaMaterial.controller');
const { authenticateToken, authorizeRoles } = require('../middlewares/auth');

// Todas las rutas requieren autenticación
router.use(authenticateToken);

// Solo admin puede crear, actualizar y eliminar categorías
router.post('/', authorizeRoles('admin'), categoriaMaterialCtrl.createCategoriaMaterial);
router.put('/:id', authorizeRoles('admin'), categoriaMaterialCtrl.updateCategoriaMaterial);
router.delete('/:id', authorizeRoles('admin'), categoriaMaterialCtrl.deleteCategoriaMaterial);

// Admin y técnicos pueden ver categorías
router.get('/', authorizeRoles('admin', 'usuario'), categoriaMaterialCtrl.getCategoriasMateriales);

module.exports = router;

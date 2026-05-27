const express = require('express');
const router = express.Router();
const categoriaMaterialCtrl = require('../controllers/categoriaMaterial.controller');
const { authenticateToken, authorizeRoles } = require('../middlewares/auth');

// Solo admin tiene acceso a categorías de materiales
router.use(authenticateToken, authorizeRoles('admin'));

router.post('/', categoriaMaterialCtrl.createCategoriaMaterial);
router.get('/', categoriaMaterialCtrl.getCategoriasMateriales);
router.put('/:id', categoriaMaterialCtrl.updateCategoriaMaterial);
router.delete('/:id', categoriaMaterialCtrl.deleteCategoriaMaterial);

module.exports = router;

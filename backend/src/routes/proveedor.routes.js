const express = require('express');
const router = express.Router();
const proveedorCtrl = require('../controllers/proveedor.controller');
const { authenticateToken, authorizeRoles } = require('../middlewares/auth');

router.use(authenticateToken);

router.get('/', proveedorCtrl.getProveedores);

router.use(authorizeRoles('admin'));
router.post('/', proveedorCtrl.createProveedor);
router.put('/:id', proveedorCtrl.updateProveedor);
router.delete('/:id', proveedorCtrl.deleteProveedor);

module.exports = router;

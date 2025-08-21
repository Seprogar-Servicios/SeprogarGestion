const express = require('express');
const router = express.Router();
const especialidadCtrl = require('../controllers/especialidad.controller');
const { authenticateToken, authorizeRoles } = require('../middlewares/auth');

// Ruta pública para obtener especialidades (necesaria para el registro)
router.get('/', especialidadCtrl.getEspecialidades);

// El resto de rutas requieren autenticación y rol de admin
router.use(authenticateToken, authorizeRoles('admin'));

router.post('/', especialidadCtrl.createEspecialidad);
router.put('/:id', especialidadCtrl.updateEspecialidad);
router.delete('/:id', especialidadCtrl.deleteEspecialidad);

module.exports = router;

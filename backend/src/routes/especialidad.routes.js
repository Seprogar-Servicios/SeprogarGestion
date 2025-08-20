const express = require('express');
const router = express.Router();
const especialidadCtrl = require('../controllers/especialidad.controller');
const { authenticateToken, authorizeRoles } = require('../middlewares/auth');

// Todas requieren admin
router.use(authenticateToken, authorizeRoles('admin'));

router.post('/', especialidadCtrl.createEspecialidad);
router.get('/', especialidadCtrl.getEspecialidades);
router.put('/:id', especialidadCtrl.updateEspecialidad);
router.delete('/:id', especialidadCtrl.deleteEspecialidad);

module.exports = router;

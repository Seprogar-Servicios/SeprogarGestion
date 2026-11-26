const express = require('express');
const router = express.Router();
const avisoCtrl = require('../controllers/aviso.controller');
const { authenticateToken, authorizeRoles } = require('../middlewares/auth');

// Avisos: solo admin y super_admin (super_admin pasa por authorizeRoles)
router.use(authenticateToken, authorizeRoles('admin'));

router.get('/activos', avisoCtrl.getActivos);
router.get('/', avisoCtrl.getAvisos);
router.post('/', avisoCtrl.createAviso);
router.put('/:id', avisoCtrl.updateAviso);
router.delete('/:id', avisoCtrl.deleteAviso);

module.exports = router;

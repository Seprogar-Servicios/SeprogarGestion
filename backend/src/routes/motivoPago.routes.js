const express = require('express');
const router = express.Router();
const motivoPagoCtrl = require('../controllers/motivoPago.controller');
const { authenticateToken, authorizeRoles } = require('../middlewares/auth');

router.use(authenticateToken);

router.get('/', authorizeRoles('admin', 'usuario'), motivoPagoCtrl.getMotivosPago);
router.post('/', authorizeRoles('admin'), motivoPagoCtrl.createMotivoPago);
router.put('/:id', authorizeRoles('admin'), motivoPagoCtrl.updateMotivoPago);
router.delete('/:id', authorizeRoles('admin'), motivoPagoCtrl.deleteMotivoPago);

module.exports = router;

const express = require('express');
const router = express.Router();
const pagoManualCtrl = require('../controllers/pagoManual.controller');
const { authenticateToken, authorizeRoles } = require('../middlewares/auth');

router.use(authenticateToken);

router.get('/mis-pagos', authorizeRoles('usuario'), pagoManualCtrl.getMisPagos);

router.get('/', authorizeRoles('admin'), pagoManualCtrl.getPagosManuales);
router.post('/', authorizeRoles('admin'), pagoManualCtrl.createPagoManual);
router.get('/:id/pdf', authorizeRoles('admin'), pagoManualCtrl.downloadPagoManualPdf);
router.get('/:id', authorizeRoles('admin', 'usuario'), pagoManualCtrl.getPagoManualById);
router.put('/:id', authorizeRoles('admin'), pagoManualCtrl.updatePagoManual);
router.delete('/:id', authorizeRoles('admin'), pagoManualCtrl.deletePagoManual);

module.exports = router;

const express = require('express');
const router = express.Router();
const reclamoCtrl = require('../controllers/reclamo.controller');
const { authenticateToken, authorizeRoles } = require('../middlewares/auth');

router.use(authenticateToken);
router.use(authorizeRoles('admin'));

router.get('/', reclamoCtrl.getReclamos);
router.post('/', reclamoCtrl.createReclamo);
router.put('/:id', reclamoCtrl.updateReclamo);
router.delete('/:id', reclamoCtrl.deleteReclamo);

module.exports = router;

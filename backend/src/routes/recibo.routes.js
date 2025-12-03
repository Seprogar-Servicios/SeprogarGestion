const express = require('express');
const router = express.Router();


const {
  createRecibo,
  getRecibos,
  getMisRecibos,
  getReciboById,
  firmarRecibo,
  deleteRecibo,
} = require('../controllers/recibo.controller');

const { authenticateToken, authorizeRoles } = require('../middlewares/auth');
const upload = require('../middlewares/upload');
const { validate } = require('../middlewares/validator.middleware');
const { reciboSchema, firmaSchema } = require('../utils/validators');

// Todas las rutas requieren autenticación
router.use(authenticateToken);

// === RUTAS ADMIN ===
router.post('/', authorizeRoles('admin'), upload.single('pdf'), validate(reciboSchema), createRecibo);
router.get('/', authorizeRoles('admin'), getRecibos);
router.delete('/:id', authorizeRoles('admin'), deleteRecibo);

// === RUTAS TÉCNICO ===
router.get('/mis-recibos', getMisRecibos);
router.post('/:id/firmar', upload.single('firma'), validate(firmaSchema), firmarRecibo);

// === RUTA COMPARTIDA ===
router.get('/:id', getReciboById);

module.exports = router;

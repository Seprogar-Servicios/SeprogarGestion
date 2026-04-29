const express = require('express');
const router = express.Router();
const tareaConsorcioCtrl = require('../controllers/tareaConsorcio.controller');
const { authenticateToken } = require('../middlewares/auth');
const { array, single, handleUploadError } = require('../middlewares/uploadConsorcio');

// Todas requieren autenticación
router.use(authenticateToken);

// CRUD básico
router.post('/', tareaConsorcioCtrl.createTareaConsorcio);
router.get('/', tareaConsorcioCtrl.getTareasConsorcio);
router.get('/mis-tareas', tareaConsorcioCtrl.getMisTareas);
router.get('/calendario', tareaConsorcioCtrl.getTareasConsorcioCalendario);
router.get('/:id', tareaConsorcioCtrl.getTareaConsorcioById);
router.put('/:id', tareaConsorcioCtrl.updateTareaConsorcio);
router.delete('/:id', tareaConsorcioCtrl.deleteTareaConsorcio);

// Manejo de archivos
// Subir múltiples fotos (array de archivos)
router.post('/:id/fotos', 
  array('fotos', 10), // Máximo 10 fotos
  handleUploadError,
  tareaConsorcioCtrl.uploadFotos
);

// Subir comprobante de pago (archivo único)
router.post('/:id/comprobante', 
  single('comprobante'), // Archivo único
  handleUploadError,
  tareaConsorcioCtrl.uploadComprobantePago
);

// Validar comprobante (solo admin)
router.put('/:id/validar-comprobante', 
  authenticateToken, 
  tareaConsorcioCtrl.validarComprobantePago
);

// Eliminar una foto específica
router.delete('/:id/fotos/:photoFilename', 
  authenticateToken, 
  tareaConsorcioCtrl.deleteFoto
);

module.exports = router;

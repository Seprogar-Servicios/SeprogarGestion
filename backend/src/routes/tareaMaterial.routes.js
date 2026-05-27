const express = require('express');
const router = express.Router();
const {
  getMaterialesTarea,
  agregarMaterialAdmin,
  agregarMultiplesMaterialesAdmin,
  agregarMaterialTecnico,
  agregarMaterialTecnicoDesdeLista,
  actualizarMaterialTarea,
  eliminarMaterialTarea,
  validarComprobante,
  descargarComprobante,
  upload
} = require('../controllers/tareaMaterial.controller');
const { authenticateToken, authorizeRoles } = require('../middlewares/auth');

// Todas las rutas requieren autenticación
router.use(authenticateToken);

// Obtener materiales de una tarea
router.get('/tarea/:tareaId', getMaterialesTarea);

// Agregar material a tarea (Admin - desde lista existente)
router.post('/tarea/:tareaId/admin', authorizeRoles('admin'), agregarMaterialAdmin);

// Agregar múltiples materiales a tarea (Admin)
router.post('/tarea/:tareaId/admin/multiples', authorizeRoles('admin'), agregarMultiplesMaterialesAdmin);

// Agregar material a tarea (Técnico - manual con comprobante)
router.post('/tarea/:tareaId/tecnico', authorizeRoles('usuario'), upload.single('comprobante'), agregarMaterialTecnico);

// Agregar material a tarea (Técnico - desde lista existente, sin comprobante)
router.post('/tarea/:tareaId/tecnico/lista', authorizeRoles('usuario'), agregarMaterialTecnicoDesdeLista);

// Actualizar material de tarea
router.put('/tarea/:tareaId/:materialId', actualizarMaterialTarea);

// Eliminar material de tarea
router.delete('/tarea/:tareaId/:materialId', eliminarMaterialTarea);

// Validar comprobante (Admin)
router.put('/tarea/:tareaId/:materialId/validar', authorizeRoles('admin'), validarComprobante);

// Descargar comprobante
router.get('/tarea/:tareaId/:materialId/descargar', descargarComprobante);

module.exports = router;

const express = require('express');
const router = express.Router();
const {
  getLiquidaciones,
  getLiquidacionById,
  createLiquidacion,
  updateLiquidacion,
  deleteLiquidacion,
  getLiquidacionesByTecnico,
  getLiquidacionByTarea,
  getLiquidacionByNumeroTarea,
  exportLiquidacionesTecnico,
  exportLiquidacionesAdmin,
  exportCalculoMensual
} = require('../controllers/tareaLiquidacion.controller');
const { authenticateToken, authorizeRoles } = require('../middlewares/auth');

// Todas las rutas requieren autenticación
router.use(authenticateToken);

// Obtener todas las liquidaciones (solo admin)
router.get('/', authorizeRoles('admin'), getLiquidaciones);

// Exportar todas las liquidaciones (Admin) a Excel
router.get('/export', authorizeRoles('admin'), exportLiquidacionesAdmin);

// Exportar cálculo mensual (Admin) a Excel
router.get('/export/calculo-mensual', authorizeRoles('admin'), exportCalculoMensual);

// Obtener liquidaciones por técnico (admin y el propio técnico)
router.get('/tecnico/:tecnicoId', authorizeRoles('admin', 'usuario'), getLiquidacionesByTecnico);

// Exportar liquidaciones del técnico a Excel
router.get('/tecnico/:tecnicoId/export', authorizeRoles('admin', 'usuario'), exportLiquidacionesTecnico);

// Obtener liquidación por número de tarea
router.get('/tarea/numero/:numero', getLiquidacionByNumeroTarea);

// Obtener liquidación por tarea
router.get('/tarea/:tareaId', getLiquidacionByTarea);

// Obtener liquidación por ID
router.get('/:id', getLiquidacionById);

// Crear liquidación (solo admin)
router.post('/', authorizeRoles('admin'), createLiquidacion);

// Actualizar liquidación (solo admin)
router.put('/:id', authorizeRoles('admin'), updateLiquidacion);

// Eliminar liquidación (solo admin)
router.delete('/:id', authorizeRoles('admin'), deleteLiquidacion);

module.exports = router;

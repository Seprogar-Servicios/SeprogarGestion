const express = require('express');
const router = express.Router();
const { authenticateToken, authorizeRoles } = require('../middlewares/auth');
const {
  getObservacionesByTarea,
  createObservacion,
  updateObservacion,
  deleteObservacion
} = require('../controllers/observacion.controller');

// Ruta para obtener todas las observaciones de una tarea
router.get('/tarea/:tareaId', authenticateToken, getObservacionesByTarea);

// Ruta para crear una nueva observación
router.post('/', authenticateToken, createObservacion);

// Ruta para actualizar una observación
router.put('/:id', authenticateToken, updateObservacion);

// Ruta para eliminar una observación
router.delete('/:id', authenticateToken, deleteObservacion);

module.exports = router;

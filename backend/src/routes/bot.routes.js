/**
 * Rutas específicas para el bot de WhatsApp
 * Estas rutas utilizan autenticación por API_KEY o JWT y están optimizadas para respuestas del bot
 */
const express = require('express');
const router = express.Router();
const botTareaCtrl = require('../controllers/botTarea.controller');
const { validateApiKey } = require('../middlewares/apiKeyAuth');
const { authenticateToken } = require('../middlewares/auth');

// Permitir autenticación por API Key o JWT
router.use((req, res, next) => {
  const authHeader = req.headers['authorization'];
  
  // Si tiene API Key, usar validación de API Key
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const apiKey = authHeader.split(' ')[1];
    if (apiKey === process.env.API_KEY) {
      return next();
    }
  }
  
  // Si no tiene API Key válida, usar autenticación JWT normal
  authenticateToken(req, res, next);
});

// Obtener detalles de una tarea por ID o número
router.get('/tarea/:id', botTareaCtrl.getTareaDetalles);

// Buscar tareas con filtros
router.get('/tareas/buscar', botTareaCtrl.buscarTareas);

// Actualizar liquidación por número de tarea
router.put('/liquidacion/actualizar', botTareaCtrl.actualizarLiquidacionPorTarea);

module.exports = router;

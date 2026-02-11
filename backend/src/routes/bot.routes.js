/**
 * Rutas específicas para el bot de WhatsApp
 * Estas rutas utilizan autenticación por API_KEY y están optimizadas para respuestas del bot
 */
const express = require('express');
const router = express.Router();
const botTareaCtrl = require('../controllers/botTarea.controller');
const { validateApiKey } = require('../middlewares/apiKeyAuth');

// Todas las rutas requieren API Key
router.use(validateApiKey);

// Obtener detalles de una tarea por ID o número
router.get('/tarea/:id', botTareaCtrl.getTareaDetalles);

// Buscar tareas con filtros
router.get('/tareas/buscar', botTareaCtrl.buscarTareas);

module.exports = router;

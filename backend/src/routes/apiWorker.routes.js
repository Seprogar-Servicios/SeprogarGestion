/**
 * Rutas específicas para el worker de WhatsApp
 * Estas rutas utilizan autenticación por API_KEY en lugar de JWT
 */
const express = require('express');
const router = express.Router();
const workerTareaCtrl = require('../controllers/workerTarea.controller');
const { validateApiKey } = require('../middlewares/apiKeyAuth');

// Todas las rutas requieren API Key
router.use(validateApiKey);

// Ruta para verificar si una tarea existe por número
router.get('/check-duplicate/:numero', workerTareaCtrl.checkDuplicateTarea);

// Ruta para crear una tarea desde el worker
router.post('/', workerTareaCtrl.createTarea);

module.exports = router;

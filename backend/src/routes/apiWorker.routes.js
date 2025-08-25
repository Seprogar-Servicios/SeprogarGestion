/**
 * Rutas específicas para el worker de WhatsApp
 * Estas rutas utilizan autenticación por API_KEY en lugar de JWT
 */
const express = require('express');
const router = express.Router();
const tareaCtrl = require('../controllers/tarea.controller');
const { validateApiKey } = require('../middlewares/apiKeyAuth');

// Todas las rutas requieren API Key
router.use(validateApiKey);

// Ruta para verificar si una tarea existe por número
router.get('/check-duplicate/:numero', async (req, res) => {
  try {
    const { numero } = req.params;
    const tarea = await require('../models/Tarea').findOne({ numero });
    return res.json({ exists: !!tarea });
  } catch (error) {
    console.error('Error al verificar tarea duplicada:', error);
    return res.status(500).json({ message: 'Error al verificar tarea duplicada' });
  }
});

// Ruta para crear una tarea desde el worker
router.post('/', tareaCtrl.createTarea);

module.exports = router;

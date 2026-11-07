const express = require('express');
const router = express.Router();
const tareaCtrl = require('../controllers/tarea.controller');
const { authenticateToken } = require('../middlewares/auth');

// Todas requieren autenticación
router.use(authenticateToken);

// CRUD y vistas
router.post('/', tareaCtrl.createTarea);
router.get('/', tareaCtrl.getTareas);
router.get('/calendario', tareaCtrl.getTareasCalendario);
router.get('/mapa-vivo', tareaCtrl.getMapaVivo);
router.get('/:id', tareaCtrl.getTareaById);
router.put('/:id', tareaCtrl.updateTarea);
router.delete('/:id', tareaCtrl.deleteTarea);
router.post('/delete-multiple', tareaCtrl.deleteMultipleTareas);

module.exports = router;

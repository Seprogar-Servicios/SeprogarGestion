const Agenda = require('agenda');
const config = require('../config');
const Tarea = require('../models/Tarea');
const Usuario = require('../models/User');
const { sendPush, sendEmail } = require('../controllers/notification.controller');

// Configuración de Agenda.js
const agenda = new Agenda({
  db: { address: config.mongoUri, collection: 'jobs' },
  processEvery: '1 minute',
});

// Job: Recordatorio de tarea
agenda.define('recordatorio-tarea', async (job) => {
  const { tareaId } = job.attrs.data;
  const tarea = await Tarea.findById(tareaId).populate('tecnicos');
  if (!tarea) return;
  const mensaje = `Recordatorio: La tarea "${tarea.titulo}" está programada para el ${tarea.fechaEjecucion.toLocaleString()}`;
  for (const tecnico of tarea.tecnicos) {
    await sendPush(tecnico._id, { title: 'Recordatorio de tarea', body: mensaje });
    await sendEmail(tecnico.email, 'Recordatorio de tarea', mensaje);
  }
});

module.exports = agenda;

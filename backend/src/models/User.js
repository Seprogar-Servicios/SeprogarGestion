const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  nombre: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  rol: { type: String, enum: ['admin', 'usuario'], required: true },
  especialidad: { type: mongoose.Schema.Types.ObjectId, ref: 'Especialidad', default: null },
  aprobado: { type: Boolean, default: false },
  notificationToken: { type: String, default: null },
  telefono: { type: String, default: null },
}, { timestamps: true });

module.exports = mongoose.model('Usuario', userSchema);

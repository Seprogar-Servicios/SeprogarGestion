const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  nombre: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  rol: { type: String, enum: ['super_admin', 'admin', 'usuario', 'adminConsorcio'], required: true },
  especialidad: { type: mongoose.Schema.Types.ObjectId, ref: 'Especialidad', default: null },
  aprobado: { type: Boolean, default: false },
  notificationToken: { type: String, default: null },
  telefono: { type: String, default: null },
  direccion: { type: String, default: null },
  porcentajeTecnico: {
    type: Number,
    default: 0.7,
    min: 0,
    max: 1,
    validate: {
      validator: function(v) {
        return v >= 0 && v <= 1;
      },
      message: 'El porcentaje debe estar entre 0 y 1'
    }
  }
}, { timestamps: true });

// Índices para mejor rendimiento
userSchema.index({ email: 1 });
userSchema.index({ rol: 1 });
userSchema.index({ aprobado: 1 });

// Virtuals para facilitar consultas
userSchema.virtual('esAdminConsorcio').get(function() {
  return this.rol === 'adminConsorcio';
});

userSchema.virtual('esAdmin').get(function() {
  return this.rol === 'admin' || this.rol === 'super_admin';
});

userSchema.virtual('esSuperAdmin').get(function() {
  return this.rol === 'super_admin';
});

userSchema.virtual('esTecnico').get(function() {
  return this.rol === 'usuario';
});

module.exports = mongoose.model('Usuario', userSchema);

require('dotenv').config({ path: '.env' });
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Usuario = require('../src/models/User');
const config = require('../src/config');

const EMAIL = process.env.SUPER_ADMIN_EMAIL || 'admin@futurgas.com';
const PASSWORD = process.env.SUPER_ADMIN_PASSWORD || 'SuperAdmin123!';

async function main() {
  await mongoose.connect(config.mongoUri);
  let user = await Usuario.findOne({ rol: 'super_admin' });
  if (!user) {
    user = await Usuario.findOne({ email: EMAIL });
  }
  if (!user) {
    user = await Usuario.findOne({ email: 'admin@futurgas.com' });
  }
  if (!user) {
    console.error('No se encontró usuario Super Admin ni admin@futurgas.com');
    process.exit(1);
  }

  user.rol = 'super_admin';
  user.aprobado = true;
  user.password = await bcrypt.hash(PASSWORD, 10);
  await user.save();

  console.log('✅ Contraseña reseteada');
  console.log(`Email: ${user.email}`);
  console.log(`Password: ${PASSWORD}`);
  console.log(`Rol: ${user.rol}`);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

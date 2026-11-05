require('dotenv').config({ path: '.env' });
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Usuario = require('../src/models/User');
const config = require('../src/config');
const { MAX_SUPER_ADMINS } = require('../src/utils/roles');

// Credenciales por defecto del Super Admin (cambiar tras el primer login)
const DEFAULT_SUPER_ADMIN_EMAIL = process.env.SUPER_ADMIN_EMAIL || 'superadmin@seprogar.com';
const DEFAULT_SUPER_ADMIN_PASSWORD = process.env.SUPER_ADMIN_PASSWORD || 'SuperAdmin123!';
const LEGACY_ADMIN_EMAIL = 'admin@futurgas.com';

async function initAdmin() {
  try {
    if (!config.mongoUri) {
      throw new Error('MongoDB URI is not configured. Please check your .env file');
    }

    console.log('Connecting to MongoDB...');
    await mongoose.connect(config.mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('✅ Connected to MongoDB');

    const superCount = await Usuario.countDocuments({ rol: 'super_admin' });

    if (superCount === 0) {
      // Preferir promover el admin legacy si existe
      let legacy = await Usuario.findOne({ email: LEGACY_ADMIN_EMAIL });
      if (legacy) {
        legacy.rol = 'super_admin';
        legacy.aprobado = true;
        // Resetear contraseña a una conocida para no quedar bloqueados tras el promote
        const resetPassword = process.env.SUPER_ADMIN_PASSWORD || DEFAULT_SUPER_ADMIN_PASSWORD;
        legacy.password = await bcrypt.hash(resetPassword, 10);
        await legacy.save();
        console.log('✅ Usuario legacy promovido a Super Admin (contraseña reseteada)');
        console.log('----------------------------------------');
        console.log('SUPER ADMIN CREDENTIALS:');
        console.log(`Email: ${legacy.email}`);
        console.log(`Password: ${resetPassword}`);
        console.log('----------------------------------------');
      } else {
        let existing = await Usuario.findOne({ email: DEFAULT_SUPER_ADMIN_EMAIL });
        if (!existing) {
          const hashedPassword = await bcrypt.hash(DEFAULT_SUPER_ADMIN_PASSWORD, 10);
          existing = new Usuario({
            nombre: 'Super Administrador',
            email: DEFAULT_SUPER_ADMIN_EMAIL,
            password: hashedPassword,
            rol: 'super_admin',
            aprobado: true,
          });
          await existing.save();
          console.log('✅ Super Admin creado');
          console.log('----------------------------------------');
          console.log('SUPER ADMIN CREDENTIALS:');
          console.log(`Email: ${DEFAULT_SUPER_ADMIN_EMAIL}`);
          console.log(`Password: ${DEFAULT_SUPER_ADMIN_PASSWORD}`);
          console.log('----------------------------------------');
          console.log('⚠️  IMPORTANTE: Cambiá esta contraseña después del primer login');
        } else {
          existing.rol = 'super_admin';
          existing.aprobado = true;
          await existing.save();
          console.log('✅ Usuario existente promovido a Super Admin');
          console.log(`Email: ${existing.email}`);
        }
      }
    } else {
      console.log(`ℹ️  Ya existen ${superCount} Super Admin(s) (máximo ${MAX_SUPER_ADMINS})`);
      const supers = await Usuario.find({ rol: 'super_admin' }).select('email nombre');
      supers.forEach((s) => console.log(`  - ${s.email} (${s.nombre})`));
    }

    // Asegurar que exista al menos un admin operativo clásico (opcional, no bloquea)
    const adminCount = await Usuario.countDocuments({ rol: 'admin' });
    if (adminCount === 0 && superCount === 0) {
      console.log('ℹ️  No hay admins operativos además del Super Admin');
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error initializing admin user:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

initAdmin();

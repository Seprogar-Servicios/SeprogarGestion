require('dotenv').config({ path: '.env' });
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Usuario = require('../src/models/User');
const config = require('../src/config');

// Default admin credentials
const DEFAULT_ADMIN_EMAIL = 'admin@futurgas.com';
const DEFAULT_ADMIN_PASSWORD = 'Admin123!'; // This should be changed on first login

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

    // Check if admin already exists
    console.log('Checking for existing admin user...');
    let adminUser = await Usuario.findOne({ email: DEFAULT_ADMIN_EMAIL });
    
    if (!adminUser) {
      console.log('Creating default admin user...');
      const hashedPassword = await bcrypt.hash(DEFAULT_ADMIN_PASSWORD, 10);
      adminUser = new Usuario({
        nombre: 'Administrador',
        email: DEFAULT_ADMIN_EMAIL,
        password: hashedPassword,
        rol: 'admin',
        aprobado: true
      });
      
      await adminUser.save();
      console.log('✅ Default admin user created successfully');
      console.log('----------------------------------------');
      console.log('ADMIN CREDENTIALS:');
      console.log(`Email: ${DEFAULT_ADMIN_EMAIL}`);
      console.log(`Password: ${DEFAULT_ADMIN_PASSWORD}`);
      console.log('----------------------------------------');
      console.log('⚠️  IMPORTANT: Change this password after first login!');
    } else {
      console.log('ℹ️  Admin user already exists');
      console.log(`Email: ${adminUser.email}`);
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

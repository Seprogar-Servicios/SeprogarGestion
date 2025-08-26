const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const fs = require('fs');
const path = require('path');

// Configuración de rutas para la sesión local
const AUTH_FOLDER = path.join(__dirname, '.wwebjs_auth');

// Crear carpeta .wwebjs_auth si no existe
if (!fs.existsSync(AUTH_FOLDER)) {
    fs.mkdirSync(AUTH_FOLDER, { recursive: true });
    console.log(`📁 Carpeta creada: ${AUTH_FOLDER}`);
}

// Crear cliente de WhatsApp usando LocalAuth
const client = new Client({
    authStrategy: new LocalAuth({
        dataPath: AUTH_FOLDER
    }),
    puppeteer: {
        headless: true,
        args: ['--no-sandbox']
    }
});

console.log(`📁 Usando carpeta de autenticación: ${AUTH_FOLDER}`);

// Evento cuando se genera el QR
client.on('qr', (qr) => {
    console.log('====================');
    console.log('ESCANEA ESTE QR CON TU TELÉFONO');
    console.log('====================');
    qrcode.generate(qr, { small: true });
});

// Evento cuando se autentica y genera la sesión
client.on('authenticated', () => {
    console.log('✅ AUTENTICADO CORRECTAMENTE!');
    console.log('📄 La sesión se ha guardado automáticamente en la carpeta .wwebjs_auth');
    console.log('🔄 Ahora puedes subir esta carpeta a Render');
});

// Evento cuando hay un error de autenticación
client.on('auth_failure', (error) => {
    console.error('❌ ERROR DE AUTENTICACIÓN:', error);
});

// Evento cuando el cliente está listo
client.on('ready', () => {
    console.log('✅ Cliente listo! WhatsApp conectado y listo para usar');
    console.log('🚀 Sesión lista para ser usada en Render');
});

// Evento para errores generales
client.on('disconnected', (reason) => {
    console.log('❌ Cliente desconectado:', reason);
});

console.log('🚀 Iniciando cliente de WhatsApp...');

// Inicializar el cliente
client.initialize();

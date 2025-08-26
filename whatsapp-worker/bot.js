const { Client } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const fs = require('fs');
const path = require('path');

// Ruta de la sesión
// Usa la variable de entorno SESSION_PATH si existe (útil para Render)
// Si no, guarda localmente en ./.wwebjs_auth/session.json
const SESSION_PATH = process.env.SESSION_PATH || path.join(__dirname, '.wwebjs_auth', 'session.json');

let sessionData = {};
if (fs.existsSync(SESSION_PATH)) {
    sessionData = require(SESSION_PATH);
}

// Crear cliente WhatsApp
const client = new Client({
    puppeteer: { 
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--disable-gpu'
        ],
        executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined
    },
    session: sessionData
});

// Evento QR
client.on('qr', qr => {
    console.log('====================');
    console.log('ESCANEA ESTE QR CON TU TELÉFONO');
    console.log('====================');
    qrcode.generate(qr, { small: true });
});

// Evento autenticación
client.on('authenticated', (session) => {
    console.log('✅ AUTENTICADO CORRECTAMENTE!');

    // Crear carpeta si no existe
    const dir = path.dirname(SESSION_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    // Guardar sesión
    fs.writeFileSync(SESSION_PATH, JSON.stringify(session));
    console.log('Datos de sesión guardados en', SESSION_PATH);
});

// Evento error de autenticación
client.on('auth_failure', (error) => {
    console.error('❌ ERROR DE AUTENTICACIÓN:', error);
});

// Evento de carga
client.on('loading_screen', (percent, message) => {
    console.log(`Cargando: ${percent}% - ${message}`);
});

// Cliente listo
client.on('ready', () => {
    console.log('✅ Cliente listo! WhatsApp conectado y listo para usar');
});

client.initialize();

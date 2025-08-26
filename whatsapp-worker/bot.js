const { Client } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');

const client = new Client({
    puppeteer: { 
        headless: true, // modo headless para Docker/Render
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
    }
});

// Generar QR en ASCII cuando sea necesario
client.on('qr', qr => {
    console.log('====================');
    console.log('ESCANEA ESTE QR CON TU TELÉFONO');
    console.log('====================');
    qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
    console.log('✅ Cliente listo!');
});

client.initialize();

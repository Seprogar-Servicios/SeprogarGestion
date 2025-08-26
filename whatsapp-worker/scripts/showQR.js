require('dotenv').config();
const express = require('express');
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode');
const fs = require('fs');
const path = require('path');
const logger = require('../src/utils/logger');

// Crear carpeta public si no existe
const publicDir = path.join(__dirname, '../public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// Inicializar servidor Express
const app = express();
const port = process.env.PORT || 8080;

// Servir archivos estáticos
app.use(express.static(publicDir));

// Ruta para mostrar el QR
app.get('/', (req, res) => {
  res.sendFile(path.join(publicDir, 'qr.html'));
});

// Iniciar servidor
const server = app.listen(port, () => {
  logger.info(`Servidor QR iniciado en el puerto ${port}`);
});

// Crear archivo HTML para mostrar el QR
const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <title>WhatsApp QR Code</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    body {
      font-family: Arial, sans-serif;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100vh;
      margin: 0;
      background-color: #f0f2f5;
    }
    .container {
      text-align: center;
      background-color: white;
      padding: 20px;
      border-radius: 10px;
      box-shadow: 0 4px 8px rgba(0,0,0,0.1);
      max-width: 90%;
    }
    h1 {
      color: #128C7E;
    }
    #qrcode {
      margin: 20px auto;
    }
    .instructions {
      margin: 20px 0;
      color: #555;
    }
    .status {
      margin-top: 20px;
      padding: 10px;
      border-radius: 5px;
      font-weight: bold;
    }
    .waiting {
      background-color: #FFF3CD;
      color: #856404;
    }
    .success {
      background-color: #D4EDDA;
      color: #155724;
    }
    .error {
      background-color: #F8D7DA;
      color: #721C24;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>WhatsApp QR Code</h1>
    <div class="instructions">
      <p>Escanea este código QR con WhatsApp para iniciar sesión</p>
      <p>1. Abre WhatsApp en tu teléfono</p>
      <p>2. Toca Menú o Configuración y selecciona WhatsApp Web</p>
      <p>3. Apunta tu teléfono hacia esta pantalla para escanear el código</p>
    </div>
    <div id="qrcode"></div>
    <div id="status" class="status waiting">Esperando código QR...</div>
  </div>
  
  <script>
    // Función para actualizar el QR
    function checkQR() {
      fetch('/qr-data')
        .then(response => response.json())
        .then(data => {
          if (data.qr) {
            document.getElementById('qrcode').innerHTML = '<img src="' + data.qr + '" alt="QR Code">';
            document.getElementById('status').className = 'status waiting';
            document.getElementById('status').innerText = 'Escanea el código QR';
          } else if (data.connected) {
            document.getElementById('qrcode').innerHTML = '<p>✅</p>';
            document.getElementById('status').className = 'status success';
            document.getElementById('status').innerText = 'Conectado correctamente';
          } else {
            document.getElementById('status').className = 'status error';
            document.getElementById('status').innerText = 'Error al generar QR';
          }
        })
        .catch(err => {
          console.error('Error:', err);
          document.getElementById('status').className = 'status error';
          document.getElementById('status').innerText = 'Error de conexión';
        });
    }
    
    // Verificar QR cada 5 segundos
    setInterval(checkQR, 5000);
    
    // Verificar inmediatamente al cargar
    checkQR();
  </script>
</body>
</html>
`;

fs.writeFileSync(path.join(publicDir, 'qr.html'), htmlContent);

// Ruta de la sesión
const sessionPath = path.resolve('./.wwebjs_auth');

// Variable para almacenar el QR
let qrDataURL = null;
let connected = false;

// Ruta para obtener datos del QR
app.get('/qr-data', (req, res) => {
  res.json({
    qr: qrDataURL,
    connected: connected
  });
});

logger.info('Iniciando generación de nueva sesión de WhatsApp...');

// Inicializar cliente de WhatsApp con autenticación local
const client = new Client({
  authStrategy: new LocalAuth({
    dataPath: sessionPath
  }),
  puppeteer: {
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--disable-gpu'
    ],
    headless: true,
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined
  }
});

// Evento cuando se genera el código QR para autenticación
client.on('qr', (qr) => {
  logger.info('===========================================');
  logger.info('QR CODE GENERADO - NECESITA ESCANEAR CON WHATSAPP');
  logger.info('===========================================');
  
  // Generar imagen del QR
  qrcode.toDataURL(qr, (err, url) => {
    if (err) {
      logger.error('Error al generar imagen QR:', err);
      return;
    }
    
    qrDataURL = url;
    logger.info('QR generado y disponible en la interfaz web');
  });
});

// Evento cuando el cliente está listo
client.on('ready', () => {
  logger.info('===========================================');
  logger.info('SESIÓN INICIADA CORRECTAMENTE - WHATSAPP CONECTADO');
  logger.info('===========================================');
  
  connected = true;
  
  // Aplicar permisos correctos a la carpeta de sesión
  try {
    const command = `chmod -R 777 ${sessionPath}`;
    require('child_process').execSync(command);
    logger.info(`Permisos aplicados correctamente a: ${sessionPath}`);
  } catch (error) {
    logger.error(`Error al aplicar permisos: ${error.message}`);
  }
  
  // Esperar un tiempo para asegurar que todo se guarde correctamente
  setTimeout(() => {
    logger.info('Sesión generada y guardada correctamente');
    logger.info('Cerrando el servidor QR...');
    server.close(() => {
      logger.info('Servidor QR cerrado');
      process.exit(0);
    });
  }, 10000);
});

// Manejar errores de autenticación
client.on('auth_failure', (error) => {
  logger.error('===========================================');
  logger.error('ERROR DE AUTENTICACIÓN');
  logger.error('===========================================');
  logger.error(error);
});

// Inicializar el cliente
client.initialize();

// Manejar señales de terminación
process.on('SIGINT', () => {
  logger.info('Cerrando servidor QR...');
  server.close(() => {
    logger.info('Servidor QR cerrado');
    process.exit(0);
  });
});

// Establecer un tiempo máximo de espera
setTimeout(() => {
  if (!connected) {
    logger.error('Tiempo de espera agotado. No se pudo generar la sesión.');
    server.close(() => {
      process.exit(1);
    });
  }
}, 10 * 60 * 1000); // 10 minutos

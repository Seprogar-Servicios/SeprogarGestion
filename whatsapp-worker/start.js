const { spawn } = require('child_process');
const express = require('express');
const path = require('path');
const fs = require('fs');

// Crear servidor web para mostrar el QR
const app = express();
const PORT = process.env.PORT || 8080;

// Servir archivos estáticos desde la carpeta public
app.use(express.static(path.join(__dirname, 'public')));

// Ruta principal
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Iniciar servidor web - escuchar en todas las interfaces para que sea accesible desde Internet
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`Servidor web iniciado en http://0.0.0.0:${PORT}`);
  console.log('Accede a la URL de Render para ver el código QR');
});

// Crear directorio public si no existe
const publicDir = path.join(__dirname, 'public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// Iniciar el extractor de QR
const qrExtractor = spawn('node', [path.join(__dirname, 'scripts', 'qr-extractor.js')]);

// Redirigir la salida del extractor de QR a la consola
qrExtractor.stdout.pipe(process.stdout);
qrExtractor.stderr.pipe(process.stderr);

// Iniciar la aplicación principal
const whatsappProcess = spawn('node', ['index.js']);

// Redirigir la salida de la aplicación principal al extractor de QR
whatsappProcess.stdout.pipe(qrExtractor.stdin);
whatsappProcess.stderr.pipe(process.stderr);

// Manejar cierre
process.on('SIGINT', () => {
  console.log('Cerrando aplicación...');
  whatsappProcess.kill();
  qrExtractor.kill();
  server.close();
  process.exit(0);
});

// Manejar errores
whatsappProcess.on('error', (error) => {
  console.error('Error en proceso WhatsApp:', error);
});

qrExtractor.on('error', (error) => {
  console.error('Error en extractor QR:', error);
});

// Manejar cierre de procesos
whatsappProcess.on('close', (code) => {
  console.log(`Proceso WhatsApp cerrado con código ${code}`);
  if (code !== 0) {
    console.log('Reiniciando proceso WhatsApp...');
    // Reiniciar proceso si falla
    setTimeout(() => {
      const newProcess = spawn('node', ['index.js']);
      newProcess.stdout.pipe(qrExtractor.stdin);
      newProcess.stderr.pipe(process.stderr);
      whatsappProcess = newProcess;
    }, 5000);
  }
});

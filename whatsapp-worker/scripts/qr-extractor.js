const fs = require('fs');
const path = require('path');
const qrcode = require('qrcode');
const readline = require('readline');

// Directorio para guardar la imagen QR
const QR_DIR = path.join(__dirname, '..', 'public');
const QR_PATH = path.join(QR_DIR, 'qr-code.png');

// Asegurar que el directorio existe
if (!fs.existsSync(QR_DIR)) {
  fs.mkdirSync(QR_DIR, { recursive: true });
}

// Patrón para detectar el código QR en los logs
const QR_PATTERN = /data:image\/png;base64,([A-Za-z0-9+/=]+)/;

// Crear interfaz para leer de stdin
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false
});

console.log('QR Extractor: Esperando código QR en los logs...');

// Escuchar cada línea de entrada
rl.on('line', (line) => {
  // Buscar el patrón del QR en la línea
  const match = line.match(QR_PATTERN);
  
  if (match) {
    const base64Data = match[1];
    
    // Extraer el código QR de la data URI
    const qrData = Buffer.from(base64Data, 'base64');
    
    // Guardar como imagen PNG
    fs.writeFileSync(QR_PATH, qrData);
    
    console.log(`QR Extractor: Código QR guardado en ${QR_PATH}`);
    
    // También generar un QR a partir del texto si es necesario
    const qrText = line.match(/https:\/\/[^\s"]+/);
    if (qrText) {
      qrcode.toFile(path.join(QR_DIR, 'qr-text.png'), qrText[0], {
        errorCorrectionLevel: 'H',
        type: 'png',
        margin: 1,
        scale: 8
      }, (err) => {
        if (err) {
          console.error('Error al generar QR desde texto:', err);
        } else {
          console.log(`QR Extractor: QR alternativo generado en ${path.join(QR_DIR, 'qr-text.png')}`);
        }
      });
    }
  }
  
  // También buscar el formato de QR en texto plano
  if (line.includes('QR Code generado') || line.includes('Scan the code below')) {
    console.log('QR Extractor: Detectada línea de QR, esperando datos...');
  }
});

// Manejar cierre
rl.on('close', () => {
  console.log('QR Extractor: Finalizado');
});

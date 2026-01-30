require('dotenv').config();
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const axios = require('axios');
const { parsePedidoMessage, parseTareaMessage, parseExpedienteMessage } = require('./src/parsers');

// ================= CONFIG =================

const GRUPOS_PERMITIDOS = new Set(
  (process.env.GRUPOS_PERMITIDOS || '')
    .split(',')
    .map(g => g.trim().toLowerCase())
);

const http = axios.create({
  timeout: 10000,
  headers: {
    'Authorization': `Bearer ${process.env.API_KEY}`,
    'Content-Type': 'application/json'
  }
});

// ================= CLIENT =================

const client = new Client({
  puppeteer: {
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--no-zygote',
      '--single-process'
    ]
  }
});
// ================= EVENTS =================

client.on('qr', qr => {
  console.log('📱 Escaneá el QR');
  qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
  console.log('✅ WhatsApp conectado y listo');
});

client.on('auth_failure', msg => {
  console.error('❌ Error de auth:', msg);
  process.exit(1);
});

client.on('disconnected', reason => {
  console.warn('⚠️ Desconectado:', reason);
  setTimeout(() => client.initialize(), 5000);
});

// ================= MESSAGE HANDLER =================

client.on('message_create', async (message) => {
  try {
    await handleMessage(message);
  } catch (err) {
    console.error('Error procesando mensaje:', err.message);
  }
});
// ================= CORE LOGIC =================

async function handleMessage(message) {
  try {
    if (!message.body) return;

    const chat = await message.getChat();
    if (!chat.isGroup) return;

    const groupName = chat.name?.trim().toLowerCase();
    if (!GRUPOS_PERMITIDOS.has(groupName)) return;

    const content = normalize(message.body);

    let parser = null;
    let tipo = null;

    if (content.startsWith('TAREA:')) {
      parser = parseTareaMessage;
      tipo = 'tarea';
    } else if (content.startsWith('Pedido') || content.includes('TURNO')) {
      parser = parsePedidoMessage;
      tipo = 'pedido';
    } else if (content.toLowerCase().includes('expediente:')) {
      parser = parseExpedienteMessage;
      tipo = 'expediente';
    }

    if (!parser) {
      console.log('⚠️ Formato no reconocido');
      return;
    }

    const data = parser(content);
    if (!data?.numero) return;

    data.origen = 'whatsapp';
    data.grupoOrigen = chat.name;
    data.fechaRecepcion = new Date().toISOString();

    const exists = await checkDuplicate(data.numero);
    if (exists) {
      console.log(`⏭️ Duplicado ${data.numero}`);
      return;
    }

    await sendTask(data);
    console.log(`✅ ${tipo.toUpperCase()} ${data.numero} enviada`);

  } catch (err) {
    console.error('🔥 Error procesando mensaje:', err.message);
  }
}

// ================= HELPERS =================

function normalize(text) {
  return text
    .replace(/\*/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

async function checkDuplicate(numero) {
  try {
    const res = await http.get(`${process.env.CHECK_DUPLICATE_URL}/${numero}`);
    return res.data?.exists === true;
  } catch {
    return true; // fail-safe
  }
}

async function sendTask(data) {
  await http.post(process.env.CREATE_TASK_URL, data);
}

// ================= START =================

client.initialize();

// ================= SHUTDOWN =================

process.on('SIGINT', async () => {
  await client.destroy();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await client.destroy();
  process.exit(0);
});
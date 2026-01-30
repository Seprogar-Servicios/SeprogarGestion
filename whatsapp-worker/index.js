require('dotenv').config();
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { performance } = require('perf_hooks');
const chromium = require('@sparticuz/chromium'); // Chromium compatible contenedores

// Memory monitoring
const MEMORY_THRESHOLD = 0.7; // 70% of available memory
const MEMORY_CHECK_INTERVAL = 300000; // 5 minutes instead of 30 seconds

function getMemoryUsage() {
  const usage = process.memoryUsage();
  
  // For container environments, focus on process memory, not system memory
  const heapUsedMB = Math.round(usage.heapUsed / 1024 / 1024 * 100) / 100;
  const heapTotalMB = Math.round(usage.heapTotal / 1024 / 1024 * 100) / 100;
  const rssMB = Math.round(usage.rss / 1024 / 1024 * 100) / 100;
  const externalMB = Math.round(usage.external / 1024 / 1024 * 100) / 100;
  
  // Estimate container memory usage (512MB limit)
  const containerLimitMB = 512;
  const estimatedUsagePercent = Math.round((rssMB / containerLimitMB) * 100);
  
  return {
    heapUsed: heapUsedMB,
    heapTotal: heapTotalMB,
    external: externalMB,
    rss: rssMB,
    containerLimit: containerLimitMB,
    estimatedUsagePercent: estimatedUsagePercent
  };
}

function monitorMemory() {
  const memory = getMemoryUsage();
  
  // Only log if memory usage is concerning (>60%)
  if (memory.estimatedUsagePercent > 60) {
    logger.warn('📊 Memory Usage:', {
      heap: `${memory.heapUsed}MB / ${memory.heapTotal}MB`,
      rss: `${memory.rss}MB / ${memory.containerLimit}MB (${memory.estimatedUsagePercent}%)`,
      external: `${memory.external}MB`
    });
  }
  
  // Alert if memory usage is high
  if (memory.estimatedUsagePercent > MEMORY_THRESHOLD * 100) {
    logger.warn('⚠️  High memory usage detected!', {
      usage: `${memory.estimatedUsagePercent}%`,
      threshold: `${MEMORY_THRESHOLD * 100}%`
    });
    
    // Force garbage collection if available
    if (global.gc) {
      global.gc();
      logger.info('🧹 Forced garbage collection');
    }
    
    // Check if we need to restart
    if (memory.estimatedUsagePercent > 0.85) {
      logger.error('🚨 Critical memory usage! Consider restarting the service');
    }
  }
}

// Start memory monitoring
setInterval(monitorMemory, MEMORY_CHECK_INTERVAL);

// Error handling with controlled restart
process.on('uncaughtException', (error) => {
  logger.error('🚨 Uncaught Exception:', error);
  logger.error('Stack trace:', error.stack);
  
  // Log memory usage before crash
  const memory = getMemoryUsage();
  logger.error('Memory at crash:', {
    heap: `${memory.heapUsed}MB / ${memory.heapTotal}MB`,
    rss: `${memory.rss}MB / ${memory.containerLimit}MB (${memory.estimatedUsagePercent}%)`,
    external: `${memory.external}MB`
  });
  
  // Attempt graceful shutdown
  try {
    if (client) {
      client.destroy().then(() => {
        logger.info('Client destroyed gracefully');
        process.exit(1);
      }).catch(() => {
        process.exit(1);
      });
    } else {
      process.exit(1);
    }
  } catch (e) {
    logger.error('Error during shutdown:', e);
    process.exit(1);
  }
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('🚨 Unhandled Rejection at:', promise, 'reason:', reason);
  
  // Log memory usage
  const memory = getMemoryUsage();
  logger.error('Memory at rejection:', {
    heap: `${memory.heapUsed}MB / ${memory.heapTotal}MB`,
    rss: `${memory.rss}MB / ${memory.containerLimit}MB (${memory.estimatedUsagePercent}%)`,
    external: `${memory.external}MB`
  });
  
  // Force garbage collection
  if (global.gc) {
    global.gc();
    logger.info('🧹 Forced garbage collection after rejection');
  }
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('📴 SIGTERM received, shutting down gracefully');
  if (client) {
    client.destroy().then(() => {
      logger.info('Client destroyed on SIGTERM');
      process.exit(0);
    }).catch(() => {
      process.exit(0);
    });
  } else {
    process.exit(0);
  }
});

process.on('SIGINT', () => {
  logger.info('📴 SIGINT received, shutting down gracefully');
  if (client) {
    client.destroy().then(() => {
      logger.info('Client destroyed on SIGINT');
      process.exit(0);
    }).catch(() => {
      process.exit(0);
    });
  } else {
    process.exit(0);
  }
});

// Configuración de cola de procesamiento (p-queue es ESM, se carga con import dinámico)
let queue;
async function initializeQueue() {
  if (queue) return queue;
  const { default: PQueue } = await import('p-queue');
  queue = new PQueue({
    concurrency: 1, // Procesar un mensaje a la vez
    timeout: 30000, // 30 segundos máximo por tarea
    throwOnTimeout: true
  });
  return queue;
}

const http = axios.create({ timeout: 10000 });
const AUTH_FOLDER = path.join(__dirname, '.wwebjs_auth');

// --- CONFIGURACIÓN E IMPORTACIONES ---
const logger = require('./src/utils/logger');
const { parsePedidoMessage, parseTareaMessage, parseExpedienteMessage } = require('./src/parsers');

const GRUPOS_PERMITIDOS = process.env.GRUPOS_PERMITIDOS
  ? process.env.GRUPOS_PERMITIDOS.split(',').map((g) => g.trim().toLowerCase())
  : [];

// Cache para búsqueda rápida
const allowedGroupsCache = new Set(GRUPOS_PERMITIDOS);

// --- INICIALIZACIÓN DEL CLIENTE ---
let client;

async function initializeClient() {
  try {
    logger.info('🚀 INICIANDO CLIENTE WHATSAPP');
    await initializeQueue();
    const executablePath = await chromium.executablePath();
    
    client = new Client({
      authStrategy: new LocalAuth({ dataPath: AUTH_FOLDER, clientId: 'futurgas-worker' }),
      puppeteer: {
        headless: true,
        args: [
          '--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage',
          '--disable-gpu', '--no-zygote', '--single-process', ...chromium.args
        ],
        executablePath,
      },
      takeoverOnConflict: true,
      restartOnAuthFail: true,
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Safari/537.36'
    });

    setupEventHandlers();
    await client.initialize();
  } catch (err) {
    logger.error('🔥 Error crítico:', err);
    process.exit(1);
  }
}

function setupEventHandlers() {
  client.on('qr', (qr) => qrcode.generate(qr, { small: true }));

  client.on('authenticated', () => logger.info('✅ AUTENTICACIÓN EXITOSA'));

  client.on('ready', () => {
    logger.info('🚀 CLIENTE LISTO - Escuchando mensajes en tiempo real');
    // Se eliminó la carga masiva de chats inicial para evitar bloqueos
  });

  client.on('message_create', async (message) => {
    if (!message.body && !message.hasMedia) return;

    // Encolar procesamiento
    if (queue) {
      queue.add(() => handleIncomingFlow(message)).catch(e => logger.error('Error en cola:', e.message));
    } else {
      handleIncomingFlow(message);
    }
  });

  client.on('disconnected', (reason) => {
    logger.warn(`❌ Desconectado: ${reason}`);
    setTimeout(initializeClient, 5000);
  });
}

// --- FLUJO DE PROCESAMIENTO ---
async function handleIncomingFlow(message) {
  try {
    // Log de debug para ver qué llega al servidor
    logger.debug(`📩 Mensaje recibido de ${message.from}`);

    // Obtener chat con timeout para evitar que Puppeteer se cuelgue
    const chat = await Promise.race([
      message.getChat(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout Chat')), 8000))
    ]).catch(() => null);

    if (!chat || !chat.isGroup) return;

    // Validar grupo
    const groupName = chat.name?.trim().toLowerCase();
    if (!allowedGroupsCache.has(groupName)) return;

    // Ejecutar tus funciones originales de log y proceso
    await logIncomingMessage(message, chat);
    await processMessage(message, chat);

  } catch (error) {
    logger.error('Error flujo entrada:', error.message);
  }
}

// === Logging de mensajes entrantes ===
async function logIncomingMessage(message, chat) {
  const timestamp = new Date().toLocaleString('es-AR');
  logger.info('\n' + '='.repeat(80));
  logger.info(`📩 MENSAJE EN GRUPO PERMITIDO: ${chat.name} - ${timestamp}`);
  logger.info(`� REMITENTE: ${message.from}`);
  logger.info(`💬 CONTENIDO: ${message.body}`);
  logger.info('='.repeat(80) + '\n');
}

// --- FLUJO DE PROCESAMIENTO ---

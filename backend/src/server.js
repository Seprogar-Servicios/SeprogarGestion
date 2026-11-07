require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const mongoose = require('mongoose');

const app = express();

// Configurar trust proxy para entornos de producción (necesario para express-rate-limit en Render)
app.set('trust proxy', 1);

// Jobs programados (Agenda.js)
const agenda = require('./jobs/agenda');

// Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// CORS: orígenes fijos + CORS_ORIGINS; en no-producción también localhost/127.0.0.1 (cualquier puerto)
const isDev = process.env.NODE_ENV !== 'production';
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:4000',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5174',
  'https://seprogar-gestion.vercel.app',
  ...(process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(',').map((o) => o.trim()).filter(Boolean)
    : []),
];

const corsOptions = {
  origin: function (origin, callback) {
    // Sin Origin (curl, Postman, same-origin proxy de Vite)
    if (!origin) return callback(null, true);

    const isLocalDev =
      isDev &&
      /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin);

    if (allowedOrigins.includes(origin) || isLocalDev) {
      return callback(null, true);
    }

    console.warn(`CORS bloqueado para origen: ${origin}`);
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Content-Range', 'X-Total-Count'],
};

app.use(cors(corsOptions));

// Manejar solicitudes OPTIONS (preflight)
app.options('*', cors(corsOptions));
app.use(morgan('dev'));
app.use('/uploads', express.static('uploads'));

// Evitar servir archivos de configuración del frontend
app.use((req, res, next) => {
  // Bloquear acceso a archivos de configuración
  const blockedPaths = [
    '/tailwind.config.js',
    '/eslint.config.js',
    '/vite.config.js',
    '/.env',
    '/package.json'
  ];
  
  if (blockedPaths.some(path => req.path.endsWith(path))) {
    return res.status(404).send('Not Found');
  }
  
  next();
});

// Rate limiting (en desarrollo se omite: el SPA dispara muchas lecturas al navegar)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 2000, // admin SPA + mapa/polls; geo tiene límite propio
  message: {
    success: false,
    message: 'Demasiadas peticiones desde esta IP, por favor inténtalo de nuevo en 15 minutos',
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    if (process.env.NODE_ENV !== 'production') return true;
    const skipPaths = ['/api/health', '/api/tareas/crear-masivo', '/api/tareas/actualizar-masivo'];
    return skipPaths.some((path) => req.path.startsWith(path));
  },
});

app.use('/api', limiter);

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => {
  console.log('MongoDB connected');
}).catch((err) => {
  console.error('MongoDB connection error:', err);
});

// Health check route
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date() });
});

// IP check route para obtener la IP de Render
app.get('/api/ip', (req, res) => {
  const ipInfo = {
    'x-forwarded-for': req.headers['x-forwarded-for'],
    'remoteAddress': req.connection.remoteAddress,
    'ip': req.ip
  };
  console.log('IP addresses:', ipInfo);
  res.json(ipInfo);
});

// Rutas principales
app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/usuarios', require('./routes/user.routes'));
app.use('/api/geo', require('./routes/geo.routes'));
app.use('/api/tareas', require('./routes/tarea.routes'));
app.use('/api/tareas-consorcio', require('./routes/tareaConsorcio.routes'));
app.use('/api/observaciones', require('./routes/observacion.routes'));
app.use('/api/reclamos', require('./routes/reclamo.routes'));
app.use('/api/recibos', require('./routes/recibo.routes'));

// Rutas para el worker de WhatsApp (autenticación por API_KEY)
// Rutas de la API
app.use('/api/worker/tareas', require('./routes/apiWorker.routes'));

// Rutas específicas para el bot (autenticación por API_KEY)
app.use('/api/bot', require('./routes/bot.routes'));

// Rutas existentes
app.use('/api/especialidades', require('./routes/especialidad.routes'));
app.use('/api/categorias-materiales', require('./routes/categoriaMaterial.routes'));
app.use('/api/materiales', require('./routes/material.routes'));
app.use('/api/liquidaciones', require('./routes/tareaLiquidacion.routes'));
app.use('/api/tarea-materiales', require('./routes/tareaMaterial.routes'));
app.use('/api/motivos-pago', require('./routes/motivoPago.routes'));
app.use('/api/pagos-manuales', require('./routes/pagoManual.routes'));
app.use('/api/data', require('./routes/data.routes'));
app.use('/api/notifications', require('./routes/notification.routes'));
app.use('/api/subscribe', require('./routes/subscriptionRoutes'));
app.use('/api-docs', require('./swagger/swaggerUI'));

// Manejador de errores global
app.use((err, req, res, next) => {
  console.error(err.stack);
  
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Error interno del servidor';
  
  res.status(statusCode).json({
    success: false,
    message: message,
    statusCode: statusCode,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  // Iniciar jobs automáticos
  agenda.start();
});

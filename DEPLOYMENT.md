# Guía de Despliegue - Futurgas Gestión de Tareas

Esta guía detalla el proceso completo para desplegar la aplicación Futurgas Gestión de Tareas en un entorno de producción, utilizando MongoDB Atlas para la base de datos, Render para el backend y Vercel para el frontend.

## Índice
1. [Configuración de MongoDB Atlas](#1-configuración-de-mongodb-atlas)
2. [Despliegue del Backend en Render](#2-despliegue-del-backend-en-render)
3. [Despliegue del Frontend en Vercel](#3-despliegue-del-frontend-en-vercel)
4. [Buenas Prácticas de Producción](#4-buenas-prácticas-de-producción)

## 1. Configuración de MongoDB Atlas

### 1.1 Crear una cuenta y un cluster

1. Regístrate en [MongoDB Atlas](https://www.mongodb.com/cloud/atlas/register)
2. Crea un nuevo proyecto llamado "FuturgasGestion"
3. Crea un nuevo cluster:
   - Selecciona el plan gratuito (Shared)
   - Elige un proveedor de nube (AWS, Google Cloud o Azure) y una región cercana a tus usuarios (ej. aws/sa-east-1 para Sudamérica)
   - Nombra tu cluster como "futurgas-cluster"

### 1.2 Configurar acceso a la base de datos

1. En la sección "Database Access", crea un nuevo usuario:
   - Método de autenticación: Password
   - Nombre de usuario: futurgas_admin
   - Contraseña: Genera una contraseña segura y guárdala
   - Privilegios de usuario: "Read and write to any database"

2. En la sección "Network Access", configura el acceso a la red:
   - Opción 1 (desarrollo): Añade tu IP actual
   - Opción 2 (producción): Permite acceso desde cualquier lugar (0.0.0.0/0)

### 1.3 Crear la base de datos y colecciones

1. En el cluster, haz clic en "Browse Collections"
2. Verifica que exista la base de datos "futurgas_gestion" con las siguientes colecciones:
   - usuarios
   - tareas
   - especialidads
   - materials
   - subscriptions
   - jobs

### 1.4 Configurar índices únicos

Para garantizar la integridad de los datos, configura los siguientes índices únicos:

1. Colección "usuarios":
   ```
   db.usuarios.createIndex({ "email": 1 }, { unique: true })
   ```

2. Colección "especialidads":
   ```
   db.especialidads.createIndex({ "nombre": 1 }, { unique: true })
   ```

3. Colección "tareas":
   ```
   db.tareas.createIndex({ "numero": 1 }, { unique: true })
   ```

### 1.5 Configurar la cadena de conexión

Ya tienes tu cadena de conexión MongoDB Atlas:

```
mongodb+srv://FedericoRocha:<db_password>@futurgas.bsymwix.mongodb.net/?retryWrites=true&w=majority&appName=Futurgas
```

Esta cadena debe ser configurada en las variables de entorno de Render, reemplazando `<db_password>` con tu contraseña real. **Nunca incluyas la contraseña directamente en el código o en archivos que se suban a repositorios.**

## 2. Despliegue del Backend en Render

### 2.1 Preparar el proyecto para el despliegue

1. Asegúrate de que tu proyecto tenga los siguientes scripts en el `package.json`:

```json
"scripts": {
  "start": "node dist/server.js",
  "build": "tsc",
  "dev": "nodemon src/server.js"
}
```

2. Crea un archivo `render.yaml` en la raíz del proyecto backend:

```yaml
services:
  - type: web
    name: futurgas-backend
    env: node
    buildCommand: npm install && npm run build
    startCommand: npm start
    envVars:
      - key: NODE_ENV
        value: production
      - key: MONGODB_URI
        sync: false
      - key: JWT_ACCESS_SECRET
        sync: false
      - key: JWT_REFRESH_SECRET
        sync: false
      - key: JWT_ACCESS_EXPIRES_IN
        value: 15m
      - key: JWT_REFRESH_EXPIRES_IN
        value: 7d
      - key: VAPID_PUBLIC_KEY
        sync: false
      - key: VAPID_PRIVATE_KEY
        sync: false
```

### 2.2 Crear un nuevo servicio web en Render

1. Regístrate en [Render](https://render.com) y crea una cuenta
2. Conecta tu repositorio de GitHub/GitLab/Bitbucket
3. Haz clic en "New" y selecciona "Web Service"
4. Selecciona el repositorio de tu backend
5. Configura el servicio:
   - Nombre: futurgas-backend
   - Entorno: Node
   - Región: Selecciona la más cercana a tus usuarios
   - Rama: main (o la que uses para producción)
   - Comando de construcción: `npm install && npm run build`
   - Comando de inicio: `npm start`

### 2.3 Configurar variables de entorno

En la sección "Environment" de tu servicio en Render, añade las siguientes variables:

- `NODE_ENV`: production
- `MONGODB_URI`: Tu cadena de conexión MongoDB Atlas completa con la contraseña
- `JWT_ACCESS_SECRET`: Una cadena aleatoria segura para firmar tokens JWT
- `JWT_REFRESH_SECRET`: Otra cadena aleatoria segura para tokens de refresco
- `JWT_ACCESS_EXPIRES_IN`: 15m
- `JWT_REFRESH_EXPIRES_IN`: 7d
- `VAPID_PUBLIC_KEY`: BNViIcnJEK84VIGpr8Sq8mlxsOXFUkrAMIx-z6MSPMP5cXpyiaw96PPMpyey2NDwAoD6QRHbpTWzk6g2xtkIJF0
- `VAPID_PRIVATE_KEY`: xDySzpYtVG8EgffRDtIUtP5PnEJTzVprn_63hx0QJeQ
- `CORS_ORIGINS`: https://futurgas-gestion.vercel.app

Para generar claves JWT seguras si deseas cambiarlas:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 2.4 Desplegar el servicio

1. Haz clic en "Create Web Service"
2. Render automáticamente desplegará tu aplicación
3. Una vez completado, podrás acceder a tu API en la URL proporcionada (ej. https://futurgas-backend.onrender.com)

## 3. Despliegue del Frontend en Vercel

### 3.1 Preparar el proyecto para el despliegue

1. Asegúrate de que tu proyecto tenga los siguientes scripts en el `package.json`:

```json
"scripts": {
  "dev": "vite",
  "build": "tsc && vite build",
  "preview": "vite preview"
}
```

2. Crea un archivo `vercel.json` en la raíz del proyecto frontend:

```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ],
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": "vite"
}
```

### 3.2 Crear un nuevo proyecto en Vercel

1. Regístrate en [Vercel](https://vercel.com) y crea una cuenta
2. Conecta tu repositorio de GitHub/GitLab/Bitbucket
3. Importa tu proyecto frontend
4. Configura el proyecto:
   - Framework Preset: Vite
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Install Command: `npm install`

### 3.3 Configurar variables de entorno

En la sección "Environment Variables" de tu proyecto en Vercel, añade:

- `VITE_API_URL`: La URL completa de tu backend en Render (ej. https://futurgas-backend.onrender.com/api)

### 3.4 Desplegar el proyecto

1. Haz clic en "Deploy"
2. Vercel automáticamente construirá y desplegará tu aplicación
3. Una vez completado, podrás acceder a tu aplicación en la URL proporcionada (ej. https://futurgas-gestion.vercel.app)

## 4. Buenas Prácticas de Producción

### 4.1 Seguridad

1. **HTTPS**: Tanto Render como Vercel usan HTTPS por defecto, así que esto ya está cubierto.

2. **CORS**: Tu backend ya tiene una configuración de CORS, solo necesitas asegurarte de que la variable de entorno `CORS_ORIGINS` incluya el dominio de Vercel:

```javascript
// Tu configuración actual en server.js ya maneja esto correctamente
const allowedOrigins = [
  'http://localhost:3000',  // Frontend en desarrollo (React)
  'http://localhost:5173',  // Frontend en desarrollo (Vite)
  'http://localhost:4000',  // Backend (si se accede directamente)
  ...(process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',') : [])
];
```

Asegúrate de configurar `CORS_ORIGINS=https://futurgas-gestion.vercel.app` en las variables de entorno de Render.

3. **Rate Limiting**: Implementa límites de tasa para prevenir ataques de fuerza bruta:

```javascript
const rateLimit = require('express-rate-limit');

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // límite de 100 solicitudes por ventana
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/', apiLimiter);
```

4. **Helmet**: Usa Helmet para configurar cabeceras HTTP seguras:

```javascript
const helmet = require('helmet');
app.use(helmet());
```

### 4.2 Manejo de Errores

1. **Centraliza el manejo de errores**:

```javascript
// Middleware de manejo de errores
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || 'Error interno del servidor',
    stack: process.env.NODE_ENV === 'production' ? undefined : err.stack
  });
});
```

2. **Validación de entrada**: Usa Joi o express-validator para validar todas las entradas.

### 4.3 Monitoreo y Logs

1. **Logging**: Implementa un sistema de logs estructurado:

```javascript
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  defaultMeta: { service: 'futurgas-backend' },
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple()
  }));
}

// Uso
logger.info('Servidor iniciado en el puerto 4000');
```

2. **Monitoreo**: Considera usar servicios como:
   - [Sentry](https://sentry.io) para monitoreo de errores
   - [UptimeRobot](https://uptimerobot.com) para monitoreo de disponibilidad
   - [LogRocket](https://logrocket.com) para sesiones de usuario y errores de frontend

### 4.4 Respaldos y Recuperación

1. **Respaldos automáticos**: Configura respaldos automáticos en MongoDB Atlas:
   - En tu cluster, ve a "Backup"
   - Habilita "Continuous Backup"
   - Configura la política de retención según tus necesidades

2. **Plan de recuperación**: Documenta los pasos para restaurar desde un respaldo.

### 4.5 Escalabilidad

1. **Caché**: Implementa Redis para cachear respuestas frecuentes:

```javascript
const redis = require('redis');
const client = redis.createClient({
  url: process.env.REDIS_URL
});

// Ejemplo de uso para cachear datos
async function getTareas(req, res) {
  const cacheKey = 'tareas:all';
  
  try {
    // Intentar obtener de caché
    const cachedData = await client.get(cacheKey);
    if (cachedData) {
      return res.json(JSON.parse(cachedData));
    }
    
    // Si no está en caché, obtener de la base de datos
    const tareas = await Tarea.find();
    
    // Guardar en caché por 5 minutos
    await client.set(cacheKey, JSON.stringify(tareas), {
      EX: 300
    });
    
    res.json(tareas);
  } catch (err) {
    next(err);
  }
}
```

2. **Escalado horizontal**: Render permite escalar automáticamente según la carga.

---

## Verificación Final

Después de completar todos los pasos de despliegue, verifica:

1. Que puedas acceder a la aplicación frontend desde la URL de Vercel
2. Que puedas iniciar sesión con las credenciales de administrador
3. Que puedas crear, editar y eliminar tareas
4. Que las notificaciones push funcionen correctamente
5. Que la aplicación se comporte correctamente en dispositivos móviles

Si encuentras algún problema, revisa los logs en Render y Vercel para identificar la causa.

---

¡Felicidades! Tu aplicación Futurgas Gestión de Tareas ahora está desplegada en un entorno de producción robusto y escalable.

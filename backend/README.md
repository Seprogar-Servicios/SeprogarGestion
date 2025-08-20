# FuturgasGestionTareas Backend

Backend API para la gestión de tareas internas (stack MERN).

## Tecnologías
- Node.js
- Express
- MongoDB Atlas
- JWT (autenticación)
- Web Push API & Nodemailer
- Agenda.js (jobs programados)
- Swagger (documentación)

## Configuración
1. Copia `.env.example` a `.env` y completa los valores.
2. Instala dependencias:
   ```bash
   npm install
   ```
3. Ejecuta en desarrollo:
   ```bash
   npm run dev
   ```

## Scripts útiles
- `npm run dev`: Levanta el servidor en modo desarrollo con nodemon.
- `npm start`: Ejecuta el servidor en modo producción.
- `npm run lint`: Linting del código.

## Estructura sugerida
```
backend/
  src/
    config/
    controllers/
    jobs/
    middlewares/
    models/
    routes/
    services/
    swagger/
    utils/
    server.js
  .env.example
  package.json
  README.md
```

## Documentación API
El endpoint `/api-docs` expone la documentación Swagger una vez configurada.

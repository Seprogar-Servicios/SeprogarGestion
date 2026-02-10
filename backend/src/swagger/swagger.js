const swaggerJSDoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'FuturgasGestionTareas API',
      version: '1.0.0',
      description: 'API interna para gestión de tareas, materiales y usuarios (PWA, MERN)',
    },
    servers: [
      { url: 'http://localhost:4000/api', description: 'Local dev' },
      { url: 'https://futurgas-backend.onrender.com/api', description: 'Producción' }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
        ApiKeyAuth: {
          type: 'apiKey',
          in: 'header',
          name: 'Authorization',
          description: 'API Key para autenticación del worker'
        },
      },
    },
    security: [{ bearerAuth: [] }],
  },
  apis: [
    './src/routes/*.js',
    './src/models/*.js',
    './src/controllers/*.js',
  ],
};

const swaggerSpec = swaggerJSDoc(options);
module.exports = swaggerSpec;

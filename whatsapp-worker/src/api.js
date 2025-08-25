/**
 * Módulo para interactuar con la API del backend
 */
const axios = require('axios');
const logger = require('./utils/logger');
const auth = require('./auth');

// URLs desde variables de entorno
const CHECK_DUPLICATE_URL = process.env.CHECK_DUPLICATE_URL || 'http://localhost:5000/api/tareas/check-duplicate';
const CREATE_TASK_URL = process.env.CREATE_TASK_URL || 'http://localhost:5000/api/tareas';

/**
 * Verifica si una tarea con el número dado ya existe
 * @param {string} numero - Número de la tarea a verificar
 * @returns {Promise<boolean>} - true si la tarea ya existe, false en caso contrario
 */
async function checkDuplicateTask(numero) {
  try {
    // Usamos la configuración de autenticación que ya está configurada en auth.js
    const response = await axios.get(`${CHECK_DUPLICATE_URL}/${numero}`);
    
    return response.data.exists;
  } catch (error) {
    // Si hay un error de conexión o el endpoint no existe, asumimos que no hay duplicados
    // pero registramos el error para diagnóstico
    if (error.response) {
      logger.error(`Error al verificar duplicados (${error.response.status}): ${error.response.data.message || 'Sin mensaje'}`);
    } else {
      logger.error(`Error al verificar duplicados: ${error.message}`);
    }
    return false;
  }
}

/**
 * Crea una nueva tarea en el backend
 * @param {Object} taskData - Datos de la tarea a crear
 * @returns {Promise<Object>} - La tarea creada
 */
async function createTask(taskData) {
  try {
    // Usamos la configuración de autenticación que ya está configurada en auth.js
    // El interceptor de axios añadirá automáticamente el encabezado Authorization
    const response = await axios.post(CREATE_TASK_URL, taskData, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    return response.data;
  } catch (error) {
    if (error.response) {
      throw new Error(`Error al crear tarea (${error.response.status}): ${error.response.data.message || 'Sin mensaje'}`);
    } else {
      throw new Error(`Error al crear tarea: ${error.message}`);
    }
  }
}

module.exports = {
  checkDuplicateTask,
  createTask
};

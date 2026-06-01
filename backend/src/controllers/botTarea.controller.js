const Tarea = require('../models/Tarea');
const TareaLiquidacion = require('../models/TareaLiquidacion');
const mongoose = require('mongoose');

/**
 * @swagger
 * /bot/tarea/{id}:
 *   get:
 *     summary: Obtener detalles de una tarea para el bot
 *     tags: [Bot]
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID o número de la tarea
 *     responses:
 *       200:
 *         description: Detalles de la tarea formateados para el bot
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 tarea:
 *                   type: object
 *                   properties:
 *                     numero:
 *                       type: string
 *                       description: Número de tarea
 *                     titulo:
 *                       type: string
 *                       description: Título de la tarea
 *                     cliente:
 *                       type: string
 *                       description: Nombre del cliente
 *                     estado:
 *                       type: string
 *                       description: Estado actual
 *                     fechaEjecucion:
 *                       type: string
 *                       description: Fecha de ejecución
 *                     direccion:
 *                       type: string
 *                       description: Dirección del servicio
 *                     descripcion:
 *                       type: string
 *                       description: Descripción detallada
 *                     tecnicos:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           nombre:
 *                             type: string
 *                           telefono:
 *                             type: string
 *       404:
 *         description: Tarea no encontrada
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   message:
 *                     type: string
 */

// Obtener detalles de tarea para el bot (por ID o número)
exports.getTareaDetalles = async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'Se requiere un ID o número de tarea'
      });
    }

    let tarea;
    
    // Intentar buscar por número primero (más común para WhatsApp)
    // Acepta cualquier string que podría ser un número de tarea
    tarea = await Tarea.findOne({ numero: id })
      .populate('tecnicos', 'nombre telefono')
      .populate('creadoPor', 'nombre');
    
    // Si no se encontró por número, intentar por _id
    if (!tarea) {
      // Buscar por _id de MongoDB
      if (mongoose.Types.ObjectId.isValid(id)) {
        tarea = await Tarea.findById(id)
          .populate('tecnicos', 'nombre telefono')
          .populate('creadoPor', 'nombre');
      }
    }

    if (!tarea) {
      return res.status(404).json({
        success: false,
        message: `Tarea ${id} no encontrada`
      });
    }

    // Formatear respuesta para el bot
    const tareaFormateada = {
      numero: tarea.numero,
      titulo: tarea.titulo,
      cliente: tarea.cliente || 'No especificado',
      estado: tarea.estado,
      fechaEjecucion: tarea.fechaEjecucion,
      direccion: tarea.direccion || 'No especificada',
      descripcion: tarea.descripcion || 'Sin descripción',
      tecnicos: tarea.tecnicos || [],
      creadoPor: tarea.creadoPor?.nombre || 'Sistema',
      fechaCreacion: tarea.createdAt
    };

    res.json({
      success: true,
      tarea: tareaFormateada
    });

  } catch (error) {
    console.error('Error al obtener detalles de tarea para bot:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

/**
 * @swagger
 * /bot/tareas/buscar:
 *   get:
 *     summary: Buscar tareas con filtros para el bot
 *     tags: [Bot]
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: query
 *         name: numero
 *         schema:
 *           type: string
 *         description: Número de tarea
 *       - in: query
 *         name: cliente
 *         schema:
 *           type: string
 *         description: Nombre del cliente
 *       - in: query
 *         name: estado
 *         schema:
 *           type: string
 *           enum: [pendiente, en_progreso, completada, cancelada]
 *         description: Estado de la tarea
 *       - in: query
 *         name: limite
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Límite de resultados
 *     responses:
 *       200:
 *         description: Lista de tareas encontradas
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 tareas:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Tarea'
 *                 total:
 *                   type: integer
 */

// Buscar tareas con filtros para el bot
exports.buscarTareas = async (req, res) => {
  try {
    const { numero, cliente, estado, limite = 10 } = req.query;

    const filtro = {};
    if (numero) filtro.numero = numero;
    if (cliente) filtro.cliente = { $regex: cliente, $options: 'i' };
    if (estado) filtro.estado = estado;

    const tareas = await Tarea.find(filtro)
      .select('numero titulo cliente estado fechaEjecucion direccion')
      .limit(parseInt(limite))
      .sort({ fechaEjecucion: -1 });

    res.json({
      success: true,
      tareas: tareas,
      total: tareas.length
    });

  } catch (error) {
    console.error('Error al buscar tareas para bot:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

/**
 * @swagger
 * /bot/liquidacion/actualizar:
 *   put:
 *     summary: Actualizar liquidación por número de tarea para el bot
 *     tags: [Bot]
 *     security:
 *       - ApiKeyAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               numeroTarea:
 *                 type: string
 *                 description: Número de tarea
 *               manoObra:
 *                 type: number
 *                 description: Mano de obra
 *               cobertura:
 *                 type: number
 *                 description: Cobertura
 *               materialReal:
 *                 type: number
 *                 description: Material real
 *               boletasMateriales:
 *                 type: number
 *                 description: Boletas de materiales
 *               observacionesFinancieras:
 *                 type: string
 *                 description: Observaciones financieras
 *     responses:
 *       200:
 *         description: Liquidación actualizada exitosamente
 *       404:
 *         description: Tarea o liquidación no encontrada
 */

// Actualizar liquidación por número de tarea para el bot
exports.actualizarLiquidacionPorTarea = async (req, res) => {
  try {
    const { numeroTarea, manoObra, cobertura, materialReal, boletasMateriales, observacionesFinancieras } = req.body;

    if (!numeroTarea) {
      return res.status(400).json({
        success: false,
        message: 'Se requiere el número de tarea'
      });
    }

    // Buscar tarea por número
    const tarea = await Tarea.findOne({ numero: numeroTarea });
    if (!tarea) {
      return res.status(404).json({
        success: false,
        message: `Tarea ${numeroTarea} no encontrada`
      });
    }

    // Buscar liquidación asociada a la tarea
    const liquidacion = await TareaLiquidacion.findOne({ tarea: tarea._id });
    if (!liquidacion) {
      return res.status(404).json({
        success: false,
        message: `No existe liquidación para la tarea ${numeroTarea}`
      });
    }

    // Construir objeto de actualización solo con campos proporcionados
    const actualizacion = {};
    if (manoObra !== undefined && manoObra !== null) actualizacion.manoObra = Number(manoObra);
    if (cobertura !== undefined && cobertura !== null) actualizacion.cobertura = Number(cobertura);
    if (materialReal !== undefined && materialReal !== null) actualizacion.materialReal = Number(materialReal);
    if (boletasMateriales !== undefined && boletasMateriales !== null) actualizacion.boletasMateriales = Number(boletasMateriales);
    if (observacionesFinancieras !== undefined && observacionesFinancieras !== null) actualizacion.observacionesFinancieras = observacionesFinancieras;

    // Actualizar liquidación
    const liquidacionActualizada = await TareaLiquidacion.findByIdAndUpdate(
      liquidacion._id,
      actualizacion,
      { new: true }
    ).populate({
      path: 'tarea',
      populate: {
        path: 'tecnicos',
        select: 'nombre email porcentajeTecnico'
      }
    });

    res.json({
      success: true,
      message: 'Liquidación actualizada exitosamente',
      data: liquidacionActualizada
    });

  } catch (error) {
    console.error('Error al actualizar liquidación para bot:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

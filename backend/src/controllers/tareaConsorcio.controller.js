const TareaConsorcio = require('../models/TareaConsorcio');
const Usuario = require('../models/User');
const mongoose = require('mongoose');
const { sendNotification } = require('../utils/push');

/**
 * @swagger
 * components:
 *   schemas:
 *     TareaConsorcio:
 *       type: object
 *       required:
 *         - titulo
 *         - descripcion
 *         - administradorConsorcio
 *         - precio
 *       properties:
 *         _id:
 *           type: string
 *           description: ID autogenerado de la tarea de consorcio
 *         titulo:
 *           type: string
 *           description: Título de la tarea de consorcio
 *         descripcion:
 *           type: string
 *           description: Descripción detallada de la tarea
 *         precio:
 *           type: number
 *           description: Presupuesto de la tarea
 *         estado:
 *           type: string
 *           enum: [presupuesto, confirmado, pendiente, en_progreso, completada, cancelada, PENDIENTE_PAGO, FACTURADO, PAGADO]
 *           description: Estado de la tarea de consorcio
 *         administradorConsorcio:
 *           type: string
 *           description: ID del administrador de consorcio asignado
 *         fotos:
 *           type: array
 *           description: Array de fotos adjuntas
 *         comprobantePago:
 *           type: object
 *           description: Información del comprobante de pago
 */

// Crear nueva tarea de consorcio
const createTareaConsorcio = async (req, res) => {
  try {
    const { titulo, descripcion, precio, administradorConsorcio, cliente, direccion, fechaEjecucion, franja_horaria } = req.body;
    
    // Validaciones básicas
    if (!titulo || !descripcion || !administradorConsorcio) {
      return res.status(400).json({
        message: 'Faltan campos requeridos: título, descripción y administrador de consorcio'
      });
    }

    // El precio no es requerido cuando el AdminConsorcio crea la tarea
    if (precio !== undefined && (precio === null || precio === '' || isNaN(parseFloat(precio)))) {
      return res.status(400).json({
        message: 'El precio debe ser un número válido'
      });
    }

    // Verificar que el administrador de consorcio exista y tenga el rol correcto
    const adminConsorcio = await Usuario.findById(administradorConsorcio);
    if (!adminConsorcio || adminConsorcio.rol !== 'adminConsorcio') {
      return res.status(400).json({
        message: 'El administrador de consorcio especificado no existe o no tiene el rol adecuado'
      });
    }

    // Generar número único
    const lastTarea = await TareaConsorcio.findOne().sort({ numero: -1 });
    let nextNumber;
    
    if (lastTarea && lastTarea.numero) {
      const lastNumber = parseInt(lastTarea.numero);
      nextNumber = !isNaN(lastNumber) ? lastNumber + 1 : 100000;
    } else {
      nextNumber = 100000;
    }
    
    const numero = nextNumber.toString().padStart(6, '0');

    const nuevaTarea = new TareaConsorcio({
      numero,
      titulo,
      descripcion,
      precio: precio !== undefined ? parseFloat(precio) : 0,
      administradorConsorcio,
      cliente: cliente || '',
      direccion: direccion || '',
      fechaEjecucion: fechaEjecucion || '',
      franja_horaria: franja_horaria || '',
      creadoPor: req.user.id,
      origen: 'sistema',
      estado: 'presupuesto'
    });

    await nuevaTarea.save();

    // Notificar al administrador de consorcio
    if (adminConsorcio.notificationToken) {
      await sendNotification(
        adminConsorcio.notificationToken,
        'Nueva Tarea de Consorcio',
        `Se ha creado una nueva tarea: ${titulo}`,
        { taskId: nuevaTarea._id, type: 'nueva_tarea_consorcio' }
      );
    }

    res.status(201).json({
      message: 'Tarea de consorcio creada exitosamente',
      tarea: nuevaTarea
    });
  } catch (error) {
    console.error('Error al crear tarea de consorcio:', error);
    res.status(500).json({
      message: 'Error al crear la tarea de consorcio',
      error: error.message
    });
  }
};

// Obtener todas las tareas de consorcio (con filtros por rol)
const getTareasConsorcio = async (req, res) => {
  try {
    const { page = 1, limit = 10, estado, administradorConsorcio } = req.query;
    const skip = (page - 1) * limit;

    let filtro = {};

    // Filtrar según el rol del usuario
    if (req.user.rol === 'adminConsorcio') {
      // AdminConsorcio solo ve sus tareas
      filtro.administradorConsorcio = req.user._id;
    } else if (req.user.rol === 'usuario') {
      // Técnico solo ve tareas asignadas a él
      filtro.tecnicos = req.user._id;
    }
    // Admin ve todas

    // Aplicar filtros adicionales
    if (estado) {
      filtro.estado = estado;
    }
    if (administradorConsorcio && req.user.rol === 'admin') {
      filtro.administradorConsorcio = administradorConsorcio;
    }

    const tareas = await TareaConsorcio.find(filtro)
      .populate('administradorConsorcio', 'nombre email')
      .populate('tecnicos', 'nombre email')
      .populate('creadoPor', 'nombre email')
      .sort({ fechaCreacion: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await TareaConsorcio.countDocuments(filtro);

    res.json({
      tareas,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        itemsPerPage: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Error al obtener tareas de consorcio:', error);
    res.status(500).json({
      message: 'Error al obtener las tareas de consorcio',
      error: error.message
    });
  }
};

// Obtener tarea de consorcio por ID
const getTareaConsorcioById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const tarea = await TareaConsorcio.findById(id)
      .populate('administradorConsorcio', 'nombre email')
      .populate('tecnicos', 'nombre email')
      .populate('creadoPor', 'nombre email')
      .populate('historialEstados.usuario', 'nombre email');

    if (!tarea) {
      return res.status(404).json({
        message: 'Tarea de consorcio no encontrada'
      });
    }

    // Verificar permisos
    if (req.user.rol === 'adminConsorcio' && 
        tarea.administradorConsorcio._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        message: 'No tienes permisos para ver esta tarea'
      });
    }

    if (req.user.rol === 'usuario' && 
        !tarea.tecnicos.some(tecnico => tecnico._id.toString() === req.user._id.toString())) {
      return res.status(403).json({
        message: 'No tienes permisos para ver esta tarea'
      });
    }

    res.json({ tarea });
  } catch (error) {
    console.error('Error al obtener tarea de consorcio:', error);
    res.status(500).json({
      message: 'Error al obtener la tarea de consorcio',
      error: error.message
    });
  }
};

// Actualizar tarea de consorcio
const updateTareaConsorcio = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const tarea = await TareaConsorcio.findById(id);
    if (!tarea) {
      return res.status(404).json({
        message: 'Tarea de consorcio no encontrada'
      });
    }

    // Verificar permisos
    const puedeActualizar = 
      req.user.rol === 'admin' ||
      (req.user.rol === 'adminConsorcio' && 
       tarea.administradorConsorcio.toString() === req.user._id.toString()) ||
      (req.user.rol === 'usuario' && 
       tarea.tecnicos.some(tecnico => tecnico.toString() === req.user._id.toString()));

    if (!puedeActualizar) {
      return res.status(403).json({
        message: 'No tienes permisos para actualizar esta tarea'
      });
    }

    // Validar cambios de estado según el rol
    if (updateData.estado) {
      const estadosPermitidos = {
        admin: ['confirmado', 'pendiente', 'PENDIENTE_PAGO', 'FACTURADO', 'PAGADO'],
        adminConsorcio: ['confirmado', 'pendiente', 'cancelada'],
        usuario: ['en_progreso', 'completada'] // Los técnicos pueden iniciar y completar tareas
      };

      if (req.user.rol !== 'admin' && 
          !estadosPermitidos[req.user.rol]?.includes(updateData.estado)) {
        return res.status(403).json({
          message: 'No tienes permisos para cambiar a este estado'
        });
      }
    }

    // Si se sube comprobante de pago
    if (updateData.comprobantePago && req.user.rol === 'adminConsorcio') {
      updateData.comprobantePago.estadoValidacion = 'pendiente';
      updateData.estado = 'PENDIENTE_PAGO';
    }

    const tareaActualizada = await TareaConsorcio.findByIdAndUpdate(
      id,
      { ...updateData, fechaModificacion: new Date() },
      { new: true, runValidators: true }
    ).populate('administradorConsorcio', 'nombre email')
     .populate('tecnicos', 'nombre email');

    res.json({
      message: 'Tarea de consorcio actualizada exitosamente',
      tarea: tareaActualizada
    });
  } catch (error) {
    console.error('Error al actualizar tarea de consorcio:', error);
    res.status(500).json({
      message: 'Error al actualizar la tarea de consorcio',
      error: error.message
    });
  }
};

// Subir fotos a tarea de consorcio
const uploadFotos = async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        message: 'No se han subido fotos'
      });
    }

    const tarea = await TareaConsorcio.findById(id);
    if (!tarea) {
      return res.status(404).json({
        message: 'Tarea de consorcio no encontrada'
      });
    }

    // Verificar permisos
    const puedeSubirFotos = 
      req.user.rol === 'admin' ||
      (req.user.rol === 'adminConsorcio' && 
       tarea.administradorConsorcio.toString() === req.user._id.toString());

    if (!puedeSubirFotos) {
      return res.status(403).json({
        message: 'No tienes permisos para subir fotos a esta tarea'
      });
    }

    // Procesar archivos subidos
    const nuevasFotos = req.files.map(file => ({
      filename: file.filename,
      originalName: file.originalname,
      path: file.path,
      mimetype: file.mimetype,
      size: file.size,
      uploadDate: new Date()
    }));

    // Agregar fotos a la tarea
    tarea.fotos.push(...nuevasFotos);
    await tarea.save();

    res.json({
      message: 'Fotos subidas exitosamente',
      fotos: nuevasFotos
    });
  } catch (error) {
    console.error('Error al subir fotos:', error);
    res.status(500).json({
      message: 'Error al subir las fotos',
      error: error.message
    });
  }
};

// Subir comprobante de pago
const uploadComprobantePago = async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!req.file) {
      return res.status(400).json({
        message: 'No se ha subido comprobante de pago'
      });
    }

    const tarea = await TareaConsorcio.findById(id);
    if (!tarea) {
      return res.status(404).json({
        message: 'Tarea de consorcio no encontrada'
      });
    }

    // Solo AdminConsorcio puede subir comprobante
    if (req.user.rol !== 'adminConsorcio' || 
        tarea.administradorConsorcio.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        message: 'No tienes permisos para subir comprobante a esta tarea'
      });
    }

    const comprobanteData = {
      filename: req.file.filename,
      originalName: req.file.originalname,
      path: req.file.path,
      url: `/uploads/comprobantes/${req.file.filename}`,
      mimetype: req.file.mimetype,
      size: req.file.size,
      uploadDate: new Date(),
      estadoValidacion: 'pendiente'
    };

    tarea.comprobantePago = comprobanteData;
    tarea.estado = 'FACTURADO';
    await tarea.save();

    // Notificar al admin para validar
    const admins = await Usuario.find({ rol: 'admin' });
    for (const admin of admins) {
      if (admin.notificationToken) {
        await sendNotification(
          admin.notificationToken,
          'Comprobante de Pago Subido',
          `Se ha subido un comprobante para la tarea ${tarea.numero}`,
          { taskId: tarea._id, type: 'comprobante_pago' }
        );
      }
    }

    res.json({
      message: 'Comprobante de pago subido exitosamente',
      comprobante: comprobanteData
    });
  } catch (error) {
    console.error('Error al subir comprobante de pago:', error);
    res.status(500).json({
      message: 'Error al subir el comprobante de pago',
      error: error.message
    });
  }
};

// Validar comprobante de pago (solo admin)
const validarComprobantePago = async (req, res) => {
  try {
    const { id } = req.params;
    const { estadoValidacion, observaciones } = req.body;

    if (!['aprobado', 'rechazado'].includes(estadoValidacion)) {
      return res.status(400).json({
        message: 'Estado de validación inválido'
      });
    }

    const tarea = await TareaConsorcio.findById(id);
    if (!tarea) {
      return res.status(404).json({
        message: 'Tarea de consorcio no encontrada'
      });
    }

    if (!tarea.comprobantePago) {
      return res.status(400).json({
        message: 'La tarea no tiene comprobante de pago'
      });
    }

    // Actualizar validación
    tarea.comprobantePago.estadoValidacion = estadoValidacion;
    tarea.comprobantePago.fechaValidacion = new Date();
    tarea.comprobantePago.validadoPor = req.user._id;

    if (estadoValidacion === 'aprobado') {
      tarea.estado = 'FACTURADO';
    } else {
      tarea.estado = 'confirmado'; // Vuelve a estado anterior para que corrija
    }

    await tarea.save();

    // Notificar al AdminConsorcio
    const adminConsorcio = await Usuario.findById(tarea.administradorConsorcio);
    if (adminConsorcio && adminConsorcio.notificationToken) {
      const mensaje = estadoValidacion === 'aprobado' 
        ? 'Comprobante aprobado. Pago validado.'
        : 'Comprobante rechazado. Por favor corrija y suba nuevamente.';
      
      await sendNotification(
        adminConsorcio.notificationToken,
        estadoValidacion === 'aprobado' ? 'Comprobante Aprobado' : 'Comprobante Rechazado',
        mensaje,
        { taskId: tarea._id, type: 'validacion_comprobante' }
      );
    }

    res.json({
      message: `Comprobante ${estadoValidacion} exitosamente`,
      tarea
    });
  } catch (error) {
    console.error('Error al validar comprobante de pago:', error);
    res.status(500).json({
      message: 'Error al validar el comprobante de pago',
      error: error.message
    });
  }
};

// Eliminar tarea de consorcio
const deleteTareaConsorcio = async (req, res) => {
  try {
    const { id } = req.params;
    
    const tarea = await TareaConsorcio.findById(id);
    if (!tarea) {
      return res.status(404).json({
        message: 'Tarea de consorcio no encontrada'
      });
    }

    // Solo admin puede eliminar
    if (req.user.rol !== 'admin') {
      return res.status(403).json({
        message: 'No tienes permisos para eliminar esta tarea'
      });
    }

    await TareaConsorcio.findByIdAndDelete(id);

    res.json({
      message: 'Tarea de consorcio eliminada exitosamente'
    });
  } catch (error) {
    console.error('Error al eliminar tarea de consorcio:', error);
    res.status(500).json({
      message: 'Error al eliminar la tarea de consorcio',
      error: error.message
    });
  }
};

// Obtener tareas de consorcio para calendario
const getTareasConsorcioCalendario = async (req, res) => {
  try {
    const { startDate, endDate, administradorConsorcio } = req.query;
    
    let filtro = {};
    
    // Filtrar por rango de fechas
    if (startDate && endDate) {
      filtro.fechaEjecucion = {
        $gte: startDate,
        $lte: endDate
      };
    }

    // Filtrar según el rol
    if (req.user.rol === 'adminConsorcio') {
      filtro.administradorConsorcio = req.user._id;
    } else if (req.user.rol === 'usuario') {
      filtro.tecnicos = req.user._id;
    }
    
    if (administradorConsorcio && req.user.rol === 'admin') {
      filtro.administradorConsorcio = administradorConsorcio;
    }

    const tareas = await TareaConsorcio.find(filtro)
      .populate('administradorConsorcio', 'nombre email')
      .populate('tecnicos', 'nombre email')
      .select('titulo fechaEjecucion franja_horaria estado administradorConsorcio tecnicos')
      .sort({ fechaEjecucion: 1 });

    // Formatear para calendario
    const eventosCalendario = tareas.map(tarea => ({
      id: tarea._id,
      title: `${tarea.numero} - ${tarea.titulo}`,
      start: tarea.fechaEjecucion,
      backgroundColor: tarea.estado === 'completada' ? '#28a745' : 
                      tarea.estado === 'en_progreso' ? '#ffc107' : 
                      tarea.estado === 'PENDIENTE_PAGO' ? '#dc3545' : '#17a2b8',
      extendedProps: {
        numero: tarea.numero,
        estado: tarea.estado,
        administradorConsorcio: tarea.administradorConsorcio,
        tecnicos: tarea.tecnicos,
        franja_horaria: tarea.franja_horaria
      }
    }));

    res.json(eventosCalendario);
  } catch (error) {
    console.error('Error al obtener tareas para calendario:', error);
    res.status(500).json({
      message: 'Error al obtener las tareas para el calendario',
      error: error.message
    });
  }
};

// Obtener tareas asignadas al técnico actual
const getMisTareas = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    
    // Construir filtros
    let filtro = { tecnicos: req.user._id };
    
    // Filtro por estado si se proporciona
    if (req.query.estado) {
      filtro.estado = req.query.estado;
    }
    
    // Filtro por búsqueda si se proporciona
    if (req.query.search) {
      const searchRegex = new RegExp(req.query.search, 'i');
      filtro.$or = [
        { titulo: searchRegex },
        { descripcion: searchRegex },
        { cliente: searchRegex },
        { direccion: searchRegex }
      ];
    }
    
    // Obtener tareas paginadas
    const tareas = await TareaConsorcio.find(filtro)
      .populate('administradorConsorcio', 'nombre')
      .populate('tecnicos', 'nombre')
      .populate('creadoPor', 'nombre')
      .sort({ fechaCreacion: -1 })
      .skip(skip)
      .limit(limit);
    
    // Obtener total de tareas para paginación
    const total = await TareaConsorcio.countDocuments(filtro);
    
    res.json({
      tasks: tareas,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      hasMore: skip + limit < total
    });
    
  } catch (error) {
    console.error('Error al obtener mis tareas:', error);
    res.status(500).json({
      message: 'Error al obtener las tareas asignadas',
      error: error.message
    });
  }
};

// Eliminar una foto específica
const deleteFoto = async (req, res) => {
  try {
    const { id, photoFilename } = req.params;

    // Validar que la tarea exista
    const tarea = await TareaConsorcio.findById(id);
    if (!tarea) {
      return res.status(404).json({
        message: 'Tarea de consorcio no encontrada'
      });
    }

    // Verificar permisos
    const puedeEliminarFotos = 
      req.user.rol === 'admin' ||
      (req.user.rol === 'adminConsorcio' && 
       tarea.administradorConsorcio.toString() === req.user._id.toString());

    if (!puedeEliminarFotos) {
      return res.status(403).json({
        message: 'No tienes permisos para eliminar fotos de esta tarea'
      });
    }

    // Encontrar la foto en la tarea
    const fotoIndex = tarea.fotos.findIndex(foto => foto.filename === photoFilename);
    if (fotoIndex === -1) {
      return res.status(404).json({
        message: 'Foto no encontrada'
      });
    }

    // Eliminar el archivo físico
    const fs = require('fs').promises;
    const path = require('path');
    const fotoPath = path.join(process.cwd(), 'uploads', 'consorcio', 'fotos', photoFilename);
    
    try {
      await fs.unlink(fotoPath);
    } catch (error) {
      console.error('Error al eliminar archivo físico:', error);
      // Continuar aunque no se pueda eliminar el archivo físico
    }

    // Eliminar la foto de la base de datos
    tarea.fotos.splice(fotoIndex, 1);
    await tarea.save();

    res.json({
      message: 'Foto eliminada exitosamente'
    });
  } catch (error) {
    console.error('Error al eliminar foto:', error);
    res.status(500).json({
      message: 'Error al eliminar la foto',
      error: error.message
    });
  }
};

module.exports = {
  createTareaConsorcio,
  getTareasConsorcio,
  getTareaConsorcioById,
  updateTareaConsorcio,
  uploadFotos,
  uploadComprobantePago,
  validarComprobantePago,
  deleteTareaConsorcio,
  getTareasConsorcioCalendario,
  getMisTareas,
  deleteFoto
};

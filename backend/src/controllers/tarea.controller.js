const Tarea = require('../models/Tarea');
const Usuario = require('../models/User');
const Material = require('../models/Material');
const { tareaSchema } = require('../utils/validators');
const mongoose = require('mongoose');
const Subscription = require('../models/Subscription');
const { sendNotification } = require('../utils/push');

// Crear tarea
exports.createTarea = async (req, res) => {
  const { error } = tareaSchema.validate(req.body);
  if (error) return res.status(400).json({ message: error.details[0].message });
  try {
    // Procesar la fecha de ejecución para evitar problemas de zona horaria
    let datosAjustados = { ...req.body };
    
    if (datosAjustados.fechaEjecucion && typeof datosAjustados.fechaEjecucion === 'string') {
      // Si la fecha viene en formato YYYY-MM-DD (sin tiempo)
      if (!datosAjustados.fechaEjecucion.includes('T')) {
        // Mantener el formato de string para evitar conversión automática a UTC
        console.log('Fecha de ejecución recibida (string):', datosAjustados.fechaEjecucion);
      } else {
        // Si viene en formato ISO, convertir a Date
        console.log('Fecha de ejecución recibida (ISO):', datosAjustados.fechaEjecucion);
      }
    }
    
    const tarea = new Tarea({
      ...datosAjustados,
      creadoPor: req.user._id,
      fechaCreacion: new Date(),
      fechaModificacion: new Date(),
    });
    await tarea.save();

    // Enviar notificación a los técnicos asignados
    if (req.body.tecnicos && req.body.tecnicos.length > 0) {
      const payload = {
        title: 'Nueva Tarea Asignada',
        body: `Se te ha asignado la tarea: ${req.body.titulo}`,
      };

      for (const tecnicoId of req.body.tecnicos) {
        const subscriptions = await Subscription.find({ user: tecnicoId });
        for (const subscription of subscriptions) {
          sendNotification(subscription, payload);
        }
      }
    }

    res.status(201).json({ success: true, data: tarea, message: 'Tarea creada' });
  } catch (err) {
    res.status(500).json({ message: 'Error al crear tarea', error: err.message });
  }
};

// Listar tareas con filtros (usuario, estado, fecha, cliente)
exports.getTareas = async (req, res) => {
  try {
    const { usuario, estado, fechaDesde, fechaHasta, cliente } = req.query;
    const filtro = {};
    if (usuario) filtro.tecnicos = usuario;
    if (estado) filtro.estado = estado;
    if (cliente) filtro.cliente = { $regex: cliente, $options: 'i' };
    // Manejo de filtros de fecha para fechaEjecucion
    if (fechaDesde || fechaHasta) {
      filtro.fechaEjecucion = {};
      
      if (fechaDesde) {
        try {
          const fechaDesdeDate = new Date(fechaDesde);
          if (!isNaN(fechaDesdeDate.getTime())) {
            fechaDesdeDate.setHours(0, 0, 0, 0); // Start of day
            filtro.fechaEjecucion.$gte = fechaDesdeDate;
          }
        } catch (error) {
          console.error('Error al procesar fechaDesde:', error);
        }
      }
      
      if (fechaHasta) {
        try {
          const fechaHastaDate = new Date(fechaHasta);
          if (!isNaN(fechaHastaDate.getTime())) {
            fechaHastaDate.setHours(23, 59, 59, 999); // End of day
            filtro.fechaEjecucion.$lte = fechaHastaDate;
          }
        } catch (error) {
          console.error('Error al procesar fechaHasta:', error);
        }
      }
      
      // Si no hay operadores válidos, eliminar el filtro de fecha
      if (Object.keys(filtro.fechaEjecucion).length === 0) {
        delete filtro.fechaEjecucion;
      }
    }
    const tareas = await Tarea.find(filtro)
      .populate('tecnicos', 'nombre email telefono')
      .populate('creadoPor', 'nombre email')
      .sort({ fechaEjecucion: 1 });
    res.json({ success: true, data: tareas });
  } catch (err) {
    console.error('Error completo al obtener tareas:', err);
    res.status(500).json({ message: 'Error al obtener tareas', error: err.message });
  }
};

// Obtener tarea individual
exports.getTareaById = async (req, res) => {
  try {
    const tarea = await Tarea.findById(req.params.id)
      .populate('tecnicos', 'nombre email telefono')
      .populate('creadoPor', 'nombre email');
    if (!tarea) return res.status(404).json({ message: 'Tarea no encontrada' });
    res.json({ success: true, data: tarea });
  } catch (err) {
    res.status(500).json({ message: 'Error al obtener tarea', error: err.message });
  }
};

// Actualizar tarea (solo creador o admin)
exports.updateTarea = async (req, res) => {
  const { error } = tareaSchema.validate(req.body);
  if (error) return res.status(400).json({ message: error.details[0].message });
  try {
    const tarea = await Tarea.findById(req.params.id);
    if (!tarea) return res.status(404).json({ message: 'Tarea no encontrada' });
    if (req.user.rol !== 'admin' && !tarea.creadoPor.equals(req.user._id)) {
      return res.status(403).json({ message: 'No autorizado' });
    }
    Object.assign(tarea, req.body, { fechaModificacion: new Date() });
    await tarea.save();
    res.json({ success: true, data: tarea, message: 'Tarea actualizada' });
  } catch (err) {
    res.status(500).json({ message: 'Error al actualizar tarea', error: err.message });
  }
};

// Eliminar tarea (solo creador o admin)
exports.deleteTarea = async (req, res) => {
  try {
    const tarea = await Tarea.findById(req.params.id);
    if (!tarea) return res.status(404).json({ message: 'Tarea no encontrada' });
    if (req.user.rol !== 'admin' && !tarea.creadoPor.equals(req.user._id)) {
      return res.status(403).json({ message: 'No autorizado' });
    }
    await tarea.deleteOne();
    res.json({ success: true, message: 'Tarea eliminada' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error al eliminar tarea', error: err.message });
  }
};

// Eliminar múltiples tareas (solo admin o creador de todas las tareas)
exports.deleteMultipleTareas = async (req, res) => {
  try {
    const { ids } = req.body;
    
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Se requiere un array de IDs de tareas' 
      });
    }
    
    // Verificar que todas las tareas existan y el usuario tenga permisos
    const tareas = await Tarea.find({ _id: { $in: ids } });
    
    if (tareas.length !== ids.length) {
      return res.status(404).json({ 
        success: false, 
        message: 'Una o más tareas no fueron encontradas' 
      });
    }
    
    // Verificar permisos para cada tarea
    if (req.user.rol !== 'admin') {
      const unauthorized = tareas.some(tarea => 
        !tarea.creadoPor.equals(req.user._id)
      );
      
      if (unauthorized) {
        return res.status(403).json({ 
          success: false, 
          message: 'No tienes autorización para eliminar una o más de estas tareas' 
        });
      }
    }
    
    // Eliminar las tareas
    const result = await Tarea.deleteMany({ _id: { $in: ids } });
    
    res.json({ 
      success: true, 
      message: `${result.deletedCount} tareas eliminadas correctamente`,
      deletedCount: result.deletedCount
    });
  } catch (err) {
    console.error('Error al eliminar múltiples tareas:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Error al eliminar tareas', 
      error: err.message 
    });
  }
};

// Vista calendario (eventos por mes/semana)
exports.getTareasCalendario = async (req, res) => {
  try {
    console.log('Query params recibidos:', req.query);
    const { desde, hasta, usuario, tecnico, cliente, estado } = req.query;
    const filtro = {};
    
    // Filtro por fechas - ahora fechaEjecucion es un string en formato YYYY-MM-DD
    if (desde || hasta) {
      filtro.fechaEjecucion = {};
      if (desde) {
        try {
          // Extraer solo la parte YYYY-MM-DD
          const fechaDesdeStr = desde.split('T')[0];
          filtro.fechaEjecucion.$gte = fechaDesdeStr;
          console.log('Filtro desde (string):', fechaDesdeStr);
        } catch (error) {
          console.error('Error al procesar fecha desde:', error);
        }
      }
      if (hasta) {
        try {
          // Extraer solo la parte YYYY-MM-DD
          const fechaHastaStr = hasta.split('T')[0];
          filtro.fechaEjecucion.$lte = fechaHastaStr;
          console.log('Filtro hasta (string):', fechaHastaStr);
        } catch (error) {
          console.error('Error al procesar fecha hasta:', error);
        }
      }
    }
    
    // Filtro por usuario (si no es admin, solo ve sus tareas)
    if (req.user.rol !== 'admin') {
      // Buscar tareas donde el usuario es técnico asignado
      filtro.$or = [
        { tecnicos: req.user._id },
        { creadoPor: req.user._id }
      ];
    } else if (usuario) {
      // Si es admin y especifica un usuario
      // Incluir tareas asignadas al usuario y tareas sin técnicos asignados
      filtro.$or = [
        { tecnicos: usuario },
        { tecnicos: { $size: 0 } },
        { tecnicos: { $exists: false } }
      ];
    }
    
    // Otros filtros opcionales
    if (tecnico) {
      // Si ya existe un $or, no sobrescribirlo
      if (!filtro.$or) {
        filtro.$or = [
          { tecnicos: tecnico },
          { tecnicos: { $size: 0 } },
          { tecnicos: { $exists: false } },
          { tecnicos: null }
        ];
      }
    } else {
      // Si no se especifica técnico, asegurarse de incluir tareas sin técnicos
      // Solo si no hay otro filtro $or ya aplicado (por ejemplo, por usuario)
      if (!filtro.$or) {
        filtro.$or = [
          { tecnicos: { $exists: true } }, // Tareas con técnicos (cualquiera)
          { tecnicos: { $size: 0 } },      // Tareas con array vacío de técnicos
          { tecnicos: { $exists: false } }, // Tareas sin campo técnicos
          { tecnicos: null }               // Tareas con técnicos null
        ];
      }
    }
    if (cliente) filtro.cliente = { $regex: cliente, $options: 'i' };
    if (estado) filtro.estado = estado;
    
    console.log('Filtro aplicado:', JSON.stringify(filtro));
    
    const tareas = await Tarea.find(filtro)
      .select('titulo estado fechaEjecucion tecnicos cliente descripcion numero')
      .populate('tecnicos', 'nombre telefono')
      .populate('creadoPor', 'nombre')
      .sort({ fechaEjecucion: 1 });
    
    console.log(`Se encontraron ${tareas.length} tareas`);
    
    // Devolver tareas completas para el calendario
    res.json({ success: true, data: tareas });
  } catch (err) {
    console.error('Error en calendario:', err);
    res.status(500).json({ success: false, message: 'Error en vista calendario', error: err.message });
  }
};

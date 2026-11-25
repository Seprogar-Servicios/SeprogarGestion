const Tarea = require('../models/Tarea');
const Usuario = require('../models/User');
const Material = require('../models/Material');
const { tareaSchema, sanitizeTareaBody } = require('../utils/validators');
const mongoose = require('mongoose');
const Subscription = require('../models/Subscription');
const { sendNotification } = require('../utils/push');
const { normalizeAddress } = require('../utils/addressNormalizer');
const { isPrivilegedAdmin } = require('../utils/roles');
const {
  parseHmToMinutes,
  rankTecnicos,
} = require('../utils/tecnicoRecommend');

/**
 * @swagger
 * components:
 *   schemas:
 *     Tarea:
 *       type: object
 *       required:
 *         - titulo
 *         - descripcion
 *         - fechaEjecucion
 *       properties:
 *         _id:
 *           type: string
 *           description: ID autogenerado de la tarea
 *         titulo:
 *           type: string
 *           description: Título de la tarea
 *         descripcion:
 *           type: string
 *           description: Descripción detallada de la tarea
 *         fechaEjecucion:
 *           type: string
 *           format: date
 *           description: Fecha de ejecución de la tarea
 *         estado:
 *           type: string
 *           enum: [pendiente, en_progreso, completada, cancelada]
 *           description: Estado de la tarea
 *         creadoPor:
 *           type: string
 *           description: ID del usuario que creó la tarea
 */

/**
 * @swagger
 * /tareas:
 *   get:
 *     summary: Obtener todas las tareas
 *     tags: [Tareas]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de tareas
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Tarea'
 *   post:
 *     summary: Crear una nueva tarea
 *     tags: [Tareas]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - titulo
 *               - descripcion
 *               - fechaEjecucion
 *             properties:
 *               titulo:
 *                 type: string
 *               descripcion:
 *                 type: string
 *               fechaEjecucion:
 *                 type: string
 *                 format: date
 *     responses:
 *       201:
 *         description: Tarea creada exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Tarea'
 *       400:
 *         description: Error de validación
 */
// Crear tarea
exports.createTarea = async (req, res) => {
  const body = sanitizeTareaBody(req.body);
  const { error, value } = tareaSchema.validate(body, { abortEarly: false });
  if (error) {
    const details = error.details.map((d) => d.message).join(' · ');
    return res.status(400).json({ message: details, error: details });
  }
  try {
    // Procesar la fecha de ejecución para evitar problemas de zona horaria
    let datosAjustados = { ...value };
    
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
    
    // Normalizar la dirección si está presente
    if (datosAjustados.direccion) {
      datosAjustados.direccion = normalizeAddress(datosAjustados.direccion);
    }
    if (typeof datosAjustados.direccionExtra === 'string') {
      datosAjustados.direccionExtra = datosAjustados.direccionExtra.trim();
    }
    if (typeof datosAjustados.entreCalles === 'string') {
      datosAjustados.entreCalles = datosAjustados.entreCalles.trim();
    }
    if (datosAjustados.especialidad === '' || datosAjustados.especialidad == null) {
      datosAjustados.especialidad = null;
    }
    if (datosAjustados.proveedor === '' || datosAjustados.proveedor == null) {
      datosAjustados.proveedor = null;
    }
    if (typeof datosAjustados.vip !== 'boolean') {
      datosAjustados.vip = Boolean(datosAjustados.vip);
    }

    // Ubicación: SOLO coords del autocomplete (opcional).
    // No geocodificar texto libre al crear: puede ser impreciso y romper mapa/recomendaciones.
    const incomingMap = datosAjustados.ubicacionMapa;
    const incomingDir = datosAjustados.ubicacionDireccion;
    if (
      incomingDir &&
      typeof incomingDir.lat === 'number' &&
      typeof incomingDir.lng === 'number'
    ) {
      datosAjustados.ubicacionDireccion = {
        lat: incomingDir.lat,
        lng: incomingDir.lng,
        actualizadoAt: new Date(),
      };
    }
    if (
      incomingMap &&
      typeof incomingMap.lat === 'number' &&
      typeof incomingMap.lng === 'number'
    ) {
      datosAjustados.ubicacionMapa = {
        lat: incomingMap.lat,
        lng: incomingMap.lng,
        fuente: incomingMap.fuente || 'direccion',
        actualizadoAt: new Date(),
      };
      if ((incomingMap.fuente || 'direccion') === 'direccion' && !datosAjustados.ubicacionDireccion) {
        datosAjustados.ubicacionDireccion = {
          lat: incomingMap.lat,
          lng: incomingMap.lng,
          actualizadoAt: new Date(),
        };
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
    const msg = err?.message || 'Error al crear tarea';
    // CastError de ObjectId (técnico / especialidad / proveedor)
    if (err?.name === 'CastError') {
      return res.status(400).json({
        message: `Dato inválido en ${err.path || 'campo'}: revisá técnicos, especialidad o proveedor`,
        error: msg,
      });
    }
    if (err?.name === 'ValidationError') {
      const details = Object.values(err.errors || {})
        .map((e) => e.message)
        .join(' · ');
      return res.status(400).json({ message: details || msg, error: msg });
    }
    res.status(500).json({ message: `Error al crear tarea: ${msg}`, error: msg });
  }
};

/**
 * @swagger
 * /tareas/{id}:
 *   get:
 *     summary: Obtener una tarea por ID
 *     tags: [Tareas]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de la tarea
 *     responses:
 *       200:
 *         description: Tarea encontrada
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Tarea'
 *       404:
 *         description: Tarea no encontrada
 *   put:
 *     summary: Actualizar una tarea
 *     tags: [Tareas]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de la tarea
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               titulo:
 *                 type: string
 *               descripcion:
 *                 type: string
 *               estado:
 *                 type: string
 *                 enum: [pendiente, en_progreso, completada, cancelada]
 *     responses:
 *       200:
 *         description: Tarea actualizada
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Tarea'
 *       404:
 *         description: Tarea no encontrada
 */

/** Campos de listado (sin materiales / mensaje WhatsApp / blobs pesados). */
const TAREA_LIST_SELECT =
  'numero titulo descripcion estado tecnicos fechaCreacion fechaModificacion fechaEjecucion franja_horaria creadoPor cliente cuentaCliente fechaCompletado numeroTitular direccion direccionExtra entreCalles especialidad proveedor vip ubicacionMapa ubicacionDireccion origen';

// Listar tareas con filtros (usuario, estado, fecha, cliente, q)
exports.getTareas = async (req, res) => {
  try {
    const {
      usuario,
      estado,
      fechaDesde,
      fechaHasta,
      cliente,
      useCreatedAt,
      numero,
      q,
      limit,
    } = req.query;
    const filtro = {};

    // No admin: solo tareas propias (asignadas). Impide IDOR vía ?usuario=
    if (!isPrivilegedAdmin(req.user)) {
      filtro.tecnicos = req.user._id;
    } else if (usuario) {
      filtro.tecnicos = usuario;
    }

    if (estado) filtro.estado = estado;
    if (cliente) filtro.cliente = { $regex: cliente, $options: 'i' };
    if (numero) filtro.numero = { $regex: String(numero).trim(), $options: 'i' };

    const search = String(q || '').trim();
    const searching = search.length >= 2;
    if (searching) {
      const rx = { $regex: search, $options: 'i' };
      filtro.$or = [
        { numero: rx },
        { titulo: rx },
        { cliente: rx },
        { direccion: rx },
        { numeroTitular: rx },
      ];
    }

    // Con búsqueda de texto: no acotar por fechas (histórico accesible).
    // Sin búsqueda: aplicar ventana de fechas si viene en query.
    if (!searching && (fechaDesde || fechaHasta)) {
      if (useCreatedAt === 'true') {
        const dateFilter = {};
        if (fechaDesde) dateFilter.$gte = new Date(fechaDesde);
        if (fechaHasta) {
          const hasta = new Date(fechaHasta);
          hasta.setDate(hasta.getDate() + 1);
          dateFilter.$lt = hasta;
        }
        filtro.fechaCreacion = dateFilter;
      } else {
        const dateFilter = {};
        if (fechaDesde) dateFilter.$gte = fechaDesde;
        if (fechaHasta) dateFilter.$lte = fechaHasta;
        if (Object.keys(dateFilter).length > 0) {
          filtro.fechaEjecucion = dateFilter;
        }
      }
    }

    let query = Tarea.find(filtro)
      .select(TAREA_LIST_SELECT)
      .populate({
        path: 'tecnicos',
        select: 'nombre email telefono color especialidad porcentajeTecnico localidad',
        populate: { path: 'especialidad', select: 'nombre' },
      })
      .populate('especialidad', 'nombre')
      .populate('proveedor', 'nombre')
      .populate('creadoPor', 'nombre email')
      .sort({ fechaEjecucion: 1 })
      .lean();

    const parsedLimit = limit ? parseInt(limit, 10) : null;
    if (parsedLimit && parsedLimit > 0) {
      query = query.limit(parsedLimit);
    }

    const tareas = await query;
    res.json({ success: true, data: tareas });
  } catch (err) {
    console.error('Error completo al obtener tareas:', err);
    res.status(500).json({ message: 'Error al obtener tareas', error: err.message });
  }
};

/** KPIs globales (conteos) sin devolver filas — Dashboard. */
exports.getTareasResumen = async (req, res) => {
  try {
    const match = {};
    if (!isPrivilegedAdmin(req.user)) {
      match.tecnicos = req.user._id;
    } else if (req.query.usuario) {
      match.tecnicos = req.query.usuario;
    }

    const byEstado = await Tarea.aggregate([
      { $match: match },
      { $group: { _id: '$estado', count: { $sum: 1 } } },
    ]);

    const counts = {
      total: 0,
      pendiente: 0,
      'en progreso': 0,
      completada: 0,
      cancelada: 0,
    };
    for (const row of byEstado) {
      const key = row._id || 'pendiente';
      counts[key] = row.count;
      counts.total += row.count;
    }

    // Hoy (fechaEjecucion YYYY-MM-DD local del servidor UTC; el front también calcula hoy)
    const today = new Date();
    const ymd = [
      today.getFullYear(),
      String(today.getMonth() + 1).padStart(2, '0'),
      String(today.getDate()).padStart(2, '0'),
    ].join('-');
    const hoy = await Tarea.countDocuments({ ...match, fechaEjecucion: ymd });

    res.json({ success: true, data: { ...counts, hoy } });
  } catch (err) {
    console.error('Error en getTareasResumen:', err);
    res.status(500).json({ message: 'Error al obtener resumen', error: err.message });
  }
};

// Obtener tarea individual
exports.getTareaById = async (req, res) => {
  try {
    const tarea = await Tarea.findById(req.params.id)
      .populate({
        path: 'tecnicos',
        select: 'nombre email telefono color especialidad porcentajeTecnico localidad',
        populate: { path: 'especialidad', select: 'nombre' },
      })
      .populate('especialidad', 'nombre')
      .populate('proveedor', 'nombre')
      .populate('creadoPor', 'nombre email');
    if (!tarea) return res.status(404).json({ message: 'Tarea no encontrada' });

    const isAdmin = isPrivilegedAdmin(req.user);
    const isCreator =
      tarea.creadoPor &&
      (tarea.creadoPor._id
        ? tarea.creadoPor._id.equals(req.user._id)
        : tarea.creadoPor.equals?.(req.user._id));
    const isAssigned =
      Array.isArray(tarea.tecnicos) &&
      tarea.tecnicos.some((t) => {
        const id = t && t._id ? t._id : t;
        return id && id.equals?.(req.user._id);
      });

    if (!isAdmin && !isCreator && !isAssigned) {
      return res.status(403).json({ message: 'No autorizado' });
    }

    res.json({ success: true, data: tarea });
  } catch (err) {
    res.status(500).json({ message: 'Error al obtener tarea', error: err.message });
  }
};

// Actualizar tarea (admin, creador o técnico asignado)
exports.updateTarea = async (req, res) => {
  const rawBody = req.body || {};
  const bodyHadOrigen = Object.prototype.hasOwnProperty.call(rawBody, 'origen');
  const body = sanitizeTareaBody(rawBody);
  const { error, value } = tareaSchema.validate(body, { abortEarly: false });
  if (error) {
    const details = error.details.map((d) => d.message).join(' · ');
    return res.status(400).json({ message: details, error: details });
  }
  try {
    const tarea = await Tarea.findById(req.params.id);
    if (!tarea) return res.status(404).json({ message: 'Tarea no encontrada' });

    const isAdmin = isPrivilegedAdmin(req.user);
    const isCreator = tarea.creadoPor && tarea.creadoPor.equals(req.user._id);
    const isAssigned = Array.isArray(tarea.tecnicos) && tarea.tecnicos.some((t) => t.equals(req.user._id));

    if (!isAdmin && !isCreator && !isAssigned) {
      return res.status(403).json({ message: 'No autorizado' });
    }

    let datosActualizados = { ...value };
    // Joi aplica default origen=sistema; no pisar histórico si el front no lo mandó
    if (!bodyHadOrigen) delete datosActualizados.origen;

    // Técnico asignado: solo puede cambiar estado y ubicación en vivo
    if (!isAdmin && !isCreator && isAssigned) {
      datosActualizados = {
        numero: tarea.numero,
        titulo: tarea.titulo,
        descripcion: tarea.descripcion,
        estado: req.body.estado ?? tarea.estado,
        tecnicos: tarea.tecnicos.map((t) => t.toString()),
        fechaEjecucion: tarea.fechaEjecucion,
        franja_horaria: tarea.franja_horaria,
        cliente: tarea.cliente,
        numeroTitular: tarea.numeroTitular,
        direccion: tarea.direccion,
        direccionExtra: tarea.direccionExtra,
        entreCalles: tarea.entreCalles,
        especialidad: tarea.especialidad,
        origen: tarea.origen,
        ...(req.body.ubicacionMapa ? { ubicacionMapa: req.body.ubicacionMapa } : {}),
      };
    }

    if (datosActualizados.direccion) {
      datosActualizados.direccion = normalizeAddress(datosActualizados.direccion);
    }
    if (typeof datosActualizados.direccionExtra === 'string') {
      datosActualizados.direccionExtra = datosActualizados.direccionExtra.trim();
    }
    if (typeof datosActualizados.entreCalles === 'string') {
      datosActualizados.entreCalles = datosActualizados.entreCalles.trim();
    }
    if (
      Object.prototype.hasOwnProperty.call(datosActualizados, 'especialidad') &&
      (datosActualizados.especialidad === '' || datosActualizados.especialidad == null)
    ) {
      datosActualizados.especialidad = null;
    }
    if (
      Object.prototype.hasOwnProperty.call(datosActualizados, 'proveedor') &&
      (datosActualizados.proveedor === '' || datosActualizados.proveedor == null)
    ) {
      datosActualizados.proveedor = null;
    }

    // Coords fijas de dirección (autocomplete opcional) — independientes del pin en vivo
    if (
      datosActualizados.ubicacionDireccion &&
      typeof datosActualizados.ubicacionDireccion.lat === 'number' &&
      typeof datosActualizados.ubicacionDireccion.lng === 'number'
    ) {
      datosActualizados.ubicacionDireccion = {
        lat: datosActualizados.ubicacionDireccion.lat,
        lng: datosActualizados.ubicacionDireccion.lng,
        actualizadoAt: new Date(),
      };
    } else if (
      Object.prototype.hasOwnProperty.call(datosActualizados, 'ubicacionDireccion') &&
      datosActualizados.ubicacionDireccion == null
    ) {
      datosActualizados.ubicacionDireccion = null;
    }

    // Si el front mandó coords del autocomplete, persistirlas
    if (
      datosActualizados.ubicacionMapa &&
      typeof datosActualizados.ubicacionMapa.lat === 'number' &&
      typeof datosActualizados.ubicacionMapa.lng === 'number'
    ) {
      const fuente = datosActualizados.ubicacionMapa.fuente || 'direccion';
      datosActualizados.ubicacionMapa = {
        lat: datosActualizados.ubicacionMapa.lat,
        lng: datosActualizados.ubicacionMapa.lng,
        fuente,
        actualizadoAt: new Date(),
      };
      if (fuente === 'direccion') {
        datosActualizados.ubicacionDireccion = {
          lat: datosActualizados.ubicacionMapa.lat,
          lng: datosActualizados.ubicacionMapa.lng,
          actualizadoAt: new Date(),
        };
      }
    } else if (
      Object.prototype.hasOwnProperty.call(datosActualizados, 'direccion') &&
      String(datosActualizados.direccion || '').trim() === ''
    ) {
      // Dirección vaciada: limpiar coords stale de dirección (no tocar GPS si no venía)
      if (!tarea.ubicacionMapa || tarea.ubicacionMapa.fuente === 'direccion' || !tarea.ubicacionMapa.fuente) {
        datosActualizados.ubicacionMapa = null;
      }
      datosActualizados.ubicacionDireccion = null;
    } else if (
      Object.prototype.hasOwnProperty.call(datosActualizados, 'direccion') &&
      datosActualizados.direccion !== tarea.direccion &&
      !(
        datosActualizados.ubicacionMapa &&
        typeof datosActualizados.ubicacionMapa.lat === 'number'
      ) &&
      !(
        datosActualizados.ubicacionDireccion &&
        typeof datosActualizados.ubicacionDireccion.lat === 'number'
      )
    ) {
      // Dirección cambió sin sugerencia confirmada: no inventar coords (pueden ser imprecisas).
      // Limpiar solo el pin de dirección; conservar GPS/técnico en vivo.
      datosActualizados.ubicacionDireccion = null;
      if (!tarea.ubicacionMapa || tarea.ubicacionMapa.fuente === 'direccion' || !tarea.ubicacionMapa.fuente) {
        datosActualizados.ubicacionMapa = null;
      }
    }

    const estadoAnterior = tarea.estado;
    const estadoNuevo = datosActualizados.estado || estadoAnterior;

    // Entrar a "en progreso": fijar ubicación en el mapa
    if (estadoNuevo === 'en progreso' && estadoAnterior !== 'en progreso') {
      const gps = datosActualizados.ubicacionMapa;
      if (gps && typeof gps.lat === 'number' && typeof gps.lng === 'number') {
        datosActualizados.ubicacionMapa = {
          lat: gps.lat,
          lng: gps.lng,
          fuente: gps.fuente || 'gps',
          actualizadoAt: new Date(),
        };
      } else {
        // Preferir coords confirmadas de la tarea; si no, base del técnico.
        // No geocodificar texto libre (puede ser impreciso).
        let coords = null;
        let fuente = 'direccion';
        const dirFixed =
          (datosActualizados.ubicacionDireccion &&
          typeof datosActualizados.ubicacionDireccion.lat === 'number'
            ? datosActualizados.ubicacionDireccion
            : null) ||
          (tarea.ubicacionDireccion &&
          typeof tarea.ubicacionDireccion.lat === 'number'
            ? tarea.ubicacionDireccion
            : null);
        if (dirFixed) {
          coords = { lat: dirFixed.lat, lng: dirFixed.lng };
          fuente = 'direccion';
        }
        if (!coords) {
          const tecnicoIds = (datosActualizados.tecnicos || tarea.tecnicos || []).map((t) =>
            typeof t === 'string' ? t : t.toString()
          );
          if (tecnicoIds.length > 0) {
            const tecnico = await Usuario.findById(tecnicoIds[0]).select(
              'direccion localidad ubicacionBase'
            );
            if (tecnico?.ubicacionBase?.lat != null && tecnico?.ubicacionBase?.lng != null) {
              coords = { lat: tecnico.ubicacionBase.lat, lng: tecnico.ubicacionBase.lng };
              fuente = 'tecnico';
            }
          }
        }
        if (coords) {
          datosActualizados.ubicacionMapa = {
            lat: coords.lat,
            lng: coords.lng,
            fuente,
            actualizadoAt: new Date(),
          };
        } else {
          delete datosActualizados.ubicacionMapa;
        }
      }
    }

    // Salir de "en progreso": quitar pin GPS; restaurar solo coords confirmadas del autocomplete.
    // Sin ubicacionDireccion no inventamos punto (evita pins imprecisos en DayMap).
    if (estadoAnterior === 'en progreso' && estadoNuevo !== 'en progreso') {
      const dirCoords =
        (datosActualizados.ubicacionDireccion &&
        typeof datosActualizados.ubicacionDireccion.lat === 'number' &&
        typeof datosActualizados.ubicacionDireccion.lng === 'number'
          ? datosActualizados.ubicacionDireccion
          : null) ||
        (tarea.ubicacionDireccion &&
        typeof tarea.ubicacionDireccion.lat === 'number' &&
        typeof tarea.ubicacionDireccion.lng === 'number'
          ? tarea.ubicacionDireccion
          : null);
      if (dirCoords) {
        datosActualizados.ubicacionMapa = {
          lat: dirCoords.lat,
          lng: dirCoords.lng,
          fuente: 'direccion',
          actualizadoAt: new Date(),
        };
      } else {
        datosActualizados.ubicacionMapa = null;
      }
    }

    // Completada: registrar fechaCompletado solo si aún no existe (no pisa históricos)
    if (estadoNuevo === 'completada' && estadoAnterior !== 'completada') {
      if (!tarea.fechaCompletado && !datosActualizados.fechaCompletado) {
        datosActualizados.fechaCompletado = new Date();
      }
    }

    Object.assign(tarea, datosActualizados, { fechaModificacion: new Date() });
    if (datosActualizados.ubicacionMapa === null) {
      tarea.ubicacionMapa = undefined;
      tarea.markModified('ubicacionMapa');
    }
    if (datosActualizados.ubicacionDireccion === null) {
      tarea.ubicacionDireccion = undefined;
      tarea.markModified('ubicacionDireccion');
    }
    await tarea.save();

    const populated = await Tarea.findById(tarea._id)
      .populate('tecnicos', 'nombre telefono direccion')
      .populate('especialidad', 'nombre')
      .populate('proveedor', 'nombre')
      .populate('creadoPor', 'nombre');

    res.json({ success: true, data: populated, message: 'Tarea actualizada' });
  } catch (err) {
    const msg = err?.message || 'Error al actualizar tarea';
    if (err?.name === 'CastError') {
      return res.status(400).json({
        message: `Dato inválido en ${err.path || 'campo'}: revisá técnicos, especialidad o proveedor`,
        error: msg,
      });
    }
    if (err?.name === 'ValidationError') {
      const details = Object.values(err.errors || {})
        .map((e) => e.message)
        .join(' · ');
      return res.status(400).json({ message: details || msg, error: msg });
    }
    res.status(500).json({ message: `Error al actualizar tarea: ${msg}`, error: msg });
  }
};

// Tareas en progreso con ubicación para el mapa en vivo (solo admin)
exports.getMapaVivo = async (req, res) => {
  try {
    if (!isPrivilegedAdmin(req.user)) {
      return res.status(403).json({ success: false, message: 'Solo administradores' });
    }

    const tareas = await Tarea.find({
      estado: 'en progreso',
      'ubicacionMapa.lat': { $exists: true, $ne: null },
      'ubicacionMapa.lng': { $exists: true, $ne: null },
    })
      .select('numero titulo estado cliente direccion franja_horaria fechaEjecucion ubicacionMapa tecnicos')
      .populate('tecnicos', 'nombre telefono direccion color')
      .sort({ 'ubicacionMapa.actualizadoAt': -1 });

    res.json({ success: true, data: tareas });
  } catch (err) {
    console.error('Error en mapa vivo:', err);
    res.status(500).json({ success: false, message: 'Error al obtener mapa en vivo', error: err.message });
  }
};

const franjaStartMinutes = (franja) => {
  if (!franja || typeof franja !== 'string') return 24 * 60 + 1;
  const m = franja.trim().match(/(\d{1,2}):(\d{2})\s*[-–—]/);
  if (!m) return 24 * 60 + 1;
  return Number(m[1]) * 60 + Number(m[2]);
};

/**
 * Buscar tarea por número exacto (recomendación / operación).
 */
exports.getTareaByNumero = async (req, res) => {
  try {
    const numero = String(req.params.numero || '').trim();
    if (!numero) {
      return res.status(400).json({ success: false, message: 'Número requerido' });
    }

    const tarea = await Tarea.findOne({ numero })
      .populate('especialidad', 'nombre')
      .populate('proveedor', 'nombre')
      .populate('creadoPor', 'nombre email')
      .populate({
        path: 'tecnicos',
        select: 'nombre telefono color especialidad localidad',
        populate: { path: 'especialidad', select: 'nombre' },
      });

    if (!tarea) {
      return res.status(404).json({ success: false, message: 'Tarea no encontrada' });
    }

    const isAdmin = isPrivilegedAdmin(req.user);
    const isCreator =
      tarea.creadoPor &&
      (tarea.creadoPor._id
        ? tarea.creadoPor._id.equals(req.user._id)
        : tarea.creadoPor.equals?.(req.user._id));
    const isAssigned =
      Array.isArray(tarea.tecnicos) &&
      tarea.tecnicos.some((t) => {
        const id = t && t._id ? t._id : t;
        return id && id.equals?.(req.user._id);
      });

    if (!isAdmin && !isCreator && !isAssigned) {
      return res.status(403).json({ success: false, message: 'No autorizado' });
    }

    res.json({ success: true, data: tarea });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: 'Error al buscar tarea',
      error: err.message,
    });
  }
};

/**
 * Recomendación de técnico.
 * Body/query: direccion, fecha, horaInicio, horaFin (HH:mm), especialidadId opcional,
 * excludeTareaId opcional, lat/lng opcionales.
 */
exports.recomendarTecnicos = async (req, res) => {
  try {
    if (!isPrivilegedAdmin(req.user)) {
      return res.status(403).json({ success: false, message: 'Solo administradores' });
    }

    const src = { ...req.query, ...req.body };
    const direccion = String(src.direccion || '').trim();
    const fechaRaw = String(src.fecha || '').trim();
    const fecha = /^\d{4}-\d{2}-\d{2}$/.test(fechaRaw)
      ? fechaRaw
      : new Date().toISOString().slice(0, 10);
    const horaInicio = String(src.horaInicio || '').trim();
    const horaFin = String(src.horaFin || '').trim();
    const priorizarCercania =
      src.priorizarCercania === true ||
      src.priorizarCercania === 'true' ||
      src.priorizarCercania === '1';
    const especialidadId = String(src.especialidadId || src.especialidad || '').trim();
    const excludeTareaId = String(src.excludeTareaId || '').trim();

    const proposedStart = parseHmToMinutes(horaInicio);
    const proposedEndRaw = parseHmToMinutes(horaFin);
    if (proposedStart == null || proposedEndRaw == null) {
      return res.status(400).json({
        success: false,
        message: 'horaInicio y horaFin son obligatorias (HH:mm)',
      });
    }
    let proposedEnd = proposedEndRaw;
    if (proposedEnd <= proposedStart) proposedEnd += 24 * 60;

    // Solo coords explícitas (autocomplete). Nunca inventamos geocode de texto libre.
    let targetCoords = null;
    if (
      src.lat != null &&
      src.lng != null &&
      !Number.isNaN(Number(src.lat)) &&
      !Number.isNaN(Number(src.lng))
    ) {
      targetCoords = { lat: Number(src.lat), lng: Number(src.lng) };
    }

    if (!targetCoords) {
      return res.status(400).json({
        success: false,
        message:
          'Para recomendar necesitás elegir la dirección de la lista (punto confirmado). No inventamos coordenadas.',
      });
    }

    const tecnicoQuery = {
      rol: 'usuario',
      aprobado: true,
    };
    if (especialidadId && mongoose.Types.ObjectId.isValid(especialidadId)) {
      // Match especialidad legacy o cualquiera de especialidades[]
      tecnicoQuery.$or = [
        { especialidad: especialidadId },
        { especialidades: especialidadId },
      ];
    }

    const tecnicos = await Usuario.find(tecnicoQuery)
      .select('nombre telefono localidad direccion ubicacionBase color especialidad especialidades')
      .populate('especialidad', 'nombre')
      .populate('especialidades', 'nombre')
      .lean();

    const tareasDiaQuery = {
      fechaEjecucion: fecha,
      estado: { $ne: 'cancelada' },
      tecnicos: { $exists: true, $ne: [] },
    };
    if (excludeTareaId && mongoose.Types.ObjectId.isValid(excludeTareaId)) {
      tareasDiaQuery._id = { $ne: excludeTareaId };
    }

    const tareasDia = await Tarea.find(tareasDiaQuery)
      .select(
        'numero titulo estado direccion franja_horaria fechaEjecucion ubicacionMapa ubicacionDireccion tecnicos'
      )
      .lean();

    // Usar solo coords ya guardadas (mapa o dirección confirmada). Nunca geocodificar.
    for (const t of tareasDia) {
      const hasMap =
        t.ubicacionMapa &&
        typeof t.ubicacionMapa.lat === 'number' &&
        typeof t.ubicacionMapa.lng === 'number';
      if (hasMap) continue;
      if (
        t.ubicacionDireccion &&
        typeof t.ubicacionDireccion.lat === 'number' &&
        typeof t.ubicacionDireccion.lng === 'number'
      ) {
        t.ubicacionMapa = {
          lat: t.ubicacionDireccion.lat,
          lng: t.ubicacionDireccion.lng,
          fuente: 'direccion',
        };
      }
    }

    const tareasPorTecnico = new Map();
    for (const t of tareasDia) {
      const ids = Array.isArray(t.tecnicos) ? t.tecnicos : [];
      for (const raw of ids) {
        const tid = String(raw);
        if (!tareasPorTecnico.has(tid)) tareasPorTecnico.set(tid, []);
        tareasPorTecnico.get(tid).push(t);
      }
    }

    const { recomendaciones, omitidosSinCoords } = rankTecnicos({
      targetCoords,
      proposedStart,
      proposedEnd,
      tecnicos,
      tareasPorTecnico,
      priorizarCercania,
    });

    const tareasDiaConCoords = tareasDia.filter(
      (t) =>
        (t.ubicacionMapa &&
          typeof t.ubicacionMapa.lat === 'number' &&
          typeof t.ubicacionMapa.lng === 'number') ||
        (t.ubicacionDireccion &&
          typeof t.ubicacionDireccion.lat === 'number' &&
          typeof t.ubicacionDireccion.lng === 'number')
    ).length;

    res.json({
      success: true,
      data: {
        fecha,
        direccion: direccion || null,
        franja: { inicio: horaInicio, fin: horaFin },
        priorizarCercania,
        especialidadId: especialidadId || null,
        destino: targetCoords,
        recomendaciones,
        meta: {
          tecnicosEvaluados: tecnicos.length,
          tecnicosConCoords: recomendaciones.length,
          tecnicosOmitidosSinCoords: omitidosSinCoords,
          tareasDelDia: tareasDia.length,
          tareasDelDiaConCoords: tareasDiaConCoords,
          filtroEspecialidad: Boolean(especialidadId && mongoose.Types.ObjectId.isValid(especialidadId)),
        },
      },
    });
  } catch (err) {
    console.error('Error en recomendarTecnicos:', err);
    res.status(500).json({
      success: false,
      message: 'Error al recomendar técnicos',
      error: err.message,
    });
  }
};

/**
 * Mapa del día: tareas de una fecha (y opcional técnico).
 * Solo pinea las que ya tienen coords confirmadas; las demás se listan sin inventar punto.
 */
exports.getMapaDia = async (req, res) => {
  try {
    if (!isPrivilegedAdmin(req.user)) {
      return res.status(403).json({ success: false, message: 'Solo administradores' });
    }

    const fechaRaw = String(req.query.fecha || '').trim();
    const fecha = /^\d{4}-\d{2}-\d{2}$/.test(fechaRaw)
      ? fechaRaw
      : new Date().toISOString().slice(0, 10);
    const tecnicoId = String(req.query.tecnico || '').trim();
    const incluirCanceladas = String(req.query.incluirCanceladas || '') === '1';

    const filtro = { fechaEjecucion: fecha };
    if (!incluirCanceladas) {
      filtro.estado = { $ne: 'cancelada' };
    }
    if (tecnicoId) {
      filtro.tecnicos = tecnicoId;
    }

    const tareas = await Tarea.find(filtro)
      .select(
        'numero titulo estado cliente direccion franja_horaria fechaEjecucion ubicacionMapa ubicacionDireccion tecnicos'
      )
      .populate('tecnicos', 'nombre telefono direccion color localidad')
      .lean();

    // Solo coords ya confirmadas. Nunca geocodificar texto libre ni persistir inventos.
    let geocoded = 0;
    let sinCoords = 0;

    for (const tarea of tareas) {
      const hasCoords =
        tarea.ubicacionMapa &&
        typeof tarea.ubicacionMapa.lat === 'number' &&
        typeof tarea.ubicacionMapa.lng === 'number';

      if (hasCoords) continue;

      if (
        tarea.ubicacionDireccion &&
        typeof tarea.ubicacionDireccion.lat === 'number' &&
        typeof tarea.ubicacionDireccion.lng === 'number'
      ) {
        tarea.ubicacionMapa = {
          lat: tarea.ubicacionDireccion.lat,
          lng: tarea.ubicacionDireccion.lng,
          fuente: 'direccion',
        };
        geocoded += 1;
        continue;
      }
      sinCoords += 1;
    }

    tareas.sort((a, b) => {
      const fa = franjaStartMinutes(a.franja_horaria);
      const fb = franjaStartMinutes(b.franja_horaria);
      if (fa !== fb) return fa - fb;
      return String(a.numero || '').localeCompare(String(b.numero || ''));
    });

    res.json({
      success: true,
      data: {
        fecha,
        tareas,
        meta: {
          total: tareas.length,
          conCoords: tareas.length - sinCoords,
          sinCoords,
          geocoded,
        },
      },
    });
  } catch (err) {
    console.error('Error en mapa del día:', err);
    res.status(500).json({
      success: false,
      message: 'Error al obtener mapa del día',
      error: err.message,
    });
  }
};

// Eliminar tarea (solo creador o admin)
exports.deleteTarea = async (req, res) => {
  try {
    const tarea = await Tarea.findById(req.params.id);
    if (!tarea) return res.status(404).json({ message: 'Tarea no encontrada' });
    if (!isPrivilegedAdmin(req.user) && !tarea.creadoPor.equals(req.user._id)) {
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
    if (!isPrivilegedAdmin(req.user)) {
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
    if (!isPrivilegedAdmin(req.user)) {
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
      .select(
        'titulo estado fechaEjecucion fechaCompletado franja_horaria tecnicos cliente cuentaCliente descripcion numero direccion direccionExtra entreCalles especialidad proveedor vip ubicacionMapa ubicacionDireccion numeroTitular origen'
      )
      .populate({
        path: 'tecnicos',
        select: 'nombre telefono color especialidad',
        populate: { path: 'especialidad', select: 'nombre' },
      })
      .populate('especialidad', 'nombre')
      .populate('proveedor', 'nombre')
      .populate('creadoPor', 'nombre')
      .sort({ fechaEjecucion: 1 })
      .lean();
    
    console.log(`Se encontraron ${tareas.length} tareas`);
    
    // Devolver tareas completas para el calendario
    res.json({ success: true, data: tareas });
  } catch (err) {
    console.error('Error en calendario:', err);
    res.status(500).json({ success: false, message: 'Error en vista calendario', error: err.message });
  }
};

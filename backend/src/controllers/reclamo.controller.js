const Reclamo = require('../models/Reclamo');
const Tarea = require('../models/Tarea');
const { isPrivilegedAdmin } = require('../utils/roles');

const MOTIVOS = [
  'mala_atencion',
  'trabajo_incompleto',
  'problema_tecnico',
  'demora',
  'otro',
];
const ESTADOS = ['abierto', 'resuelto', 'reabierto'];

const populateQuery = (q) =>
  q
    .populate('tarea', 'numero titulo cliente estado fechaEjecucion')
    .populate('tecnicos', 'nombre email especialidad')
    .populate('creadoPor', 'nombre')
    .populate('resueltoPor', 'nombre');

exports.getReclamos = async (req, res) => {
  try {
    if (!isPrivilegedAdmin(req.user)) {
      return res.status(403).json({ success: false, message: 'No autorizado' });
    }

    const filter = {};
    if (req.query.estado && ESTADOS.includes(req.query.estado)) {
      filter.estado = req.query.estado;
    }
    if (req.query.motivo && MOTIVOS.includes(req.query.motivo)) {
      filter.motivo = req.query.motivo;
    }
    if (req.query.tarea) filter.tarea = req.query.tarea;

    if (req.query.start || req.query.end) {
      filter.fechaReclamo = {};
      if (req.query.start) {
        const s = new Date(req.query.start);
        s.setHours(0, 0, 0, 0);
        filter.fechaReclamo.$gte = s;
      }
      if (req.query.end) {
        const e = new Date(req.query.end);
        e.setHours(23, 59, 59, 999);
        filter.fechaReclamo.$lte = e;
      }
    }

    const reclamos = await populateQuery(Reclamo.find(filter).sort({ fechaReclamo: -1 }));
    res.json({ success: true, data: reclamos });
  } catch (err) {
    console.error('getReclamos:', err);
    res.status(500).json({
      success: false,
      message: 'Error al listar reclamos',
      error: err.message,
    });
  }
};

exports.createReclamo = async (req, res) => {
  try {
    if (!isPrivilegedAdmin(req.user)) {
      return res.status(403).json({ success: false, message: 'No autorizado' });
    }

    const {
      tarea,
      cliente,
      cuentaCliente,
      tecnicos,
      motivo,
      estado,
      descripcion,
      fechaReclamo,
    } = req.body;

    if (!motivo || !MOTIVOS.includes(motivo)) {
      return res.status(400).json({
        success: false,
        message: 'motivo inválido (mala_atencion, trabajo_incompleto, problema_tecnico, demora, otro)',
      });
    }

    let clienteFinal = (cliente || '').trim();
    let tecnicosFinal = Array.isArray(tecnicos) ? tecnicos.filter(Boolean) : [];
    let cuentaFinal = cuentaCliente || '';

    if (tarea) {
      const t = await Tarea.findById(tarea).select('cliente tecnicos cuentaCliente');
      if (!t) {
        return res.status(404).json({ success: false, message: 'Tarea no encontrada' });
      }
      if (!clienteFinal) clienteFinal = t.cliente || '';
      if (!cuentaFinal && t.cuentaCliente) cuentaFinal = t.cuentaCliente;
      if (tecnicosFinal.length === 0 && Array.isArray(t.tecnicos)) {
        tecnicosFinal = t.tecnicos.map((id) => id.toString());
      }
    }

    const payload = {
      tarea: tarea || null,
      cliente: clienteFinal,
      cuentaCliente: cuentaFinal || '',
      tecnicos: tecnicosFinal,
      motivo,
      estado: estado && ESTADOS.includes(estado) ? estado : 'abierto',
      descripcion: descripcion || '',
      fechaReclamo: fechaReclamo ? new Date(fechaReclamo) : new Date(),
      creadoPor: req.user._id,
    };

    if (payload.estado === 'resuelto') {
      payload.fechaResolucion = new Date();
      payload.resueltoPor = req.user._id;
    }

    const reclamo = await Reclamo.create(payload);
    const populated = await populateQuery(Reclamo.findById(reclamo._id));
    res.status(201).json({ success: true, data: populated, message: 'Reclamo registrado' });
  } catch (err) {
    console.error('createReclamo:', err);
    res.status(500).json({
      success: false,
      message: 'Error al crear reclamo',
      error: err.message,
    });
  }
};

exports.updateReclamo = async (req, res) => {
  try {
    if (!isPrivilegedAdmin(req.user)) {
      return res.status(403).json({ success: false, message: 'No autorizado' });
    }

    const reclamo = await Reclamo.findById(req.params.id);
    if (!reclamo) {
      return res.status(404).json({ success: false, message: 'Reclamo no encontrado' });
    }

    const { cliente, cuentaCliente, tecnicos, motivo, estado, descripcion, fechaReclamo, tarea } =
      req.body;

    if (cliente !== undefined) reclamo.cliente = cliente;
    if (cuentaCliente !== undefined) reclamo.cuentaCliente = cuentaCliente || '';
    if (Array.isArray(tecnicos)) reclamo.tecnicos = tecnicos;
    if (motivo !== undefined) {
      if (!MOTIVOS.includes(motivo)) {
        return res.status(400).json({ success: false, message: 'motivo inválido' });
      }
      reclamo.motivo = motivo;
    }
    if (descripcion !== undefined) reclamo.descripcion = descripcion;
    if (fechaReclamo !== undefined) reclamo.fechaReclamo = new Date(fechaReclamo);
    if (tarea !== undefined) reclamo.tarea = tarea || null;

    if (estado !== undefined) {
      if (!ESTADOS.includes(estado)) {
        return res.status(400).json({ success: false, message: 'estado inválido' });
      }
      const prev = reclamo.estado;
      reclamo.estado = estado;
      if (estado === 'resuelto' && prev !== 'resuelto') {
        reclamo.fechaResolucion = new Date();
        reclamo.resueltoPor = req.user._id;
      }
      if (estado === 'reabierto') {
        reclamo.fechaResolucion = null;
      }
      if (estado === 'abierto' && prev === 'resuelto') {
        reclamo.fechaResolucion = null;
      }
    }

    await reclamo.save();
    const populated = await populateQuery(Reclamo.findById(reclamo._id));
    res.json({ success: true, data: populated, message: 'Reclamo actualizado' });
  } catch (err) {
    console.error('updateReclamo:', err);
    res.status(500).json({
      success: false,
      message: 'Error al actualizar reclamo',
      error: err.message,
    });
  }
};

exports.deleteReclamo = async (req, res) => {
  try {
    if (!isPrivilegedAdmin(req.user)) {
      return res.status(403).json({ success: false, message: 'No autorizado' });
    }
    const deleted = await Reclamo.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Reclamo no encontrado' });
    }
    res.json({ success: true, message: 'Reclamo eliminado' });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: 'Error al eliminar reclamo',
      error: err.message,
    });
  }
};

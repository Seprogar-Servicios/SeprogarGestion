const PagoManual = require('../models/PagoManual');
const MotivoPago = require('../models/MotivoPago');
const Usuario = require('../models/User');
const Tarea = require('../models/Tarea');
const { pagoManualSchema, pagoManualUpdateSchema } = require('../utils/validators');
const { generatePagoManualPdf } = require('../utils/pagoManualPdf');

const populateFields = [
  { path: 'tecnico', select: 'nombre email rol' },
  { path: 'motivo', select: 'nombre descripcion activo' },
  { path: 'tareas', select: 'numero titulo estado fechaEjecucion' },
  { path: 'creadoPor', select: 'nombre email' },
];

async function validatePagoRelations({ tecnico, motivo, tareas }) {
  const usuario = await Usuario.findById(tecnico);
  if (!usuario) return 'Técnico no encontrado';
  if (usuario.rol !== 'usuario') return 'El usuario seleccionado no es un técnico';

  const motivoDoc = await MotivoPago.findById(motivo);
  if (!motivoDoc) return 'Motivo de pago no encontrado';
  if (!motivoDoc.activo) return 'El motivo de pago está inactivo';

  const tareaIds = Array.isArray(tareas) ? tareas : [];
  if (tareaIds.length > 0) {
    const count = await Tarea.countDocuments({ _id: { $in: tareaIds } });
    if (count !== tareaIds.length) return 'Una o más tareas no existen';
  }

  return null;
}

exports.createPagoManual = async (req, res) => {
  const { error, value } = pagoManualSchema.validate(req.body);
  if (error) return res.status(400).json({ message: error.details[0].message });

  try {
    const validationError = await validatePagoRelations(value);
    if (validationError) return res.status(400).json({ message: validationError });

    const pago = new PagoManual({
      ...value,
      fechaEmision: new Date(value.fechaEmision),
      tareas: value.tareas || [],
      creadoPor: req.user._id,
    });
    await pago.save();
    await pago.populate(populateFields);

    res.status(201).json({ data: pago });
  } catch (err) {
    res.status(500).json({ message: 'Error al crear pago manual', error: err.message });
  }
};

exports.getPagosManuales = async (req, res) => {
  try {
    const filter = {};
    if (req.query.tecnico) filter.tecnico = req.query.tecnico;
    if (req.query.motivo) filter.motivo = req.query.motivo;

    const pagos = await PagoManual.find(filter)
      .populate(populateFields)
      .sort({ fechaEmision: -1, createdAt: -1 });

    res.json({ data: pagos });
  } catch (err) {
    res.status(500).json({ message: 'Error al obtener pagos manuales', error: err.message });
  }
};

exports.getMisPagos = async (req, res) => {
  try {
    const pagos = await PagoManual.find({ tecnico: req.user._id })
      .populate(populateFields)
      .sort({ fechaEmision: -1, createdAt: -1 });

    res.json({ data: pagos });
  } catch (err) {
    res.status(500).json({ message: 'Error al obtener tus pagos', error: err.message });
  }
};

exports.getPagoManualById = async (req, res) => {
  try {
    const pago = await PagoManual.findById(req.params.id).populate(populateFields);
    if (!pago) return res.status(404).json({ message: 'Pago manual no encontrado' });

    if (
      req.user.rol === 'usuario' &&
      pago.tecnico._id.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({ message: 'No autorizado' });
    }

    res.json({ data: pago });
  } catch (err) {
    res.status(500).json({ message: 'Error al obtener el pago manual', error: err.message });
  }
};

exports.updatePagoManual = async (req, res) => {
  const { error, value } = pagoManualUpdateSchema.validate(req.body);
  if (error) return res.status(400).json({ message: error.details[0].message });

  try {
    const pago = await PagoManual.findById(req.params.id);
    if (!pago) return res.status(404).json({ message: 'Pago manual no encontrado' });

    const next = {
      tecnico: value.tecnico ?? pago.tecnico.toString(),
      motivo: value.motivo ?? pago.motivo.toString(),
      tareas: value.tareas ?? pago.tareas.map((t) => t.toString()),
    };

    const validationError = await validatePagoRelations(next);
    if (validationError) return res.status(400).json({ message: validationError });

    if (value.monto !== undefined) pago.monto = value.monto;
    if (value.fechaEmision !== undefined) pago.fechaEmision = new Date(value.fechaEmision);
    if (value.tecnico !== undefined) pago.tecnico = value.tecnico;
    if (value.motivo !== undefined) pago.motivo = value.motivo;
    if (value.tareas !== undefined) pago.tareas = value.tareas;
    if (value.observaciones !== undefined) pago.observaciones = value.observaciones;

    await pago.save();
    await pago.populate(populateFields);

    res.json({ data: pago });
  } catch (err) {
    res.status(500).json({ message: 'Error al actualizar pago manual', error: err.message });
  }
};

exports.deletePagoManual = async (req, res) => {
  try {
    const pago = await PagoManual.findByIdAndDelete(req.params.id);
    if (!pago) return res.status(404).json({ message: 'Pago manual no encontrado' });
    res.json({ message: 'Pago manual eliminado' });
  } catch (err) {
    res.status(500).json({ message: 'Error al eliminar pago manual', error: err.message });
  }
};

exports.downloadPagoManualPdf = async (req, res) => {
  try {
    const pago = await PagoManual.findById(req.params.id).populate(populateFields);
    if (!pago) return res.status(404).json({ message: 'Pago manual no encontrado' });

    const idCorto = String(pago._id).slice(-8).toUpperCase();
    const filename = `pago-manual-${idCorto}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    generatePagoManualPdf(pago, res);
  } catch (err) {
    if (!res.headersSent) {
      res.status(500).json({ message: 'Error al generar el PDF', error: err.message });
    }
  }
};

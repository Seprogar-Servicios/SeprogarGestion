const MotivoPago = require('../models/MotivoPago');
const { motivoPagoSchema } = require('../utils/validators');

const DEFAULT_MOTIVOS = [
  { nombre: 'Pago sueldo', descripcion: 'Recibo de sueldo / liquidación mensual' },
  { nombre: 'Aguinaldo', descripcion: 'Pago de aguinaldo' },
  { nombre: 'Adicional', descripcion: 'Pago adicional' },
  { nombre: 'Adelanto', descripcion: 'Adelanto de pago al técnico' },
  { nombre: 'Pago extra', descripcion: 'Pago adicional o extraordinario' },
];

async function ensureDefaultMotivos() {
  for (const motivo of DEFAULT_MOTIVOS) {
    await MotivoPago.updateOne(
      { nombre: motivo.nombre },
      { $setOnInsert: { ...motivo, activo: true } },
      { upsert: true }
    );
  }
}

exports.createMotivoPago = async (req, res) => {
  const { error } = motivoPagoSchema.validate(req.body);
  if (error) return res.status(400).json({ message: error.details[0].message });

  try {
    const motivo = new MotivoPago(req.body);
    await motivo.save();
    res.status(201).json({ data: motivo });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ message: 'Ya existe un motivo con ese nombre' });
    }
    res.status(500).json({ message: 'Error al crear motivo de pago', error: err.message });
  }
};

exports.getMotivosPago = async (req, res) => {
  try {
    await ensureDefaultMotivos();
    const filter = {};
    if (req.query.activo === 'true') filter.activo = true;
    if (req.query.activo === 'false') filter.activo = false;

    const motivos = await MotivoPago.find(filter).sort({ nombre: 1 });
    res.json({ data: motivos });
  } catch (err) {
    res.status(500).json({ message: 'Error al obtener motivos de pago', error: err.message });
  }
};

exports.updateMotivoPago = async (req, res) => {
  const { error } = motivoPagoSchema.validate(req.body);
  if (error) return res.status(400).json({ message: error.details[0].message });

  try {
    const motivo = await MotivoPago.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!motivo) return res.status(404).json({ message: 'Motivo de pago no encontrado' });
    res.json({ data: motivo });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ message: 'Ya existe un motivo con ese nombre' });
    }
    res.status(500).json({ message: 'Error al actualizar motivo de pago', error: err.message });
  }
};

exports.deleteMotivoPago = async (req, res) => {
  try {
    const PagoManual = require('../models/PagoManual');
    const enUso = await PagoManual.exists({ motivo: req.params.id });
    if (enUso) {
      return res.status(400).json({
        message: 'No se puede eliminar: hay pagos asociados. Desactivá el motivo en su lugar.',
      });
    }

    const motivo = await MotivoPago.findByIdAndDelete(req.params.id);
    if (!motivo) return res.status(404).json({ message: 'Motivo de pago no encontrado' });
    res.json({ message: 'Motivo de pago eliminado' });
  } catch (err) {
    res.status(500).json({ message: 'Error al eliminar motivo de pago', error: err.message });
  }
};

const Recibo = require('../models/Recibo');
const MotivoPago = require('../models/MotivoPago');

const populateFields = [
  { path: 'tecnico', select: 'nombre email' },
  { path: 'motivo', select: 'nombre descripcion activo' },
];

// Crear recibo (solo admin)
exports.createRecibo = async (req, res) => {
  try {
    const { tecnico, motivo, mes, anio } = req.body;

    if (!req.file) {
      return res.status(400).json({ message: 'El PDF es obligatorio.' });
    }

    if (!motivo) {
      return res.status(400).json({ message: 'El motivo es obligatorio.' });
    }

    const motivoDoc = await MotivoPago.findById(motivo);
    if (!motivoDoc) {
      return res.status(400).json({ message: 'Motivo de pago no encontrado.' });
    }
    if (!motivoDoc.activo) {
      return res.status(400).json({ message: 'El motivo de pago está inactivo.' });
    }

    const nuevoRecibo = new Recibo({
      tecnico,
      motivo,
      mes,
      anio,
      url: req.file.path,
    });

    await nuevoRecibo.save();
    await nuevoRecibo.populate(populateFields);
    res.status(201).json(nuevoRecibo);
  } catch (error) {
    res.status(500).json({ message: 'Error al crear el recibo', error: error.message });
  }
};

// Obtener todos los recibos (admin)
exports.getRecibos = async (req, res) => {
  try {
    const recibos = await Recibo.find().populate(populateFields).sort({ anio: -1, mes: -1 });
    res.status(200).json(recibos);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener recibos', error: error.message });
  }
};

// Obtener recibos del técnico logueado
exports.getMisRecibos = async (req, res) => {
  try {
    const tecnicoId = req.user._id || req.user.id;
    const recibos = await Recibo.find({ tecnico: tecnicoId })
      .populate(populateFields)
      .sort({ anio: -1, mes: -1 });
    res.status(200).json(recibos);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener tus recibos', error: error.message });
  }
};

// Obtener recibo por ID (acceso: admin o técnico dueño)
exports.getReciboById = async (req, res) => {
  try {
    const recibo = await Recibo.findById(req.params.id).populate(populateFields);

    if (!recibo) return res.status(404).json({ message: 'Recibo no encontrado' });

    const tecnicoId = recibo.tecnico?._id?.toString() || recibo.tecnico?.toString();
    if (
      (req.user.rol === 'usuario' || req.user.rol === 'tecnico') &&
      tecnicoId !== (req.user._id || req.user.id).toString()
    ) {
      return res.status(403).json({ message: 'No autorizado' });
    }

    res.status(200).json(recibo);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener el recibo', error: error.message });
  }
};

// Firmar un recibo (solo técnico dueño)
exports.firmarRecibo = async (req, res) => {
  try {
    const recibo = await Recibo.findById(req.params.id);

    if (!recibo) return res.status(404).json({ message: 'Recibo no encontrado' });

    const userId = (req.user._id || req.user.id).toString();
    if (recibo.tecnico.toString() !== userId) {
      return res.status(403).json({ message: 'No autorizado para firmar este recibo' });
    }

    if (recibo.estadoFirma === 'firmado') {
      return res.status(400).json({ message: 'Este recibo ya fue firmado' });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'La imagen de la firma es obligatoria.' });
    }

    recibo.firma = {
      imagen: req.file.path,
      fecha: new Date(),
    };

    recibo.estadoFirma = 'firmado';
    await recibo.save();
    await recibo.populate(populateFields);

    res.status(200).json({ message: 'Recibo firmado correctamente', recibo });
  } catch (error) {
    res.status(500).json({ message: 'Error al firmar recibo', error: error.message });
  }
};

// Eliminar recibo (solo admin)
exports.deleteRecibo = async (req, res) => {
  try {
    const recibo = await Recibo.findByIdAndDelete(req.params.id);

    if (!recibo) {
      return res.status(404).json({ message: 'Recibo no encontrado' });
    }

    res.status(200).json({ message: 'Recibo eliminado correctamente' });
  } catch (error) {
    res.status(500).json({ message: 'Error al eliminar el recibo', error: error.message });
  }
};

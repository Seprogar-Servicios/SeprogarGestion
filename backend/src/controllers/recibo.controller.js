const Recibo = require('../models/Recibo');
const Usuario = require('../models/User');

// Crear recibo (solo admin)
exports.createRecibo = async (req, res) => {
  try {
    const { tecnico, mes, anio } = req.body;

    if (!req.file) {
      return res.status(400).json({ message: 'El PDF es obligatorio.' });
    }

    const nuevoRecibo = new Recibo({
      tecnico,
      mes,
      anio,
      url: req.file.path,
    });

    await nuevoRecibo.save();
    res.status(201).json(nuevoRecibo);

  } catch (error) {
    res.status(500).json({ message: 'Error al crear el recibo', error });
  }
};

// Obtener todos los recibos (admin)
exports.getRecibos = async (req, res) => {
  try {
    const recibos = await Recibo.find().populate('tecnico', 'nombre email');
    res.status(200).json(recibos);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener recibos', error });
  }
};

// Obtener recibos del técnico logueado
exports.getMisRecibos = async (req, res) => {
  try {
    const recibos = await Recibo.find({ tecnico: req.user.id });
    res.status(200).json(recibos);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener tus recibos', error });
  }
};

// Obtener recibo por ID (acceso: admin o técnico dueño)
exports.getReciboById = async (req, res) => {
  try {
    const recibo = await Recibo.findById(req.params.id).populate('tecnico');

    if (!recibo) return res.status(404).json({ message: 'Recibo no encontrado' });

    // Si es técnico, solo puede ver sus recibos
    if (req.user.rol === 'tecnico' && recibo.tecnico._id.toString() !== req.user.id) {
      return res.status(403).json({ message: 'No autorizado' });
    }

    res.status(200).json(recibo);

  } catch (error) {
    res.status(500).json({ message: 'Error al obtener el recibo', error });
  }
};

// Firmar un recibo (solo técnico dueño)
exports.firmarRecibo = async (req, res) => {
  try {
    const recibo = await Recibo.findById(req.params.id);

    if (!recibo) return res.status(404).json({ message: 'Recibo no encontrado' });

    if (recibo.tecnico.toString() !== req.user.id) {
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

    res.status(200).json({ message: 'Recibo firmado correctamente', recibo });

  } catch (error) {
    res.status(500).json({ message: 'Error al firmar recibo', error });
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
    res.status(500).json({ message: 'Error al eliminar el recibo', error });
  }
};

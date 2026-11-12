const TareaLiquidacion = require('../models/TareaLiquidacion');
const Tarea = require('../models/Tarea');
const { tareaLiquidacionSchema, tareaLiquidacionUpdateSchema } = require('../utils/validators');
const {
  generateLiquidacionesListPdf,
  generateCalculoMensualPdf,
} = require('../utils/liquidacionPdf');

// Obtener todas las liquidaciones (solo de tareas con técnico asignado)
exports.getLiquidaciones = async (req, res) => {
  try {
    const liquidaciones = await TareaLiquidacion
      .find({})
      .populate({
        path: 'tarea',
        match: { tecnicos: { $exists: true, $ne: [] } },
        select: 'numero titulo estado fechaEjecucion cliente cuentaCliente tecnicos',
        populate: {
          path: 'tecnicos',
          select: 'nombre email porcentajeTecnico especialidad',
          populate: { path: 'especialidad', select: 'nombre' },
        }
      });

    // Filtrar liquidaciones donde la tarea existe (match funciona como filtro)
    const liquidacionesFiltradas = liquidaciones.filter(l => l.tarea !== null);

    res.json({ data: liquidacionesFiltradas });
  } catch (err) {
    res.status(500).json({ message: 'Error al obtener liquidaciones', error: err.message });
  }
};

// Obtener liquidación por ID
exports.getLiquidacionById = async (req, res) => {
  try {
    const liquidacion = await TareaLiquidacion
      .findById(req.params.id)
      .populate({
        path: 'tarea',
        populate: {
          path: 'tecnicos',
          select: 'nombre email porcentajeTecnico'
        }
      });

    if (!liquidacion) {
      return res.status(404).json({ message: 'Liquidación no encontrada' });
    }

    res.json({ data: liquidacion });
  } catch (err) {
    res.status(500).json({ message: 'Error al obtener liquidación', error: err.message });
  }
};

// Crear liquidación
exports.createLiquidacion = async (req, res) => {
  const { error } = tareaLiquidacionSchema.validate(req.body);
  if (error) return res.status(400).json({ message: error.details[0].message });

  try {
    const liquidacion = new TareaLiquidacion(req.body);
    await liquidacion.save();
    const populated = await TareaLiquidacion
      .findById(liquidacion._id)
      .populate({
        path: 'tarea',
        populate: {
          path: 'tecnicos',
          select: 'nombre email porcentajeTecnico'
        }
      });
    res.status(201).json({ data: populated });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ message: 'Ya existe una liquidación para esta tarea' });
    }
    res.status(500).json({ message: 'Error al crear liquidación', error: err.message });
  }
};

// Actualizar liquidación
exports.updateLiquidacion = async (req, res) => {
  const { error } = tareaLiquidacionUpdateSchema.validate(req.body);
  if (error) return res.status(400).json({ message: error.details[0].message });

  try {
    const liquidacion = await TareaLiquidacion.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    ).populate({
      path: 'tarea',
      populate: {
        path: 'tecnicos',
        select: 'nombre email porcentajeTecnico'
      }
    });

    if (!liquidacion) {
      return res.status(404).json({ message: 'Liquidación no encontrada' });
    }

    res.json({ data: liquidacion });
  } catch (err) {
    res.status(500).json({ message: 'Error al actualizar liquidación', error: err.message });
  }
};

// Eliminar liquidación
exports.deleteLiquidacion = async (req, res) => {
  try {
    const liquidacion = await TareaLiquidacion.findByIdAndDelete(req.params.id);
    if (!liquidacion) {
      return res.status(404).json({ message: 'Liquidación no encontrada' });
    }
    res.json({ message: 'Liquidación eliminada' });
  } catch (err) {
    res.status(500).json({ message: 'Error al eliminar liquidación', error: err.message });
  }
};

// Obtener liquidaciones por técnico
exports.getLiquidacionesByTecnico = async (req, res) => {
  try {
    const { tecnicoId } = req.params;

    const liquidaciones = await TareaLiquidacion
      .find({})
      .populate({
        path: 'tarea',
        match: { tecnicos: { $in: [tecnicoId] } },
        select: 'numero titulo estado fechaEjecucion cliente cuentaCliente tecnicos',
        populate: {
          path: 'tecnicos',
          select: 'nombre email porcentajeTecnico especialidad',
          populate: { path: 'especialidad', select: 'nombre' },
        }
      });

    // Filtrar liquidaciones donde la tarea existe y tiene el técnico
    const liquidacionesFiltradas = liquidaciones.filter(l => l.tarea !== null);

    res.json({ data: liquidacionesFiltradas });
  } catch (err) {
    res.status(500).json({ message: 'Error al obtener liquidaciones por técnico', error: err.message });
  }
};

// Obtener liquidación por tarea
exports.getLiquidacionByTarea = async (req, res) => {
  try {
    const { tareaId } = req.params;

    const liquidacion = await TareaLiquidacion
      .findOne({ tarea: tareaId })
      .populate({
        path: 'tarea',
        populate: {
          path: 'tecnicos',
          select: 'nombre email porcentajeTecnico'
        }
      });

    if (!liquidacion) {
      return res.status(404).json({ message: 'Liquidación no encontrada para esta tarea' });
    }

    res.json({ data: liquidacion });
  } catch (err) {
    res.status(500).json({ message: 'Error al obtener liquidación por tarea', error: err.message });
  }
};

// Exportar liquidaciones del técnico a PDF
exports.exportLiquidacionesTecnico = async (req, res) => {
  try {
    const { tecnicoId } = req.params;

    const liquidaciones = await TareaLiquidacion
      .find({})
      .populate({
        path: 'tarea',
        match: { tecnicos: { $in: [tecnicoId] } },
        populate: {
          path: 'tecnicos',
          select: 'nombre email porcentajeTecnico'
        }
      });

    const liquidacionesFiltradas = liquidaciones.filter(l => l.tarea !== null);

    if (liquidacionesFiltradas.length === 0) {
      return res.status(404).json({ message: 'No se encontraron liquidaciones para este técnico' });
    }

    const tecnicoNombre = liquidacionesFiltradas[0]?.tarea?.tecnicos?.[0]?.nombre || 'tecnico';
    const filename = `liquidaciones_${new Date().toISOString().split('T')[0]}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');

    generateLiquidacionesListPdf(liquidacionesFiltradas, res, {
      title: 'Liquidaciones',
      subtitle: `Técnico: ${tecnicoNombre}  ·  ${new Date().toLocaleDateString('es-AR')}`,
      mode: 'tecnico',
    });
  } catch (err) {
    if (!res.headersSent) {
      res.status(500).json({ message: 'Error al exportar liquidaciones', error: err.message });
    }
  }
};

// Exportar todas las liquidaciones (Admin) a PDF
exports.exportLiquidacionesAdmin = async (req, res) => {
  try {
    const liquidaciones = await TareaLiquidacion
      .find({})
      .populate({
        path: 'tarea',
        match: { tecnicos: { $exists: true, $ne: [] } },
        populate: {
          path: 'tecnicos',
          select: 'nombre email porcentajeTecnico'
        }
      });

    const liquidacionesFiltradas = liquidaciones.filter(l => l.tarea !== null);

    if (liquidacionesFiltradas.length === 0) {
      return res.status(404).json({ message: 'No se encontraron liquidaciones' });
    }

    const filename = `liquidaciones_admin_${new Date().toISOString().split('T')[0]}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');

    generateLiquidacionesListPdf(liquidacionesFiltradas, res, {
      title: 'Liquidaciones',
      subtitle: `Listado general  ·  ${new Date().toLocaleDateString('es-AR')}`,
      mode: 'admin',
    });
  } catch (err) {
    if (!res.headersSent) {
      res.status(500).json({ message: 'Error al exportar liquidaciones', error: err.message });
    }
  }
};

// Exportar cálculo mensual (Admin) a PDF
exports.exportCalculoMensual = async (req, res) => {
  try {
    const { tecnico, mes } = req.query;

    const liquidaciones = await TareaLiquidacion
      .find({})
      .populate({
        path: 'tarea',
        match: { tecnicos: { $exists: true, $ne: [] } },
        populate: {
          path: 'tecnicos',
          select: 'nombre email porcentajeTecnico'
        }
      });

    const liquidacionesFiltradas = liquidaciones.filter(l => l.tarea !== null);

    const filtradasPorTecnico = tecnico
      ? liquidacionesFiltradas.filter(l => l.tarea?.tecnicos?.[0]?.nombre === tecnico)
      : liquidacionesFiltradas;

    const filtradasPorMes = mes
      ? filtradasPorTecnico.filter(l => l.tarea?.fechaEjecucion && l.tarea.fechaEjecucion.startsWith(mes))
      : filtradasPorTecnico;

    if (filtradasPorMes.length === 0) {
      return res.status(404).json({ message: 'No se encontraron liquidaciones para el cálculo mensual' });
    }

    const totals = filtradasPorMes.reduce((acc, l) => ({
      manoObra: acc.manoObra + (l.manoObra || 0),
      materiales: acc.materiales + (l.materiales || 0),
      cobertura: acc.cobertura + (l.cobertura || 0),
      excedente: acc.excedente + (l.excedente || 0),
      materialReal: acc.materialReal + (l.materialReal || 0),
      totalPresupuesto: acc.totalPresupuesto + (l.totalPresupuesto || 0),
      gananciaMaterial: acc.gananciaMaterial + (l.gananciaMaterial || 0),
      gananciaTotal: acc.gananciaTotal + (l.gananciaTotal || 0),
      repartida: acc.repartida + (l.repartida || 0),
      pagoTecnico: acc.pagoTecnico + (l.pagoTecnico || 0),
      futurgas: acc.futurgas + (l.futurgas || 0),
      pago15Dias: acc.pago15Dias + (l.pago15Dias || 0),
    }), {
      manoObra: 0,
      materiales: 0,
      cobertura: 0,
      excedente: 0,
      materialReal: 0,
      totalPresupuesto: 0,
      gananciaMaterial: 0,
      gananciaTotal: 0,
      repartida: 0,
      pagoTecnico: 0,
      futurgas: 0,
      pago15Dias: 0,
    });

    const filename = `calculo-mensual-${mes || 'todos'}-${tecnico || 'todos'}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');

    generateCalculoMensualPdf(totals, res, {
      title: 'Cálculo mensual',
      tecnico: tecnico || null,
      mes: mes || null,
    });
  } catch (err) {
    if (!res.headersSent) {
      res.status(500).json({ message: 'Error al exportar cálculo mensual', error: err.message });
    }
  }
};

exports.getLiquidacionByNumeroTarea = async (req, res) => {
  try {
    const { numero } = req.params;
    
    // Buscar tarea por número
    const tarea = await Tarea.findOne({ numero });
    
    if (!tarea) {
      return res.status(404).json({ message: 'Tarea no encontrada' });
    }

    // Buscar liquidación por _id de tarea
    const liquidacion = await TareaLiquidacion
      .findOne({ tarea: tarea._id })
      .populate({
        path: 'tarea',
        populate: {
          path: 'tecnicos',
          select: 'nombre email porcentajeTecnico'
        }
      });

    if (!liquidacion) {
      return res.status(404).json({ message: 'Liquidación no encontrada' });
    }

    res.json({ data: liquidacion });
  } catch (err) {
    res.status(500).json({ message: 'Error al obtener liquidación por número de tarea', error: err.message });
  }
};

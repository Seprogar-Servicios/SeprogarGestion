const TareaLiquidacion = require('../models/TareaLiquidacion');
const Tarea = require('../models/Tarea');
const { tareaLiquidacionSchema } = require('../utils/validators');
const ExcelJS = require('exceljs');

// Obtener todas las liquidaciones (solo de tareas con técnico asignado)
exports.getLiquidaciones = async (req, res) => {
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
  const { error } = tareaLiquidacionSchema.validate(req.body);
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
        populate: {
          path: 'tecnicos',
          select: 'nombre email porcentajeTecnico'
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

// Exportar liquidaciones del técnico a Excel
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

    // Filtrar liquidaciones donde la tarea existe y tiene el técnico
    const liquidacionesFiltradas = liquidaciones.filter(l => l.tarea !== null);

    if (liquidacionesFiltradas.length === 0) {
      return res.status(404).json({ message: 'No se encontraron liquidaciones para este técnico' });
    }

    // Crear el archivo Excel
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Futurgas';
    workbook.lastModifiedBy = 'Sistema';
    workbook.created = new Date();
    workbook.modified = new Date();

    const sheet = workbook.addWorksheet('Liquidaciones');

    // Configurar columnas - Solo las que muestra la lista del técnico
    sheet.columns = [
      { header: 'Numero', key: 'numero', width: 20 },
      { header: 'Cliente', key: 'cliente', width: 30 },
      { header: 'Fecha', key: 'fechaEjecucion', width: 20 },
      { header: 'Pago Tecnico', key: 'pagoTecnico', width: 15 },
      { header: 'Pago 15 Dias', key: 'pago15Dias', width: 15 }
    ];

    // Agregar datos
    liquidacionesFiltradas.forEach(liquidacion => {
      const row = {
        numero: liquidacion.tarea?.numero || '',
        cliente: liquidacion.tarea?.cliente || '',
        fechaEjecucion: liquidacion.tarea?.fechaEjecucion || '',
        pagoTecnico: liquidacion.pagoTecnico || 0,
        pago15Dias: liquidacion.pago15Dias || 0
      };
      sheet.addRow(row);
    });

    // Estilo para la primera fila (encabezados) - Naranja con letras blancas
    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFFF6600' } // Naranja
    };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };

    // Configurar el response
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=liquidaciones_${new Date().toISOString().split('T')[0]}.xlsx`);
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    res.status(500).json({ message: 'Error al exportar liquidaciones', error: err.message });
  }
};

// Exportar todas las liquidaciones (Admin) a Excel
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

    // Filtrar liquidaciones donde la tarea existe
    const liquidacionesFiltradas = liquidaciones.filter(l => l.tarea !== null);

    if (liquidacionesFiltradas.length === 0) {
      return res.status(404).json({ message: 'No se encontraron liquidaciones' });
    }

    // Crear el archivo Excel
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Futurgas';
    workbook.lastModifiedBy = 'Sistema';
    workbook.created = new Date();
    workbook.modified = new Date();

    const sheet = workbook.addWorksheet('Liquidaciones');

    // Configurar columnas - Todas las columnas de liquidación
    sheet.columns = [
      { header: 'Numero', key: 'numero', width: 20 },
      { header: 'Cliente', key: 'cliente', width: 30 },
      { header: 'Fecha', key: 'fechaEjecucion', width: 20 },
      { header: 'Mano de Obra', key: 'manoObra', width: 15 },
      { header: 'Materiales', key: 'materiales', width: 15 },
      { header: 'Cobertura', key: 'cobertura', width: 15 },
      { header: 'Excedente', key: 'excedente', width: 15 },
      { header: 'Material Real', key: 'materialReal', width: 15 },
      { header: 'Total Presupuesto', key: 'totalPresupuesto', width: 18 },
      { header: 'Dif Excedente', key: 'difExcedente', width: 15 },
      { header: 'Ganancia Material', key: 'gananciaMaterial', width: 18 },
      { header: 'Ganancia Total', key: 'gananciaTotal', width: 15 },
      { header: 'Repartida', key: 'repartida', width: 15 },
      { header: 'Pago Tecnico', key: 'pagoTecnico', width: 15 },
      { header: 'Futurgas 30%', key: 'futurgas', width: 15 },
      { header: 'Pago 15 Dias', key: 'pago15Dias', width: 15 },
      { header: 'Observaciones', key: 'observacionesFinancieras', width: 40 }
    ];

    // Agregar datos
    liquidacionesFiltradas.forEach(liquidacion => {
      const row = {
        numero: liquidacion.tarea?.numero || '',
        cliente: liquidacion.tarea?.cliente || '',
        fechaEjecucion: liquidacion.tarea?.fechaEjecucion || '',
        manoObra: liquidacion.manoObra || 0,
        materiales: liquidacion.materiales || 0,
        cobertura: liquidacion.cobertura || 0,
        excedente: liquidacion.excedente || 0,
        materialReal: liquidacion.materialReal || 0,
        totalPresupuesto: liquidacion.totalPresupuesto || 0,
        difExcedente: liquidacion.difExcedente || 0,
        gananciaMaterial: liquidacion.gananciaMaterial || 0,
        gananciaTotal: liquidacion.gananciaTotal || 0,
        repartida: liquidacion.repartida || 0,
        pagoTecnico: liquidacion.pagoTecnico || 0,
        futurgas: liquidacion.futurgas || 0,
        pago15Dias: liquidacion.pago15Dias || 0,
        observacionesFinancieras: liquidacion.observacionesFinancieras || ''
      };
      sheet.addRow(row);
    });

    // Estilo para la primera fila (encabezados) - Naranja con letras blancas
    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFFF6600' } // Naranja
    };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };

    // Configurar el response
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=liquidaciones_admin_${new Date().toISOString().split('T')[0]}.xlsx`);
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    res.status(500).json({ message: 'Error al exportar liquidaciones', error: err.message });
  }
};
// Exportar cálculo mensual (Admin) a Excel
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

    // Filtrar liquidaciones donde la tarea existe
    const liquidacionesFiltradas = liquidaciones.filter(l => l.tarea !== null);

    // Filtrar por técnico si se especifica
    const filtradasPorTecnico = tecnico 
      ? liquidacionesFiltradas.filter(l => l.tarea?.tecnicos?.[0]?.nombre === tecnico)
      : liquidacionesFiltradas;

    // Filtrar por mes si se especifica
    const filtradasPorMes = mes
      ? filtradasPorTecnico.filter(l => l.tarea?.fechaEjecucion && l.tarea.fechaEjecucion.startsWith(mes))
      : filtradasPorTecnico;

    if (filtradasPorMes.length === 0) {
      return res.status(404).json({ message: 'No se encontraron liquidaciones para el cálculo mensual' });
    }

    // Calcular totales
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

    // Crear el archivo Excel
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Futurgas';
    workbook.lastModifiedBy = 'Sistema';
    workbook.created = new Date();
    workbook.modified = new Date();

    const sheet = workbook.addWorksheet('Cálculo Mensual');

    // Configurar columnas
    sheet.columns = [
      { header: 'Campo', key: 'campo', width: 25 },
      { header: 'Total', key: 'total', width: 20 }
    ];

    // Agregar datos
    const rows = [
      { campo: 'Mano de Obra', total: totals.manoObra },
      { campo: 'Materiales', total: totals.materiales },
      { campo: 'Cobertura', total: totals.cobertura },
      { campo: 'Excedente', total: totals.excedente },
      { campo: 'Material Real', total: totals.materialReal },
      { campo: 'Total Presupuesto', total: totals.totalPresupuesto },
      { campo: 'Ganancia Material', total: totals.gananciaMaterial },
      { campo: 'Ganancia Total', total: totals.gananciaTotal },
      { campo: 'Repartida', total: totals.repartida },
      { campo: 'Pago Técnico', total: totals.pagoTecnico },
      { campo: 'Futurgas', total: totals.futurgas },
      { campo: 'Pago 15 Días', total: totals.pago15Dias },
    ];

    rows.forEach(row => {
      sheet.addRow(row);
    });

    // Estilo para la primera fila (encabezados) - Naranja con letras blancas
    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFFF6600' } // Naranja
    };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };

    // Configurar el response
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=calculo-mensual-${mes || 'todos'}-${tecnico || 'todos'}.xlsx`);
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    res.status(500).json({ message: 'Error al exportar cálculo mensual', error: err.message });
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

const PDFDocument = require('pdfkit');
const {
  COLORS,
  LEGAL_FOOTER,
  formatCurrency,
  formatDate,
  drawDocumentHeader,
  drawSectionLabel,
  drawDivider,
  drawDocumentFooter,
} = require('./documentPdfStyle');

function ensurePageSpace(doc, needed = 80) {
  if (doc.y + needed > doc.page.height - 90) {
    doc.addPage();
    drawDocumentHeader(doc, {
      title: 'Liquidaciones',
      subtitle: 'Continuación',
    });
  }
}

function drawTableHeader(doc, columns, left, widths) {
  const y = doc.y;
  let x = left;
  doc.font('Helvetica').fontSize(8).fillColor(COLORS.muted);
  columns.forEach((col, i) => {
    doc.text(col, x, y, { width: widths[i], align: i === 0 ? 'left' : 'right' });
    x += widths[i];
  });
  doc.y = y + 14;
  drawDivider(doc);
  doc.moveDown(0.4);
}

/**
 * PDF listado de liquidaciones (admin o técnico) — estilo Seprogar.
 */
function generateLiquidacionesListPdf(liquidaciones, outputStream, options = {}) {
  const {
    title = 'Liquidaciones',
    subtitle = `Generado el ${formatDate(new Date())}`,
    mode = 'admin', // 'admin' | 'tecnico'
  } = options;

  const doc = new PDFDocument({ size: 'A4', margin: 50, layout: 'landscape' });
  doc.pipe(outputStream);

  drawDocumentHeader(doc, { title, subtitle });

  const left = 50;
  const usableWidth = doc.page.width - 100;

  if (mode === 'tecnico') {
    const columns = ['NÚMERO', 'CLIENTE', 'FECHA', 'PAGO TÉCNICO', 'PAGO 15 DÍAS'];
    const widths = [90, usableWidth - 90 - 110 - 110 - 110, 110, 110, 110];
    drawTableHeader(doc, columns, left, widths);

    liquidaciones.forEach((l) => {
      ensurePageSpace(doc, 28);
      const y = doc.y;
      const values = [
        l.tarea?.numero || '—',
        l.tarea?.cliente || '—',
        formatDate(l.tarea?.fechaEjecucion),
        formatCurrency(l.pagoTecnico),
        formatCurrency(l.pago15Dias),
      ];
      let x = left;
      doc.font('Helvetica').fontSize(9).fillColor(COLORS.text);
      values.forEach((val, i) => {
        doc.text(String(val), x, y, {
          width: widths[i],
          align: i < 3 ? 'left' : 'right',
          ellipsis: true,
        });
        x += widths[i];
      });
      doc.y = y + 18;
    });
  } else {
    const columns = [
      'NÚMERO',
      'CLIENTE',
      'FECHA',
      'M.OBRA',
      'MAT.',
      'PAGO TEC.',
      'FUTURGAS',
      'PAGO 15D',
    ];
    const widths = [70, 130, 90, 75, 75, 85, 85, 85];
    drawTableHeader(doc, columns, left, widths);

    liquidaciones.forEach((l) => {
      ensurePageSpace(doc, 28);
      const y = doc.y;
      const values = [
        l.tarea?.numero || '—',
        l.tarea?.cliente || '—',
        formatDate(l.tarea?.fechaEjecucion),
        formatCurrency(l.manoObra),
        formatCurrency(l.materiales),
        formatCurrency(l.pagoTecnico),
        formatCurrency(l.futurgas),
        formatCurrency(l.pago15Dias),
      ];
      let x = left;
      doc.font('Helvetica').fontSize(8).fillColor(COLORS.text);
      values.forEach((val, i) => {
        doc.text(String(val), x, y, {
          width: widths[i],
          align: i < 3 ? 'left' : 'right',
          ellipsis: true,
        });
        x += widths[i];
      });
      doc.y = y + 16;
    });
  }

  // Totales
  const totals = liquidaciones.reduce(
    (acc, l) => ({
      pagoTecnico: acc.pagoTecnico + (l.pagoTecnico || 0),
      pago15Dias: acc.pago15Dias + (l.pago15Dias || 0),
      futurgas: acc.futurgas + (l.futurgas || 0),
    }),
    { pagoTecnico: 0, pago15Dias: 0, futurgas: 0 }
  );

  ensurePageSpace(doc, 90);
  doc.moveDown(1);
  drawDivider(doc);
  doc.moveDown(0.8);
  drawSectionLabel(doc, 'Totales');
  doc.moveDown(0.35);
  doc.font('Helvetica-Bold').fontSize(12).fillColor(COLORS.text);
  doc.text(`Pago técnico: ${formatCurrency(totals.pagoTecnico)}`);
  doc.text(`Pago 15 días: ${formatCurrency(totals.pago15Dias)}`);
  if (mode === 'admin') {
    doc.text(`Futurgas: ${formatCurrency(totals.futurgas)}`);
  }

  drawDocumentFooter(doc, LEGAL_FOOTER);
  doc.end();
}

/**
 * PDF de cálculo mensual — estilo Seprogar.
 */
function generateCalculoMensualPdf(totals, outputStream, options = {}) {
  const {
    title = 'Cálculo mensual',
    subtitle = `Generado el ${formatDate(new Date())}`,
    tecnico,
    mes,
  } = options;

  const doc = new PDFDocument({ size: 'A4', margin: 50 });
  doc.pipe(outputStream);

  const detailParts = [];
  if (tecnico) detailParts.push(`Técnico: ${tecnico}`);
  if (mes) detailParts.push(`Período: ${mes}`);
  const fullSubtitle = [subtitle, ...detailParts].filter(Boolean).join('  ·  ');

  drawDocumentHeader(doc, { title, subtitle: fullSubtitle });

  const rows = [
    ['Mano de obra', totals.manoObra],
    ['Materiales', totals.materiales],
    ['Cobertura', totals.cobertura],
    ['Excedente', totals.excedente],
    ['Material real', totals.materialReal],
    ['Total presupuesto', totals.totalPresupuesto],
    ['Ganancia material', totals.gananciaMaterial],
    ['Ganancia total', totals.gananciaTotal],
    ['Repartida', totals.repartida],
    ['Pago técnico', totals.pagoTecnico],
    ['Futurgas', totals.futurgas],
    ['Pago 15 días', totals.pago15Dias],
  ];

  const left = 50;
  const contentWidth = doc.page.width - 100;

  rows.forEach(([label, value], index) => {
    const isHighlight = label === 'Pago técnico' || label === 'Pago 15 días';
    const y = doc.y;
    doc
      .font(isHighlight ? 'Helvetica-Bold' : 'Helvetica')
      .fontSize(isHighlight ? 13 : 11)
      .fillColor(isHighlight ? COLORS.text : COLORS.mutedSoft)
      .text(label, left, y, { width: contentWidth * 0.55 });
    doc
      .font('Helvetica-Bold')
      .fontSize(isHighlight ? 15 : 12)
      .fillColor(COLORS.text)
      .text(formatCurrency(value), left + contentWidth * 0.55, y, {
        width: contentWidth * 0.45,
        align: 'right',
      });
    doc.y = y + (isHighlight ? 28 : 22);
    if (index === rows.length - 3 || index === 4) {
      doc.moveDown(0.2);
      drawDivider(doc);
      doc.moveDown(0.5);
    }
  });

  drawDocumentFooter(doc, LEGAL_FOOTER);
  doc.end();
}

module.exports = {
  generateLiquidacionesListPdf,
  generateCalculoMensualPdf,
};

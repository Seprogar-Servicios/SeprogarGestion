const PDFDocument = require('pdfkit');
const {
  COLORS,
  formatCurrency,
  formatDate,
  drawDocumentHeader,
  drawSectionLabel,
  drawFieldBlock,
  drawDivider,
  drawDocumentFooter,
} = require('./documentPdfStyle');

/**
 * Genera un PDF de comprobante de pago manual y lo escribe en el stream/response.
 * @param {object} pago - Documento poblado (tecnico, motivo, tareas)
 * @param {import('stream').Writable} outputStream
 */
function generatePagoManualPdf(pago, outputStream) {
  const doc = new PDFDocument({ size: 'A4', margin: 50 });
  doc.pipe(outputStream);

  const contentWidth = doc.page.width - 100;

  const tecnicoNombre = pago.tecnico?.nombre || 'Sin técnico';
  const motivoNombre = pago.motivo?.nombre || 'Sin motivo';
  const idCorto = pago._id ? String(pago._id).slice(-8).toUpperCase() : 'N/A';

  drawDocumentHeader(doc, {
    title: 'Comprobante de pago',
    subtitle: `N° ${idCorto}`,
  });

  drawFieldBlock(doc, 'Fecha de emisión', formatDate(pago.fechaEmision));
  drawFieldBlock(doc, 'Técnico', tecnicoNombre);
  drawFieldBlock(doc, 'Motivo', motivoNombre);
  drawFieldBlock(doc, 'Monto', formatCurrency(pago.monto), { large: true });

  drawDivider(doc);
  doc.moveDown(1.2);

  drawSectionLabel(doc, 'Tareas asociadas');
  doc.moveDown(0.45);

  const tareas = Array.isArray(pago.tareas) ? pago.tareas : [];
  if (tareas.length === 0) {
    doc.font('Helvetica-Bold').fontSize(13).fillColor(COLORS.text).text('Sin tareas asociadas');
  } else {
    tareas.forEach((tarea) => {
      const numero = tarea.numero || '—';
      const titulo = tarea.titulo || 'Sin título';
      doc
        .font('Helvetica-Bold')
        .fontSize(13)
        .fillColor(COLORS.text)
        .text(`${numero}`, { continued: true });
      doc.font('Helvetica').fillColor(COLORS.valueSoft).text(`  —  ${titulo}`);
    });
  }

  if (pago.observaciones) {
    doc.moveDown(1.4);
    drawSectionLabel(doc, 'Observaciones');
    doc.moveDown(0.4);
    doc
      .font('Helvetica')
      .fontSize(13)
      .fillColor(COLORS.text)
      .text(pago.observaciones, { width: contentWidth });
  }

  drawDocumentFooter(
    doc,
    'El presente documento constituye constancia de notificación de un pago efectuado. Su emisión tiene fines informativos y de registro, sin perjuicio de la documentación respaldatoria que corresponda.'
  );

  doc.end();
}

module.exports = { generatePagoManualPdf };

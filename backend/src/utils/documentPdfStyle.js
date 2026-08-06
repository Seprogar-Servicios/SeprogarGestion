const fs = require('fs');
const path = require('path');

let SVGtoPDF = null;
try {
  SVGtoPDF = require('svg-to-pdfkit');
} catch (_) {
  SVGtoPDF = null;
}

const LOGO_PATH = path.join(__dirname, '../../assets/seprogar-logo.svg');

const COLORS = {
  brand: '#1e40af',
  text: '#0f172a',
  muted: '#64748b',
  mutedSoft: '#475569',
  line: '#cbd5e1',
  footer: '#94a3b8',
  valueSoft: '#334155',
};

const LEGAL_FOOTER =
  'El presente documento constituye constancia informativa de liquidación/pago. Su emisión tiene fines de registro, sin perjuicio de la documentación respaldatoria que corresponda.';

function formatCurrency(amount) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
  }).format(amount || 0);
}

function formatDate(date) {
  if (!date) return '—';
  if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
    const [y, m, d] = date.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString('es-AR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return String(date);
  return d.toLocaleDateString('es-AR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function drawLogo(doc, x, y, width, height) {
  if (fs.existsSync(LOGO_PATH) && SVGtoPDF) {
    try {
      const svg = fs.readFileSync(LOGO_PATH, 'utf8');
      SVGtoPDF(doc, svg, x, y, { width, height, preserveAspectRatio: 'xMidYMid meet' });
      return true;
    } catch (err) {
      console.warn('No se pudo renderizar el logo SVG:', err.message);
    }
  }
  return false;
}

function drawCornerLogo(doc) {
  const pageWidth = doc.page.width;
  const cornerLogoSize = 36;
  const cornerX = pageWidth - 50 - cornerLogoSize;
  const cornerY = 28;
  if (!drawLogo(doc, cornerX, cornerY, cornerLogoSize, cornerLogoSize)) {
    doc
      .font('Helvetica-Bold')
      .fontSize(11)
      .fillColor(COLORS.brand)
      .text('Seprogar', cornerX - 10, cornerY + 10, {
        width: cornerLogoSize + 20,
        align: 'right',
      });
  }
}

/**
 * Encabezado tipográfico Seprogar (mismo criterio que comprobante de pago).
 */
function drawDocumentHeader(doc, { title, subtitle }) {
  const left = 50;
  const pageWidth = doc.page.width;
  const contentWidth = pageWidth - 100;

  drawCornerLogo(doc);

  doc
    .font('Helvetica')
    .fontSize(11)
    .fillColor(COLORS.muted)
    .text('SEPROGAR', left, 36, { characterSpacing: 2 });

  doc
    .font('Helvetica-Bold')
    .fontSize(26)
    .fillColor(COLORS.text)
    .text(title, left, 58, { width: contentWidth - 50 });

  if (subtitle) {
    doc
      .font('Helvetica')
      .fontSize(11)
      .fillColor(COLORS.mutedSoft)
      .text(subtitle, left, 92);
  }

  doc
    .moveTo(left, 118)
    .lineTo(pageWidth - 50, 118)
    .lineWidth(1.5)
    .strokeColor(COLORS.text)
    .stroke();

  doc.y = 140;
}

function drawSectionLabel(doc, label) {
  doc
    .font('Helvetica')
    .fontSize(10)
    .fillColor(COLORS.muted)
    .text(String(label).toUpperCase(), { characterSpacing: 0.6 });
}

function drawFieldBlock(doc, label, value, { large = false } = {}) {
  const left = 50;
  const contentWidth = doc.page.width - 100;
  const y = doc.y;
  drawSectionLabel(doc, label);
  doc
    .font('Helvetica-Bold')
    .fontSize(large ? 28 : 15)
    .fillColor(COLORS.text)
    .text(String(value), left, y + 16, { width: contentWidth });
  doc.y = y + (large ? 70 : 52);
}

function drawDivider(doc) {
  const left = 50;
  doc
    .moveTo(left, doc.y)
    .lineTo(doc.page.width - 50, doc.y)
    .lineWidth(0.8)
    .strokeColor(COLORS.line)
    .stroke();
}

function drawDocumentFooter(doc, text = LEGAL_FOOTER) {
  const left = 50;
  const contentWidth = doc.page.width - 100;
  const pageHeight = doc.page.height;

  // Pie fijo cerca del final de página
  const footerY = Math.max(doc.y + 24, pageHeight - 70);

  doc
    .moveTo(left, footerY)
    .lineTo(doc.page.width - 50, footerY)
    .lineWidth(0.8)
    .strokeColor(COLORS.line)
    .stroke();

  doc
    .font('Helvetica')
    .fontSize(9)
    .fillColor(COLORS.footer)
    .text(text, left, footerY + 10, { align: 'center', width: contentWidth });
}

module.exports = {
  COLORS,
  LEGAL_FOOTER,
  LOGO_PATH,
  formatCurrency,
  formatDate,
  drawLogo,
  drawCornerLogo,
  drawDocumentHeader,
  drawSectionLabel,
  drawFieldBlock,
  drawDivider,
  drawDocumentFooter,
};

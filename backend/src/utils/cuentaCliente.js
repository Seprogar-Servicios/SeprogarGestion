/** Cuentas comerciales usadas en el informe ejecutivo / analytics */
const CUENTAS_CLIENTE = ['IKE', 'VAITTY', 'MDO', 'Particular', 'Consorcio', 'Otro'];

/**
 * Infieren cuenta desde texto libre sin exigir campo nuevo en datos viejos.
 * @param {string} [cliente]
 * @param {string} [cuentaExplicit]
 */
function resolveCuentaCliente(cliente = '', cuentaExplicit = '') {
  const explicit = String(cuentaExplicit || '').trim();
  if (explicit && CUENTAS_CLIENTE.includes(explicit)) return explicit;

  const raw = String(cliente || '').trim().toUpperCase();
  if (!raw) return 'Sin clasificar';

  if (/\bIKE\b/.test(raw) || raw.includes('IKE')) return 'IKE';
  if (raw.includes('VAITTY') || raw.includes('VAITY')) return 'VAITTY';
  if (/\bMDO\b/.test(raw)) return 'MDO';
  if (raw.includes('CONSORCIO')) return 'Consorcio';
  if (
    raw.includes('PARTICULAR') ||
    raw.includes('PRIVADO') ||
    raw === 'PART.' ||
    raw.startsWith('PART ')
  ) {
    return 'Particular';
  }
  return 'Otro';
}

module.exports = { CUENTAS_CLIENTE, resolveCuentaCliente };

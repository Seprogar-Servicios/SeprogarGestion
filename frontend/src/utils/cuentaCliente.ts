import type { CuentaCliente } from '../types';

export const CUENTAS_CLIENTE: CuentaCliente[] = [
  'IKE',
  'VAITTY',
  'MDO',
  'Particular',
  'Consorcio',
  'Otro',
];

export const RECLAMO_MOTIVO_LABELS: Record<string, string> = {
  mala_atencion: 'Mala atención',
  trabajo_incompleto: 'Trabajo incompleto',
  problema_tecnico: 'Problema técnico',
  demora: 'Demora',
  otro: 'Otro',
};

export const RECLAMO_ESTADO_LABELS: Record<string, string> = {
  abierto: 'Abierto',
  resuelto: 'Resuelto',
  reabierto: 'Reabierto',
};

/** Infieren cuenta desde texto libre; no exige campo nuevo en datos históricos. */
export function resolveCuentaCliente(
  cliente?: string | null,
  cuentaExplicit?: string | null
): string {
  const explicit = String(cuentaExplicit || '').trim();
  if (explicit && (CUENTAS_CLIENTE as string[]).includes(explicit)) return explicit;

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

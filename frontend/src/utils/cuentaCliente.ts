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

/**
 * Solo usa el valor del selector `cuentaCliente`.
 * No infiere desde el nombre del cliente.
 * El primer argumento se mantiene por compatibilidad de llamadas.
 */
export function resolveCuentaCliente(
  _cliente?: string | null,
  cuentaExplicit?: string | null
): string {
  const explicit = String(cuentaExplicit || '').trim();
  if (explicit && (CUENTAS_CLIENTE as string[]).includes(explicit)) return explicit;
  return 'Sin clasificar';
}

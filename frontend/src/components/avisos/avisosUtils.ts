export type AvisoUnidad = 'horas' | 'dias';

export type Aviso = {
  _id: string;
  titulo: string;
  mensaje: string;
  duracionValor: number;
  duracionUnidad: AvisoUnidad;
  venceAt: string;
  createdAt: string;
  creadoPor?: { _id: string; nombre: string } | null;
};

const MS_POR_UNIDAD: Record<AvisoUnidad, number> = {
  horas: 60 * 60 * 1000,
  dias: 24 * 60 * 60 * 1000,
};

export const duracionMs = (valor: number, unidad: AvisoUnidad) =>
  valor * MS_POR_UNIDAD[unidad];

export const estaVigente = (aviso: Pick<Aviso, 'venceAt'>, now = Date.now()) =>
  new Date(aviso.venceAt).getTime() > now;

/** "Vence en 3 días", "Vence en 5 h", "Vencido" */
export const formatVencimiento = (venceAt: string, now = Date.now()): string => {
  const diff = new Date(venceAt).getTime() - now;
  if (diff <= 0) return 'Vencido';
  const horas = Math.floor(diff / MS_POR_UNIDAD.horas);
  if (horas < 1) return 'Vence en menos de 1 h';
  if (horas < 24) return `Vence en ${horas} h`;
  const dias = Math.floor(diff / MS_POR_UNIDAD.dias);
  return `Vence en ${dias} ${dias === 1 ? 'día' : 'días'}`;
};

export const formatFechaHora = (iso: string) =>
  new Date(iso).toLocaleString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

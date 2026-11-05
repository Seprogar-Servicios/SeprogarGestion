export interface FranjaParsed {
  startTime: string; // HH:mm
  endTime: string;   // HH:mm
}

/**
 * Parsea franjas tipo "09:00 - 18:00", "9:00–18:00", "09:00-18:00".
 */
export const parseFranjaHoraria = (franja?: string | null): FranjaParsed | null => {
  if (!franja || typeof franja !== 'string') return null;

  const cleaned = franja.trim();
  if (!cleaned) return null;

  const match = cleaned.match(
    /(\d{1,2}):(\d{2})\s*[-–—]\s*(\d{1,2}):(\d{2})/
  );
  if (!match) return null;

  const startH = Number(match[1]);
  const startM = Number(match[2]);
  const endH = Number(match[3]);
  const endM = Number(match[4]);

  if (
    startH > 23 || endH > 23 ||
    startM > 59 || endM > 59
  ) {
    return null;
  }

  const pad = (n: number) => String(n).padStart(2, '0');
  const startTime = `${pad(startH)}:${pad(startM)}`;
  let endTime = `${pad(endH)}:${pad(endM)}`;

  // Si fin <= inicio, asumir al menos 1 hora
  if (endTime <= startTime) {
    const endDate = new Date(2000, 0, 1, startH, startM);
    endDate.setHours(endDate.getHours() + 1);
    endTime = `${pad(endDate.getHours())}:${pad(endDate.getMinutes())}`;
  }

  return { startTime, endTime };
};

/**
 * Extrae YYYY-MM-DD de fechaEjecucion en formatos comunes.
 */
export const toFechaEjecucionYmd = (fecha?: string | Date | null): string | null => {
  if (!fecha) return null;

  if (fecha instanceof Date) {
    if (isNaN(fecha.getTime())) return null;
    const y = fecha.getFullYear();
    const m = String(fecha.getMonth() + 1).padStart(2, '0');
    const d = String(fecha.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  const s = String(fecha).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
    return s.slice(0, 10);
  }

  if (/^\d{1,2}\/\d{1,2}\/\d{2,4}/.test(s)) {
    const [dd, mm, yy] = s.split('/');
    const year = yy.length === 2 ? `20${yy}` : yy;
    return `${year}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`;
  }

  const parsed = new Date(s);
  if (!isNaN(parsed.getTime())) {
    return toFechaEjecucionYmd(parsed);
  }

  return null;
};

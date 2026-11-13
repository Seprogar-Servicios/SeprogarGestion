export interface FranjaParsed {
  startTime: string; // HH:mm
  endTime: string;   // HH:mm
  /** true cuando fin <= inicio (ej. 21:00 → 00:00 / 12:00 del día siguiente) */
  crossesMidnight: boolean;
}

/**
 * Parsea franjas tipo "09:00 - 18:00", "9:00–18:00", "09:00-18:00", "21:00 - 00:00".
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
  const endTime = `${pad(endH)}:${pad(endM)}`;

  // Fin igual o anterior al inicio ⇒ cruza medianoche (no forzar +1h)
  const crossesMidnight = endTime <= startTime;

  return { startTime, endTime, crossesMidnight };
};

/** Suma un día calendario a un YYYY-MM-DD local. */
export const addDaysYmd = (ymd: string, days: number): string => {
  const [y, m, d] = ymd.split('-').map(Number);
  const dt = new Date(y, m - 1, d + days);
  const yy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, '0');
  const dd = String(dt.getDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
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

/** Minutos desde 00:00 del inicio de franja; sin franja válida → alto (van al final). */
export const franjaStartMinutes = (franja?: string | null): number => {
  const parsed = parseFranjaHoraria(franja);
  if (!parsed) return 24 * 60 + 1;
  const [h, m] = parsed.startTime.split(':').map(Number);
  return h * 60 + m;
};

/** Orden: fecha ejecución, luego hora inicio de franja. */
export const compareTasksBySchedule = (
  a: { fechaEjecucion?: string | null; franja_horaria?: string | null },
  b: { fechaEjecucion?: string | null; franja_horaria?: string | null }
): number => {
  const da = toFechaEjecucionYmd(a.fechaEjecucion) || '';
  const db = toFechaEjecucionYmd(b.fechaEjecucion) || '';
  if (da !== db) return da.localeCompare(db);
  return franjaStartMinutes(a.franja_horaria) - franjaStartMinutes(b.franja_horaria);
};

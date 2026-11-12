import { format, subDays, subMonths, startOfMonth, endOfMonth, differenceInCalendarDays, addDays } from 'date-fns';

export type DateRangeYmd = { start: string; end: string };

const ymd = (d: Date) => format(d, 'yyyy-MM-dd');

export const DATE_PRESETS: { id: string; label: string; range: () => DateRangeYmd }[] = [
  {
    id: 'este-mes',
    label: 'Este mes',
    range: () => ({ start: ymd(startOfMonth(new Date())), end: ymd(new Date()) }),
  },
  {
    id: 'mes-anterior',
    label: 'Mes anterior',
    range: () => {
      const prev = subMonths(new Date(), 1);
      return { start: ymd(startOfMonth(prev)), end: ymd(endOfMonth(prev)) };
    },
  },
  {
    id: '90d',
    label: '90 días',
    range: () => ({ start: ymd(subDays(new Date(), 89)), end: ymd(new Date()) }),
  },
  {
    id: '12m',
    label: '12 meses',
    range: () => ({ start: ymd(subMonths(new Date(), 12)), end: ymd(new Date()) }),
  },
];

/** Período anterior de la misma duración (calendario). */
export const previousPeriod = (range: DateRangeYmd): DateRangeYmd => {
  const start = parseLocalDayStart(range.start);
  const end = parseLocalDayStart(range.end);
  const days = Math.max(0, differenceInCalendarDays(end, start));
  const prevEnd = addDays(start, -1);
  const prevStart = addDays(prevEnd, -days);
  return { start: ymd(prevStart), end: ymd(prevEnd) };
};

export const parseLocalDayStart = (value: string): Date => {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(value || '').trim());
  if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 0, 0, 0, 0);
  const d = new Date(value);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
};

export const parseLocalDayEnd = (value: string): Date => {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(value || '').trim());
  if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 23, 59, 59, 999);
  const d = new Date(value);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
};

export const deltaPct = (current: number, previous: number): number | null => {
  if (previous === 0) return current === 0 ? 0 : null;
  return Math.round(((current - previous) / Math.abs(previous)) * 100);
};

export const formatDelta = (current: number, previous: number): string => {
  const d = deltaPct(current, previous);
  if (d == null) return current > 0 ? '+∞' : '—';
  const sign = d > 0 ? '+' : '';
  return `${sign}${d}%`;
};

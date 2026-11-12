import type {
  Task,
  User,
  TareaLiquidacion,
  PagoManual,
  Recibo,
  TareaConsorcio,
  Reclamo,
} from '../types';
import { resolveCuentaCliente, RECLAMO_MOTIVO_LABELS } from './cuentaCliente';
import { parseLocalDayEnd, parseLocalDayStart } from './analyticsPeriod';

export const formatMoney = (value: number) =>
  new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(value || 0);

export const formatPct = (part: number, total: number) =>
  total > 0 ? Math.round((part / total) * 100) : 0;

/** Porcentaje con 1 decimal (tasas pequeñas). */
export const formatPct1 = (part: number, total: number) =>
  total > 0 ? Math.round((part / total) * 1000) / 10 : 0;

const toLocalDate = (raw: string | Date | null | undefined): Date | null => {
  if (raw == null || raw === '') return null;
  if (raw instanceof Date) {
    return isNaN(raw.getTime())
      ? null
      : new Date(raw.getFullYear(), raw.getMonth(), raw.getDate(), raw.getHours(), raw.getMinutes(), raw.getSeconds(), raw.getMilliseconds());
  }
  const s = String(raw).trim();
  const ymd = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (ymd) return new Date(Number(ymd[1]), Number(ymd[2]) - 1, Number(ymd[3]), 12, 0, 0, 0);
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
};

const taskDate = (task: Task): Date | null =>
  toLocalDate(task.fechaEjecucion) || toLocalDate(task.fechaCreacion);

/** Fecha de análisis operativo: preferir cierre real si existe. */
export const taskAnalyticsDate = (task: Task, preferCompletado = false): Date | null => {
  if (preferCompletado && task.fechaCompletado) {
    return toLocalDate(task.fechaCompletado);
  }
  return taskDate(task);
};

export const inDateRange = (date: Date | null, start?: string, end?: string) => {
  if (!start && !end) return true;
  if (!date) return false;
  if (start) {
    const s = parseLocalDayStart(start);
    if (date < s) return false;
  }
  if (end) {
    const e = parseLocalDayEnd(end);
    if (date > e) return false;
  }
  return true;
};

export const filterTasksForAnalytics = (
  tasks: Task[],
  opts: {
    start?: string;
    end?: string;
    statuses?: string[];
    tecnicoIds?: string[];
    cuentas?: string[];
    preferCompletado?: boolean;
  }
) => {
  return tasks.filter((task) => {
    if (opts.statuses && opts.statuses.length > 0 && !opts.statuses.includes(task.estado)) {
      return false;
    }
    if (opts.tecnicoIds && opts.tecnicoIds.length > 0) {
      const tecnicos = Array.isArray(task.tecnicos) ? task.tecnicos : [];
      if (tecnicos.length === 0) return false;
      const ok = tecnicos.some((t) => {
        const id = typeof t === 'object' && t ? t._id : t;
        return id && opts.tecnicoIds!.includes(String(id));
      });
      if (!ok) return false;
    }
    if (opts.cuentas && opts.cuentas.length > 0) {
      const cuenta = resolveCuentaCliente(task.cliente, task.cuentaCliente);
      if (!opts.cuentas.includes(cuenta)) return false;
    }
    return inDateRange(taskAnalyticsDate(task, opts.preferCompletado), opts.start, opts.end);
  });
};

export interface OperationalSummary {
  total: number;
  completadas: number;
  enProgreso: number;
  pendientes: number;
  canceladas: number;
  sinTecnico: number;
  sinFecha: number;
  sinFechaCompletado: number;
  completionRate: number;
  cancelRate: number;
  avgCompletionHours: number;
  medianCompletionHours: number;
  p90CompletionHours: number;
  byOrigen: { label: string; count: number }[];
  topClientes: { label: string; count: number }[];
  byEspecialidad: { label: string; count: number }[];
  byFranja: { label: string; count: number }[];
  byCuenta: { label: string; count: number }[];
}

const especialidadLabel = (value: unknown): string => {
  if (value == null || value === '') return 'Sin especialidad';
  if (typeof value === 'object' && value !== null && 'nombre' in (value as object)) {
    return String((value as { nombre?: string }).nombre || 'Sin especialidad');
  }
  return String(value);
};

export const especialidadOf = (tecnico: User | string | undefined, users: User[]) => {
  if (!tecnico) return 'Sin especialidad';
  if (typeof tecnico === 'string') {
    const u = users.find((x) => x._id === tecnico);
    return especialidadLabel(u?.especialidad);
  }
  if (tecnico.especialidad) return especialidadLabel(tecnico.especialidad);
  const u = users.find((x) => x._id === tecnico._id);
  return especialidadLabel(u?.especialidad);
};

const percentile = (sorted: number[], p: number) => {
  if (sorted.length === 0) return 0;
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1));
  return sorted[idx];
};

export const buildOperationalSummary = (
  tasks: Task[],
  users: User[]
): OperationalSummary => {
  const total = tasks.length;
  const completadas = tasks.filter((t) => t.estado === 'completada').length;
  const enProgreso = tasks.filter((t) => t.estado === 'en progreso').length;
  const pendientes = tasks.filter((t) => t.estado === 'pendiente').length;
  const canceladas = tasks.filter((t) => t.estado === 'cancelada').length;
  const sinTecnico = tasks.filter((t) => !t.tecnicos || t.tecnicos.length === 0).length;
  const sinFecha = tasks.filter((t) => !t.fechaEjecucion).length;
  const sinFechaCompletado = tasks.filter(
    (t) => t.estado === 'completada' && !t.fechaCompletado
  ).length;

  const hours = tasks
    .filter((t) => t.estado === 'completada' && t.fechaCreacion)
    .map((t) => {
      const a = toLocalDate(t.fechaCreacion)?.getTime();
      const endRaw = t.fechaCompletado || t.fechaModificacion;
      const b = toLocalDate(endRaw)?.getTime();
      if (a == null || b == null) return null;
      return Math.max(0, (b - a) / (1000 * 60 * 60));
    })
    .filter((h): h is number => h != null)
    .sort((a, b) => a - b);

  const avgCompletionHours =
    hours.length > 0 ? Math.round(hours.reduce((s, h) => s + h, 0) / hours.length) : 0;
  const medianCompletionHours = hours.length > 0 ? Math.round(percentile(hours, 50)) : 0;
  const p90CompletionHours = hours.length > 0 ? Math.round(percentile(hours, 90)) : 0;

  const origenMap = new Map<string, number>();
  const clienteMap = new Map<string, number>();
  const especialidadMap = new Map<string, number>();
  const franjaMap = new Map<string, number>();
  const cuentaMap = new Map<string, number>();

  tasks.forEach((task) => {
    const origen =
      task.origen === 'whatsapp' ? 'WhatsApp' : task.origen ? String(task.origen) : 'Sistema';
    origenMap.set(origen, (origenMap.get(origen) || 0) + 1);

    const cliente = (task.cliente || '').trim() || 'Sin cliente';
    clienteMap.set(cliente, (clienteMap.get(cliente) || 0) + 1);

    const franja = (task.franja_horaria || '').trim() || 'Sin franja';
    franjaMap.set(franja, (franjaMap.get(franja) || 0) + 1);

    const cuenta = resolveCuentaCliente(task.cliente, task.cuentaCliente);
    cuentaMap.set(cuenta, (cuentaMap.get(cuenta) || 0) + 1);

    const tecnicos = Array.isArray(task.tecnicos) ? task.tecnicos : [];
    if (tecnicos.length === 0) {
      especialidadMap.set('Sin asignar', (especialidadMap.get('Sin asignar') || 0) + 1);
    } else {
      const seen = new Set<string>();
      tecnicos.forEach((tec) => {
        const label = especialidadOf(tec as User, users);
        if (!seen.has(label)) {
          seen.add(label);
          especialidadMap.set(label, (especialidadMap.get(label) || 0) + 1);
        }
      });
    }
  });

  const toSorted = (map: Map<string, number>, limit = 8) =>
    Array.from(map.entries())
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);

  return {
    total,
    completadas,
    enProgreso,
    pendientes,
    canceladas,
    sinTecnico,
    sinFecha,
    sinFechaCompletado,
    completionRate: formatPct(completadas, total),
    cancelRate: formatPct(canceladas, total),
    avgCompletionHours,
    medianCompletionHours,
    p90CompletionHours,
    byOrigen: toSorted(origenMap, 6),
    topClientes: toSorted(clienteMap, 8),
    byEspecialidad: toSorted(especialidadMap, 8),
    byFranja: toSorted(franjaMap, 6),
    byCuenta: toSorted(cuentaMap, 8),
  };
};

export interface FinancialSummary {
  liquidacionesCount: number;
  liquidacionesActivas: number;
  manoObra: number;
  materiales: number;
  cobertura: number;
  excedente: number;
  materialReal: number;
  totalPresupuesto: number;
  gananciaTotal: number;
  pagoTecnico: number;
  futurgas: number;
  pagosManualesTotal: number;
  pagosManualesCount: number;
  pagosPorMotivo: { label: string; amount: number; count: number }[];
  recibosTotal: number;
  recibosFirmados: number;
  recibosPendientes: number;
  firmaRate: number;
  /** Devengado a técnicos − pagos manuales del período */
  deudaTecnicos: number;
  rentabilidadPorCuenta: { label: string; ingresos: number; ganancia: number; count: number }[];
  rentabilidadPorTecnico: { label: string; pago: number; count: number }[];
}

const liqNum = (liq: TareaLiquidacion, key: keyof TareaLiquidacion) => {
  const v = liq[key];
  return typeof v === 'number' && !isNaN(v) ? v : 0;
};

const liqTaskEstado = (liq: TareaLiquidacion): string | null => {
  const t = liq.tarea;
  if (t && typeof t === 'object' && 'estado' in t) return (t as Task).estado;
  return null;
};

const liqMatchesFilters = (
  liq: TareaLiquidacion,
  opts?: {
    start?: string;
    end?: string;
    statuses?: string[];
    tecnicoIds?: string[];
  }
) => {
  const tarea = liq.tarea && typeof liq.tarea === 'object' ? (liq.tarea as Task) : null;
  const d = tarea?.fechaEjecucion
    ? toLocalDate(tarea.fechaEjecucion)
    : liq.createdAt
      ? toLocalDate(liq.createdAt)
      : null;
  if (!inDateRange(d, opts?.start, opts?.end)) return false;

  if (opts?.statuses && opts.statuses.length > 0) {
    const estado = liqTaskEstado(liq);
    if (estado && !opts.statuses.includes(estado)) return false;
    if (!estado) return false;
  }

  if (opts?.tecnicoIds && opts.tecnicoIds.length > 0) {
    const tecnicos = tarea && Array.isArray(tarea.tecnicos) ? tarea.tecnicos : [];
    if (tecnicos.length === 0) return false;
    const ok = tecnicos.some((t) => {
      const id = typeof t === 'object' && t ? t._id : t;
      return id && opts.tecnicoIds!.includes(String(id));
    });
    if (!ok) return false;
  }
  return true;
};

export const buildFinancialSummary = (
  liquidaciones: TareaLiquidacion[],
  pagos: PagoManual[],
  recibos: Recibo[],
  opts?: {
    start?: string;
    end?: string;
    statuses?: string[];
    tecnicoIds?: string[];
  }
): FinancialSummary => {
  const allInRange = liquidaciones.filter((l) => liqMatchesFilters(l, { start: opts?.start, end: opts?.end, tecnicoIds: opts?.tecnicoIds }));

  // Presupuesto “activo”: excluye canceladas (y opcionalmente pendientes si se filtra)
  const liqs = allInRange.filter((l) => {
    const estado = liqTaskEstado(l);
    if (estado === 'cancelada') return false;
    if (opts?.statuses && opts.statuses.length > 0) {
      return estado ? opts.statuses.includes(estado) : false;
    }
    return true;
  });

  const pagosFiltrados = pagos.filter((p) => {
    const d = p.fechaEmision
      ? toLocalDate(p.fechaEmision)
      : p.createdAt
        ? toLocalDate(p.createdAt)
        : null;
    if (!inDateRange(d, opts?.start, opts?.end)) return false;
    if (opts?.tecnicoIds && opts.tecnicoIds.length > 0) {
      const tid =
        typeof p.tecnico === 'object' && p.tecnico ? p.tecnico._id : (p.tecnico as unknown as string);
      if (!tid || !opts.tecnicoIds.includes(String(tid))) return false;
    }
    return true;
  });

  // Recibos del período por mes/año del rango
  const recibosFiltrados = recibos.filter((r) => {
    if (!opts?.start && !opts?.end) return true;
    const key = `${r.anio}-${String(r.mes).padStart(2, '0')}-01`;
    return inDateRange(toLocalDate(key), opts?.start, opts?.end);
  });

  const sum = (key: keyof TareaLiquidacion) =>
    liqs.reduce((acc, l) => acc + liqNum(l, key), 0);

  const motivoMap = new Map<string, { amount: number; count: number }>();
  pagosFiltrados.forEach((p) => {
    const label = p.motivo?.nombre || 'Sin motivo';
    const cur = motivoMap.get(label) || { amount: 0, count: 0 };
    cur.amount += p.monto || 0;
    cur.count += 1;
    motivoMap.set(label, cur);
  });

  const firmados = recibosFiltrados.filter((r) => r.estadoFirma === 'firmado').length;
  const pendientes = recibosFiltrados.filter((r) => r.estadoFirma !== 'firmado').length;

  const pagoTecnico = sum('pagoTecnico');
  const pagosManualesTotal = pagosFiltrados.reduce((s, p) => s + (p.monto || 0), 0);

  const cuentaMap = new Map<string, { ingresos: number; ganancia: number; count: number }>();
  const tecMap = new Map<string, { pago: number; count: number }>();

  liqs.forEach((l) => {
    const tarea = l.tarea && typeof l.tarea === 'object' ? (l.tarea as Task) : null;
    const cuenta = resolveCuentaCliente(tarea?.cliente, tarea?.cuentaCliente);
    const cur = cuentaMap.get(cuenta) || { ingresos: 0, ganancia: 0, count: 0 };
    cur.ingresos += liqNum(l, 'totalPresupuesto') || liqNum(l, 'manoObra') + liqNum(l, 'materiales');
    cur.ganancia += liqNum(l, 'gananciaTotal') || liqNum(l, 'futurgas');
    cur.count += 1;
    cuentaMap.set(cuenta, cur);

    const tecnicos = tarea && Array.isArray(tarea.tecnicos) ? tarea.tecnicos : [];
    const name =
      tecnicos.length > 0 && typeof tecnicos[0] === 'object'
        ? tecnicos[0].nombre || 'Sin técnico'
        : 'Sin técnico';
    const tcur = tecMap.get(name) || { pago: 0, count: 0 };
    tcur.pago += liqNum(l, 'pagoTecnico');
    tcur.count += 1;
    tecMap.set(name, tcur);
  });

  return {
    liquidacionesCount: allInRange.length,
    liquidacionesActivas: liqs.length,
    manoObra: sum('manoObra'),
    materiales: sum('materiales'),
    cobertura: sum('cobertura'),
    excedente: sum('excedente'),
    materialReal: sum('materialReal'),
    totalPresupuesto: sum('totalPresupuesto'),
    gananciaTotal: sum('gananciaTotal'),
    pagoTecnico,
    futurgas: sum('futurgas'),
    pagosManualesTotal,
    pagosManualesCount: pagosFiltrados.length,
    pagosPorMotivo: Array.from(motivoMap.entries())
      .map(([label, v]) => ({ label, ...v }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 8),
    recibosTotal: recibosFiltrados.length,
    recibosFirmados: firmados,
    recibosPendientes: pendientes,
    firmaRate: formatPct(firmados, recibosFiltrados.length),
    deudaTecnicos: Math.max(0, Math.round(pagoTecnico - pagosManualesTotal)),
    rentabilidadPorCuenta: Array.from(cuentaMap.entries())
      .map(([label, v]) => ({ label, ...v }))
      .sort((a, b) => b.ganancia - a.ganancia)
      .slice(0, 8),
    rentabilidadPorTecnico: Array.from(tecMap.entries())
      .map(([label, v]) => ({ label, ...v }))
      .sort((a, b) => b.pago - a.pago)
      .slice(0, 10),
  };
};

export interface ConsorcioSummary {
  total: number;
  byEstado: { label: string; count: number; color: string }[];
  revenuePaid: number;
  revenuePending: number;
  ticketPromedio: number;
  conversionPago: number;
  byAdmin: { label: string; count: number; revenue: number }[];
  agingCobranza: number;
  agingDiasPromedio: number;
  agingOver30: number;
  withPhotos: number;
  withComprobante: number;
  canceladas: number;
  sinAdmin: number;
  topClientes: { label: string; count: number }[];
  byFranja: { label: string; count: number }[];
  byTecnico: { label: string; count: number }[];
  byMes: { label: string; count: number }[];
  revenueByEstado: { label: string; count: number }[];
  docsBreakdown: { label: string; count: number }[];
  adminVolume: { label: string; count: number }[];
  truncatedHint?: boolean;
}

const CONSORCIO_ESTADOS: { key: string; label: string; color: string }[] = [
  { key: 'presupuesto', label: 'Presupuesto', color: 'bg-slate-500' },
  { key: 'confirmado', label: 'Confirmado', color: 'bg-blue-500' },
  { key: 'pendiente', label: 'Pendiente', color: 'bg-yellow-500' },
  { key: 'en_progreso', label: 'En progreso', color: 'bg-orange-500' },
  { key: 'completada', label: 'Completada', color: 'bg-green-500' },
  { key: 'PENDIENTE_PAGO', label: 'Pendiente pago', color: 'bg-amber-500' },
  { key: 'FACTURADO', label: 'Facturado', color: 'bg-indigo-500' },
  { key: 'PAGADO', label: 'Pagado', color: 'bg-emerald-500' },
];

const consorcioDate = (task: TareaConsorcio): Date | null =>
  toLocalDate(task.fechaEjecucion) || toLocalDate(task.fechaCreacion);

const daysInCobranza = (task: TareaConsorcio): number | null => {
  if (!['PENDIENTE_PAGO', 'FACTURADO'].includes(task.estado)) return null;
  const hist = (task as TareaConsorcio & {
    historialEstados?: Array<{ estado?: string; fecha?: string }>;
  }).historialEstados;
  let since: Date | null = null;
  if (Array.isArray(hist) && hist.length > 0) {
    const entry = [...hist].reverse().find((h) =>
      ['PENDIENTE_PAGO', 'FACTURADO', 'completada'].includes(String(h.estado || ''))
    );
    since = entry?.fecha ? toLocalDate(entry.fecha) : null;
  }
  if (!since) since = consorcioDate(task);
  if (!since) return null;
  return Math.max(0, Math.round((Date.now() - since.getTime()) / (1000 * 60 * 60 * 24)));
};

export const buildConsorcioSummary = (
  tasks: TareaConsorcio[],
  opts?: { truncated?: boolean }
): ConsorcioSummary => {
  const total = tasks.length;
  const paid = tasks.filter((t) => t.estado === 'PAGADO');
  // Pipeline cobranza real (no mezcla presupuestos / canceladas)
  const pendingMoney = tasks.filter((t) =>
    ['PENDIENTE_PAGO', 'FACTURADO'].includes(t.estado)
  );
  const revenuePaid = paid.reduce((s, t) => s + (t.precio || 0), 0);
  const revenuePending = pendingMoney.reduce((s, t) => s + (t.precio || 0), 0);
  const withPrice = tasks.filter(
    (t) => (t.precio || 0) > 0 && t.estado !== 'cancelada' && t.estado !== 'presupuesto'
  );
  const ticketPromedio =
    withPrice.length > 0
      ? withPrice.reduce((s, t) => s + (t.precio || 0), 0) / withPrice.length
      : 0;

  const elegiblesConversion = tasks.filter(
    (t) => !['presupuesto', 'cancelada'].includes(t.estado)
  );

  const adminMap = new Map<string, { count: number; revenue: number }>();
  const clienteMap = new Map<string, number>();
  const franjaMap = new Map<string, number>();
  const tecnicoMap = new Map<string, number>();
  const mesMap = new Map<string, number>();
  const revenueEstadoMap = new Map<string, number>();

  const agingDays: number[] = [];
  tasks.forEach((t) => {
    const days = daysInCobranza(t);
    if (days != null) agingDays.push(days);

    const adminLabel =
      typeof t.administradorConsorcio === 'object' && t.administradorConsorcio
        ? t.administradorConsorcio.nombre || 'Sin admin'
        : 'Sin admin';
    const cur = adminMap.get(adminLabel) || { count: 0, revenue: 0 };
    cur.count += 1;
    if (t.estado === 'PAGADO') cur.revenue += t.precio || 0;
    adminMap.set(adminLabel, cur);

    const cliente = (t.cliente || '').trim() || 'Sin cliente';
    clienteMap.set(cliente, (clienteMap.get(cliente) || 0) + 1);

    const franja = (t.franja_horaria || '').trim() || 'Sin franja';
    franjaMap.set(franja, (franjaMap.get(franja) || 0) + 1);

    const tecnicos = Array.isArray(t.tecnicos) ? t.tecnicos : [];
    if (tecnicos.length === 0) {
      tecnicoMap.set('Sin técnico', (tecnicoMap.get('Sin técnico') || 0) + 1);
    } else {
      tecnicos.forEach((tec) => {
        const name =
          typeof tec === 'object' && tec ? tec.nombre || 'Sin nombre' : 'Sin técnico';
        tecnicoMap.set(name, (tecnicoMap.get(name) || 0) + 1);
      });
    }

    const d = consorcioDate(t);
    if (d) {
      const mesLabel = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      mesMap.set(mesLabel, (mesMap.get(mesLabel) || 0) + 1);
    }

    const estadoMeta = CONSORCIO_ESTADOS.find((e) => e.key === t.estado);
    const estadoLabel = estadoMeta?.label || t.estado;
    revenueEstadoMap.set(
      estadoLabel,
      (revenueEstadoMap.get(estadoLabel) || 0) + (t.precio || 0)
    );
  });

  const toSorted = (map: Map<string, number>, limit = 8) => {
    const all = Array.from(map.entries())
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count);
    if (all.length <= limit) return all;
    const head = all.slice(0, limit - 1);
    const rest = all.slice(limit - 1).reduce((s, x) => s + x.count, 0);
    return [...head, { label: 'Otros', count: rest }];
  };

  const withPhotos = tasks.filter((t) => t.fotos && t.fotos.length > 0).length;
  const withComprobante = tasks.filter((t) => !!t.comprobantePago).length;
  const agingCobranza = pendingMoney.length;
  const agingDiasPromedio =
    agingDays.length > 0
      ? Math.round(agingDays.reduce((s, d) => s + d, 0) / agingDays.length)
      : 0;
  const agingOver30 = agingDays.filter((d) => d >= 30).length;

  const byAdmin = Array.from(adminMap.entries())
    .map(([label, v]) => ({ label, ...v }))
    .sort((a, b) => b.revenue - a.revenue || b.count - a.count)
    .slice(0, 8);

  return {
    total,
    byEstado: CONSORCIO_ESTADOS.map((e) => ({
      label: e.label,
      count: tasks.filter((t) => t.estado === e.key).length,
      color: e.color,
    })).filter((e) => e.count > 0),
    revenuePaid,
    revenuePending,
    ticketPromedio,
    conversionPago: formatPct(paid.length, elegiblesConversion.length || total),
    byAdmin,
    agingCobranza,
    agingDiasPromedio,
    agingOver30,
    withPhotos,
    withComprobante,
    canceladas: tasks.filter((t) => t.estado === 'cancelada').length,
    sinAdmin: tasks.filter(
      (t) => !t.administradorConsorcio || !(t.administradorConsorcio as { _id?: string })._id
    ).length,
    topClientes: toSorted(clienteMap, 8),
    byFranja: toSorted(franjaMap, 6),
    byTecnico: toSorted(tecnicoMap, 8),
    byMes: Array.from(mesMap.entries())
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => a.label.localeCompare(b.label))
      .slice(-12),
    revenueByEstado: Array.from(revenueEstadoMap.entries())
      .map(([label, amount]) => ({ label, count: Math.round(amount) }))
      .filter((x) => x.count > 0)
      .sort((a, b) => b.count - a.count)
      .slice(0, 8),
    docsBreakdown: [
      { label: 'Con fotos', count: withPhotos },
      { label: 'Sin fotos', count: Math.max(0, total - withPhotos) },
      { label: 'Con comprobante', count: withComprobante },
      { label: 'Sin comprobante', count: Math.max(0, total - withComprobante) },
    ].filter((x) => x.count > 0),
    adminVolume: byAdmin.map((a) => ({ label: a.label, count: a.count })),
    truncatedHint: Boolean(opts?.truncated),
  };
};

export interface MonthlyCloseSummary {
  servicios: number;
  completadas: number;
  pendientes: number;
  enProgreso: number;
  canceladas: number;
  cierreRate: number;
  ticketPromedio: number;
  ingresos: number;
  costoManoObra: number;
  costoMateriales: number;
  costoReal: number;
  pagoTecnico: number;
  materialReal: number;
  gananciaTotal: number;
  futurgas: number;
  margenOperativo: number;
  margenPct: number;
  top2ConcentracionPct: number;
  byCuenta: { label: string; count: number; ingresos: number; ganancia: number }[];
  byEspecialidad: { label: string; count: number }[];
  byTecnico: { label: string; count: number }[];
  sinLiquidacion: number;
  gapsRegistro: { label: string; count: number }[];
}

export interface QualitySummary {
  reclamos: number;
  tasaReclamo: number;
  tasaReclamoSobreCompletadas: number;
  resueltos: number;
  tasaResolucion: number;
  reabiertos: number;
  abiertos: number;
  mttrHoras: number;
  byCuenta: { label: string; count: number; tasa: number; servicios: number }[];
  byTecnico: { label: string; count: number; tasa: number; servicios: number }[];
  byMotivo: { label: string; count: number }[];
  alertas: string[];
}

const liqForTask = (liquidaciones: TareaLiquidacion[], taskId: string) =>
  liquidaciones.find((l) => {
    const id = typeof l.tarea === 'object' && l.tarea ? l.tarea._id : l.tarea;
    return String(id) === String(taskId);
  });

const techName = (t: User | string, users: User[]) => {
  if (typeof t === 'object' && t) return t.nombre || 'Sin nombre';
  const u = users.find((x) => x._id === t);
  return u?.nombre || 'Sin técnico';
};

export const buildMonthlyCloseSummary = (
  tasks: Task[],
  users: User[],
  liquidaciones: TareaLiquidacion[]
): MonthlyCloseSummary => {
  const servicios = tasks.length;
  const completadas = tasks.filter((t) => t.estado === 'completada').length;
  const pendientes = tasks.filter((t) => t.estado === 'pendiente').length;
  const enProgreso = tasks.filter((t) => t.estado === 'en progreso').length;
  const canceladas = tasks.filter((t) => t.estado === 'cancelada').length;

  let ingresos = 0;
  let costoManoObra = 0;
  let costoMateriales = 0;
  let pagoTecnico = 0;
  let materialReal = 0;
  let gananciaTotal = 0;
  let futurgas = 0;
  let sinLiquidacion = 0;

  const cuentaMap = new Map<string, { count: number; ingresos: number; ganancia: number }>();
  const espMap = new Map<string, number>();
  const tecMap = new Map<string, number>();

  // Índice O(1) liquidaciones
  const liqIndex = new Map<string, TareaLiquidacion>();
  liquidaciones.forEach((l) => {
    const id = typeof l.tarea === 'object' && l.tarea ? l.tarea._id : l.tarea;
    if (id) liqIndex.set(String(id), l);
  });

  tasks.forEach((task) => {
    const cuenta = resolveCuentaCliente(task.cliente, task.cuentaCliente);
    const liq = liqIndex.get(String(task._id));
    const ingresoTarea = liq
      ? liqNum(liq, 'totalPresupuesto') ||
        liqNum(liq, 'manoObra') +
          liqNum(liq, 'materiales') +
          liqNum(liq, 'cobertura') +
          liqNum(liq, 'excedente')
      : 0;

    if (!liq && task.estado === 'completada') sinLiquidacion += 1;

    ingresos += ingresoTarea;
    if (liq) {
      costoManoObra += liq.manoObra || 0;
      costoMateriales += liq.materiales || 0;
      pagoTecnico += typeof liq.pagoTecnico === 'number' ? liq.pagoTecnico : 0;
      materialReal += typeof liq.materialReal === 'number' ? liq.materialReal : 0;
      gananciaTotal += typeof liq.gananciaTotal === 'number' ? liq.gananciaTotal : 0;
      futurgas += typeof liq.futurgas === 'number' ? liq.futurgas : 0;
    }

    const cur = cuentaMap.get(cuenta) || { count: 0, ingresos: 0, ganancia: 0 };
    cur.count += 1;
    cur.ingresos += ingresoTarea;
    cur.ganancia += liq ? liqNum(liq, 'gananciaTotal') || liqNum(liq, 'futurgas') : 0;
    cuentaMap.set(cuenta, cur);

    const tecnicos = Array.isArray(task.tecnicos) ? task.tecnicos : [];
    if (tecnicos.length === 0) {
      tecMap.set('Sin técnico', (tecMap.get('Sin técnico') || 0) + 1);
      espMap.set('Sin asignar', (espMap.get('Sin asignar') || 0) + 1);
    } else {
      const seenEsp = new Set<string>();
      tecnicos.forEach((tec) => {
        const name = techName(tec as User, users);
        tecMap.set(name, (tecMap.get(name) || 0) + 1);
        const esp = especialidadOf(tec as User, users);
        if (!seenEsp.has(esp)) {
          seenEsp.add(esp);
          espMap.set(esp, (espMap.get(esp) || 0) + 1);
        }
      });
    }
  });

  const byCuenta = Array.from(cuentaMap.entries())
    .map(([label, v]) => ({ label, count: v.count, ingresos: v.ingresos, ganancia: v.ganancia }))
    .sort((a, b) => b.ingresos - a.ingresos);

  const top2 = byCuenta.slice(0, 2).reduce((s, x) => s + x.count, 0);
  // Margen real: ingresos − (pago técnico + material real consumido)
  const costoReal = pagoTecnico + materialReal;
  const margenOperativo =
    gananciaTotal > 0 ? gananciaTotal : Math.max(0, ingresos - costoReal);

  const gapsRegistro = [
    { label: 'Completadas sin liquidación', count: sinLiquidacion },
    { label: 'Sin técnico', count: tasks.filter((t) => !t.tecnicos?.length).length },
    { label: 'Sin fecha de ejecución', count: tasks.filter((t) => !t.fechaEjecucion).length },
    {
      label: 'Completadas sin fechaCompletado',
      count: tasks.filter((t) => t.estado === 'completada' && !t.fechaCompletado).length,
    },
    {
      label: 'Sin cuenta clasificada',
      count: tasks.filter(
        (t) => resolveCuentaCliente(t.cliente, t.cuentaCliente) === 'Sin clasificar'
      ).length,
    },
  ].filter((g) => g.count > 0);

  return {
    servicios,
    completadas,
    pendientes,
    enProgreso,
    canceladas,
    cierreRate: formatPct(completadas, servicios),
    ticketPromedio: completadas > 0 ? Math.round(ingresos / Math.max(1, completadas)) : 0,
    ingresos,
    costoManoObra,
    costoMateriales,
    costoReal,
    pagoTecnico,
    materialReal,
    gananciaTotal,
    futurgas,
    margenOperativo,
    margenPct: formatPct(margenOperativo, ingresos),
    top2ConcentracionPct: formatPct(top2, servicios),
    byCuenta,
    byEspecialidad: Array.from(espMap.entries())
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8),
    byTecnico: Array.from(tecMap.entries())
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 12),
    sinLiquidacion,
    gapsRegistro,
  };
};

export const buildQualitySummary = (
  tasks: Task[],
  users: User[],
  reclamos: Reclamo[]
): QualitySummary => {
  const servicios = tasks.length;
  const completadas = tasks.filter((t) => t.estado === 'completada').length;
  const totalReclamos = reclamos.length;
  const resueltos = reclamos.filter((r) => r.estado === 'resuelto').length;
  const reabiertos = reclamos.filter((r) => r.estado === 'reabierto').length;
  const abiertos = reclamos.filter((r) => r.estado === 'abierto').length;

  const mttrHours = reclamos
    .filter((r) => r.estado === 'resuelto' && r.fechaReclamo && r.fechaResolucion)
    .map((r) => {
      const a = toLocalDate(r.fechaReclamo)?.getTime();
      const b = toLocalDate(r.fechaResolucion)?.getTime();
      if (a == null || b == null) return null;
      return Math.max(0, (b - a) / (1000 * 60 * 60));
    })
    .filter((h): h is number => h != null);
  const mttrHoras =
    mttrHours.length > 0
      ? Math.round(mttrHours.reduce((s, h) => s + h, 0) / mttrHours.length)
      : 0;

  const serviciosPorCuenta = new Map<string, number>();
  const serviciosPorTecnico = new Map<string, number>();
  const taskById = new Map(tasks.map((t) => [String(t._id), t]));

  tasks.forEach((task) => {
    const cuenta = resolveCuentaCliente(task.cliente, task.cuentaCliente);
    serviciosPorCuenta.set(cuenta, (serviciosPorCuenta.get(cuenta) || 0) + 1);
    const tecnicos = Array.isArray(task.tecnicos) ? task.tecnicos : [];
    if (tecnicos.length === 0) {
      serviciosPorTecnico.set('Sin técnico', (serviciosPorTecnico.get('Sin técnico') || 0) + 1);
    } else {
      tecnicos.forEach((tec) => {
        const name = techName(tec as User, users);
        serviciosPorTecnico.set(name, (serviciosPorTecnico.get(name) || 0) + 1);
      });
    }
  });

  const reclamosCuenta = new Map<string, number>();
  const reclamosTec = new Map<string, number>();
  const motivoMap = new Map<string, number>();

  reclamos.forEach((r) => {
    // Cohorte: si el reclamo apunta a una tarea del set, usar esa cuenta/técnicos
    const linkedId =
      r.tarea && typeof r.tarea === 'object'
        ? r.tarea._id
        : typeof r.tarea === 'string'
          ? r.tarea
          : null;
    const linked = linkedId ? taskById.get(String(linkedId)) : null;

    const cuenta = resolveCuentaCliente(
      linked?.cliente || r.cliente,
      linked?.cuentaCliente || r.cuentaCliente
    );
    reclamosCuenta.set(cuenta, (reclamosCuenta.get(cuenta) || 0) + 1);

    const motivoLabel = RECLAMO_MOTIVO_LABELS[r.motivo] || r.motivo;
    motivoMap.set(motivoLabel, (motivoMap.get(motivoLabel) || 0) + 1);

    const tecs =
      linked && Array.isArray(linked.tecnicos) && linked.tecnicos.length > 0
        ? linked.tecnicos
        : Array.isArray(r.tecnicos)
          ? r.tecnicos
          : [];
    if (tecs.length === 0) {
      reclamosTec.set('Sin técnico', (reclamosTec.get('Sin técnico') || 0) + 1);
    } else {
      tecs.forEach((tec) => {
        const name = techName(tec as User, users);
        reclamosTec.set(name, (reclamosTec.get(name) || 0) + 1);
      });
    }
  });

  const byCuenta = Array.from(
    new Set([...serviciosPorCuenta.keys(), ...reclamosCuenta.keys()])
  )
    .map((label) => {
      const count = reclamosCuenta.get(label) || 0;
      const serviciosCuenta = serviciosPorCuenta.get(label) || 0;
      return {
        label,
        count,
        servicios: serviciosCuenta,
        tasa: formatPct(count, serviciosCuenta || Math.max(1, servicios)),
      };
    })
    .filter((x) => x.count > 0 || x.servicios > 0)
    .sort((a, b) => b.tasa - a.tasa || b.count - a.count);

  const byTecnico = Array.from(reclamosTec.entries())
    .map(([label, count]) => {
      const serviciosTec = serviciosPorTecnico.get(label) || 0;
      return {
        label,
        count,
        servicios: serviciosTec,
        tasa: formatPct(count, serviciosTec || 1),
      };
    })
    .sort((a, b) => b.tasa - a.tasa || b.count - a.count)
    .slice(0, 12);

  const alertas: string[] = [];
  const tasaGlobal = formatPct(totalReclamos, Math.max(1, completadas || servicios));
  byCuenta.forEach((c) => {
    if (c.servicios >= 10 && c.tasa >= tasaGlobal * 2 && c.tasa >= 5) {
      alertas.push(
        `${c.label}: tasa de reclamo ${c.tasa}% (${c.count}/${c.servicios}), por encima del promedio`
      );
    }
  });
  byTecnico.forEach((t) => {
    if (t.servicios >= 5 && t.tasa >= 15) {
      alertas.push(
        `${t.label}: ${t.tasa}% de reclamos (${t.count}/${t.servicios}) — revisar desempeño`
      );
    }
  });
  if (mttrHoras > 72 && resueltos >= 3) {
    alertas.push(`MTTR alto: ${mttrHoras}h promedio de resolución`);
  }
  const sinMotivoDetalle = reclamos.filter((r) => !r.motivo).length;
  if (sinMotivoDetalle > 0) {
    alertas.push(`${sinMotivoDetalle} reclamos sin motivo`);
  }

  return {
    reclamos: totalReclamos,
    tasaReclamo: formatPct1(totalReclamos, servicios),
    tasaReclamoSobreCompletadas: formatPct1(totalReclamos, completadas || 1),
    resueltos,
    tasaResolucion: formatPct(resueltos, totalReclamos),
    reabiertos,
    abiertos,
    mttrHoras,
    byCuenta: byCuenta.slice(0, 8),
    byTecnico,
    byMotivo: Array.from(motivoMap.entries())
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count),
    alertas,
  };
};

/** Cobertura de campos clave — útil mientras se completa la carga de datos. */
export interface DataCoverageSummary {
  total: number;
  conTecnicoPct: number;
  conFechaEjecucionPct: number;
  conFechaCompletadoPct: number;
  conCuentaPct: number;
  conClientePct: number;
  conFranjaPct: number;
  conOrigenPct: number;
  gaps: { label: string; count: number; pct: number }[];
}

export const buildDataCoverage = (tasks: Task[]): DataCoverageSummary => {
  const total = tasks.length || 1;
  const count = (fn: (t: Task) => boolean) => tasks.filter(fn).length;
  const conTecnico = count((t) => Array.isArray(t.tecnicos) && t.tecnicos.length > 0);
  const conFecha = count((t) => !!t.fechaEjecucion);
  const completadas = tasks.filter((t) => t.estado === 'completada');
  const conCompletado = completadas.filter((t) => !!t.fechaCompletado).length;
  const conCuenta = count(
    (t) => resolveCuentaCliente(t.cliente, t.cuentaCliente) !== 'Sin clasificar'
  );
  const conCliente = count((t) => !!(t.cliente || '').trim());
  const conFranja = count((t) => !!(t.franja_horaria || '').trim());
  const conOrigen = count((t) => !!t.origen);

  const gaps = [
    { label: 'Sin técnico', count: tasks.length - conTecnico },
    { label: 'Sin fecha ejecución', count: tasks.length - conFecha },
    {
      label: 'Completadas sin fechaCompletado',
      count: completadas.length - conCompletado,
    },
    { label: 'Sin cuenta', count: tasks.length - conCuenta },
    { label: 'Sin cliente', count: tasks.length - conCliente },
    { label: 'Sin franja', count: tasks.length - conFranja },
  ]
    .filter((g) => g.count > 0)
    .map((g) => ({ ...g, pct: formatPct(g.count, tasks.length) }))
    .sort((a, b) => b.count - a.count);

  return {
    total: tasks.length,
    conTecnicoPct: formatPct(conTecnico, total),
    conFechaEjecucionPct: formatPct(conFecha, total),
    conFechaCompletadoPct: formatPct(conCompletado, Math.max(1, completadas.length)),
    conCuentaPct: formatPct(conCuenta, total),
    conClientePct: formatPct(conCliente, total),
    conFranjaPct: formatPct(conFranja, total),
    conOrigenPct: formatPct(conOrigen, total),
    gaps,
  };
};

/** Buckets de aging cobranza consorcio (días). */
export const agingBuckets = (tasks: TareaConsorcio[]) => {
  const buckets = [
    { label: '0–7d', count: 0 },
    { label: '8–30d', count: 0 },
    { label: '31–60d', count: 0 },
    { label: '>60d', count: 0 },
  ];
  tasks.forEach((t) => {
    const d = daysInCobranza(t);
    if (d == null) return;
    if (d <= 7) buckets[0].count += 1;
    else if (d <= 30) buckets[1].count += 1;
    else if (d <= 60) buckets[2].count += 1;
    else buckets[3].count += 1;
  });
  return buckets.filter((b) => b.count > 0);
};

/** Evitar uso accidental del find lineal viejo */
export const __liqForTaskDeprecated = liqForTask;

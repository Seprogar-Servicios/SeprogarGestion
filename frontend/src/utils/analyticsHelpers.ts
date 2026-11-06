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

export const formatMoney = (value: number) =>
  new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(value || 0);

export const formatPct = (part: number, total: number) =>
  total > 0 ? Math.round((part / total) * 100) : 0;

const taskDate = (task: Task): Date | null => {
  const raw = task.fechaEjecucion || task.fechaCreacion;
  if (!raw) return null;
  const d = new Date(raw);
  return isNaN(d.getTime()) ? null : d;
};

export const inDateRange = (date: Date | null, start?: string, end?: string) => {
  if (!start && !end) return true;
  if (!date) return false;
  if (start) {
    const s = new Date(start);
    s.setHours(0, 0, 0, 0);
    if (date < s) return false;
  }
  if (end) {
    const e = new Date(end);
    e.setHours(23, 59, 59, 999);
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
    return inDateRange(taskDate(task), opts.start, opts.end);
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
  completionRate: number;
  cancelRate: number;
  avgCompletionHours: number;
  byOrigen: { label: string; count: number }[];
  topClientes: { label: string; count: number }[];
  byEspecialidad: { label: string; count: number }[];
  byFranja: { label: string; count: number }[];
}

const especialidadOf = (tecnico: User | string | undefined, users: User[]) => {
  if (!tecnico) return 'Sin especialidad';
  if (typeof tecnico === 'string') {
    const u = users.find((x) => x._id === tecnico);
    return u?.especialidad || 'Sin especialidad';
  }
  return tecnico.especialidad || 'Sin especialidad';
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

  const hours = tasks
    .filter((t) => t.estado === 'completada' && t.fechaCreacion)
    .map((t) => {
      const a = new Date(t.fechaCreacion!).getTime();
      const endRaw = t.fechaCompletado || t.fechaModificacion;
      if (!endRaw) return null;
      const b = new Date(endRaw).getTime();
      return Math.max(0, (b - a) / (1000 * 60 * 60));
    })
    .filter((h): h is number => h != null);
  const avgCompletionHours =
    hours.length > 0 ? Math.round(hours.reduce((s, h) => s + h, 0) / hours.length) : 0;

  const origenMap = new Map<string, number>();
  const clienteMap = new Map<string, number>();
  const especialidadMap = new Map<string, number>();
  const franjaMap = new Map<string, number>();

  tasks.forEach((task) => {
    const origen = task.origen === 'whatsapp' ? 'WhatsApp' : task.origen ? String(task.origen) : 'Sistema';
    origenMap.set(origen, (origenMap.get(origen) || 0) + 1);

    const cliente = (task.cliente || '').trim() || 'Sin cliente';
    clienteMap.set(cliente, (clienteMap.get(cliente) || 0) + 1);

    const franja = (task.franja_horaria || '').trim() || 'Sin franja';
    franjaMap.set(franja, (franjaMap.get(franja) || 0) + 1);

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
    completionRate: formatPct(completadas, total),
    cancelRate: formatPct(canceladas, total),
    avgCompletionHours,
    byOrigen: toSorted(origenMap, 6),
    topClientes: toSorted(clienteMap, 8),
    byEspecialidad: toSorted(especialidadMap, 8),
    byFranja: toSorted(franjaMap, 6),
  };
};

export interface FinancialSummary {
  liquidacionesCount: number;
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
}

const liqNum = (liq: TareaLiquidacion, key: keyof TareaLiquidacion) => {
  const v = liq[key];
  return typeof v === 'number' && !isNaN(v) ? v : 0;
};

export const buildFinancialSummary = (
  liquidaciones: TareaLiquidacion[],
  pagos: PagoManual[],
  recibos: Recibo[],
  dateRange?: { start?: string; end?: string }
): FinancialSummary => {
  const liqs = liquidaciones.filter((l) => {
    const d = l.tarea?.fechaEjecucion
      ? new Date(l.tarea.fechaEjecucion)
      : l.createdAt
        ? new Date(l.createdAt)
        : null;
    return inDateRange(d && !isNaN(d.getTime()) ? d : null, dateRange?.start, dateRange?.end);
  });

  const pagosFiltrados = pagos.filter((p) => {
    const d = p.fechaEmision ? new Date(p.fechaEmision) : p.createdAt ? new Date(p.createdAt) : null;
    return inDateRange(d && !isNaN(d.getTime()) ? d : null, dateRange?.start, dateRange?.end);
  });

  const recibosFiltrados = recibos; // recibos son por mes/año; se muestran todos del set cargado

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

  return {
    liquidacionesCount: liqs.length,
    manoObra: sum('manoObra'),
    materiales: sum('materiales'),
    cobertura: sum('cobertura'),
    excedente: sum('excedente'),
    materialReal: sum('materialReal'),
    totalPresupuesto: sum('totalPresupuesto'),
    gananciaTotal: sum('gananciaTotal'),
    pagoTecnico: sum('pagoTecnico'),
    futurgas: sum('futurgas'),
    pagosManualesTotal: pagosFiltrados.reduce((s, p) => s + (p.monto || 0), 0),
    pagosManualesCount: pagosFiltrados.length,
    pagosPorMotivo: Array.from(motivoMap.entries())
      .map(([label, v]) => ({ label, ...v }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 8),
    recibosTotal: recibosFiltrados.length,
    recibosFirmados: firmados,
    recibosPendientes: pendientes,
    firmaRate: formatPct(firmados, recibosFiltrados.length),
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

const consorcioDate = (task: TareaConsorcio): Date | null => {
  const raw = task.fechaEjecucion || task.fechaCreacion;
  if (!raw) return null;
  const d = new Date(raw);
  return isNaN(d.getTime()) ? null : d;
};

export const buildConsorcioSummary = (tasks: TareaConsorcio[]): ConsorcioSummary => {
  const total = tasks.length;
  const paid = tasks.filter((t) => t.estado === 'PAGADO');
  const pendingMoney = tasks.filter((t) =>
    ['PENDIENTE_PAGO', 'FACTURADO', 'completada', 'en_progreso', 'confirmado', 'pendiente'].includes(
      t.estado
    )
  );
  const revenuePaid = paid.reduce((s, t) => s + (t.precio || 0), 0);
  const revenuePending = pendingMoney.reduce((s, t) => s + (t.precio || 0), 0);
  const withPrice = tasks.filter((t) => (t.precio || 0) > 0);
  const ticketPromedio =
    withPrice.length > 0
      ? withPrice.reduce((s, t) => s + (t.precio || 0), 0) / withPrice.length
      : 0;

  const adminMap = new Map<string, { count: number; revenue: number }>();
  const clienteMap = new Map<string, number>();
  const franjaMap = new Map<string, number>();
  const tecnicoMap = new Map<string, number>();
  const mesMap = new Map<string, number>();
  const revenueEstadoMap = new Map<string, number>();

  tasks.forEach((t) => {
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

  const toSorted = (map: Map<string, number>, limit = 8) =>
    Array.from(map.entries())
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);

  const withPhotos = tasks.filter((t) => t.fotos && t.fotos.length > 0).length;
  const withComprobante = tasks.filter((t) => !!t.comprobantePago).length;
  const agingCobranza = tasks.filter((t) =>
    ['PENDIENTE_PAGO', 'FACTURADO'].includes(t.estado)
  ).length;

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
    conversionPago: formatPct(paid.length, total),
    byAdmin,
    agingCobranza,
    withPhotos,
    withComprobante,
    canceladas: tasks.filter((t) => t.estado === 'cancelada').length,
    sinAdmin: tasks.filter(
      (t) => !t.administradorConsorcio || !(t.administradorConsorcio as any)._id
    ).length,
    topClientes: toSorted(clienteMap, 8),
    byFranja: toSorted(franjaMap, 6),
    byTecnico: toSorted(tecnicoMap, 8),
    byMes: Array.from(mesMap.entries())
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => a.label.localeCompare(b.label))
      .slice(-8),
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
  pagoTecnico: number;
  margenOperativo: number;
  margenPct: number;
  top2ConcentracionPct: number;
  byCuenta: { label: string; count: number; ingresos: number }[];
  byEspecialidad: { label: string; count: number }[];
  byTecnico: { label: string; count: number }[];
  sinLiquidacion: number;
  gapsRegistro: { label: string; count: number }[];
}

export interface QualitySummary {
  reclamos: number;
  tasaReclamo: number;
  resueltos: number;
  tasaResolucion: number;
  reabiertos: number;
  abiertos: number;
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
  let sinLiquidacion = 0;

  const cuentaMap = new Map<string, { count: number; ingresos: number }>();
  const espMap = new Map<string, number>();
  const tecMap = new Map<string, number>();

  tasks.forEach((task) => {
    const cuenta = resolveCuentaCliente(task.cliente, task.cuentaCliente);
    const liq = liqForTask(liquidaciones, task._id);
    const ingresoTarea = liq
      ? (typeof liq.totalPresupuesto === 'number' ? liq.totalPresupuesto : 0) ||
        (liq.manoObra || 0) + (liq.materiales || 0) + (liq.cobertura || 0) + (liq.excedente || 0)
      : 0;

    if (!liq && task.estado === 'completada') sinLiquidacion += 1;

    ingresos += ingresoTarea;
    if (liq) {
      costoManoObra += liq.manoObra || 0;
      costoMateriales += liq.materiales || 0;
      pagoTecnico += typeof liq.pagoTecnico === 'number' ? liq.pagoTecnico : 0;
    }

    const cur = cuentaMap.get(cuenta) || { count: 0, ingresos: 0 };
    cur.count += 1;
    cur.ingresos += ingresoTarea;
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
        let esp = 'Sin especialidad';
        if (typeof tec === 'object' && tec) {
          const e = (tec as any).especialidad;
          esp = typeof e === 'object' && e?.nombre ? e.nombre : e || esp;
        } else {
          const u = users.find((x) => x._id === tec);
          const e = u?.especialidad as any;
          esp = typeof e === 'object' && e?.nombre ? e.nombre : e || esp;
        }
        if (!seenEsp.has(esp)) {
          seenEsp.add(esp);
          espMap.set(esp, (espMap.get(esp) || 0) + 1);
        }
      });
    }
  });

  const byCuenta = Array.from(cuentaMap.entries())
    .map(([label, v]) => ({ label, count: v.count, ingresos: v.ingresos }))
    .sort((a, b) => b.count - a.count);

  const top2 = byCuenta.slice(0, 2).reduce((s, x) => s + x.count, 0);
  const costos = costoManoObra + costoMateriales;
  const margenOperativo = ingresos - costos;

  const gapsRegistro = [
    { label: 'Completadas sin liquidación', count: sinLiquidacion },
    { label: 'Sin técnico', count: tasks.filter((t) => !t.tecnicos?.length).length },
    { label: 'Sin fecha de ejecución', count: tasks.filter((t) => !t.fechaEjecucion).length },
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
    ticketPromedio: servicios > 0 ? Math.round(ingresos / servicios) : 0,
    ingresos,
    costoManoObra,
    costoMateriales,
    pagoTecnico,
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
  const totalReclamos = reclamos.length;
  const resueltos = reclamos.filter((r) => r.estado === 'resuelto').length;
  const reabiertos = reclamos.filter((r) => r.estado === 'reabierto').length;
  const abiertos = reclamos.filter((r) => r.estado === 'abierto').length;

  const serviciosPorCuenta = new Map<string, number>();
  const serviciosPorTecnico = new Map<string, number>();
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
    const cuenta = resolveCuentaCliente(r.cliente, r.cuentaCliente);
    reclamosCuenta.set(cuenta, (reclamosCuenta.get(cuenta) || 0) + 1);

    const motivoLabel = RECLAMO_MOTIVO_LABELS[r.motivo] || r.motivo;
    motivoMap.set(motivoLabel, (motivoMap.get(motivoLabel) || 0) + 1);

    const tecs = Array.isArray(r.tecnicos) ? r.tecnicos : [];
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
        tasa: formatPct(count, serviciosCuenta || servicios),
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
  const tasaGlobal = formatPct(totalReclamos, servicios);
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
  if (motivoMap.size === 0 && totalReclamos > 0) {
    alertas.push('Hay reclamos sin motivo cargado: completar taxonomía para acciones correctivas');
  }
  const sinMotivoDetalle = reclamos.filter((r) => !r.motivo).length;
  if (sinMotivoDetalle > 0) {
    alertas.push(`${sinMotivoDetalle} reclamos sin motivo`);
  }

  return {
    reclamos: totalReclamos,
    tasaReclamo: formatPct(totalReclamos, servicios),
    resueltos,
    tasaResolucion: formatPct(resueltos, totalReclamos),
    reabiertos,
    abiertos,
    byCuenta: byCuenta.slice(0, 8),
    byTecnico,
    byMotivo: Array.from(motivoMap.entries())
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count),
    alertas,
  };
};

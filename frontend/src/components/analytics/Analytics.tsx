import React, { useEffect, useMemo, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../../store';
import { fetchTasks } from '../../store/slices/tasksSlice';
import { fetchUsers } from '../../store/slices/usersSlice';
import { fetchLiquidaciones } from '../../store/slices/tareaLiquidacionSlice';
import { fetchPagosManuales } from '../../store/slices/pagoManualSlice';
import { fetchRecibos } from '../../store/slices/recibosSlice';
import TasksByTimeChart from './TasksByTimeChart';
import TasksByStatusChart from './TasksByStatusChart';
import TasksByUserChart from './TasksByUserChart';
import TasksCompletionTimeChart from './TasksCompletionTimeChart';
import SimpleCategoryChart from './SimpleCategoryChart';
import FinancialAnalyticsPanel from './FinancialAnalyticsPanel';
import QualityAnalyticsPanel from './QualityAnalyticsPanel';
import ConsorcioAnalytics from './ConsorcioAnalytics';
import ChartDrilldownPanel, { type ChartDrilldown } from './ChartDrilldownPanel';
import {
  BarChart3,
  Clock,
  CheckCircle,
  AlertCircle,
  Calendar,
  Filter,
  X,
  RefreshCw,
  Check,
  User,
  ClipboardList,
  XCircle,
  Wallet,
  Activity,
  Users as UsersIcon,
  Briefcase,
  Tag,
  ShieldAlert,
  Building,
  Download,
} from 'lucide-react';
import { format, subMonths } from 'date-fns';
import { useSearchParams } from 'react-router-dom';
import AdminPageHeader from '../common/AdminPageHeader';
import { isAdminRole } from '../../utils/roles';
import {
  buildDataCoverage,
  buildFinancialSummary,
  buildMonthlyCloseSummary,
  buildOperationalSummary,
  buildQualitySummary,
  especialidadOf,
  filterTasksForAnalytics,
  inDateRange,
} from '../../utils/analyticsHelpers';
import { DATE_PRESETS, formatDelta, previousPeriod } from '../../utils/analyticsPeriod';
import { exportKpisCsv, exportTasksCsv } from '../../utils/analyticsExport';
import type { Reclamo, Task } from '../../types';
import api from '../../config/api';

type TabId = 'operativo' | 'financiero' | 'cierre' | 'consorcio';

const TAB_FROM_QUERY: Record<string, TabId> = {
  operativo: 'operativo',
  financiero: 'financiero',
  cierre: 'cierre',
  calidad: 'cierre',
  consorcio: 'consorcio',
};

const ChartCard: React.FC<{
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}> = ({ title, icon, children }) => (
  <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-gray-800 p-4">
    <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-3 flex items-center gap-2">
      {icon}
      {title}
    </h2>
    <div className="h-72">{children}</div>
  </div>
);

const Analytics: React.FC = () => {
  const dispatch = useAppDispatch();
  const [searchParams, setSearchParams] = useSearchParams();
  const { tasks, loading: tasksLoading } = useAppSelector((state) => state.tasks);
  const { users, loading: usersLoading } = useAppSelector((state) => state.users);
  const { liquidaciones } = useAppSelector((state) => state.tareaLiquidacion);
  const { pagos } = useAppSelector((state) => state.pagoManual);
  const { recibos } = useAppSelector((state) => state.recibos);
  const { user } = useAppSelector((state) => state.auth);

  const [isLoading, setIsLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const initialTab = TAB_FROM_QUERY[searchParams.get('tab') || ''] || 'operativo';
  const [tab, setTab] = useState<TabId>(initialTab);
  const [detail, setDetail] = useState<ChartDrilldown | null>(null);
  const [reclamos, setReclamos] = useState<Reclamo[]>([]);
  const [reclamosError, setReclamosError] = useState<string | null>(null);

  useEffect(() => {
    const q = searchParams.get('tab') || '';
    if (TAB_FROM_QUERY[q] && TAB_FROM_QUERY[q] !== tab) {
      setTab(TAB_FROM_QUERY[q]);
    }
  }, [searchParams, tab]);

  const selectTab = (id: TabId) => {
    setTab(id);
    setDetail(null);
    setSearchParams(id === 'operativo' ? {} : { tab: id }, { replace: true });
  };

  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({
    start: format(subMonths(new Date(), 12), 'yyyy-MM-dd'),
    end: format(new Date(), 'yyyy-MM-dd'),
  });
  const [statusFilter, setStatusFilter] = useState<string[]>([
    'pendiente',
    'en progreso',
    'completada',
    'cancelada',
  ]);
  const [userFilter, setUserFilter] = useState<string[]>([]);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        await dispatch(fetchTasks({})).unwrap();
        if (isAdminRole(user)) {
          await Promise.all([
            dispatch(fetchUsers()),
            dispatch(fetchLiquidaciones()),
            dispatch(fetchPagosManuales()),
            dispatch(fetchRecibos()),
          ]);
          try {
            const res = await api.get<{ success: boolean; data: Reclamo[] }>('/reclamos');
            setReclamos(res.data.data || []);
            setReclamosError(null);
          } catch (err: any) {
            setReclamos([]);
            setReclamosError(
              err?.response?.data?.message || 'No se pudieron cargar los reclamos'
            );
          }
        }
      } catch (error) {
        console.error('Error al cargar los datos:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, [dispatch, user?.rol]);

  const tecnicos = useMemo(
    () => (Array.isArray(users) ? users.filter((u) => u.rol === 'usuario') : []),
    [users]
  );

  const filteredTasks = useMemo(
    () =>
      filterTasksForAnalytics(Array.isArray(tasks) ? tasks : [], {
        start: dateRange.start,
        end: dateRange.end,
        statuses: statusFilter,
        tecnicoIds: userFilter,
      }),
    [tasks, dateRange, statusFilter, userFilter]
  );

  const ops = useMemo(
    () => buildOperationalSummary(filteredTasks, Array.isArray(users) ? users : []),
    [filteredTasks, users]
  );

  const prevRange = useMemo(() => previousPeriod(dateRange), [dateRange]);

  const prevTasks = useMemo(
    () =>
      filterTasksForAnalytics(Array.isArray(tasks) ? tasks : [], {
        start: prevRange.start,
        end: prevRange.end,
        statuses: statusFilter,
        tecnicoIds: userFilter,
      }),
    [tasks, prevRange, statusFilter, userFilter]
  );

  const finance = useMemo(
    () =>
      buildFinancialSummary(
        Array.isArray(liquidaciones) ? liquidaciones : [],
        Array.isArray(pagos) ? pagos : [],
        Array.isArray(recibos) ? recibos : [],
        {
          start: dateRange.start,
          end: dateRange.end,
          statuses: statusFilter,
          tecnicoIds: userFilter,
        }
      ),
    [liquidaciones, pagos, recibos, dateRange, statusFilter, userFilter]
  );

  const reclamosFiltrados = useMemo(
    () =>
      reclamos.filter((r) => {
        const d = r.fechaReclamo ? new Date(r.fechaReclamo) : null;
        return inDateRange(d && !isNaN(d.getTime()) ? d : null, dateRange.start, dateRange.end);
      }),
    [reclamos, dateRange]
  );

  const monthlyClose = useMemo(
    () =>
      buildMonthlyCloseSummary(
        filteredTasks,
        Array.isArray(users) ? users : [],
        Array.isArray(liquidaciones) ? liquidaciones : []
      ),
    [filteredTasks, users, liquidaciones]
  );

  const prevOps = useMemo(
    () => buildOperationalSummary(prevTasks, Array.isArray(users) ? users : []),
    [prevTasks, users]
  );

  const quality = useMemo(
    () =>
      buildQualitySummary(
        filteredTasks,
        Array.isArray(users) ? users : [],
        reclamosFiltrados
      ),
    [filteredTasks, users, reclamosFiltrados]
  );

  const coverage = useMemo(() => buildDataCoverage(filteredTasks), [filteredTasks]);

  const prevFinance = useMemo(
    () =>
      buildFinancialSummary(
        Array.isArray(liquidaciones) ? liquidaciones : [],
        Array.isArray(pagos) ? pagos : [],
        Array.isArray(recibos) ? recibos : [],
        {
          start: prevRange.start,
          end: prevRange.end,
          statuses: statusFilter,
          tecnicoIds: userFilter,
        }
      ),
    [liquidaciones, pagos, recibos, prevRange, statusFilter, userFilter]
  );

  const filtersActive =
    statusFilter.length !== 4 ||
    userFilter.length > 0 ||
    dateRange.start !== format(subMonths(new Date(), 12), 'yyyy-MM-dd');

  const exportCurrent = () => {
    exportTasksCsv(filteredTasks, `analisis-tareas-${dateRange.start}_${dateRange.end}.csv`);
    exportKpisCsv(
      [
        { metrica: 'Tareas', valor: ops.total, nota: `vs ant ${formatDelta(ops.total, prevOps.total)}` },
        { metrica: 'Completadas', valor: ops.completadas },
        { metrica: 'Tasa cierre %', valor: ops.completionRate },
        { metrica: 'Avg completado h', valor: ops.avgCompletionHours },
        { metrica: 'Mediana completado h', valor: ops.medianCompletionHours },
        { metrica: 'Presupuesto liq.', valor: Math.round(finance.totalPresupuesto) },
        { metrica: 'Ganancia', valor: Math.round(finance.gananciaTotal) },
        { metrica: 'Deuda técnicos', valor: Math.round(finance.deudaTecnicos) },
        { metrica: 'Margen cierre', valor: Math.round(monthlyClose.margenOperativo) },
        { metrica: 'Reclamos', valor: quality.reclamos },
        { metrica: 'MTTR h', valor: quality.mttrHoras },
      ],
      `analisis-kpis-${dateRange.start}_${dateRange.end}.csv`
    );
  };

  const resetFilters = () => {
    setDateRange({
      start: format(subMonths(new Date(), 12), 'yyyy-MM-dd'),
      end: format(new Date(), 'yyyy-MM-dd'),
    });
    setStatusFilter(['pendiente', 'en progreso', 'completada', 'cancelada']);
    setUserFilter([]);
    setDetail(null);
  };

  const openTasks = (title: string, list: Task[], subtitle?: string) => {
    setDetail({ title, subtitle, tasks: list });
  };

  if (isLoading || tasksLoading || usersLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500" />
      </div>
    );
  }

  const kpis = [
    {
      title: 'Tareas',
      value: ops.total,
      hint: formatDelta(ops.total, prevOps.total),
      icon: ClipboardList,
      color: 'bg-blue-500',
    },
    {
      title: 'Completadas',
      value: ops.completadas,
      hint: `${ops.completionRate}% · ${formatDelta(ops.completadas, prevOps.completadas)}`,
      icon: CheckCircle,
      color: 'bg-green-500',
      list: filteredTasks.filter((t) => t.estado === 'completada'),
    },
    {
      title: 'En progreso',
      value: ops.enProgreso,
      hint: formatDelta(ops.enProgreso, prevOps.enProgreso),
      icon: Clock,
      color: 'bg-yellow-500',
      list: filteredTasks.filter((t) => t.estado === 'en progreso'),
    },
    {
      title: 'Pendientes',
      value: ops.pendientes,
      icon: AlertCircle,
      color: 'bg-orange-500',
      list: filteredTasks.filter((t) => t.estado === 'pendiente'),
    },
    {
      title: 'Canceladas',
      value: ops.canceladas,
      hint: `${ops.cancelRate}%`,
      icon: XCircle,
      color: 'bg-red-500',
      list: filteredTasks.filter((t) => t.estado === 'cancelada'),
    },
    {
      title: 'SLA (mediana)',
      value: ops.medianCompletionHours > 0 ? `${ops.medianCompletionHours}h` : '—',
      hint: `avg ${ops.avgCompletionHours}h · p90 ${ops.p90CompletionHours}h`,
      icon: Clock,
      color: 'bg-violet-500',
      list: filteredTasks.filter((t) => t.estado === 'completada'),
    },
  ];

  return (
    <div className="pb-6 animate-fadeIn">
      <div className="space-y-4">
        <AdminPageHeader
          title="Panel de Análisis"
          description="Operativo, financiero, consorcio y cierre de calidad"
          eyebrow="Análisis"
          icon={<BarChart3 className="h-5 w-5" />}
          actions={
            <div className="flex items-center gap-2 flex-wrap justify-end">
              {tab !== 'consorcio' && (
                <button
                  type="button"
                  onClick={exportCurrent}
                  className="inline-flex items-center px-3 py-2.5 text-sm font-medium rounded-lg border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 bg-white dark:bg-gray-700 hover:bg-slate-50"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Exportar
                </button>
              )}
              {tab !== 'consorcio' ? (
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className={`inline-flex items-center px-4 py-2.5 text-sm font-medium rounded-lg text-white ${
                    filtersActive ? 'bg-amber-600 hover:bg-amber-700' : 'bg-blue-600 hover:bg-blue-700'
                  }`}
                >
                  <Filter className="h-4 w-4 mr-2" />
                  Filtros{filtersActive ? ' · activos' : ''}
                </button>
              ) : undefined}
            </div>
          }
        />

        <div className="flex gap-1 p-1 rounded-xl bg-slate-200/70 dark:bg-slate-800 w-fit flex-wrap">
          {(
            [
              ['operativo', 'Operativo', Activity],
              ['financiero', 'Financiero', Wallet],
              ['consorcio', 'Consorcio', Building],
              ['cierre', 'Cierre / Calidad', ShieldAlert],
            ] as const
          ).map(([id, label, Icon]) => (
            <button
              key={id}
              type="button"
              onClick={() => selectTab(id)}
              className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium ${
                tab === id
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </div>

        {showFilters && tab !== 'consorcio' && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">Filtros</span>
              <div className="flex gap-2">
                <button
                  onClick={resetFilters}
                  className="text-xs text-blue-600 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-600 inline-flex items-center gap-1"
                >
                  <RefreshCw className="h-3.5 w-3.5" /> Restablecer
                </button>
                <button
                  onClick={() => setShowFilters(false)}
                  className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-xs text-slate-500">Desde / hasta</label>
                <div className="flex gap-2">
                  <input
                    type="date"
                    value={dateRange.start}
                    onChange={(e) => setDateRange((p) => ({ ...p, start: e.target.value }))}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-gray-700 text-sm py-2 px-2"
                  />
                  <input
                    type="date"
                    value={dateRange.end}
                    onChange={(e) => setDateRange((p) => ({ ...p, end: e.target.value }))}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-gray-700 text-sm py-2 px-2"
                  />
                </div>
                <div className="flex flex-wrap gap-1">
                  {DATE_PRESETS.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setDateRange(p.range())}
                      className="px-2 py-0.5 text-[11px] rounded-full border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
                <p className="text-[11px] text-slate-400">
                  Comparación vs período anterior: {prevRange.start} → {prevRange.end}
                </p>
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-2 block">Estados</label>
                <div className="flex flex-wrap gap-1.5">
                  {['pendiente', 'en progreso', 'completada', 'cancelada'].map((value) => {
                    const selected = statusFilter.includes(value);
                    return (
                      <button
                        key={value}
                        type="button"
                        onClick={() => {
                          if (selected && statusFilter.length > 1) {
                            setStatusFilter(statusFilter.filter((s) => s !== value));
                          } else if (!selected) {
                            setStatusFilter([...statusFilter, value]);
                          }
                        }}
                        className={`px-2.5 py-1 rounded-full text-xs border ${
                          selected
                            ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300'
                            : 'border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300'
                        }`}
                      >
                        {selected && <Check className="inline h-3 w-3 mr-1" />}
                        {value}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-2 block">Técnicos</label>
                <select
                  multiple
                  value={userFilter}
                  onChange={(e) =>
                    setUserFilter(Array.from(e.target.selectedOptions, (o) => o.value))
                  }
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-gray-700 text-sm py-1.5 min-h-[72px]"
                >
                  {tecnicos.map((u) => (
                    <option key={u._id} value={u._id}>
                      {u.nombre}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}

        {tab === 'operativo' && (
          <>
            {coverage.gaps.length > 0 && (
              <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-800/50 px-4 py-3">
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 mb-2">
                  Cobertura de datos (mejora sola a medida que completan campos)
                </p>
                <div className="flex flex-wrap gap-2 text-[11px]">
                  <span className="px-2 py-1 rounded-full bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600">
                    Técnico {coverage.conTecnicoPct}%
                  </span>
                  <span className="px-2 py-1 rounded-full bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600">
                    Fecha ejec. {coverage.conFechaEjecucionPct}%
                  </span>
                  <span className="px-2 py-1 rounded-full bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600">
                    Completado {coverage.conFechaCompletadoPct}%
                  </span>
                  <span className="px-2 py-1 rounded-full bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600">
                    Cuenta {coverage.conCuentaPct}%
                  </span>
                  <span className="px-2 py-1 rounded-full bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600">
                    Franja {coverage.conFranjaPct}%
                  </span>
                  {coverage.gaps.slice(0, 3).map((g) => (
                    <span
                      key={g.label}
                      className="px-2 py-1 rounded-full bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200"
                    >
                      {g.label}: {g.count} ({g.pct}%)
                    </span>
                  ))}
                </div>
              </div>
            )}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              {kpis.map((kpi) => {
                const Icon = kpi.icon;
                return (
                  <button
                    key={kpi.title}
                    type="button"
                    onClick={() =>
                      kpi.list
                        ? openTasks(kpi.title, kpi.list)
                        : openTasks(kpi.title, filteredTasks)
                    }
                    className="text-left rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-gray-800 p-4 hover:border-blue-300 dark:hover:border-blue-700 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium text-slate-500">{kpi.title}</span>
                      <div className={`${kpi.color} rounded-lg p-2`}>
                        <Icon className="h-4 w-4 text-white" />
                      </div>
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-bold text-slate-900 dark:text-white tabular-nums">
                        {kpi.value}
                      </span>
                      {kpi.hint && (
                        <span className="text-xs text-slate-400">{kpi.hint}</span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <ChartCard
                title="Tareas por período"
                icon={<Calendar className="h-4 w-4 text-blue-500" />}
              >
                <TasksByTimeChart
                  tasks={filteredTasks}
                  dateRange={dateRange}
                  onSegmentClick={setDetail}
                />
              </ChartCard>
              <ChartCard
                title="Distribución por estado"
                icon={<CheckCircle className="h-4 w-4 text-emerald-500" />}
              >
                <TasksByStatusChart tasks={filteredTasks} onSegmentClick={setDetail} />
              </ChartCard>
              <ChartCard
                title="Carga por técnico"
                icon={<UsersIcon className="h-4 w-4 text-orange-500" />}
              >
                <TasksByUserChart
                  tasks={filteredTasks}
                  users={users}
                  onSegmentClick={setDetail}
                />
              </ChartCard>
              <ChartCard
                title="Tiempo promedio de completado"
                icon={<Clock className="h-4 w-4 text-rose-500" />}
              >
                <TasksCompletionTimeChart tasks={filteredTasks} />
              </ChartCard>
              <ChartCard
                title="Por especialidad"
                icon={<Briefcase className="h-4 w-4 text-indigo-500" />}
              >
                <SimpleCategoryChart
                  items={ops.byEspecialidad}
                  color="#6366f1"
                  onBarClick={(label) =>
                    openTasks(
                      `Especialidad: ${label}`,
                      filteredTasks.filter((task) => {
                        const tecnicosTask = Array.isArray(task.tecnicos) ? task.tecnicos : [];
                        if (tecnicosTask.length === 0) return label === 'Sin asignar';
                        return tecnicosTask.some(
                          (tec) => especialidadOf(tec as any, users) === label
                        );
                      })
                    )
                  }
                />
              </ChartCard>
              <ChartCard
                title="Top clientes"
                icon={<Tag className="h-4 w-4 text-teal-500" />}
              >
                <SimpleCategoryChart
                  items={ops.topClientes}
                  color="#14b8a6"
                  onBarClick={(label) =>
                    openTasks(
                      `Cliente: ${label}`,
                      filteredTasks.filter(
                        (t) => ((t.cliente || '').trim() || 'Sin cliente') === label
                      )
                    )
                  }
                />
              </ChartCard>
              <ChartCard
                title="Franjas horarias"
                icon={<Clock className="h-4 w-4 text-amber-500" />}
              >
                <SimpleCategoryChart
                  items={ops.byFranja}
                  color="#f59e0b"
                  onBarClick={(label) =>
                    openTasks(
                      `Franja: ${label}`,
                      filteredTasks.filter(
                        (t) => ((t.franja_horaria || '').trim() || 'Sin franja') === label
                      )
                    )
                  }
                />
              </ChartCard>
              <ChartCard
                title="Origen de tareas"
                icon={<Activity className="h-4 w-4 text-sky-500" />}
              >
                <SimpleCategoryChart
                  items={ops.byOrigen}
                  color="#0ea5e9"
                  onBarClick={(label) =>
                    openTasks(
                      `Origen: ${label}`,
                      filteredTasks.filter((t) => {
                        const origen =
                          t.origen === 'whatsapp'
                            ? 'WhatsApp'
                            : t.origen
                              ? String(t.origen)
                              : 'Sistema';
                        return origen === label;
                      })
                    )
                  }
                />
              </ChartCard>
            </div>

            {detail && (
              <ChartDrilldownPanel drilldown={detail} onClose={() => setDetail(null)} />
            )}
          </>
        )}

        {tab === 'financiero' && (
          <>
            <p className="text-xs text-slate-500">
              Respeta fecha, estado y técnico. Canceladas excluidas del presupuesto activo.
              Deuda = pago liquidado − pagos manuales. Deltas vs{' '}
              {prevRange.start} → {prevRange.end}.
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-gray-800 px-3 py-2">
                <p className="text-[11px] text-slate-500">Presupuesto vs ant.</p>
                <p className="text-sm font-semibold tabular-nums">
                  {formatDelta(finance.totalPresupuesto, prevFinance.totalPresupuesto)}
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-gray-800 px-3 py-2">
                <p className="text-[11px] text-slate-500">Ganancia vs ant.</p>
                <p className="text-sm font-semibold tabular-nums">
                  {formatDelta(finance.gananciaTotal, prevFinance.gananciaTotal)}
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-gray-800 px-3 py-2">
                <p className="text-[11px] text-slate-500">Deuda vs ant.</p>
                <p className="text-sm font-semibold tabular-nums">
                  {formatDelta(finance.deudaTecnicos, prevFinance.deudaTecnicos)}
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-gray-800 px-3 py-2">
                <p className="text-[11px] text-slate-500">Firma recibos vs ant.</p>
                <p className="text-sm font-semibold tabular-nums">
                  {formatDelta(finance.firmaRate, prevFinance.firmaRate)}
                </p>
              </div>
            </div>
            <FinancialAnalyticsPanel summary={finance} />
          </>
        )}

        {tab === 'consorcio' && <ConsorcioAnalytics embedded />}

        {tab === 'cierre' && (
          <>
            {reclamosError && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 dark:bg-rose-950/20 dark:border-rose-800 px-4 py-3 text-sm text-rose-800 dark:text-rose-200">
                {reclamosError}. Los KPIs de calidad pueden quedar incompletos.
              </div>
            )}
            {ops.sinFechaCompletado > 0 && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800 px-4 py-3 text-sm text-amber-900 dark:text-amber-100">
                {ops.sinFechaCompletado} completadas sin <code>fechaCompletado</code>. Al
                cerrar tareas de ahora en más, el SLA y el gráfico de tiempos mejoran solos.
              </div>
            )}
            <QualityAnalyticsPanel close={monthlyClose} quality={quality} />
          </>
        )}
      </div>
    </div>
  );
};

export default Analytics;

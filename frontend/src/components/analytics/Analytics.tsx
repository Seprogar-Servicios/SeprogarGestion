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
} from 'lucide-react';
import { format, subMonths } from 'date-fns';
import AdminPageHeader from '../common/AdminPageHeader';
import { isAdminRole } from '../../utils/roles';
import {
  buildFinancialSummary,
  buildOperationalSummary,
  filterTasksForAnalytics,
} from '../../utils/analyticsHelpers';
import type { Task } from '../../types';

type TabId = 'operativo' | 'financiero';

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
  const { tasks, loading: tasksLoading } = useAppSelector((state) => state.tasks);
  const { users, loading: usersLoading } = useAppSelector((state) => state.users);
  const { liquidaciones } = useAppSelector((state) => state.tareaLiquidacion);
  const { pagos } = useAppSelector((state) => state.pagoManual);
  const { recibos } = useAppSelector((state) => state.recibos);
  const { user } = useAppSelector((state) => state.auth);

  const [isLoading, setIsLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [tab, setTab] = useState<TabId>('operativo');
  const [detail, setDetail] = useState<ChartDrilldown | null>(null);

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

  const finance = useMemo(
    () =>
      buildFinancialSummary(
        Array.isArray(liquidaciones) ? liquidaciones : [],
        Array.isArray(pagos) ? pagos : [],
        Array.isArray(recibos) ? recibos : [],
        dateRange
      ),
    [liquidaciones, pagos, recibos, dateRange]
  );

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
    { title: 'Tareas', value: ops.total, icon: ClipboardList, color: 'bg-blue-500' },
    {
      title: 'Completadas',
      value: ops.completadas,
      hint: `${ops.completionRate}%`,
      icon: CheckCircle,
      color: 'bg-green-500',
      list: filteredTasks.filter((t) => t.estado === 'completada'),
    },
    {
      title: 'En progreso',
      value: ops.enProgreso,
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
      title: 'Sin técnico',
      value: ops.sinTecnico,
      icon: User,
      color: 'bg-slate-500',
      list: filteredTasks.filter((t) => !t.tecnicos || t.tecnicos.length === 0),
    },
  ];

  return (
    <div className="pb-6 animate-fadeIn">
      <div className="space-y-4">
        <AdminPageHeader
          title="Panel de Análisis"
          description="Operativo y financiero para decisiones de jefatura"
          eyebrow="Análisis"
          icon={<BarChart3 className="h-5 w-5" />}
          actions={
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="inline-flex items-center px-4 py-2.5 text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700"
            >
              <Filter className="h-4 w-4 mr-2" />
              Filtros
            </button>
          }
        />

        <div className="flex gap-1 p-1 rounded-xl bg-slate-200/70 dark:bg-slate-800 w-fit">
          {(
            [
              ['operativo', 'Operativo', Activity],
              ['financiero', 'Financiero', Wallet],
            ] as const
          ).map(([id, label, Icon]) => (
            <button
              key={id}
              type="button"
              onClick={() => {
                setTab(id);
                setDetail(null);
              }}
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

        {showFilters && (
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
                <TasksByTimeChart tasks={filteredTasks} onSegmentClick={setDetail} />
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
                        return tecnicosTask.some((tec) => {
                          if (typeof tec === 'string') {
                            const u = users.find((x) => x._id === tec);
                            return (u?.especialidad || 'Sin especialidad') === label;
                          }
                          return ((tec as any)?.especialidad || 'Sin especialidad') === label;
                        });
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

        {tab === 'financiero' && <FinancialAnalyticsPanel summary={finance} />}
      </div>
    </div>
  );
};

export default Analytics;

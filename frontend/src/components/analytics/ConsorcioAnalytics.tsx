import React, { useEffect, useMemo, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../../store';
import { fetchUsers } from '../../store/slices/usersSlice';
import {
  Clock,
  CheckCircle,
  Filter,
  X,
  RefreshCw,
  ClipboardList,
  DollarSign,
  Building,
  CreditCard,
  Percent,
  AlertTriangle,
  Calendar,
  Users,
  Tag,
  Image,
  Briefcase,
  Check,
} from 'lucide-react';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import type { TareaConsorcio } from '../../types';
import AdminPageHeader from '../common/AdminPageHeader';
import { isAdminRole } from '../../utils/roles';
import api from '../../config/api';
import { buildConsorcioSummary, formatMoney } from '../../utils/analyticsHelpers';
import SimpleCategoryChart from './SimpleCategoryChart';
import ConsorcioDrilldownPanel, { type ConsorcioDrilldown } from './ConsorcioDrilldownPanel';

const ESTADO_KEYS = [
  'presupuesto',
  'confirmado',
  'pendiente',
  'en_progreso',
  'completada',
  'PENDIENTE_PAGO',
  'FACTURADO',
  'PAGADO',
  'cancelada',
] as const;

const ESTADO_LABEL: Record<string, string> = {
  presupuesto: 'Presupuesto',
  confirmado: 'Confirmado',
  pendiente: 'Pendiente',
  en_progreso: 'En progreso',
  completada: 'Completada',
  PENDIENTE_PAGO: 'Pendiente pago',
  FACTURADO: 'Facturado',
  PAGADO: 'Pagado',
  cancelada: 'Cancelada',
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

interface Props {
  /** Oculta filtro de administradores (vista adminConsorcio) */
  hideAdminFilter?: boolean;
  title?: string;
  description?: string;
  /** Sin header propio (cuando se embebe en hub de Análisis) */
  embedded?: boolean;
}

const ConsorcioAnalytics: React.FC<Props> = ({
  hideAdminFilter = false,
  title = 'Análisis de Consorcio',
  description = 'Embudo operativo, cobranza e ingresos por administrador',
  embedded = false,
}) => {
  const dispatch = useAppDispatch();
  const { users } = useAppSelector((state) => state.users);
  const { user } = useAppSelector((state) => state.auth);
  const [isLoading, setIsLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [detail, setDetail] = useState<ConsorcioDrilldown | null>(null);

  const [tareas, setTareas] = useState<TareaConsorcio[]>([]);
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({
    start: format(startOfMonth(subMonths(new Date(), 12)), 'yyyy-MM-dd'),
    end: format(endOfMonth(new Date()), 'yyyy-MM-dd'),
  });
  const [statusFilter, setStatusFilter] = useState<string[]>([...ESTADO_KEYS]);
  const [adminConsorcioFilter, setAdminConsorcioFilter] = useState<string[]>([]);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        if (isAdminRole(user) && !hideAdminFilter) {
          await dispatch(fetchUsers());
        }

        const response = await api.get('/tareas-consorcio', {
          params: { limit: 2000, page: 1 },
        });
        const payload = response.data;
        const list: TareaConsorcio[] = Array.isArray(payload?.tareas)
          ? payload.tareas
          : Array.isArray(payload?.data)
            ? payload.data
            : Array.isArray(payload)
              ? payload
              : [];
        setTareas(list);
      } catch (error) {
        console.error('Error al cargar los datos:', error);
        setTareas([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [dispatch, user?.rol, hideAdminFilter]);

  const filteredTasks = useMemo(() => {
    let filtered = [...tareas];

    if (dateRange.start && dateRange.end) {
      const startDate = new Date(dateRange.start);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(dateRange.end);
      endDate.setHours(23, 59, 59, 999);
      filtered = filtered.filter((task) => {
        const raw = task.fechaEjecucion || task.fechaCreacion;
        if (!raw) return true;
        const taskDate = new Date(raw);
        if (isNaN(taskDate.getTime())) return true;
        return taskDate >= startDate && taskDate <= endDate;
      });
    }

    if (statusFilter.length > 0) {
      filtered = filtered.filter((task) => statusFilter.includes(task.estado));
    }

    if (!hideAdminFilter && adminConsorcioFilter.length > 0) {
      filtered = filtered.filter(
        (task) =>
          task.administradorConsorcio &&
          adminConsorcioFilter.includes(task.administradorConsorcio._id)
      );
    }

    return filtered;
  }, [tareas, dateRange, statusFilter, adminConsorcioFilter, hideAdminFilter]);

  const summary = useMemo(() => buildConsorcioSummary(filteredTasks), [filteredTasks]);
  const adminConsorcios = useMemo(
    () => (Array.isArray(users) ? users.filter((u) => u.rol === 'adminConsorcio') : []),
    [users]
  );

  const openTasks = (titleText: string, list: TareaConsorcio[], subtitle?: string) => {
    setDetail({ title: titleText, subtitle, tasks: list });
  };

  const resetFilters = () => {
    setDateRange({
      start: format(startOfMonth(subMonths(new Date(), 12)), 'yyyy-MM-dd'),
      end: format(endOfMonth(new Date()), 'yyyy-MM-dd'),
    });
    setStatusFilter([...ESTADO_KEYS]);
    setAdminConsorcioFilter([]);
    setDetail(null);
  };

  const adminNameOf = (task: TareaConsorcio) =>
    task.administradorConsorcio?.nombre || 'Sin admin';

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
        <span className="ml-2 text-gray-600 dark:text-gray-300">Cargando análisis...</span>
      </div>
    );
  }

  const kpis = [
    {
      title: 'Tareas',
      value: summary.total,
      icon: ClipboardList,
      color: 'bg-blue-500',
      list: filteredTasks,
    },
    {
      title: 'Cobrados',
      value: formatMoney(summary.revenuePaid),
      icon: DollarSign,
      color: 'bg-emerald-500',
      list: filteredTasks.filter((t) => t.estado === 'PAGADO'),
    },
    {
      title: 'Por cobrar',
      value: formatMoney(summary.revenuePending),
      icon: Clock,
      color: 'bg-orange-500',
      list: filteredTasks.filter((t) =>
        ['PENDIENTE_PAGO', 'FACTURADO', 'completada', 'en_progreso', 'confirmado', 'pendiente'].includes(
          t.estado
        )
      ),
    },
    {
      title: 'Ticket prom.',
      value: formatMoney(summary.ticketPromedio),
      icon: CreditCard,
      color: 'bg-indigo-500',
      list: filteredTasks.filter((t) => (t.precio || 0) > 0),
    },
    {
      title: 'Conv. a pago',
      value: `${summary.conversionPago}%`,
      icon: Percent,
      color: 'bg-sky-500',
      list: filteredTasks.filter((t) => t.estado === 'PAGADO'),
    },
    {
      title: 'Aging cobranza',
      value: summary.agingCobranza,
      icon: AlertTriangle,
      color: 'bg-amber-500',
      list: filteredTasks.filter((t) => ['PENDIENTE_PAGO', 'FACTURADO'].includes(t.estado)),
    },
  ];

  const filtersButton = (
    <button
      type="button"
      onClick={() => setShowFilters(!showFilters)}
      className="inline-flex items-center px-4 py-2.5 text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700"
    >
      <Filter className="h-4 w-4 mr-2" />
      Filtros
    </button>
  );

  return (
    <div className={embedded ? 'animate-fadeIn' : 'pb-6 animate-fadeIn'}>
      <div className="space-y-4">
        {!embedded ? (
          <AdminPageHeader
            title={title}
            description={description}
            eyebrow="Análisis"
            icon={<Building className="h-5 w-5" />}
            actions={filtersButton}
          />
        ) : (
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <p className="text-sm text-slate-500 dark:text-slate-400">{description}</p>
            {filtersButton}
          </div>
        )}

        {showFilters && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                Filtros
              </span>
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
            <div
              className={`grid grid-cols-1 gap-4 ${hideAdminFilter ? 'md:grid-cols-2' : 'md:grid-cols-3'}`}
            >
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
                <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto">
                  {ESTADO_KEYS.map((value) => {
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
                        {ESTADO_LABEL[value] || value}
                      </button>
                    );
                  })}
                </div>
              </div>
              {!hideAdminFilter && (
                <div>
                  <label className="text-xs text-slate-500 mb-2 block">Administradores</label>
                  <select
                    multiple
                    value={adminConsorcioFilter}
                    onChange={(e) =>
                      setAdminConsorcioFilter(
                        Array.from(e.target.selectedOptions, (o) => o.value)
                      )
                    }
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-gray-700 text-sm py-1.5 min-h-[72px]"
                  >
                    {adminConsorcios.map((admin) => (
                      <option key={admin._id} value={admin._id}>
                        {admin.nombre}
                      </option>
                    ))}
                  </select>
                </div>
              )}
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
                onClick={() => openTasks(kpi.title, kpi.list)}
                className="text-left rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-gray-800 p-4 hover:border-blue-300 dark:hover:border-blue-700 transition-colors"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-slate-500">{kpi.title}</span>
                  <div className={`${kpi.color} rounded-lg p-2`}>
                    <Icon className="h-4 w-4 text-white" />
                  </div>
                </div>
                <span className="text-lg font-bold text-slate-900 dark:text-white tabular-nums truncate block">
                  {kpi.value}
                </span>
              </button>
            );
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <ChartCard
            title="Tareas por mes"
            icon={<Calendar className="h-4 w-4 text-blue-500" />}
          >
            <SimpleCategoryChart
              items={summary.byMes}
              color="#3b82f6"
              onBarClick={(label) =>
                openTasks(
                  `Mes: ${label}`,
                  filteredTasks.filter((t) => {
                    const raw = t.fechaEjecucion || t.fechaCreacion;
                    if (!raw) return false;
                    const d = new Date(raw);
                    if (isNaN(d.getTime())) return false;
                    const mes = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
                    return mes === label;
                  })
                )
              }
            />
          </ChartCard>

          <ChartCard
            title="Embudo por estado"
            icon={<CheckCircle className="h-4 w-4 text-emerald-500" />}
          >
            <SimpleCategoryChart
              items={summary.byEstado.map((e) => ({ label: e.label, count: e.count }))}
              color="#10b981"
              onBarClick={(label) => {
                const key = Object.entries(ESTADO_LABEL).find(([, v]) => v === label)?.[0];
                openTasks(
                  `Estado: ${label}`,
                  filteredTasks.filter((t) => (key ? t.estado === key : false))
                );
              }}
            />
          </ChartCard>

          {!hideAdminFilter && (
            <ChartCard
              title="Volumen por administrador"
              icon={<Building className="h-4 w-4 text-violet-500" />}
            >
              <SimpleCategoryChart
                items={summary.adminVolume}
                color="#8b5cf6"
                onBarClick={(label) =>
                  openTasks(
                    `Admin: ${label}`,
                    filteredTasks.filter((t) => adminNameOf(t) === label)
                  )
                }
              />
            </ChartCard>
          )}

          <ChartCard
            title="Ingresos pagados por administrador"
            icon={<DollarSign className="h-4 w-4 text-emerald-500" />}
          >
            <SimpleCategoryChart
              items={summary.byAdmin.map((a) => ({
                label: a.label,
                count: Math.round(a.revenue),
              }))}
              color="#059669"
              datasetLabel="Ingresos"
              formatValue={formatMoney}
              onBarClick={(label) =>
                openTasks(
                  `Pagado · ${label}`,
                  filteredTasks.filter(
                    (t) => t.estado === 'PAGADO' && adminNameOf(t) === label
                  )
                )
              }
            />
          </ChartCard>

          <ChartCard
            title="Monto por estado"
            icon={<CreditCard className="h-4 w-4 text-indigo-500" />}
          >
            <SimpleCategoryChart
              items={summary.revenueByEstado}
              color="#6366f1"
              datasetLabel="Monto"
              formatValue={formatMoney}
              onBarClick={(label) => {
                const key = Object.entries(ESTADO_LABEL).find(([, v]) => v === label)?.[0];
                openTasks(
                  `Monto · ${label}`,
                  filteredTasks.filter((t) => (key ? t.estado === key : false))
                );
              }}
            />
          </ChartCard>

          <ChartCard
            title="Top clientes"
            icon={<Tag className="h-4 w-4 text-teal-500" />}
          >
            <SimpleCategoryChart
              items={summary.topClientes}
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
            title="Carga por técnico"
            icon={<Users className="h-4 w-4 text-orange-500" />}
          >
            <SimpleCategoryChart
              items={summary.byTecnico}
              color="#f97316"
              onBarClick={(label) =>
                openTasks(
                  `Técnico: ${label}`,
                  filteredTasks.filter((t) => {
                    const tecnicos = Array.isArray(t.tecnicos) ? t.tecnicos : [];
                    if (tecnicos.length === 0) return label === 'Sin técnico';
                    return tecnicos.some((tec) => (tec?.nombre || 'Sin nombre') === label);
                  })
                )
              }
            />
          </ChartCard>

          <ChartCard
            title="Franjas horarias"
            icon={<Clock className="h-4 w-4 text-amber-500" />}
          >
            <SimpleCategoryChart
              items={summary.byFranja}
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
            title="Documentación"
            icon={<Image className="h-4 w-4 text-sky-500" />}
          >
            <SimpleCategoryChart
              items={summary.docsBreakdown}
              color="#0ea5e9"
              onBarClick={(label) => {
                if (label === 'Con fotos') {
                  openTasks(label, filteredTasks.filter((t) => t.fotos && t.fotos.length > 0));
                } else if (label === 'Sin fotos') {
                  openTasks(label, filteredTasks.filter((t) => !t.fotos || t.fotos.length === 0));
                } else if (label === 'Con comprobante') {
                  openTasks(label, filteredTasks.filter((t) => !!t.comprobantePago));
                } else {
                  openTasks(label, filteredTasks.filter((t) => !t.comprobantePago));
                }
              }}
            />
          </ChartCard>

          <ChartCard
            title="Aging y alertas"
            icon={<Briefcase className="h-4 w-4 text-rose-500" />}
          >
            <SimpleCategoryChart
              items={[
                {
                  label: 'Pendiente pago',
                  count: filteredTasks.filter((t) => t.estado === 'PENDIENTE_PAGO').length,
                },
                {
                  label: 'Facturado',
                  count: filteredTasks.filter((t) => t.estado === 'FACTURADO').length,
                },
                { label: 'Canceladas', count: summary.canceladas },
                { label: 'Sin admin', count: summary.sinAdmin },
              ].filter((x) => x.count > 0)}
              color="#f43f5e"
              onBarClick={(label) => {
                if (label === 'Pendiente pago') {
                  openTasks(label, filteredTasks.filter((t) => t.estado === 'PENDIENTE_PAGO'));
                } else if (label === 'Facturado') {
                  openTasks(label, filteredTasks.filter((t) => t.estado === 'FACTURADO'));
                } else if (label === 'Canceladas') {
                  openTasks(label, filteredTasks.filter((t) => t.estado === 'cancelada'));
                } else {
                  openTasks(
                    label,
                    filteredTasks.filter(
                      (t) => !t.administradorConsorcio || !(t.administradorConsorcio as any)._id
                    )
                  );
                }
              }}
            />
          </ChartCard>
        </div>

        {detail && (
          <ConsorcioDrilldownPanel drilldown={detail} onClose={() => setDetail(null)} />
        )}
      </div>
    </div>
  );
};

export default ConsorcioAnalytics;

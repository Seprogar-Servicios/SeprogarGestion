import React, { useMemo, useState } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';
import {
  format,
  subDays,
  subWeeks,
  subMonths,
  isSameDay,
  isSameWeek,
  isSameMonth,
  startOfDay,
} from 'date-fns';
import { es } from 'date-fns/locale';
import {
  ChevronRight,
  RotateCcw,
  Calendar,
  CheckCircle,
  Users,
  MousePointerClick,
} from 'lucide-react';
import type { Task, User } from '../../types';
import { useTheme } from '../../hooks/useTheme';
import ChartDrilldownPanel from './ChartDrilldownPanel';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Title, Tooltip, Legend);

type ExplorerView = 'time' | 'status' | 'user';
type TimeRange = 'day' | 'week' | 'month';

interface Level {
  id: string;
  label: string;
  tasks: Task[];
  focus: ExplorerView;
}

interface Props {
  tasks: Task[];
  users: User[];
}

const STATUS_ORDER = ['pendiente', 'en progreso', 'completada', 'cancelada'] as const;
const STATUS_LABEL: Record<string, string> = {
  pendiente: 'Pendiente',
  'en progreso': 'En progreso',
  completada: 'Completada',
  cancelada: 'Cancelada',
};
const STATUS_COLOR: Record<string, string> = {
  pendiente: '#FF6B6B',
  'en progreso': '#F9AB00',
  completada: '#1e8e3e',
  cancelada: '#94A3B8',
};

const normalizeDate = (date: Date) => {
  const d = new Date(date);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000);
};

const taskDate = (task: Task) => {
  const raw = task.fechaEjecucion || task.fechaCreacion;
  if (!raw) return null;
  const d = normalizeDate(new Date(raw));
  return isNaN(d.getTime()) ? null : d;
};

const tecnicoId = (t: any): string | null => {
  if (!t) return null;
  return typeof t === 'string' ? t : t._id || null;
};

const tecnicoNombre = (id: string, users: User[]) => {
  if (id === 'unassigned') return 'Sin asignar';
  const u = users.find((x) => x._id === id);
  return u?.nombre || 'Técnico';
};

const AnalyticsChartExplorer: React.FC<Props> = ({ tasks, users }) => {
  const { isDarkMode } = useTheme();
  const [timeRange, setTimeRange] = useState<TimeRange>('day');
  const [stack, setStack] = useState<Level[]>([
    { id: 'root', label: 'Vista general', tasks, focus: 'time' },
  ]);
  const [showList, setShowList] = useState(false);

  // Mantener el nivel raíz sincronizado con filtros externos
  const rootTasks = tasks;
  const levels = useMemo(() => {
    if (stack.length === 1) {
      return [{ ...stack[0], tasks: rootTasks }];
    }
    return stack.map((level, i) => (i === 0 ? { ...level, tasks: rootTasks } : level));
  }, [stack, rootTasks]);

  const current = levels[levels.length - 1];
  const currentTasks = current.tasks;

  const pushLevel = (level: Level) => {
    setStack((prev) => [...prev, level]);
    setShowList(false);
  };

  const goToLevel = (index: number) => {
    setStack((prev) => prev.slice(0, index + 1));
    setShowList(false);
  };

  const reset = () => {
    setStack([{ id: 'root', label: 'Vista general', tasks: rootTasks, focus: 'time' }]);
    setShowList(false);
  };

  // —— Datos período ——
  const timeBuckets = useMemo(() => {
    const today = startOfDay(normalizeDate(new Date()));
    let labels: string[] = [];
    let buckets: { label: string; tasks: Task[]; key: string }[] = [];

    if (timeRange === 'day') {
      buckets = Array.from({ length: 7 }, (_, i) => {
        const date = subDays(today, 6 - i);
        const label = format(date, 'EEE d', { locale: es });
        return {
          key: date.toISOString(),
          label,
          tasks: currentTasks.filter((t) => {
            const d = taskDate(t);
            return d && isSameDay(d, date);
          }),
        };
      });
    } else if (timeRange === 'week') {
      buckets = Array.from({ length: 4 }, (_, i) => {
        const date = subWeeks(today, 3 - i);
        const label = `Sem ${format(date, 'w')}`;
        return {
          key: `w-${format(date, 'yyyy-ww')}`,
          label,
          tasks: currentTasks.filter((t) => {
            const d = taskDate(t);
            return d && isSameWeek(d, date, { weekStartsOn: 1 });
          }),
        };
      });
    } else {
      buckets = Array.from({ length: 6 }, (_, i) => {
        const date = subMonths(today, 5 - i);
        const label = format(date, 'MMM yyyy', { locale: es });
        return {
          key: format(date, 'yyyy-MM'),
          label,
          tasks: currentTasks.filter((t) => {
            const d = taskDate(t);
            return d && isSameMonth(d, date);
          }),
        };
      });
    }
    labels = buckets.map((b) => b.label);
    return { labels, buckets };
  }, [currentTasks, timeRange]);

  // —— Datos estado ——
  const statusBuckets = useMemo(
    () =>
      STATUS_ORDER.map((estado) => ({
        key: estado,
        label: STATUS_LABEL[estado],
        color: STATUS_COLOR[estado],
        tasks: currentTasks.filter((t) => t.estado === estado),
      })).filter((b) => b.tasks.length > 0 || levels.length === 1),
    [currentTasks, levels.length]
  );

  // —— Datos técnico ——
  const userBuckets = useMemo(() => {
    const map = new Map<string, Task[]>();
    currentTasks.forEach((task) => {
      const ids = new Set<string>();
      (task.tecnicos || []).forEach((t) => {
        const id = tecnicoId(t);
        if (id) ids.add(id);
      });
      if (ids.size === 0) ids.add('unassigned');
      ids.forEach((id) => {
        const list = map.get(id) || [];
        if (!list.some((x) => x._id === task._id)) list.push(task);
        map.set(id, list);
      });
    });
    return Array.from(map.entries())
      .map(([id, list]) => ({
        key: id,
        label: tecnicoNombre(id, users),
        tasks: list,
      }))
      .sort((a, b) => b.tasks.length - a.tasks.length)
      .slice(0, 10);
  }, [currentTasks, users]);

  const tickColor = isDarkMode ? '#D1D5DB' : '#4B5563';
  const gridColor = isDarkMode ? 'rgba(75,85,99,0.25)' : 'rgba(209,213,219,0.5)';

  const primaryChart =
    current.focus === 'status' ? 'status' : current.focus === 'user' ? 'user' : 'time';

  // Al hacer drill, el gráfico secundario muestra la siguiente dimensión didáctica
  const secondaryFocus: ExplorerView =
    primaryChart === 'time' ? 'status' : primaryChart === 'status' ? 'user' : 'status';

  const drillFromTime = (index: number) => {
    const bucket = timeBuckets.buckets[index];
    if (!bucket) return;
    pushLevel({
      id: `time-${bucket.key}`,
      label: bucket.label,
      tasks: bucket.tasks,
      focus: 'status',
    });
  };

  const drillFromStatus = (index: number) => {
    const bucket = statusBuckets[index];
    if (!bucket || bucket.tasks.length === 0) return;
    pushLevel({
      id: `status-${bucket.key}`,
      label: bucket.label,
      tasks: bucket.tasks,
      focus: 'user',
    });
  };

  const drillFromUser = (index: number) => {
    const bucket = userBuckets[index];
    if (!bucket) return;
    // Último nivel: enfocamos estado/tiempo de ese técnico y abrimos lista
    pushLevel({
      id: `user-${bucket.key}`,
      label: bucket.label,
      tasks: bucket.tasks,
      focus: 'status',
    });
    setShowList(true);
  };

  const timeChartData = {
    labels: timeBuckets.labels,
    datasets: [
      {
        label: 'Tareas',
        data: timeBuckets.buckets.map((b) => b.tasks.length),
        backgroundColor: isDarkMode ? 'rgba(96,165,250,0.65)' : 'rgba(59,130,246,0.7)',
        borderColor: '#3B82F6',
        borderWidth: 1,
        borderRadius: 6,
        hoverBackgroundColor: '#2563EB',
      },
    ],
  };

  const statusChartData = {
    labels: statusBuckets.map((b) => b.label),
    datasets: [
      {
        data: statusBuckets.map((b) => b.tasks.length),
        backgroundColor: statusBuckets.map((b) => b.color + 'CC'),
        borderColor: statusBuckets.map((b) => b.color),
        borderWidth: 2,
        borderRadius: 4,
        spacing: 3,
      },
    ],
  };

  const userChartData = {
    labels: userBuckets.map((b) =>
      b.label.length > 16 ? `${b.label.slice(0, 15)}…` : b.label
    ),
    datasets: [
      {
        label: 'Tareas',
        data: userBuckets.map((b) => b.tasks.length),
        backgroundColor: 'rgba(0,164,235,0.55)',
        borderColor: '#00a4eb',
        borderWidth: 1,
        borderRadius: 6,
        barThickness: 16,
        hoverBackgroundColor: 'rgba(0,164,235,0.9)',
      },
    ],
  };

  const barOptions = (onClickIndex: (i: number) => void, horizontal = false) => ({
    indexAxis: horizontal ? ('y' as const) : ('x' as const),
    responsive: true,
    maintainAspectRatio: false,
    onHover: (event: any, els: unknown[]) => {
      const t = event?.native?.target as HTMLElement | undefined;
      if (t) t.style.cursor = els?.length ? 'pointer' : 'default';
    },
    onClick: (_: unknown, els: { index: number }[]) => {
      if (els?.length) onClickIndex(els[0].index);
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          afterBody: () => ['', 'Clic para profundizar →'],
        },
      },
    },
    scales: {
      x: {
        beginAtZero: true,
        ticks: { precision: 0, color: tickColor, font: { size: 11 } },
        grid: { color: horizontal ? gridColor : 'transparent', drawBorder: false },
      },
      y: {
        beginAtZero: true,
        ticks: { precision: 0, color: tickColor, font: { size: 11 }, autoSkip: !horizontal },
        grid: { color: horizontal ? 'transparent' : gridColor, drawBorder: false },
      },
    },
  });

  const donutOptions = (onClickIndex: (i: number) => void) => ({
    responsive: true,
    maintainAspectRatio: false,
    cutout: '62%',
    onHover: (event: any, els: unknown[]) => {
      const t = event?.native?.target as HTMLElement | undefined;
      if (t) t.style.cursor = els?.length ? 'pointer' : 'default';
    },
    onClick: (_: unknown, els: { index: number }[]) => {
      if (els?.length) onClickIndex(els[0].index);
    },
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          color: tickColor,
          usePointStyle: true,
          pointStyle: 'circle' as const,
          font: { size: 11 },
          padding: 12,
        },
      },
      tooltip: {
        callbacks: {
          afterBody: () => ['', 'Clic para profundizar →'],
        },
      },
    },
  });

  const renderPrimary = () => {
    if (primaryChart === 'status') {
      return (
        <Doughnut
          data={statusChartData}
          options={donutOptions(drillFromStatus) as any}
        />
      );
    }
    if (primaryChart === 'user') {
      return (
        <Bar
          data={userChartData}
          options={barOptions(drillFromUser, true) as any}
        />
      );
    }
    return (
      <Bar data={timeChartData} options={barOptions(drillFromTime) as any} />
    );
  };

  const renderSecondary = () => {
    if (secondaryFocus === 'status') {
      return (
        <Doughnut
          data={statusChartData}
          options={donutOptions(drillFromStatus) as any}
        />
      );
    }
    if (secondaryFocus === 'user') {
      return (
        <Bar
          data={userChartData}
          options={barOptions(drillFromUser, true) as any}
        />
      );
    }
    return (
      <Bar data={timeChartData} options={barOptions(drillFromTime) as any} />
    );
  };

  const primaryTitle =
    primaryChart === 'time'
      ? 'Por período'
      : primaryChart === 'status'
        ? 'Por estado'
        : 'Por técnico';

  const secondaryTitle =
    secondaryFocus === 'time'
      ? 'Detalle por período'
      : secondaryFocus === 'status'
        ? 'Detalle por estado'
        : 'Detalle por técnico';

  const focusSwitcher: { id: ExplorerView; label: string; icon: React.ReactNode }[] = [
    { id: 'time', label: 'Período', icon: <Calendar className="h-3.5 w-3.5" /> },
    { id: 'status', label: 'Estado', icon: <CheckCircle className="h-3.5 w-3.5" /> },
    { id: 'user', label: 'Técnico', icon: <Users className="h-3.5 w-3.5" /> },
  ];

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-gray-800 overflow-hidden">
      {/* Header + breadcrumbs */}
      <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700 space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
              <MousePointerClick className="h-4 w-4 text-blue-500" />
              Explorador interactivo
            </h2>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              Tocá una barra o segmento para entrar al detalle. Usá el camino para volver.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {levels.length > 1 && (
              <button
                type="button"
                onClick={reset}
                className="inline-flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Reiniciar
              </button>
            )}
            <button
              type="button"
              onClick={() => setShowList((v) => !v)}
              className="text-xs px-2.5 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
            >
              {showList ? 'Ocultar lista' : `Lista (${currentTasks.length})`}
            </button>
          </div>
        </div>

        {/* Breadcrumb */}
        <nav className="flex flex-wrap items-center gap-1 text-xs">
          {levels.map((level, index) => {
            const isLast = index === levels.length - 1;
            return (
              <React.Fragment key={level.id + index}>
                {index > 0 && <ChevronRight className="h-3.5 w-3.5 text-slate-400" />}
                <button
                  type="button"
                  onClick={() => goToLevel(index)}
                  className={`px-2 py-1 rounded-md transition-colors ${
                    isLast
                      ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200 font-medium'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                  }`}
                >
                  {level.label}
                  <span className="ml-1 text-[10px] opacity-70">({level.tasks.length})</span>
                </button>
              </React.Fragment>
            );
          })}
        </nav>

        {/* Controles de eje principal (solo en raíz o para cambiar foco del nivel) */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex gap-1 p-0.5 rounded-lg bg-slate-100 dark:bg-slate-900/60">
            {focusSwitcher.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() =>
                  setStack((prev) => {
                    const copy = [...prev];
                    copy[copy.length - 1] = { ...copy[copy.length - 1], focus: f.id };
                    return copy;
                  })
                }
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium ${
                  current.focus === f.id
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                {f.icon}
                {f.label}
              </button>
            ))}
          </div>

          {primaryChart === 'time' && (
            <div className="flex gap-1">
              {([
                ['day', 'Días'],
                ['week', 'Semanas'],
                ['month', 'Meses'],
              ] as const).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setTimeRange(key)}
                  className={`px-2 py-1 rounded-md text-[11px] ${
                    timeRange === key
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Charts: principal + detalle */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 lg:divide-x divide-slate-200 dark:divide-slate-700">
        <div className="p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              {primaryTitle}
            </h3>
            <span className="text-[10px] text-blue-600 dark:text-blue-400">Clic → profundizar</span>
          </div>
          <div className="h-64 bg-slate-50 dark:bg-slate-900/40 rounded-xl p-2">{renderPrimary()}</div>
        </div>
        <div className="p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              {levels.length === 1 ? 'Complemento' : secondaryTitle}
            </h3>
            <span className="text-[10px] text-slate-400">
              {levels.length === 1
                ? 'También clickeable'
                : `Filtrado: ${current.label}`}
            </span>
          </div>
          <div className="h-64 bg-slate-50 dark:bg-slate-900/40 rounded-xl p-2">
            {renderSecondary()}
          </div>
        </div>
      </div>

      {showList && (
        <div className="px-4 pb-4">
          <ChartDrilldownPanel
            drilldown={{
              title: current.label,
              subtitle: 'Tareas del nivel actual del explorador',
              tasks: currentTasks,
            }}
            onClose={() => setShowList(false)}
          />
        </div>
      )}
    </div>
  );
};

export default AnalyticsChartExplorer;

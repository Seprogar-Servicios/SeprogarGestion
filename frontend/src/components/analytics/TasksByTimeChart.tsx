import React, { useState, useRef, useMemo } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import {
  format,
  eachDayOfInterval,
  eachWeekOfInterval,
  eachMonthOfInterval,
  startOfWeek,
  endOfWeek,
  isWithinInterval,
} from 'date-fns';
import { es } from 'date-fns/locale';
import type { Task } from '../../types';
import { useTheme } from '../../hooks/useTheme';
import type { ChartDrilldown } from './ChartDrilldownPanel';
import { parseLocalDayEnd, parseLocalDayStart } from '../../utils/analyticsPeriod';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

interface TasksByTimeChartProps {
  tasks: Task[];
  dateRange?: { start: string; end: string };
  onSegmentClick?: (drilldown: ChartDrilldown) => void;
}

type TimeRange = 'day' | 'week' | 'month';

const taskBucketDate = (task: Task): Date | null => {
  const raw = task.fechaCompletado || task.fechaEjecucion || task.fechaCreacion;
  if (!raw) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(String(raw).trim())) {
    return parseLocalDayStart(String(raw));
  }
  const d = new Date(raw);
  return isNaN(d.getTime()) ? null : d;
};

const TasksByTimeChart: React.FC<TasksByTimeChartProps> = ({
  tasks,
  dateRange,
  onSegmentClick,
}) => {
  const [timeRange, setTimeRange] = useState<TimeRange>('month');
  const chartRef = useRef<ChartJS<'bar'>>(null);
  const { isDarkMode } = useTheme();

  const { labels, data, buckets } = useMemo(() => {
    const end = dateRange?.end ? parseLocalDayEnd(dateRange.end) : new Date();
    const start = dateRange?.start
      ? parseLocalDayStart(dateRange.start)
      : new Date(end.getFullYear(), end.getMonth() - 5, 1);

    let labels: string[] = [];
    let intervals: Array<{ start: Date; end: Date }> = [];

    if (timeRange === 'day') {
      const days = eachDayOfInterval({ start, end }).slice(-31);
      labels = days.map((d) => format(d, 'EEE d', { locale: es }));
      intervals = days.map((d) => ({
        start: new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0),
        end: new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999),
      }));
    } else if (timeRange === 'week') {
      const weeks = eachWeekOfInterval({ start, end }, { weekStartsOn: 1 }).slice(-12);
      labels = weeks.map((d) => `Sem ${format(d, 'w')}`);
      intervals = weeks.map((d) => ({
        start: startOfWeek(d, { weekStartsOn: 1 }),
        end: endOfWeek(d, { weekStartsOn: 1 }),
      }));
    } else {
      const months = eachMonthOfInterval({ start, end }).slice(-12);
      labels = months.map((d) => format(d, 'MMM yyyy', { locale: es }));
      intervals = months.map((d) => ({
        start: new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0),
        end: new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999),
      }));
    }

    const buckets = intervals.map((iv) =>
      tasks.filter((task) => {
        const d = taskBucketDate(task);
        if (!d) return false;
        return isWithinInterval(d, iv);
      })
    );

    return {
      labels,
      data: buckets.map((b) => b.length),
      buckets,
    };
  }, [tasks, timeRange, dateRange?.start, dateRange?.end]);

  const primaryColor = isDarkMode ? '#60A5FA' : '#3B82F6';
  const secondaryColor = isDarkMode ? '#93C5FD' : '#BFDBFE';

  const chartData = {
    labels,
    datasets: [
      {
        label: 'Tareas',
        data,
        backgroundColor: (ctx: { chart: ChartJS }) => {
          const { ctx: c, chartArea } = ctx.chart;
          if (!chartArea) return primaryColor;
          const gradient = c.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
          gradient.addColorStop(0, primaryColor);
          gradient.addColorStop(1, secondaryColor);
          return gradient;
        },
        borderRadius: 6,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          footer: () => 'Clic para ver detalle',
        },
      },
    },
    onClick: (_: unknown, elements: Array<{ index: number }>) => {
      if (!onSegmentClick || !elements.length) return;
      const idx = elements[0].index;
      onSegmentClick({
        title: `Período: ${labels[idx]}`,
        subtitle: 'Según fechaCompletado / ejecución',
        tasks: buckets[idx] || [],
      });
    },
    scales: {
      x: {
        ticks: { color: isDarkMode ? '#9CA3AF' : '#6B7280', maxRotation: 45 },
        grid: { display: false },
      },
      y: {
        beginAtZero: true,
        ticks: { color: isDarkMode ? '#9CA3AF' : '#6B7280', precision: 0 },
        grid: { color: isDarkMode ? '#374151' : '#E5E7EB' },
      },
    },
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex gap-1 mb-2 justify-end">
        {([
          ['day', 'Día'],
          ['week', 'Semana'],
          ['month', 'Mes'],
        ] as const).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTimeRange(id)}
            className={`px-2 py-0.5 text-[11px] rounded-md ${
              timeRange === id
                ? 'bg-blue-600 text-white'
                : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="flex-1 min-h-0">
        <Bar ref={chartRef} data={chartData} options={options as never} />
      </div>
      <p className="text-[10px] text-slate-400 mt-1">
        Respeta el rango de filtros · usa fechaCompletado si existe
      </p>
    </div>
  );
};

export default TasksByTimeChart;

import React, { useState, useRef, useEffect, useMemo } from 'react';
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
import { format, subDays, subWeeks, subMonths, isSameDay, isSameWeek, isSameMonth } from 'date-fns';
import { es } from 'date-fns/locale';
import type { Task } from '../../types';
import { useTheme } from '../../hooks/useTheme';
import { Calendar } from 'lucide-react';
import type { ChartDrilldown } from './ChartDrilldownPanel';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

interface TasksByTimeChartProps {
  tasks: Task[];
  onSegmentClick?: (drilldown: ChartDrilldown) => void;
}

type TimeRange = 'day' | 'week' | 'month';

const TasksByTimeChart: React.FC<TasksByTimeChartProps> = ({ tasks, onSegmentClick }) => {
  const [timeRange, setTimeRange] = useState<TimeRange>('day');
  const chartRef = useRef<ChartJS<'bar'>>(null);
  const { isDarkMode } = useTheme();

  const normalizeDate = (date: Date): Date => {
    const d = new Date(date);
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  };

  const { labels, data, buckets } = useMemo(() => {
    const today = normalizeDate(new Date());
    let labels: string[] = [];
    let buckets: Task[][] = [];

    const taskMatches = (task: Task, predicate: (d: Date) => boolean) => {
      const taskDate = task.fechaEjecucion || task.fechaCreacion;
      if (!taskDate) return false;
      return predicate(normalizeDate(new Date(taskDate)));
    };

    if (timeRange === 'day') {
      labels = Array.from({ length: 7 }, (_, i) => {
        const date = subDays(today, 6 - i);
        return format(date, 'EEE d', { locale: es });
      });
      buckets = labels.map((_, index) => {
        const date = subDays(today, 6 - index);
        return tasks.filter((task) => taskMatches(task, (d) => isSameDay(d, date)));
      });
    } else if (timeRange === 'week') {
      labels = Array.from({ length: 4 }, (_, i) => {
        const date = subWeeks(today, 3 - i);
        return `Sem ${format(date, 'w')}`;
      });
      buckets = labels.map((_, index) => {
        const date = subWeeks(today, 3 - index);
        return tasks.filter((task) =>
          taskMatches(task, (d) => isSameWeek(d, date, { weekStartsOn: 1 }))
        );
      });
    } else {
      labels = Array.from({ length: 6 }, (_, i) => {
        const date = subMonths(today, 5 - i);
        return format(date, 'MMM yyyy', { locale: es });
      });
      buckets = labels.map((_, index) => {
        const date = subMonths(today, 5 - index);
        return tasks.filter((task) => taskMatches(task, (d) => isSameMonth(d, date)));
      });
    }

    return {
      labels,
      data: buckets.map((b) => b.length),
      buckets,
    };
  }, [tasks, timeRange]);

  const primaryColor = isDarkMode ? '#60A5FA' : '#3B82F6';
  const secondaryColor = isDarkMode ? '#93C5FD' : '#BFDBFE';

  const getGradient = (ctx: CanvasRenderingContext2D) => {
    const gradient = ctx.createLinearGradient(0, 0, 0, 400);
    gradient.addColorStop(0, primaryColor);
    gradient.addColorStop(1, secondaryColor);
    return gradient;
  };

  const chartData = {
    labels,
    datasets: [
      {
        label: 'Número de tareas',
        data,
        backgroundColor: (context: any) => {
          const chart = context.chart;
          const { ctx, chartArea } = chart;
          if (!chartArea) return isDarkMode ? 'rgba(96, 165, 250, 0.7)' : 'rgba(59, 130, 246, 0.7)';
          return getGradient(ctx);
        },
        borderColor: isDarkMode ? '#60A5FA' : '#3B82F6',
        borderWidth: 1,
        borderRadius: 6,
        hoverBackgroundColor: isDarkMode ? '#3B82F6' : '#2563EB',
        hoverBorderWidth: 2,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    onHover: (event: any, elements: unknown[]) => {
      const target = event?.native?.target as HTMLElement | undefined;
      if (target) target.style.cursor = elements?.length ? 'pointer' : 'default';
    },
    onClick: (_: unknown, elements: { index: number }[]) => {
      if (!onSegmentClick || !elements?.length) return;
      const index = elements[0].index;
      const rangeLabel =
        timeRange === 'day' ? 'Día' : timeRange === 'week' ? 'Semana' : 'Mes';
      onSegmentClick({
        title: `${rangeLabel}: ${labels[index]}`,
        subtitle: 'Tareas del período seleccionado',
        tasks: buckets[index] || [],
      });
    },
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          boxWidth: 12,
          usePointStyle: true,
          pointStyle: 'rectRounded' as const,
          font: { size: 12, weight: 'bold' as const },
          color: isDarkMode ? '#E5E7EB' : '#374151',
          padding: 16,
        },
      },
      title: { display: false },
      tooltip: {
        backgroundColor: isDarkMode ? '#374151' : '#FFFFFF',
        titleColor: isDarkMode ? '#E5E7EB' : '#111827',
        bodyColor: isDarkMode ? '#E5E7EB' : '#374151',
        borderColor: isDarkMode ? '#4B5563' : '#E5E7EB',
        borderWidth: 1,
        padding: 12,
        cornerRadius: 8,
        callbacks: {
          label: (context: any) => `Tareas: ${context.parsed.y}`,
          afterBody: () => ['', 'Clic para ver detalle'],
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          precision: 0,
          color: isDarkMode ? '#D1D5DB' : '#4B5563',
          font: { size: 11 },
        },
        grid: {
          color: isDarkMode ? 'rgba(75, 85, 99, 0.2)' : 'rgba(209, 213, 219, 0.5)',
          drawBorder: false,
        },
      },
      x: {
        ticks: {
          color: isDarkMode ? '#D1D5DB' : '#4B5563',
          font: { size: 11 },
        },
        grid: { display: false, drawBorder: false },
      },
    },
    animation: { duration: 800, easing: 'easeOutQuart' as const },
    barPercentage: 0.7,
    categoryPercentage: 0.8,
  };

  useEffect(() => {
    chartRef.current?.update();
  }, [isDarkMode, timeRange, tasks]);

  return (
    <div className="h-full">
      <div className="flex justify-center mb-3 space-x-2">
        {([
          ['day', 'Diario'],
          ['week', 'Semanal'],
          ['month', 'Mensual'],
        ] as const).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTimeRange(key)}
            className={`px-3 py-1.5 rounded-lg transition-all text-sm flex items-center cursor-pointer ${
              timeRange === key
                ? 'bg-blue-500 text-white shadow-md'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            <Calendar
              className={`h-3.5 w-3.5 mr-1 ${
                timeRange === key ? 'text-white' : 'text-blue-500 dark:text-blue-400'
              }`}
            />
            {label}
          </button>
        ))}
      </div>
      <div className="h-[calc(100%-48px)]">
        <Bar data={chartData} options={options as any} ref={chartRef} />
      </div>
    </div>
  );
};

export default TasksByTimeChart;

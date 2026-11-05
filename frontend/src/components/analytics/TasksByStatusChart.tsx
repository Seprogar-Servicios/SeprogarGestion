import React, { useEffect, useMemo, useRef } from 'react';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, Title } from 'chart.js';
import { Doughnut } from 'react-chartjs-2';
import type { Task } from '../../types';
import { useTheme } from '../../hooks/useTheme';
import type { ChartDrilldown } from './ChartDrilldownPanel';

ChartJS.register(ArcElement, Tooltip, Legend, Title);

const STATUS_KEYS = ['pendiente', 'en progreso', 'completada', 'cancelada'] as const;
const STATUS_LABELS = ['Pendiente', 'En progreso', 'Completada', 'Cancelada'];

interface TasksByStatusChartProps {
  tasks: Task[];
  onSegmentClick?: (drilldown: ChartDrilldown) => void;
}

const TasksByStatusChart: React.FC<TasksByStatusChartProps> = ({ tasks, onSegmentClick }) => {
  const chartRef = useRef<ChartJS<'doughnut'>>(null);
  const { isDarkMode } = useTheme();

  const counts = useMemo(
    () => STATUS_KEYS.map((estado) => tasks.filter((t) => t.estado === estado).length),
    [tasks]
  );

  const pendingColor = '#FF6B6B';
  const inProgressColor = '#4ECDC4';
  const completedColor = '#59CD90';
  const cancelledColor = '#94A3B8';

  const data = {
    labels: STATUS_LABELS,
    datasets: [
      {
        data: counts,
        backgroundColor: isDarkMode
          ? ['#FF8080CC', '#5DDFDFCC', '#6EE7A0CC', '#CBD5E1CC']
          : [pendingColor + 'CC', inProgressColor + 'CC', completedColor + 'CC', cancelledColor + 'CC'],
        borderColor: isDarkMode
          ? ['#FF8080', '#5DDFDF', '#6EE7A0', '#CBD5E1']
          : [pendingColor, inProgressColor, completedColor, cancelledColor],
        borderWidth: 2,
        hoverBorderWidth: 0,
        borderRadius: 5,
        spacing: 5,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '65%',
    onHover: (_: unknown, elements: unknown[]) => {
      const canvas = chartRef.current?.canvas;
      if (canvas) canvas.style.cursor = elements?.length ? 'pointer' : 'default';
    },
    onClick: (_: unknown, elements: { index: number }[]) => {
      if (!onSegmentClick || !elements?.length) return;
      const index = elements[0].index;
      const estado = STATUS_KEYS[index];
      const label = STATUS_LABELS[index];
      onSegmentClick({
        title: `Estado: ${label}`,
        subtitle: 'Clic en el gráfico · detalle de tareas',
        tasks: tasks.filter((t) => t.estado === estado),
      });
    },
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          padding: 16,
          usePointStyle: true,
          pointStyle: 'circle' as const,
          font: { size: 12, weight: 'bold' as const },
          color: isDarkMode ? '#E5E7EB' : '#374151',
        },
      },
      tooltip: {
        callbacks: {
          afterBody: () => ['', 'Clic para ver detalle'],
          label: (context: any) => {
            const label = context.label || '';
            const value = context.raw || 0;
            const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0) || 1;
            const percentage = Math.round((value / total) * 100);
            return `${label}: ${value} (${percentage}%)`;
          },
        },
      },
      title: { display: false },
    },
    animation: {
      animateScale: true,
      animateRotate: true,
      duration: 800,
      easing: 'easeOutQuart' as const,
    },
  };

  useEffect(() => {
    chartRef.current?.update();
  }, [isDarkMode, tasks]);

  return (
    <div className="flex flex-col justify-center items-center h-full">
      <div className="relative w-full h-full flex justify-center items-center">
        <Doughnut data={data} options={options as any} ref={chartRef} />
        <div className="absolute flex flex-col justify-center items-center text-center pointer-events-none">
          <div className="text-3xl font-bold text-slate-900 dark:text-white">{tasks.length}</div>
          <div className="text-xs text-gray-500 dark:text-gray-400">Total</div>
        </div>
      </div>
    </div>
  );
};

export default TasksByStatusChart;

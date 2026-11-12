import React, { useMemo } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { differenceInHours, format } from 'date-fns';
import { es } from 'date-fns/locale';
import type { Task } from '../../types';
import { useTheme } from '../../hooks/useTheme';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

interface TasksCompletionTimeChartProps {
  tasks: Task[];
}

const TasksCompletionTimeChart: React.FC<TasksCompletionTimeChartProps> = ({ tasks }) => {
  const { isDarkMode } = useTheme();

  const { labels, avgData, medianData, sampleNote } = useMemo(() => {
    const completedTasks = tasks.filter(
      (task) =>
        task.estado === 'completada' &&
        task.fechaCreacion &&
        (task.fechaCompletado || task.fechaModificacion)
    );

    const tasksByMonth: Record<string, number[]> = {};
    let withCompletado = 0;

    completedTasks.forEach((task) => {
      const creationDate = new Date(task.fechaCreacion!);
      const endRaw = task.fechaCompletado || task.fechaModificacion;
      if (!endRaw) return;
      if (task.fechaCompletado) withCompletado += 1;
      const completionDate = new Date(endRaw);
      if (isNaN(creationDate.getTime()) || isNaN(completionDate.getTime())) return;

      const monthKey = format(task.fechaCompletado ? completionDate : creationDate, 'yyyy-MM');
      const hours = Math.max(0, differenceInHours(completionDate, creationDate));
      if (!tasksByMonth[monthKey]) tasksByMonth[monthKey] = [];
      tasksByMonth[monthKey].push(hours);
    });

    const sortedMonths = Object.keys(tasksByMonth).sort();
    const labels = sortedMonths.map((month) => {
      const [y, m] = month.split('-').map(Number);
      return format(new Date(y, m - 1, 1), 'MMM yyyy', { locale: es });
    });

    const avgData = sortedMonths.map((month) => {
      const arr = tasksByMonth[month];
      return Math.round(arr.reduce((s, h) => s + h, 0) / arr.length);
    });

    const medianData = sortedMonths.map((month) => {
      const arr = [...tasksByMonth[month]].sort((a, b) => a - b);
      const mid = Math.floor(arr.length / 2);
      return arr.length % 2 ? arr[mid] : Math.round((arr[mid - 1] + arr[mid]) / 2);
    });

    return {
      labels,
      avgData,
      medianData,
      sampleNote: `${withCompletado}/${completedTasks.length} con fechaCompletado`,
    };
  }, [tasks]);

  const chartData = {
    labels,
    datasets: [
      {
        label: 'Promedio (h)',
        data: avgData,
        borderColor: isDarkMode ? '#60A5FA' : '#2563EB',
        backgroundColor: 'transparent',
        tension: 0.25,
      },
      {
        label: 'Mediana (h)',
        data: medianData,
        borderColor: isDarkMode ? '#34D399' : '#059669',
        backgroundColor: 'transparent',
        borderDash: [4, 4],
        tension: 0.25,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: { color: isDarkMode ? '#D1D5DB' : '#374151', boxWidth: 12 },
      },
    },
    scales: {
      x: {
        ticks: { color: isDarkMode ? '#9CA3AF' : '#6B7280' },
        grid: { display: false },
      },
      y: {
        beginAtZero: true,
        ticks: { color: isDarkMode ? '#9CA3AF' : '#6B7280' },
        grid: { color: isDarkMode ? '#374151' : '#E5E7EB' },
        title: {
          display: true,
          text: 'Horas',
          color: isDarkMode ? '#9CA3AF' : '#6B7280',
        },
      },
    },
  };

  if (labels.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-sm text-slate-500">
        Sin tareas completadas con fechas suficientes
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 min-h-0">
        <Line data={chartData} options={options as never} />
      </div>
      <p className="text-[10px] text-slate-400 mt-1">{sampleNote}</p>
    </div>
  );
};

export default TasksCompletionTimeChart;

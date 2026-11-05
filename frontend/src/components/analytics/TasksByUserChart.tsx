import React, { useMemo } from 'react';
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
import type { Task } from '../../types';
import type { ChartDrilldown } from './ChartDrilldownPanel';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

interface TasksByUserChartProps {
  tasks: Task[];
  users: any[];
  onSegmentClick?: (drilldown: ChartDrilldown) => void;
}

const truncateLabel = (label: string, max = 18) =>
  label.length > max ? `${label.slice(0, max - 1)}…` : label;

const TasksByUserChart: React.FC<TasksByUserChartProps> = ({ tasks, users, onSegmentClick }) => {
  const { topUserIds, fullLabels, labels, data, tasksByUserId } = useMemo(() => {
    const userMap = users.reduce((acc, user) => {
      acc[user._id] = user;
      return acc;
    }, {} as Record<string, any>);

    const tasksByUserId: Record<string, Task[]> = {};

    const pushTask = (userId: string, task: Task) => {
      if (!tasksByUserId[userId]) tasksByUserId[userId] = [];
      if (!tasksByUserId[userId].some((t) => t._id === task._id)) {
        tasksByUserId[userId].push(task);
      }
    };

    tasks.forEach((task) => {
      let assigned = false;
      if (task.tecnicos && task.tecnicos.length > 0) {
        task.tecnicos.forEach((tecnico: any) => {
          const userId = typeof tecnico === 'string' ? tecnico : tecnico?._id;
          if (userId) {
            pushTask(userId, task);
            assigned = true;
          }
        });
      }
      if (!assigned && (task as any).tecnicoAsignado) {
        const t = (task as any).tecnicoAsignado;
        const userId = typeof t === 'string' ? t : t?._id;
        if (userId) {
          pushTask(userId, task);
          assigned = true;
        }
      }
      if (!assigned) pushTask('unassigned', task);
    });

    if (tasksByUserId.unassigned?.length) {
      userMap.unassigned = { _id: 'unassigned', nombre: 'Sin asignar', apellido: '' };
    }

    const counts: Record<string, number> = {};
    Object.keys(tasksByUserId).forEach((id) => {
      counts[id] = tasksByUserId[id].length;
    });

    const sortedUserIds = Object.keys(counts)
      .filter((id) => counts[id] > 0)
      .sort((a, b) => counts[b] - counts[a]);
    const topUserIds = sortedUserIds.slice(0, 10);

    const fullLabels = topUserIds.map((userId) => {
      const user = userMap[userId];
      if (!user) return 'Usuario desconocido';
      return user.apellido ? `${user.nombre} ${user.apellido}` : user.nombre;
    });

    return {
      topUserIds,
      fullLabels,
      labels: fullLabels.map((l) => truncateLabel(l)),
      data: topUserIds.map((id) => counts[id]),
      tasksByUserId,
    };
  }, [tasks, users]);

  const chartData = {
    labels,
    datasets: [
      {
        label: 'Número de tareas',
        data,
        backgroundColor: 'rgba(0, 164, 235, 0.55)',
        borderColor: '#00a4eb',
        borderWidth: 1,
        borderRadius: 6,
        barThickness: 18,
        hoverBackgroundColor: 'rgba(0, 164, 235, 0.85)',
      },
    ],
  };

  const options = {
    indexAxis: 'y' as const,
    responsive: true,
    maintainAspectRatio: false,
    layout: { padding: { top: 4, right: 12, bottom: 4, left: 4 } },
    onHover: (event: any, elements: unknown[]) => {
      const target = event?.native?.target as HTMLElement | undefined;
      if (target) target.style.cursor = elements?.length ? 'pointer' : 'default';
    },
    onClick: (_: unknown, elements: { index: number }[]) => {
      if (!onSegmentClick || !elements?.length) return;
      const index = elements[0].index;
      const userId = topUserIds[index];
      onSegmentClick({
        title: fullLabels[index] || 'Técnico',
        subtitle: 'Carga de tareas · clic en la barra',
        tasks: tasksByUserId[userId] || [],
      });
    },
    plugins: {
      legend: { display: false },
      title: { display: false },
      tooltip: {
        callbacks: {
          title: (tooltipItems: any[]) => {
            const idx = tooltipItems[0]?.dataIndex ?? 0;
            return fullLabels[idx] || tooltipItems[0]?.label;
          },
          label: (context: any) => {
            const value = context.raw;
            return `${value} tarea${value !== 1 ? 's' : ''}`;
          },
          afterBody: () => ['', 'Clic para ver detalle'],
        },
      },
    },
    scales: {
      x: {
        beginAtZero: true,
        grid: { color: 'rgba(148, 163, 184, 0.25)' },
        ticks: { precision: 0, maxTicksLimit: 8 },
      },
      y: {
        grid: { display: false },
        ticks: { autoSkip: false, font: { size: 11 } },
      },
    },
  };

  return (
    <div className="w-full h-full overflow-hidden">
      {labels.length > 0 ? (
        <div className="w-full h-full">
          <Bar data={chartData} options={options as any} />
        </div>
      ) : (
        <div className="flex justify-center items-center h-full text-slate-500 dark:text-slate-400 text-sm">
          No hay datos suficientes para mostrar
        </div>
      )}
    </div>
  );
};

export default TasksByUserChart;

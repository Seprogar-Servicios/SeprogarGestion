import React from 'react';
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

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

interface TasksByUserChartProps {
  tasks: Task[];
  users: any[];
}

const truncateLabel = (label: string, max = 18) =>
  label.length > max ? `${label.slice(0, max - 1)}…` : label;

const TasksByUserChart: React.FC<TasksByUserChartProps> = ({ tasks, users }) => {
  const userMap = users.reduce((acc, user) => {
    acc[user._id] = user;
    return acc;
  }, {} as Record<string, any>);

  const tasksByUser = tasks.reduce((acc, task) => {
    const addTecnico = (tecnico: any) => {
      if (!tecnico) return false;
      const userId = typeof tecnico === 'string' ? tecnico : tecnico._id ? tecnico._id : null;
      if (userId) {
        acc[userId] = (acc[userId] || 0) + 1;
        return true;
      }
      return false;
    };

    let taskAssigned = false;

    if (task.tecnicos && task.tecnicos.length > 0) {
      task.tecnicos.forEach((tecnico) => {
        if (addTecnico(tecnico)) taskAssigned = true;
      });
    }

    if (!taskAssigned && task.tecnicoAsignado) {
      addTecnico(task.tecnicoAsignado);
    }

    if (!taskAssigned && (!task.tecnicos || task.tecnicos.length === 0) && !task.tecnicoAsignado) {
      acc.unassigned = (acc.unassigned || 0) + 1;
    }
    return acc;
  }, {} as Record<string, number>);

  if (tasksByUser.unassigned) {
    userMap.unassigned = { _id: 'unassigned', nombre: 'Sin asignar', apellido: '' };
  }

  const sortedUserIds = Object.keys(tasksByUser)
    .filter((userId) => tasksByUser[userId] > 0)
    .sort((a, b) => tasksByUser[b] - tasksByUser[a]);
  const topUserIds = sortedUserIds.slice(0, 10);

  const fullLabels = topUserIds.map((userId) => {
    const user = userMap[userId];
    if (!user) return 'Usuario Desconocido';
    return user.apellido ? `${user.nombre} ${user.apellido}` : user.nombre;
  });
  const labels = fullLabels.map((label) => truncateLabel(label));
  const data = topUserIds.map((userId) => tasksByUser[userId]);

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
      },
    ],
  };

  const options = {
    indexAxis: 'y' as const,
    responsive: true,
    maintainAspectRatio: false,
    layout: {
      padding: { top: 4, right: 12, bottom: 4, left: 4 },
    },
    plugins: {
      legend: {
        display: false,
      },
      title: {
        display: false,
      },
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
        },
      },
    },
    scales: {
      x: {
        beginAtZero: true,
        grid: {
          color: 'rgba(148, 163, 184, 0.25)',
        },
        ticks: {
          precision: 0,
          maxTicksLimit: 8,
        },
      },
      y: {
        grid: {
          display: false,
        },
        ticks: {
          autoSkip: false,
          font: { size: 11 },
        },
      },
    },
  };

  const chartHeight = Math.max(260, topUserIds.length * 36 + 48);

  return (
    <div className="w-full overflow-hidden">
      {labels.length > 0 ? (
        <div className="w-full" style={{ height: chartHeight }}>
          <Bar data={chartData} options={options} />
        </div>
      ) : (
        <div className="flex justify-center items-center h-64 text-slate-500 dark:text-slate-400">
          No hay datos suficientes para mostrar
        </div>
      )}
    </div>
  );
};

export default TasksByUserChart;

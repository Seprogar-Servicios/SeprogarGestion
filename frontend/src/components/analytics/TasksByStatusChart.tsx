import React from 'react';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Pie } from 'react-chartjs-2';
import type { Task } from '../../types';

ChartJS.register(ArcElement, Tooltip, Legend);

interface TasksByStatusChartProps {
  tasks: Task[];
}

const TasksByStatusChart: React.FC<TasksByStatusChartProps> = ({ tasks }) => {
  // Contar tareas por estado
  const pendingTasks = tasks.filter(task => task.estado === 'pendiente').length;
  const inProgressTasks = tasks.filter(task => task.estado === 'en progreso').length;
  const completedTasks = tasks.filter(task => task.estado === 'completada').length;
  
  const data = {
    labels: ['Pendiente', 'En Progreso', 'Completada'],
    datasets: [
      {
        data: [pendingTasks, inProgressTasks, completedTasks],
        backgroundColor: [
          'rgba(255, 159, 64, 0.7)',  // Naranja para pendiente
          'rgba(54, 162, 235, 0.7)',   // Azul para en progreso
          'rgba(75, 192, 192, 0.7)',   // Verde para completada
        ],
        borderColor: [
          'rgb(255, 159, 64)',
          'rgb(54, 162, 235)',
          'rgb(75, 192, 192)',
        ],
        borderWidth: 1,
      },
    ],
  };
  
  const options = {
    responsive: true,
    plugins: {
      legend: {
        position: 'bottom' as const,
      },
      tooltip: {
        callbacks: {
          label: function(context: any) {
            const label = context.label || '';
            const value = context.raw || 0;
            const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
            const percentage = Math.round((value / total) * 100);
            return `${label}: ${value} (${percentage}%)`;
          }
        }
      }
    },
  };
  
  return (
    <div className="flex justify-center items-center h-64">
      <Pie data={data} options={options} />
    </div>
  );
};

export default TasksByStatusChart;

import React from 'react';
import { 
  Chart as ChartJS, 
  CategoryScale, 
  LinearScale, 
  BarElement, 
  Title, 
  Tooltip, 
  Legend 
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import type { Task } from '../../types';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

interface TasksByUserChartProps {
  tasks: Task[];
  users: any[]; // Ajustar según la estructura de usuarios
}

const TasksByUserChart: React.FC<TasksByUserChartProps> = ({ tasks, users }) => {
  // Crear un mapa de usuarios por ID para búsqueda rápida
  const userMap = users.reduce((acc, user) => {
    acc[user._id] = user;
    return acc;
  }, {} as Record<string, any>);
  
  // Contar tareas por usuario
  const tasksByUser = tasks.reduce((acc, task) => {
    // Si hay técnicos asignados, contar una tarea para cada uno
    if (task.tecnicos && task.tecnicos.length > 0) {
      task.tecnicos.forEach(tecnico => {
        const userId = typeof tecnico === 'string' ? tecnico : tecnico._id;
        acc[userId] = (acc[userId] || 0) + 1;
      });
    }
    return acc;
  }, {} as Record<string, number>);
  
  // Preparar datos para el gráfico
  // Solo mostrar los 10 usuarios con más tareas si hay muchos
  const sortedUserIds = Object.keys(tasksByUser).sort((a, b) => tasksByUser[b] - tasksByUser[a]);
  const topUserIds = sortedUserIds.slice(0, 10);
  
  const labels = topUserIds.map(userId => {
    const user = userMap[userId];
    return user ? `${user.nombre} ${user.apellido}` : 'Usuario Desconocido';
  });
  
  const data = topUserIds.map(userId => tasksByUser[userId]);
  
  // Datos para el gráfico
  const chartData = {
    labels,
    datasets: [
      {
        label: 'Número de tareas',
        data,
        backgroundColor: 'rgba(153, 102, 255, 0.5)',
        borderColor: 'rgb(153, 102, 255)',
        borderWidth: 1,
      },
    ],
  };
  
  const options = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: false,
      },
      tooltip: {
        callbacks: {
          title: function(tooltipItems: any[]) {
            return tooltipItems[0].label;
          },
          label: function(context: any) {
            const value = context.raw;
            return `${value} tarea${value !== 1 ? 's' : ''}`;
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          precision: 0
        }
      }
    }
  };
  
  return (
    <div>
      {labels.length > 0 ? (
        <Bar data={chartData} options={options} />
      ) : (
        <div className="flex justify-center items-center h-64 text-gray-500 dark:text-gray-400">
          No hay datos suficientes para mostrar
        </div>
      )}
    </div>
  );
};

export default TasksByUserChart;

import React from 'react';
import { 
  Chart as ChartJS, 
  CategoryScale, 
  LinearScale, 
  PointElement, 
  LineElement, 
  Title, 
  Tooltip, 
  Legend 
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { differenceInHours, format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import type { Task } from '../../types';

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
  // Filtrar tareas completadas que tengan fechas válidas
  // Para tareas completadas, usamos fechaModificacion como aproximación de la fecha de completado
  const completedTasks = tasks.filter(task => 
    task.estado === 'completada' && 
    task.fechaCreacion && 
    task.fechaModificacion
  );
  
  // Calcular tiempo promedio de completado por mes
  const tasksByMonth: Record<string, { totalHours: number, count: number }> = {};
  
  completedTasks.forEach(task => {
    if (!task.fechaCreacion || !task.fechaModificacion) return;
    
    const creationDate = typeof task.fechaCreacion === 'string' 
      ? new Date(task.fechaCreacion) 
      : task.fechaCreacion;
      
    const completionDate = typeof task.fechaModificacion === 'string' 
      ? new Date(task.fechaModificacion) 
      : task.fechaModificacion;
    
    const monthKey = format(creationDate, 'yyyy-MM');
    const completionHours = differenceInHours(completionDate, creationDate);
    
    if (!tasksByMonth[monthKey]) {
      tasksByMonth[monthKey] = { totalHours: 0, count: 0 };
    }
    
    tasksByMonth[monthKey].totalHours += completionHours;
    tasksByMonth[monthKey].count += 1;
  });
  
  // Ordenar por fecha
  const sortedMonths = Object.keys(tasksByMonth).sort();
  
  // Calcular promedios
  const labels = sortedMonths.map(month => {
    const date = parseISO(`${month}-01`);
    return format(date, 'MMM yyyy', { locale: es });
  });
  
  const data = sortedMonths.map(month => {
    const { totalHours, count } = tasksByMonth[month];
    return count > 0 ? Math.round(totalHours / count) : 0;
  });
  
  const chartData = {
    labels,
    datasets: [
      {
        label: 'Tiempo promedio de completado (horas)',
        data,
        borderColor: 'rgb(255, 99, 132)',
        backgroundColor: 'rgba(255, 99, 132, 0.5)',
        tension: 0.3,
      },
    ],
  };
  
  const options = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      tooltip: {
        callbacks: {
          label: function(context: any) {
            const value = context.raw;
            return `${value} hora${value !== 1 ? 's' : ''}`;
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: 'Horas'
        }
      }
    }
  };
  
  return (
    <div>
      {labels.length > 0 ? (
        <Line data={chartData} options={options} />
      ) : (
        <div className="flex justify-center items-center h-64 text-gray-500 dark:text-gray-400">
          No hay suficientes tareas completadas para mostrar estadísticas
        </div>
      )}
    </div>
  );
};

export default TasksCompletionTimeChart;

import React, { useState } from 'react';
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
import { format, subDays, subWeeks, subMonths, isSameDay, isSameWeek, isSameMonth } from 'date-fns';
import { es } from 'date-fns/locale';
import type { Task } from '../../types';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

interface TasksByTimeChartProps {
  tasks: Task[];
}

type TimeRange = 'day' | 'week' | 'month';

const TasksByTimeChart: React.FC<TasksByTimeChartProps> = ({ tasks }) => {
  const [timeRange, setTimeRange] = useState<TimeRange>('day');
  
  const getFilteredData = () => {
    const today = new Date();
    let labels: string[] = [];
    let data: number[] = [];
    
    if (timeRange === 'day') {
      // Últimos 7 días
      labels = Array.from({ length: 7 }, (_, i) => {
        const date = subDays(today, 6 - i);
        return format(date, 'EEE d', { locale: es });
      });
      
      data = labels.map((_, index) => {
        const date = subDays(today, 6 - index);
        return tasks.filter(task => {
          const taskDate = new Date(task.fechaCreacion || '');
          return isSameDay(taskDate, date);
        }).length;
      });
    } else if (timeRange === 'week') {
      // Últimas 4 semanas
      labels = Array.from({ length: 4 }, (_, i) => {
        const date = subWeeks(today, 3 - i);
        return `Sem ${format(date, 'w')}`;
      });
      
      data = labels.map((_, index) => {
        const date = subWeeks(today, 3 - index);
        return tasks.filter(task => {
          const taskDate = new Date(task.fechaCreacion || '');
          return isSameWeek(taskDate, date, { weekStartsOn: 1 });
        }).length;
      });
    } else {
      // Últimos 6 meses
      labels = Array.from({ length: 6 }, (_, i) => {
        const date = subMonths(today, 5 - i);
        return format(date, 'MMM', { locale: es });
      });
      
      data = labels.map((_, index) => {
        const date = subMonths(today, 5 - index);
        return tasks.filter(task => {
          const taskDate = new Date(task.fechaCreacion || '');
          return isSameMonth(taskDate, date);
        }).length;
      });
    }
    
    return { labels, data };
  };
  
  const { labels, data } = getFilteredData();
  
  const chartData = {
    labels,
    datasets: [
      {
        label: 'Número de tareas',
        data,
        backgroundColor: 'rgba(59, 130, 246, 0.5)',
        borderColor: 'rgb(59, 130, 246)',
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
      <div className="flex justify-center mb-4 space-x-2">
        <button
          onClick={() => setTimeRange('day')}
          className={`px-3 py-1 rounded ${
            timeRange === 'day'
              ? 'bg-blue-500 text-white'
              : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
          }`}
        >
          Diario
        </button>
        <button
          onClick={() => setTimeRange('week')}
          className={`px-3 py-1 rounded ${
            timeRange === 'week'
              ? 'bg-blue-500 text-white'
              : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
          }`}
        >
          Semanal
        </button>
        <button
          onClick={() => setTimeRange('month')}
          className={`px-3 py-1 rounded ${
            timeRange === 'month'
              ? 'bg-blue-500 text-white'
              : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
          }`}
        >
          Mensual
        </button>
      </div>
      <Bar data={chartData} options={options} />
    </div>
  );
};

export default TasksByTimeChart;

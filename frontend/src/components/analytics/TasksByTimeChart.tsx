import React, { useState, useRef, useEffect } from 'react';
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
import { useTheme } from '../../hooks/useTheme';
import { Calendar } from 'lucide-react';

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
  const chartRef = useRef<ChartJS<"bar">>(null);
  const { isDarkMode } = useTheme();
  
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
  
  // Colores para el gráfico
  const primaryColor = isDarkMode ? '#60A5FA' : '#3B82F6';
  const secondaryColor = isDarkMode ? '#93C5FD' : '#BFDBFE';
  
  // Crear un gradiente para las barras
  const getGradient = (ctx: any) => {
    if (!ctx) return primaryColor;
    
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
        backgroundColor: function(context: any) {
          const chart = context.chart;
          const {ctx, chartArea} = chart;
          if (!chartArea) return isDarkMode ? 'rgba(96, 165, 250, 0.7)' : 'rgba(59, 130, 246, 0.7)';
          return getGradient(ctx);
        },
        borderColor: isDarkMode ? '#60A5FA' : '#3B82F6',
        borderWidth: 1,
        borderRadius: 6,
        hoverBackgroundColor: isDarkMode ? '#3B82F6' : '#2563EB',
        hoverBorderColor: isDarkMode ? '#2563EB' : '#1D4ED8',
        hoverBorderWidth: 2,
      },
    ],
  };
  
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          boxWidth: 12,
          usePointStyle: true,
          pointStyle: 'rectRounded',
          font: {
            size: 12,
            weight: 'bold' as const,
          },
          color: isDarkMode ? '#E5E7EB' : '#374151',
          padding: 20,
        },
      },
      title: {
        display: false,
      },
      tooltip: {
        backgroundColor: isDarkMode ? '#374151' : '#FFFFFF',
        titleColor: isDarkMode ? '#E5E7EB' : '#111827',
        bodyColor: isDarkMode ? '#E5E7EB' : '#374151',
        borderColor: isDarkMode ? '#4B5563' : '#E5E7EB',
        borderWidth: 1,
        padding: 12,
        cornerRadius: 8,
        displayColors: true,
        boxPadding: 6,
        callbacks: {
          title: function(tooltipItems: any) {
            return `${tooltipItems[0].label}`;
          },
          label: function(context: any) {
            return `Tareas: ${context.parsed.y}`;
          }
        }
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          precision: 0,
          color: isDarkMode ? '#D1D5DB' : '#4B5563',
          font: {
            size: 11,
          },
        },
        grid: {
          color: isDarkMode ? 'rgba(75, 85, 99, 0.2)' : 'rgba(209, 213, 219, 0.5)',
          drawBorder: false,
        },
      },
      x: {
        ticks: {
          color: isDarkMode ? '#D1D5DB' : '#4B5563',
          font: {
            size: 11,
          },
        },
        grid: {
          display: false,
          drawBorder: false,
        },
      },
    },
    animation: {
      duration: 1000,
      easing: 'easeOutQuart' as const,
    },
    barPercentage: 0.7,
    categoryPercentage: 0.8,
  };
  
  // Efecto para animar el gráfico cuando cambia el tema
  useEffect(() => {
    if (chartRef.current) {
      chartRef.current.update();
    }
  }, [isDarkMode]);
  
  return (
    <div className="h-full">
      <div className="flex justify-center mb-4 space-x-2">
        <button
          onClick={() => setTimeRange('day')}
          className={`px-4 py-2 rounded-lg transition-all duration-200 flex items-center cursor-pointer ${
            timeRange === 'day'
              ? 'bg-blue-500 text-white shadow-md'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
          }`}
        >
          <Calendar className={`h-4 w-4 ${timeRange === 'day' ? 'text-white' : 'text-blue-500 dark:text-blue-400'} mr-1`} />
          Diario
        </button>
        <button
          onClick={() => setTimeRange('week')}
          className={`px-4 py-2 rounded-lg transition-all duration-200 flex items-center cursor-pointer ${
            timeRange === 'week'
              ? 'bg-blue-500 text-white shadow-md'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
          }`}
        >
          <Calendar className={`h-4 w-4 ${timeRange === 'week' ? 'text-white' : 'text-blue-500 dark:text-blue-400'} mr-1`} />
          Semanal
        </button>
        <button
          onClick={() => setTimeRange('month')}
          className={`px-4 py-2 rounded-lg transition-all duration-200 flex items-center cursor-pointer ${
            timeRange === 'month'
              ? 'bg-blue-500 text-white shadow-md'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
          }`}
        >
          <Calendar className={`h-4 w-4 ${timeRange === 'month' ? 'text-white' : 'text-blue-500 dark:text-blue-400'} mr-1`} />
          Mensual
        </button>
      </div>
      <div className="h-[calc(100%-50px)]">
        <Bar data={chartData} options={options} ref={chartRef} />
      </div>
    </div>
  );
};

export default TasksByTimeChart;

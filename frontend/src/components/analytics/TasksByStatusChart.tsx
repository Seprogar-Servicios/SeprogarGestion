import React, { useEffect, useRef } from 'react';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, Title } from 'chart.js';
import { Doughnut } from 'react-chartjs-2';
import type { Task } from '../../types';
import { useTheme } from '../../hooks/useTheme';

ChartJS.register(ArcElement, Tooltip, Legend, Title);

interface TasksByStatusChartProps {
  tasks: Task[];
}

const TasksByStatusChart: React.FC<TasksByStatusChartProps> = ({ tasks }) => {
  const chartRef = useRef<ChartJS<"doughnut">>(null);
  const { isDarkMode } = useTheme();
  
  // Contar tareas por estado
  const pendingTasks = tasks.filter(task => task.estado === 'pendiente').length;
  const inProgressTasks = tasks.filter(task => task.estado === 'en progreso').length;
  const completedTasks = tasks.filter(task => task.estado === 'completada').length;
  
  // Colores más vibrantes y modernos
  const pendingColor = '#FF6B6B'; // Rojo coral
  const inProgressColor = '#4ECDC4'; // Turquesa
  const completedColor = '#59CD90'; // Verde menta
  
  // Colores para modo oscuro
  const darkModePendingColor = '#FF8080';
  const darkModeInProgressColor = '#5DDFDF';
  const darkModeCompletedColor = '#6EE7A0';
  
  const data = {
    labels: ['Pendiente', 'En Progreso', 'Completada'],
    datasets: [
      {
        data: [pendingTasks, inProgressTasks, completedTasks],
        backgroundColor: isDarkMode ? [
          darkModePendingColor + 'CC',  // Con transparencia
          darkModeInProgressColor + 'CC',
          darkModeCompletedColor + 'CC',
        ] : [
          pendingColor + 'CC',
          inProgressColor + 'CC',
          completedColor + 'CC',
        ],
        borderColor: isDarkMode ? [
          darkModePendingColor,
          darkModeInProgressColor,
          darkModeCompletedColor,
        ] : [
          pendingColor,
          inProgressColor,
          completedColor,
        ],
        borderWidth: 2,
        hoverBackgroundColor: isDarkMode ? [
          darkModePendingColor,
          darkModeInProgressColor,
          darkModeCompletedColor,
        ] : [
          pendingColor,
          inProgressColor,
          completedColor,
        ],
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
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          padding: 20,
          usePointStyle: true,
          pointStyle: 'circle',
          font: {
            size: 12,
            weight: 'bold' as const,
          },
          color: isDarkMode ? '#E5E7EB' : '#374151',
        },
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
          label: function(context: any) {
            const label = context.label || '';
            const value = context.raw || 0;
            const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
            const percentage = Math.round((value / total) * 100);
            return `${label}: ${value} (${percentage}%)`;
          }
        }
      },
      title: {
        display: false,
        text: 'Distribución de Tareas por Estado',
        font: {
          size: 16,
          weight: 'bold' as const,
        },
        color: isDarkMode ? '#E5E7EB' : '#111827',
        padding: {
          bottom: 20
        }
      },
    },
    animation: {
      animateScale: true,
      animateRotate: true,
      duration: 1000,
      easing: 'easeOutQuart' as const,
    },
  };
  
  // Efecto para animar el gráfico cuando cambia el tema
  useEffect(() => {
    if (chartRef.current) {
      chartRef.current.update();
    }
  }, [isDarkMode]);
  
  return (
    <div className="flex flex-col justify-center items-center h-full">
      <div className="relative w-full h-full flex justify-center items-center">
        <Doughnut data={data} options={options} ref={chartRef} />
        {/* Centro del donut con información adicional */}
        <div className="absolute flex flex-col justify-center items-center text-center">
          <div className="text-3xl font-bold text-gradient">{tasks.length}</div>
          <div className="text-xs text-gray-500 dark:text-gray-400">Total</div>
        </div>
      </div>
    </div>
  );
};

export default TasksByStatusChart;

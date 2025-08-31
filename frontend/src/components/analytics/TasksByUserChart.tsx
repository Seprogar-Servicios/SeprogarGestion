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
  console.log('Tasks received:', tasks);
  console.log('Users received:', users);
  // Crear un mapa de usuarios por ID para búsqueda rápida
  const userMap = users.reduce((acc, user) => {
    acc[user._id] = user;
    return acc;
  }, {} as Record<string, any>);
  
  // Contar tareas por usuario
  const tasksByUser = tasks.reduce((acc, task) => {
    console.log('Processing task:', task._id, 'with tecnicos:', task.tecnicos, 'tecnicoAsignado:', task.tecnicoAsignado);
    
    // Función para agregar un técnico al contador
    const addTecnico = (tecnico: any, taskId: string) => {
      if (!tecnico) return false;
      
      // Manejar diferentes formatos de técnico (objeto o string)
      const userId = typeof tecnico === 'string' ? tecnico : 
                   (tecnico._id ? tecnico._id : null);
      
      if (userId) {
        const currentCount = acc[userId] || 0;
        acc[userId] = currentCount + 1;
        console.log(`Added task ${taskId} to user ${userId}. New count: ${currentCount + 1}`);
        return true;
      }
      return false;
    };
    
    let taskAssigned = false;
    
    // Revisar si hay técnicos en el array tecnicos
    if (task.tecnicos && task.tecnicos.length > 0) {
      task.tecnicos.forEach(tecnico => {
        if (addTecnico(tecnico, task._id)) {
          taskAssigned = true;
        }
      });
    } 
    
    // Si no se asignó por tecnicos, verificar tecnicoAsignado
    if (!taskAssigned && task.tecnicoAsignado) {
      addTecnico(task.tecnicoAsignado, task._id);
    }
    
    // Si la tarea no tiene asignado, la asignamos a 'Sin asignar'
    if (!taskAssigned && (!task.tecnicos || task.tecnicos.length === 0) && !task.tecnicoAsignado) {
      const unassignedId = 'unassigned';
      acc[unassignedId] = (acc[unassignedId] || 0) + 1;
      console.log(`Task ${task._id} has no assigned technician`);
    }
    return acc;
  }, {} as Record<string, number>);
  
  console.log('Final tasks by user:', tasksByUser);
  
  // Asegurarse de que el usuario 'unassigned' se muestre correctamente
  if (tasksByUser['unassigned']) {
    const unassignedUser = {
      _id: 'unassigned',
      nombre: 'Sin asignar',
      apellido: ''
    };
    userMap['unassigned'] = unassignedUser;
  }
  
  // Preparar datos para el gráfico
  // Solo mostrar los 10 usuarios con más tareas si hay muchos
  const sortedUserIds = Object.keys(tasksByUser)
    .filter(userId => tasksByUser[userId] > 0) // Filtrar usuarios con 0 tareas
    .sort((a, b) => tasksByUser[b] - tasksByUser[a]);
  const topUserIds = sortedUserIds.slice(0, 10);
  
  const labels = topUserIds.map(userId => {
    const user = userMap[userId];
    if (!user) return 'Usuario Desconocido';
    return user.apellido ? `${user.nombre} ${user.apellido}` : user.nombre;
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

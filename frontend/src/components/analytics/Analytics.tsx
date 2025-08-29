import React, { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../../store';
import { fetchTasks } from '../../store/slices/tasksSlice';
import { fetchUsers } from '../../store/slices/usersSlice';
import TasksByTimeChart from './TasksByTimeChart';
import TasksByStatusChart from './TasksByStatusChart';
import TasksByUserChart from './TasksByUserChart';
import TasksCompletionTimeChart from './TasksCompletionTimeChart';

const Analytics: React.FC = () => {
  const dispatch = useAppDispatch();
  const { tasks, loading: tasksLoading } = useAppSelector((state) => state.tasks);
  const { users, loading: usersLoading } = useAppSelector((state) => state.users);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      await Promise.all([
        dispatch(fetchTasks({})),
        dispatch(fetchUsers())
      ]);
      setIsLoading(false);
    };
    
    loadData();
  }, [dispatch]);

  if (isLoading || tasksLoading || usersLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Análisis de Tareas</h1>
      </div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
        <div className="py-4">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Gráfico de tareas por tiempo */}
            <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-4">
              <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Tareas por Período</h2>
              <TasksByTimeChart tasks={tasks} />
            </div>
            
            {/* Gráfico de tareas por estado */}
            <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-4">
              <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Distribución por Estado</h2>
              <TasksByStatusChart tasks={tasks} />
            </div>
            
            {/* Gráfico de tareas por usuario */}
            <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-4">
              <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Tareas por Usuario</h2>
              <TasksByUserChart tasks={tasks} users={users} />
            </div>
            
            {/* Gráfico adicional: Tiempo promedio de completado */}
            <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-4">
              <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Tiempo Promedio de Completado</h2>
              <TasksCompletionTimeChart tasks={tasks} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analytics;

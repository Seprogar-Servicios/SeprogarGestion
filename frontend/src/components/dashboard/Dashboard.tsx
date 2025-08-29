import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../store';
import { fetchTasks, setFilters } from '../../store/slices/tasksSlice';
import { fetchUsers } from '../../store/slices/usersSlice';
import UpcomingTasksFilter from '../filters/UpcomingTasksFilter';
import type { TaskFilters } from '../../types';
import { 
  Calendar, 
  CheckCircle, 
  Clock, 
  Users, 
  AlertCircle,
  TrendingUp,
  Activity,
  ArrowUpRight
} from 'lucide-react';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);
  const { tasks, loading: tasksLoading } = useAppSelector((state) => state.tasks);
  const { users } = useAppSelector((state) => state.users);
  const [currentFilters, setCurrentFilters] = useState<TaskFilters>({});

  useEffect(() => {
    dispatch(fetchTasks(currentFilters));
    if (user?.rol === 'admin') {
      dispatch(fetchUsers());
    }
  }, [dispatch, user?.rol, currentFilters]);

  const handleFiltersChange = (newFilters: TaskFilters) => {
    setCurrentFilters(newFilters);
    dispatch(setFilters(newFilters));
  };

  const completedTasks = tasks?.filter(task => task.estado === 'completada').length || 0;
  const pendingTasks = tasks?.filter(task => task.estado === 'pendiente').length || 0;
  const inProgressTasks = tasks?.filter(task => task.estado === 'en progreso').length || 0;
  const myTasks = tasks?.filter(task => 
    task.creadoPor?._id === user?._id || 
    task.tecnicos?.some(tecnico => tecnico._id === user?._id)
  ) || [];

  // Calculate real percentage changes based on task completion rates
  const totalTasks = tasks?.length || 0;
  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  const progressRate = totalTasks > 0 ? Math.round((inProgressTasks / totalTasks) * 100) : 0;
  const pendingRate = totalTasks > 0 ? Math.round((pendingTasks / totalTasks) * 100) : 0;

  const stats = [
    {
      name: 'Tareas Totales',
      value: totalTasks,
      icon: Activity,
      color: 'bg-blue-500',
      change: totalTasks > 0 ? `${totalTasks} tareas` : 'Sin tareas',
      changeType: 'neutral'
    },
    {
      name: 'Completadas',
      value: completedTasks,
      icon: CheckCircle,
      color: 'bg-green-500',
      change: `${completionRate}% del total`,
      changeType: completionRate > 50 ? 'positive' : 'neutral'
    },
    {
      name: 'En Progreso',
      value: inProgressTasks,
      icon: Clock,
      color: 'bg-yellow-500',
      change: `${progressRate}% del total`,
      changeType: 'neutral'
    },
    {
      name: 'Pendientes',
      value: pendingTasks,
      icon: AlertCircle,
      color: 'bg-red-500',
      change: `${pendingRate}% del total`,
      changeType: pendingRate > 70 ? 'negative' : 'neutral'
    }
  ];

  if (user?.rol === 'admin') {
    stats.push({
      name: 'Usuarios',
      value: users?.length || 0,
      icon: Users,
      color: 'bg-purple-500',
      change: `${users?.length || 0} registrados`,
      changeType: 'neutral'
    });
  }

  const recentTasks = tasks
    ? [...tasks] // Create a new array to avoid modifying the original
      .sort((a, b) => new Date(b.fechaCreacion).getTime() - new Date(a.fechaCreacion).getTime())
      .slice(0, 5)
    : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Dashboard
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Bienvenido, {user?.nombre}. Aquí tienes un resumen de tu actividad.
        </p>
      </div>

      {/* Upcoming Tasks Filter - Only for Admin */}
      {user?.rol === 'admin' && (
        <UpcomingTasksFilter
          filters={currentFilters}
          onFiltersChange={handleFiltersChange}
        />
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.name}
              className={`relative bg-white dark:bg-gray-800 pt-5 px-4 pb-12 sm:pt-6 sm:px-6 shadow rounded-lg overflow-hidden
              transition-all duration-300 ease-in-out transform hover:scale-105 hover:shadow-lg 
              ${(stat.name === 'Usuarios' || stat.name === 'Tareas Totales' || 
                (user?.rol === 'admin' && (stat.name === 'Completadas' || stat.name === 'En Progreso' || stat.name === 'Pendientes'))) ? 
                'cursor-pointer hover:border-2 hover:border-blue-400 dark:hover:border-blue-500' : ''}`}
              onClick={() => {
                if (stat.name === 'Usuarios') {
                  navigate('/admin/users');
                } else if (stat.name === 'Tareas Totales') {
                  navigate('/tasks');
                } else if (user?.rol === 'admin' && (stat.name === 'Completadas' || stat.name === 'En Progreso' || stat.name === 'Pendientes')) {
                  navigate('/admin/analytics');
                }
              }}
            >
              <dt>
                <div className={`absolute ${stat.color} rounded-md p-3`}>
                  <Icon className="h-6 w-6 text-white" />
                </div>
                <div className="ml-16 flex items-center justify-between">
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                    {stat.name}
                  </p>
                  {(stat.name === 'Usuarios' || stat.name === 'Tareas Totales' || 
                    (user?.rol === 'admin' && (stat.name === 'Completadas' || stat.name === 'En Progreso' || stat.name === 'Pendientes'))) && (
                    <ArrowUpRight className="h-4 w-4 text-blue-500 dark:text-blue-400" />
                  )}
                </div>
              </dt>
              <dd className="ml-16 pb-6 flex items-baseline sm:pb-7">
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                  {stat.value}
                </p>
                <p
                  className={`ml-2 flex items-baseline text-sm font-semibold ${
                    stat.changeType === 'positive'
                      ? 'text-green-600 dark:text-green-400'
                      : stat.changeType === 'negative'
                      ? 'text-red-600 dark:text-red-400'
                      : 'text-gray-600 dark:text-gray-400'
                  }`}
                >
                  {stat.changeType !== 'neutral' && (
                    <TrendingUp className="self-center flex-shrink-0 h-4 w-4" />
                  )}
                  <span className="sr-only">
                    {stat.changeType === 'positive' ? 'Increased' : stat.changeType === 'negative' ? 'Decreased' : 'Status'} by
                  </span>
                  {stat.change}
                </p>
              </dd>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Tasks */}
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">
              Tareas Recientes
            </h3>
            <div className="mt-5">
              {tasksLoading ? (
                <div className="animate-pulse space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
                  ))}
                </div>
              ) : recentTasks.length > 0 ? (
                <div className="flow-root">
                  <ul className="-mb-8">
                    {recentTasks.map((task, taskIdx) => (
                      <li key={task._id}>
                        <div className="relative pb-8">
                          {taskIdx !== recentTasks.length - 1 ? (
                            <span
                              className="absolute top-5 left-5 -ml-px h-full w-0.5 bg-gray-200 dark:bg-gray-700"
                              aria-hidden="true"
                            />
                          ) : null}
                          <div className="relative flex items-start space-x-3">
                            <div>
                              <div className={`relative px-1 ${
                                task.estado === 'completada' 
                                  ? 'bg-green-500' 
                                  : task.estado === 'en progreso'
                                  ? 'bg-yellow-500'
                                  : 'bg-gray-400'
                              } h-8 w-8 rounded-full flex items-center justify-center ring-8 ring-white dark:ring-gray-800`}>
                                <Calendar className="h-4 w-4 text-white" />
                              </div>
                            </div>
                            <div className="min-w-0 flex-1">
                              <div>
                                <div className="flex justify-between items-start">
                                  <span className="font-medium text-gray-900 dark:text-white">
                                    {task.titulo}
                                  </span>
                                  {task.fechaEjecucion && (
                                    <span className="text-xs text-gray-400 whitespace-nowrap ml-2">
                                      {new Date(task.fechaEjecucion).toLocaleDateString('es-ES', {
                                        day: '2-digit',
                                        month: 'short',
                                        year: 'numeric'
                                      })}
                                    </span>
                                  )}
                                </div>
                                <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
                                  {task.cliente && `Cliente: ${task.cliente} • `}
                                  Estado: <span className="capitalize">{task.estado}</span>
                                </p>
                                <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                                  {task.tecnicos?.length > 0 && `Técnicos: ${task.tecnicos.map(t => t.nombre).join(', ')}`}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <p className="text-gray-500 dark:text-gray-400">No hay tareas recientes</p>
              )}
            </div>
          </div>
        </div>

        {/* My Tasks (for non-admin users) or Quick Actions (for admin) */}
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">
              {user?.rol === 'admin' ? 'Acciones Rápidas' : 'Mis Tareas'}
            </h3>
            <div className="mt-5">
              {user?.rol === 'admin' ? (
                <div className="space-y-3">
                  <a
                    href="/tasks"
                    className="block p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors"
                  >
                    <div className="flex items-center">
                      <Calendar className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                      <span className="ml-3 text-sm font-medium text-blue-600 dark:text-blue-400">
                        Gestionar Tareas
                      </span>
                    </div>
                  </a>
                  <a
                    href="/users"
                    className="block p-3 bg-green-50 dark:bg-green-900/20 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/40 transition-colors"
                  >
                    <div className="flex items-center">
                      <Users className="h-5 w-5 text-green-600 dark:text-green-400" />
                      <span className="ml-3 text-sm font-medium text-green-600 dark:text-green-400">
                        Gestionar Usuarios
                      </span>
                    </div>
                  </a>
                </div>
              ) : (
                <div className="space-y-3">
                  {myTasks.slice(0, 5).map((task) => (
                    <div
                      key={task._id}
                      className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                    >
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {task.titulo}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                          {task.estado}
                        </p>
                      </div>
                      <div className={`px-2 py-1 text-xs rounded-full ${
                        task.estado === 'completada'
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                          : task.estado === 'en progreso'
                          ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                          : 'bg-gray-100 text-gray-800 dark:bg-gray-600 dark:text-gray-200'
                      }`}>
                        {task.estado}
                      </div>
                    </div>
                  ))}
                  {myTasks.length === 0 && (
                    <p className="text-gray-500 dark:text-gray-400">
                      No tienes tareas asignadas
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

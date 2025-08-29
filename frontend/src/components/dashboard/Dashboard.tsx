import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../store';
import { fetchTasks, setFilters } from '../../store/slices/tasksSlice';
import { fetchUsers } from '../../store/slices/usersSlice';
import UpcomingTasksFilter from '../filters/UpcomingTasksFilter';
import type { TaskFilters } from '../../types';
import { 
  Calendar, 
  CheckCircle, 
  CheckCircle2,
  Clock, 
  Users, 
  AlertCircle,
  Activity,
  ArrowUpRight,
  ChevronRight,
  BarChart2,
  Settings,
  ArrowRight
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
      change: 'Administrar tareas',
      changeType: 'neutral',
      hideChange: false,
      description: 'Gestiona todas las tareas del sistema',
      showDescription: true
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
      change: 'Gestionar usuarios',
      changeType: 'neutral',
      hideChange: false,
      description: 'Administra los usuarios del sistema',
      showDescription: true
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
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border-t-4 border-blue-500 p-6 mb-4 animate-fadeIn">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center">
            <div className="bg-blue-100 dark:bg-blue-900/30 p-3 rounded-full mr-4">
              <Activity className="h-8 w-8 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Panel de Control
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Bienvenido, {user?.nombre}. Aquí tienes un resumen de tu actividad.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Upcoming Tasks Filter - Only for Admin */}
      {user?.rol === 'admin' && (
        <UpcomingTasksFilter
          filters={currentFilters}
          onFiltersChange={handleFiltersChange}
        />
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 animate-fadeIn" style={{ animationDelay: '100ms' }}>
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.name}
              className={`relative bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden border-l-4 ${
                stat.name === 'Completadas' ? 'border-green-500' :
                stat.name === 'En Progreso' ? 'border-amber-500' :
                stat.name === 'Pendientes' ? 'border-blue-500' :
                stat.name === 'Tareas Totales' ? 'border-purple-500' :
                'border-indigo-500'
              } transition-all duration-300 ease-in-out transform hover:scale-[1.02] hover:shadow-lg
              ${(stat.name === 'Usuarios' || stat.name === 'Tareas Totales' || 
                (user?.rol === 'admin' && (stat.name === 'Completadas' || stat.name === 'En Progreso' || stat.name === 'Pendientes'))) ? 
                'cursor-pointer' : ''}`}
              style={{
                animationDelay: `${100 + (stats.indexOf(stat) * 100)}ms`
              }}
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
              <div className="p-5">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`p-3 rounded-lg ${
                      stat.name === 'Completadas' ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400' :
                      stat.name === 'En Progreso' ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400' :
                      stat.name === 'Pendientes' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' :
                      'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400'
                    }`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                      {stat.name}
                    </p>
                  </div>
                  {(stat.name === 'Usuarios' || stat.name === 'Tareas Totales' || 
                    (user?.rol === 'admin' && (stat.name === 'Completadas' || stat.name === 'En Progreso' || stat.name === 'Pendientes'))) && (
                    <ArrowUpRight className="h-4 w-4 text-gray-400 dark:text-gray-500 hover:text-blue-500 dark:hover:text-blue-400 transition-colors" />
                  )}
                </div>
                <div className="mt-3">
                  <div className="flex items-end justify-between">
                    <div>
                      <p className="text-3xl font-bold text-gray-900 dark:text-white">
                        {stat.value}
                      </p>
                      {stat.showDescription && (
                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                          {stat.description}
                        </p>
                      )}
                    </div>
                    {!stat.hideChange && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                        {stat.change}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fadeIn" style={{ animationDelay: '200ms' }}>
        {/* Recent Tasks */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-gray-800 dark:to-gray-800">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent flex items-center">
                <Clock className="h-5 w-5 text-blue-500 dark:text-blue-400 mr-2" />
                Tareas Recientes
              </h3>
              <span className="text-xs font-medium px-2 py-1 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                {recentTasks.length} tareas
              </span>
            </div>
          </div>
          <div className="p-5">
            {tasksLoading ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="animate-pulse flex items-center space-x-4 p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50">
                    <div className="h-10 w-10 rounded-lg bg-gray-200 dark:bg-gray-600"></div>
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-3/4"></div>
                      <div className="h-3 bg-gray-200 dark:bg-gray-600 rounded w-1/2"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : recentTasks.length > 0 ? (
              <div className="space-y-3">
                {recentTasks.map((task) => (
                  <div 
                    key={task._id}
                    className="group flex items-center p-3 rounded-lg border border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer"
                    onClick={() => navigate(`/tasks/${task._id}`)}
                  >
                    <div className={`flex-shrink-0 h-10 w-10 rounded-lg flex items-center justify-center ${
                      task.estado === 'completada' 
                        ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400' 
                        : task.estado === 'en progreso'
                        ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400'
                        : 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
                    }`}>
                      <Calendar className="h-5 w-5" />
                    </div>
                    <div className="ml-3 min-w-0 flex-1">
                      <div className="flex justify-between items-start">
                        <h4 className="text-sm font-medium text-gray-900 dark:text-white truncate">
                          {task.titulo}
                        </h4>
                        {task.fechaEjecucion && (
                          <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap ml-2">
                            {new Date(task.fechaEjecucion).toLocaleDateString('es-AR', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric'
                            })}
                          </span>
                        )}
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                          task.estado === 'completada'
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                            : task.estado === 'en progreso'
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400'
                            : 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                        }`}>
                          {task.estado.charAt(0).toUpperCase() + task.estado.slice(1)}
                        </span>
                        {task.cliente && (
                          <span className="text-xs text-gray-500 dark:text-gray-400 truncate">
                            {task.cliente}
                          </span>
                        )}
                      </div>
                      {task.tecnicos?.length > 0 && (
                        <div className="mt-1.5 flex items-center">
                          <Users className="h-3 w-3 text-gray-400 dark:text-gray-500 mr-1.5" />
                          <span className="text-xs text-gray-500 dark:text-gray-400 truncate">
                            {task.tecnicos.map(t => t.nombre).join(', ')}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500">
                  <Clock className="h-full w-full" />
                </div>
                <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No hay tareas recientes</h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Las tareas recientes aparecerán aquí
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions (for admin) or My Tasks (for non-admin users) */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-gray-800 dark:to-gray-800">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent flex items-center">
                <CheckCircle className="h-5 w-5 text-green-500 dark:text-green-400 mr-2" />
                Acciones Rápidas
              </h3>
              {user?.rol !== 'admin' && (
                <span className="text-xs font-medium px-2 py-1 rounded-full bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                  {myTasks.length} tareas
                </span>
              )}
            </div>
          </div>
          <div className="p-5">
            {user?.rol === 'admin' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Link
                  to="/tasks"
                  className="block group p-4 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-blue-400 dark:hover:border-blue-500 transition-all duration-200 hover:shadow-md bg-white dark:bg-gray-800"
                >
                  <div className="flex items-start">
                    <div className="p-2.5 bg-blue-50 dark:bg-blue-900/30 rounded-lg text-blue-600 dark:text-blue-400 group-hover:bg-blue-100 dark:group-hover:bg-blue-900/50 transition-colors">
                      <Calendar className="h-5 w-5" />
                    </div>
                    <div className="ml-4">
                      <h4 className="font-medium text-gray-900 dark:text-white">Gestionar Tareas</h4>
                      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Ver y administrar todas las tareas</p>
                    </div>
                    <ChevronRight className="ml-auto h-5 w-5 text-gray-400 group-hover:text-blue-500 dark:group-hover:text-blue-400 transition-colors" />
                  </div>
                </Link>

                <Link
                  to="/admin/users"
                  className="block group p-4 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-purple-400 dark:hover:border-purple-500 transition-all duration-200 hover:shadow-md bg-white dark:bg-gray-800"
                >
                  <div className="flex items-start">
                    <div className="p-2.5 bg-purple-50 dark:bg-purple-900/30 rounded-lg text-purple-600 dark:text-purple-400 group-hover:bg-purple-100 dark:group-hover:bg-purple-900/50 transition-colors">
                      <Users className="h-5 w-5" />
                    </div>
                    <div className="ml-4">
                      <h4 className="font-medium text-gray-900 dark:text-white">Gestionar Usuarios</h4>
                      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Administrar cuentas de usuario</p>
                    </div>
                    <ChevronRight className="ml-auto h-5 w-5 text-gray-400 group-hover:text-purple-500 dark:group-hover:text-purple-400 transition-colors" />
                  </div>
                </Link>

                <Link
                  to="/admin/analytics"
                  className="block group p-4 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-green-400 dark:hover:border-green-500 transition-all duration-200 hover:shadow-md bg-white dark:bg-gray-800"
                >
                  <div className="flex items-start">
                    <div className="p-2.5 bg-green-50 dark:bg-green-900/30 rounded-lg text-green-600 dark:text-green-400 group-hover:bg-green-100 dark:group-hover:bg-green-900/50 transition-colors">
                      <BarChart2 className="h-5 w-5" />
                    </div>
                    <div className="ml-4">
                      <h4 className="font-medium text-gray-900 dark:text-white">Ver Reportes</h4>
                      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Estadísticas y análisis</p>
                    </div>
                    <ChevronRight className="ml-auto h-5 w-5 text-gray-400 group-hover:text-green-500 dark:group-hover:text-green-400 transition-colors" />
                  </div>
                </Link>

                <Link
                  to="/settings"
                  className="block group p-4 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-amber-400 dark:hover:border-amber-500 transition-all duration-200 hover:shadow-md bg-white dark:bg-gray-800"
                >
                  <div className="flex items-start">
                    <div className="p-2.5 bg-amber-50 dark:bg-amber-900/30 rounded-lg text-amber-600 dark:text-amber-400 group-hover:bg-amber-100 dark:group-hover:bg-amber-900/50 transition-colors">
                      <Settings className="h-5 w-5" />
                    </div>
                    <div className="ml-4">
                      <h4 className="font-medium text-gray-900 dark:text-white">Configuración</h4>
                      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Ajustes del sistema</p>
                    </div>
                    <ChevronRight className="ml-auto h-5 w-5 text-gray-400 group-hover:text-amber-500 dark:group-hover:text-amber-400 transition-colors" />
                  </div>
                </Link>
              </div>
            ) : myTasks.length > 0 ? (
              <div className="space-y-3">
                {myTasks.slice(0, 5).map((task) => (
                  <div
                    key={task._id}
                    className="group flex items-center p-3 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer"
                    onClick={() => navigate(`/tasks/${task._id}`)}
                  >
                    <div className={`flex-shrink-0 h-10 w-10 rounded-lg flex items-center justify-center ${
                      task.estado === 'completada' 
                        ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400' 
                        : task.estado === 'en progreso'
                        ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400'
                        : 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
                    }`}>
                      <span className="font-medium">
                        {task.titulo.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="ml-3 min-w-0 flex-1">
                      <div className="flex justify-between items-start">
                        <h4 className="text-sm font-medium text-gray-900 dark:text-white truncate">
                          {task.titulo}
                        </h4>
                        {task.fechaEjecucion && (
                          <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap ml-2">
                            {new Date(task.fechaEjecucion).toLocaleDateString('es-AR', {
                              day: '2-digit',
                              month: 'short'
                            })}
                          </span>
                        )}
                      </div>
                      <div className="mt-1">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                          task.estado === 'completada'
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                            : task.estado === 'en progreso'
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400'
                            : 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                        }`}>
                          {task.estado.charAt(0).toUpperCase() + task.estado.slice(1)}
                        </span>
                        {task.cliente && (
                          <span className="ml-2 text-xs text-gray-500 dark:text-gray-400 truncate">
                            • {task.cliente}
                          </span>
                        )}
                      </div>
                    </div>
                    <ChevronRight className="ml-2 h-4 w-4 text-gray-400 group-hover:text-blue-500 dark:group-hover:text-blue-400 transition-colors" />
                  </div>
                ))}
                {myTasks.length > 5 && (
                  <div className="text-center mt-4">
                    <a 
                      href="/tasks" 
                      className="inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                    >
                      Ver todas mis tareas
                      <ArrowRight className="ml-1 h-4 w-4" />
                    </a>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500">
                  <CheckCircle2 className="h-full w-full" />
                </div>
                <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No tienes tareas asignadas</h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Las tareas que te asignen aparecerán aquí
                </p>
                <div className="mt-4">
                  <a 
                    href="/tasks" 
                    className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Ver todas las tareas
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

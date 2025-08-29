import React, { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../../store';
import { fetchTasks } from '../../store/slices/tasksSlice';
import { fetchUsers } from '../../store/slices/usersSlice';
import TasksByTimeChart from './TasksByTimeChart';
import TasksByStatusChart from './TasksByStatusChart';
import TasksByUserChart from './TasksByUserChart';
import TasksCompletionTimeChart from './TasksCompletionTimeChart';
import { 
  BarChart3, 
  Clock, 
  Users as UsersIcon, 
  CheckCircle, 
  AlertCircle, 
  Calendar,
  TrendingUp,
  Filter,
  X,
  RefreshCw
} from 'lucide-react';
import { format, subMonths } from 'date-fns';

const Analytics: React.FC = () => {
  const dispatch = useAppDispatch();
  const { tasks, loading: tasksLoading } = useAppSelector((state) => state.tasks);
  const { users, loading: usersLoading } = useAppSelector((state) => state.users);
  const [isLoading, setIsLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  
  // Filtros
  const [filteredTasks, setFilteredTasks] = useState<typeof tasks>([]);
  const [dateRange, setDateRange] = useState<{start: string, end: string}>(() => {
    const end = new Date();
    const start = subMonths(end, 3); // Por defecto, últimos 3 meses
    return {
      start: format(start, 'yyyy-MM-dd'),
      end: format(end, 'yyyy-MM-dd')
    };
  });
  const [statusFilter, setStatusFilter] = useState<string[]>(['pendiente', 'en progreso', 'completada']);
  const [userFilter, setUserFilter] = useState<string[]>([]);

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
  
  // Aplicar filtros a las tareas
  useEffect(() => {
    if (tasks.length) {
      let filtered = [...tasks];
      
      // Filtrar por fecha
      if (dateRange.start && dateRange.end) {
        const startDate = new Date(dateRange.start);
        const endDate = new Date(dateRange.end);
        endDate.setHours(23, 59, 59, 999); // Incluir todo el día final
        
        filtered = filtered.filter(task => {
          const taskDate = new Date(task.fechaCreacion);
          return taskDate >= startDate && taskDate <= endDate;
        });
      }
      
      // Filtrar por estado
      if (statusFilter.length > 0) {
        filtered = filtered.filter(task => statusFilter.includes(task.estado));
      }
      
      // Filtrar por usuario
      if (userFilter.length > 0) {
        filtered = filtered.filter(task => {
          // Verificar si alguno de los técnicos asignados está en el filtro
          return task.tecnicos && task.tecnicos.some(tecnico => userFilter.includes(tecnico._id));
        });
      }
      
      setFilteredTasks(filtered);
    } else {
      setFilteredTasks([]);
    }
  }, [tasks, dateRange, statusFilter, userFilter]);

  if (isLoading || tasksLoading || usersLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // Calcular estadísticas clave basadas en tareas filtradas
  const totalTasks = filteredTasks.length;
  const completedTasks = filteredTasks.filter(task => task.estado === 'completada').length;
  const inProgressTasks = filteredTasks.filter(task => task.estado === 'en progreso').length;
  const pendingTasks = filteredTasks.filter(task => task.estado === 'pendiente').length;
  
  // Calcular porcentajes
  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  const avgCompletionTime = filteredTasks
    .filter(task => task.estado === 'completada' && task.fechaCreacion && task.fechaModificacion)
    .map(task => {
      const creationDate = new Date(task.fechaCreacion);
      const completionDate = new Date(task.fechaModificacion);
      return Math.round((completionDate.getTime() - creationDate.getTime()) / (1000 * 60 * 60)); // horas
    })
    .reduce((sum, hours, _, array) => sum + hours / array.length, 0) || 0;
    
  // Función para resetear filtros
  const resetFilters = () => {
    const end = new Date();
    const start = subMonths(end, 3);
    setDateRange({
      start: format(start, 'yyyy-MM-dd'),
      end: format(end, 'yyyy-MM-dd')
    });
    setStatusFilter(['pendiente', 'en progreso', 'completada']);
    setUserFilter([]);
  };
  
  // Estadísticas para las tarjetas de resumen
  const statCards = [
    {
      title: 'Tareas Totales',
      value: totalTasks,
      icon: BarChart3,
      color: 'bg-blue-500',
      textColor: 'text-blue-600 dark:text-blue-400'
    },
    {
      title: 'Completadas',
      value: completedTasks,
      icon: CheckCircle,
      color: 'bg-green-500',
      textColor: 'text-green-600 dark:text-green-400',
      subtext: `${completionRate}% del total`
    },
    {
      title: 'En Progreso',
      value: inProgressTasks,
      icon: Clock,
      color: 'bg-yellow-500',
      textColor: 'text-yellow-600 dark:text-yellow-400'
    },
    {
      title: 'Pendientes',
      value: pendingTasks,
      icon: AlertCircle,
      color: 'bg-red-500',
      textColor: 'text-red-600 dark:text-red-400'
    },
    {
      title: 'Tiempo Promedio',
      value: Math.round(avgCompletionTime),
      icon: Calendar,
      color: 'bg-purple-500',
      textColor: 'text-purple-600 dark:text-purple-400',
      subtext: 'horas'
    },
    {
      title: 'Usuarios',
      value: users.length,
      icon: UsersIcon,
      color: 'bg-indigo-500',
      textColor: 'text-indigo-600 dark:text-indigo-400'
    }
  ];

  return (
    <div className="py-6 animate-fadeIn">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Panel de Análisis
          </h1>
          <div className="flex items-center space-x-3">
            <button 
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center bg-blue-100 hover:bg-blue-200 dark:bg-blue-900/30 dark:hover:bg-blue-800/50 px-4 py-2 rounded-lg transition-all duration-200"
            >
              <Filter className="h-5 w-5 text-blue-500 mr-2" />
              <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                {showFilters ? 'Ocultar filtros' : 'Mostrar filtros'}
              </span>
            </button>
            <div className="flex items-center bg-blue-50 dark:bg-blue-900/20 px-4 py-2 rounded-lg">
              <TrendingUp className="h-5 w-5 text-blue-500 mr-2" />
              <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                Datos actualizados: {new Date().toLocaleDateString('es-ES')}
              </span>
            </div>
          </div>
        </div>
        
        {/* Panel de filtros */}
        {showFilters && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-4 mb-6 animate-scaleIn">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
                <Filter className="h-5 w-5 mr-2 text-blue-500" />
                Filtros
              </h2>
              <div className="flex space-x-2">
                <button 
                  onClick={resetFilters}
                  className="flex items-center text-sm text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 transition-colors"
                >
                  <RefreshCw className="h-4 w-4 mr-1" />
                  Resetear
                </button>
                <button 
                  onClick={() => setShowFilters(false)}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Filtro de fechas */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Rango de fechas</label>
                <div className="flex space-x-2">
                  <div>
                    <label className="block text-xs text-gray-500 dark:text-gray-400">Desde</label>
                    <input 
                      type="date" 
                      value={dateRange.start}
                      onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 dark:text-gray-400">Hasta</label>
                    <input 
                      type="date" 
                      value={dateRange.end}
                      onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm"
                    />
                  </div>
                </div>
              </div>
              
              {/* Filtro de estado */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Estado</label>
                <div className="flex flex-wrap gap-2">
                  {['pendiente', 'en progreso', 'completada'].map(status => {
                    const isSelected = statusFilter.includes(status);
                    let bgColor = '';
                    let textColor = '';
                    
                    if (status === 'pendiente') {
                      bgColor = isSelected ? 'bg-red-100 dark:bg-red-900/30' : 'bg-gray-100 dark:bg-gray-700';
                      textColor = isSelected ? 'text-red-700 dark:text-red-300' : 'text-gray-700 dark:text-gray-300';
                    } else if (status === 'en progreso') {
                      bgColor = isSelected ? 'bg-yellow-100 dark:bg-yellow-900/30' : 'bg-gray-100 dark:bg-gray-700';
                      textColor = isSelected ? 'text-yellow-700 dark:text-yellow-300' : 'text-gray-700 dark:text-gray-300';
                    } else {
                      bgColor = isSelected ? 'bg-green-100 dark:bg-green-900/30' : 'bg-gray-100 dark:bg-gray-700';
                      textColor = isSelected ? 'text-green-700 dark:text-green-300' : 'text-gray-700 dark:text-gray-300';
                    }
                    
                    return (
                      <button
                        key={status}
                        onClick={() => {
                          if (isSelected && statusFilter.length > 1) {
                            setStatusFilter(statusFilter.filter(s => s !== status));
                          } else if (!isSelected) {
                            setStatusFilter([...statusFilter, status]);
                          }
                        }}
                        className={`px-3 py-1 rounded-full text-sm ${bgColor} ${textColor} transition-colors duration-200`}
                      >
                        {status === 'pendiente' ? 'Pendiente' : 
                         status === 'en progreso' ? 'En Progreso' : 'Completada'}
                      </button>
                    );
                  })}
                </div>
              </div>
              
              {/* Filtro de usuario */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Usuario</label>
                <select
                  multiple
                  value={userFilter}
                  onChange={(e) => {
                    const values = Array.from(e.target.selectedOptions, option => option.value);
                    setUserFilter(values);
                  }}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm"
                  size={3}
                >
                  {users.map(user => (
                    <option key={user._id} value={user._id}>
                      {user.nombre}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Mantén Ctrl para seleccionar varios</p>
              </div>
            </div>
            
            <div className="mt-4 text-sm text-gray-500 dark:text-gray-400 flex items-center">
              <span className="font-medium text-blue-600 dark:text-blue-400 mr-1">{filteredTasks.length}</span> 
              tareas encontradas con los filtros aplicados
            </div>
          </div>
        )}
      </div>
      
      {/* Tarjetas de estadísticas */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 mb-8">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {statCards.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <div 
                key={stat.title}
                className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-4 transition-all duration-300 hover:shadow-lg hover:scale-105 animate-fadeIn"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className={`${stat.color} rounded-full p-2`}>
                    <Icon className="h-5 w-5 text-white" />
                  </div>
                  <span className={`text-xs font-medium ${stat.textColor}`}>{stat.title}</span>
                </div>
                <div className="flex items-baseline">
                  <span className="text-2xl font-bold text-gray-900 dark:text-white">{stat.value}</span>
                  {stat.subtext && (
                    <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">{stat.subtext}</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
        <div className="py-4">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Gráfico de tareas por tiempo */}
            <div className="bg-white dark:bg-gray-800 shadow-lg rounded-xl p-6 border-t-4 border-blue-500 animate-fadeIn" style={{ animationDelay: '200ms' }}>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                <Calendar className="h-5 w-5 mr-2 text-blue-500" />
                Tareas por Período
              </h2>
              <div className="h-80">
                <TasksByTimeChart tasks={filteredTasks} />
              </div>
            </div>
            
            {/* Gráfico de tareas por estado */}
            <div className="bg-white dark:bg-gray-800 shadow-lg rounded-xl p-6 border-t-4 border-green-500 animate-fadeIn" style={{ animationDelay: '300ms' }}>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                <CheckCircle className="h-5 w-5 mr-2 text-green-500" />
                Distribución por Estado
              </h2>
              <div className="h-80">
                <TasksByStatusChart tasks={filteredTasks} />
              </div>
            </div>
            
            {/* Gráfico de tareas por usuario */}
            <div className="bg-white dark:bg-gray-800 shadow-lg rounded-xl p-6 border-t-4 border-purple-500 animate-fadeIn" style={{ animationDelay: '400ms' }}>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                <UsersIcon className="h-5 w-5 mr-2 text-purple-500" />
                Tareas por Usuario
              </h2>
              <div className="h-80">
                <TasksByUserChart tasks={filteredTasks} users={users} />
              </div>
            </div>
            
            {/* Gráfico adicional: Tiempo promedio de completado */}
            <div className="bg-white dark:bg-gray-800 shadow-lg rounded-xl p-6 border-t-4 border-yellow-500 animate-fadeIn" style={{ animationDelay: '500ms' }}>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                <Clock className="h-5 w-5 mr-2 text-yellow-500" />
                Tiempo Promedio de Completado
              </h2>
              <div className="h-80">
                <TasksCompletionTimeChart tasks={filteredTasks} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analytics;

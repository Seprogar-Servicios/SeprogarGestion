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
  RefreshCw,
  Check,
  User
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
    
    // Asegurarse de que las fechas sean válidas
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      console.error('Fechas inválidas al inicializar el rango');
      return { start: '', end: '' };
    }
    
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
      
      // Filtrar por fecha de ejecución
      if (dateRange.start && dateRange.end) {
        const startDate = new Date(dateRange.start);
        const endDate = new Date(dateRange.end);
        endDate.setHours(23, 59, 59, 999); // Incluir todo el día final
        
        filtered = filtered.filter(task => {
          // Usar fechaEjecucion en lugar de fechaCreacion
          if (!task.fechaEjecucion) return false; // Si no tiene fecha de ejecución, la filtramos
          
          // Convertir la fecha de ejecución a objeto Date
          const taskDate = new Date(task.fechaEjecucion);
          
          // Asegurarse de que la fecha sea válida
          if (isNaN(taskDate.getTime())) {
            console.log('Fecha de ejecución inválida:', task.fechaEjecucion, 'en tarea:', task._id);
            return false;
          }
          
          const isInRange = taskDate >= startDate && taskDate <= endDate;
          if (!isInRange) {
            console.log('Tarea filtrada por fecha de ejecución:', {
              id: task._id,
              fechaEjecucion: task.fechaEjecucion,
              rango: `${dateRange.start} a ${dateRange.end}`
            });
          }
          return isInRange;
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
    <div className="space-y-6 h-full flex flex-col animate-fadeIn" style={{ minHeight: '85vh' }}>
      {/* Header Card */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border-t-4 border-blue-500 p-4 mb-4 animate-fadeIn">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center">
            <div className="bg-blue-100 dark:bg-blue-900/30 p-3 rounded-full mr-4">
              <BarChart3 className="h-8 w-8 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Panel de Análisis
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 flex items-center">
                Visualiza y analiza las métricas de rendimiento del sistema
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3 flex-wrap gap-2">
            <button 
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white px-4 py-2 rounded-lg transition-all duration-200 shadow-sm hover:shadow transform hover:scale-105 cursor-pointer"
            >
              <Filter className="h-5 w-5 mr-2" />
              <span className="text-sm font-medium">
                {showFilters ? 'Ocultar filtros' : 'Mostrar filtros'}
              </span>
            </button>
            <div className="flex items-center bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 px-4 py-2 rounded-lg shadow-sm border border-blue-100 dark:border-blue-800/30">
              <TrendingUp className="h-5 w-5 text-blue-500 mr-2" />
              <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                Datos actualizados: {new Date().toLocaleDateString('es-ES')}
              </span>
            </div>
          </div>
        </div>
      </div>
        
        {/* Panel de filtros mejorado */}
        {showFilters && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 mb-6 animate-fadeIn">
            {/* Header del panel de filtros */}
            <div className="bg-gradient-to-r from-blue-50 to-blue-100 dark:from-gray-700 dark:to-gray-800 px-5 py-3 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Filter className="h-5 w-5 text-blue-600 dark:text-blue-400 mr-2" />
                  <h2 className="text-lg font-semibold text-gray-800 dark:text-white">Filtros de análisis</h2>
                </div>
                <div className="flex items-center space-x-3">
                  <button 
                    onClick={resetFilters}
                    className="flex items-center text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors bg-white dark:bg-gray-700 px-3 py-1.5 rounded-md shadow-sm border border-blue-100 dark:border-gray-600 hover:bg-blue-50 dark:hover:bg-gray-600"
                  >
                    <RefreshCw className="h-4 w-4 mr-1.5" />
                    Restablecer
                  </button>
                  <button 
                    onClick={() => setShowFilters(false)}
                    className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    aria-label="Cerrar filtros"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </div>
            
            {/* Contenido de los filtros */}
            <div className="p-5 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Filtro de fechas */}
                <div className="bg-gray-50 dark:bg-gray-700/30 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 flex items-center">
                    <Calendar className="h-4 w-4 mr-2 text-blue-500" />
                    Rango de fechas
                  </label>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Desde</label>
                      <div className="relative">
                        <input 
                          type="date" 
                          value={dateRange.start}
                          onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm py-2 px-3 border"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Hasta</label>
                      <div className="relative">
                        <input 
                          type="date" 
                          value={dateRange.end}
                          onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm py-2 px-3 border"
                        />
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Filtro de estado */}
                <div className="bg-gray-50 dark:bg-gray-700/30 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 flex items-center">
                    <CheckCircle className="h-4 w-4 mr-2 text-blue-500" />
                    Estado de las tareas
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { value: 'pendiente', label: 'Pendiente', color: 'red' },
                      { value: 'en progreso', label: 'En Progreso', color: 'yellow' },
                      { value: 'completada', label: 'Completada', color: 'green' }
                    ].map(({ value, label, color }) => {
                      const isSelected = statusFilter.includes(value);
                      const colorClasses = {
                        red: isSelected 
                          ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 border-red-200 dark:border-red-800' 
                          : 'bg-white text-gray-700 dark:bg-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600',
                        yellow: isSelected 
                          ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800' 
                          : 'bg-white text-gray-700 dark:bg-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600',
                        green: isSelected 
                          ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 border-green-200 dark:border-green-800' 
                          : 'bg-white text-gray-700 dark:bg-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'
                      };
                      
                      return (
                        <button
                          key={value}
                          onClick={() => {
                            if (isSelected && statusFilter.length > 1) {
                              setStatusFilter(statusFilter.filter(s => s !== value));
                            } else if (!isSelected) {
                              setStatusFilter([...statusFilter, value]);
                            }
                          }}
                          className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all duration-200 flex items-center ${colorClasses[color as keyof typeof colorClasses]}`}
                        >
                          {isSelected && (
                            <Check className="h-3.5 w-3.5 mr-1.5" />
                          )}
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              
                {/* Filtro de usuario */}
                <div className="bg-gray-50 dark:bg-gray-700/30 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 flex items-center">
                    <User className="h-4 w-4 mr-2 text-blue-500" />
                    Técnico asignado
                  </label>
                  <div className="space-y-2">
                    <select
                      multiple
                      value={userFilter}
                      onChange={(e) => {
                        const values = Array.from(e.target.selectedOptions, option => option.value);
                        setUserFilter(values);
                      }}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm py-2 min-h-[100px]"
                    >
                      {users.map((user) => (
                        <option key={user._id} value={user._id}>
                          {user.nombre}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                      Mantén presionado <span className="font-mono bg-gray-100 dark:bg-gray-800 px-1 rounded">Ctrl</span> (o <span className="font-mono bg-gray-100 dark:bg-gray-800 px-1 rounded">Cmd</span> en Mac) para seleccionar múltiples
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="mt-4 text-sm text-gray-500 dark:text-gray-400 flex items-center">
                <span className="font-medium text-blue-600 dark:text-blue-400 mr-1">{filteredTasks.length}</span> 
                tareas encontradas con los filtros aplicados
              </div>
            </div>
          </div>
        )}  

      {/* Tarjetas de estadísticas */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 border-t-4 border-green-500 animate-fadeIn" style={{ animationDelay: '200ms' }}>
        <div className="flex items-center mb-4">
          <div className="bg-green-100 dark:bg-green-900/30 p-2 rounded-full mr-3">
            <TrendingUp className="h-5 w-5 text-green-600 dark:text-green-400" />
          </div>
          <h2 className="text-xl font-bold bg-gradient-to-r from-green-600 to-green-500 bg-clip-text text-transparent">
            Estadísticas Generales
          </h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {statCards.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <div 
                key={stat.title}
                className="bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 rounded-xl shadow-md p-4 transition-all duration-300 hover:shadow-lg hover:scale-105 animate-fadeIn border border-gray-100 dark:border-gray-700"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className={`bg-gradient-to-br ${stat.color.replace('bg-', 'from-')} ${stat.color.replace('bg-', 'to-')}/80 rounded-lg p-2.5 shadow-inner transform transition-transform duration-300 hover:scale-110`}>
                    <Icon className="h-5 w-5 text-white" />
                  </div>
                  <span className={`text-xs font-medium ${stat.textColor} bg-opacity-20 px-2 py-0.5 rounded-full`}>{stat.title}</span>
                </div>
                <div className="flex items-baseline">
                  <span className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">{stat.value}</span>
                  {stat.subtext && (
                    <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">{stat.subtext}</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Gráfico de tareas por tiempo */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 border-t-4 border-blue-500 animate-fadeIn" style={{ animationDelay: '300ms' }}>
          <div className="flex items-center mb-4">
            <div className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded-full mr-3">
              <Calendar className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <h2 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-blue-500 bg-clip-text text-transparent">
              Tareas por Período
            </h2>
          </div>
          <div className="h-80 bg-gray-50 dark:bg-gray-700/30 rounded-lg p-3">
            <TasksByTimeChart tasks={filteredTasks} />
          </div>
        </div>
        
        {/* Gráfico de tareas por estado */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 border-t-4 border-green-500 animate-fadeIn" style={{ animationDelay: '400ms' }}>
          <div className="flex items-center mb-4">
            <div className="bg-green-100 dark:bg-green-900/30 p-2 rounded-full mr-3">
              <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <h2 className="text-xl font-bold bg-gradient-to-r from-green-600 to-green-500 bg-clip-text text-transparent">
              Distribución por Estado
            </h2>
          </div>
          <div className="h-80 bg-gray-50 dark:bg-gray-700/30 rounded-lg p-3">
            <TasksByStatusChart tasks={filteredTasks} />
          </div>
        </div>
        
        {/* Gráfico de tareas por usuario */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 border-t-4 border-purple-500 animate-fadeIn" style={{ animationDelay: '500ms' }}>
          <div className="flex items-center mb-4">
            <div className="bg-purple-100 dark:bg-purple-900/30 p-2 rounded-full mr-3">
              <UsersIcon className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            </div>
            <h2 className="text-xl font-bold bg-gradient-to-r from-purple-600 to-purple-500 bg-clip-text text-transparent">
              Tareas por Usuario
            </h2>
          </div>
          <div className="h-80 bg-gray-50 dark:bg-gray-700/30 rounded-lg p-3">
            <TasksByUserChart tasks={filteredTasks} users={users} />
          </div>
        </div>
        
        {/* Gráfico adicional: Tiempo promedio de completado */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 border-t-4 border-yellow-500 animate-fadeIn" style={{ animationDelay: '600ms' }}>
          <div className="flex items-center mb-4">
            <div className="bg-yellow-100 dark:bg-yellow-900/30 p-2 rounded-full mr-3">
              <Clock className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
            </div>
            <h2 className="text-xl font-bold bg-gradient-to-r from-yellow-600 to-yellow-500 bg-clip-text text-transparent">
              Tiempo Promedio de Completado
            </h2>
          </div>
          <div className="h-80 bg-gray-50 dark:bg-gray-700/30 rounded-lg p-3">
            <TasksCompletionTimeChart tasks={filteredTasks} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analytics;

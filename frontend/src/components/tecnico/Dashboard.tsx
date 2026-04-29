import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Calendar, 
  CheckSquare, 
  CheckCircle, 
  Clock, 
  Activity, 
  Building, 
  ChevronRight,
  RefreshCw,
  Wrench
} from 'lucide-react';
import { showError } from '../../utils/toastUtils';
import { useAppSelector } from '../../store';

const TecnicoDashboard: React.FC = () => {
  const { user } = useAppSelector((state) => state.auth);
  
  // Estados para las tareas del técnico
  const [tareas, setTareas] = useState<any[]>([]);
  const [tareasNormales, setTareasNormales] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    pendientes: 0,
    enProgreso: 0,
    completadas: 0,
    hoy: 0
  });
  const [statsNormales, setStatsNormales] = useState({
    total: 0,
    completadas: 0,
    enProgreso: 0,
    pendientes: 0,
    canceladas: 0,
    hoy: 0
  });

  useEffect(() => {
    fetchMisTareas();
    fetchTareasNormales();
  }, []);

  const fetchMisTareas = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      
      const response = await fetch('/api/tareas-consorcio/mis-tareas', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Error al cargar las tareas de consorcio');
      }

      const data = await response.json();
      const tareasData = data.tasks || data || [];
      setTareas(tareasData);
      calcularEstadisticas(tareasData);
    } catch (error) {
      console.error('Error:', error);
      showError('Error al cargar las tareas de consorcio');
    }
  };

  const fetchTareasNormales = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('accessToken');
      
      // Filtrar tareas del técnico actual
      const response = await fetch(`/api/tareas?usuario=${user?._id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        // Si hay error, simplemente no mostrar tareas normales
        setTareasNormales([]);
        setStatsNormales({
          total: 0,
          completadas: 0,
          enProgreso: 0,
          pendientes: 0,
          canceladas: 0,
          hoy: 0
        });
        return;
      }

      const data = await response.json();
      const tareasData = data.data || [];
      setTareasNormales(tareasData);
      calcularEstadisticasNormales(tareasData);
    } catch (error) {
      console.error('Error:', error);
      // No mostrar error al usuario, solo log
      setTareasNormales([]);
      setStatsNormales({
        total: 0,
        completadas: 0,
        enProgreso: 0,
        pendientes: 0,
        canceladas: 0,
        hoy: 0
      });
    } finally {
      setLoading(false);
    }
  };

  const calcularEstadisticas = (tareasData: any[]) => {
    const ahora = new Date();
    const hoy = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate());

    const estadisticas = tareasData.reduce((acc, tarea) => {
      // Total de tareas
      acc.total++;

      // Por estado
      switch (tarea.estado) {
        case 'pendiente':
          acc.pendientes++;
          break;
        case 'en_progreso':
          acc.enProgreso++;
          break;
        case 'completada':
          acc.completadas++;
          break;
      }

      // Por fecha
      const fechaTarea = new Date(tarea.fechaEjecucion);
      if (fechaTarea >= hoy && fechaTarea < new Date(hoy.getTime() + 24 * 60 * 60 * 1000)) {
        acc.hoy++;
      }

      return acc;
    }, {
      total: 0,
      pendientes: 0,
      enProgreso: 0,
      completadas: 0,
      hoy: 0
    });

    setStats(estadisticas);
  };

  const calcularEstadisticasNormales = (tareasData: any[]) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const todayStr = [
      today.getFullYear(),
      String(today.getMonth() + 1).padStart(2, '0'),
      String(today.getDate()).padStart(2, '0')
    ].join('-');

    const todayTasks = tareasData?.filter(task => {
      if (!task.fechaEjecucion) return false;

      const taskDate = new Date(task.fechaEjecucion);
      taskDate.setDate(taskDate.getDate() + 1);
      
      const taskDateStr = [
        taskDate.getFullYear(),
        String(taskDate.getMonth() + 1).padStart(2, '0'),
        String(taskDate.getDate()).padStart(2, '0')
      ].join('-')
      
      return taskDateStr === todayStr;
    }) || [];

    const estadisticas = {
      total: tareasData?.length || 0,
      completadas: tareasData?.filter(task => task.estado === 'completada').length || 0,
      enProgreso: tareasData?.filter(task => task.estado === 'en progreso').length || 0,
      pendientes: tareasData?.filter(task => task.estado === 'pendiente').length || 0,
      canceladas: tareasData?.filter(task => task.estado === 'cancelada').length || 0,
      hoy: todayTasks.length
    };

    setStatsNormales(estadisticas);
  };

  const getEstadoColor = (estado: string) => {
    switch (estado) {
      case 'pendiente':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300';
      case 'en_progreso':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
      case 'completada':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300';
    }
  };

  const getEstadoTexto = (estado: string) => {
    switch (estado) {
      case 'pendiente':
        return 'Pendiente';
      case 'en_progreso':
        return 'En Progreso';
      case 'completada':
        return 'Completada';
      default:
        return estado;
    }
  };

  const formatDate = (fecha: string) => {
    return new Date(fecha).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Dashboard Técnico
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Resumen de tus tareas asignadas (Normales y de Consorcio)
        </p>
      </div>

      {/* Cards de Estadísticas de Tareas Normales */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
          <Calendar className="h-5 w-5 mr-2 text-blue-600 dark:text-blue-400" />
          Tareas Normales
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
          {/* Total de Tareas Normales */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total de Tareas</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{statsNormales.total}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Normales</p>
              </div>
              <div className="p-3 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
                <CheckSquare className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </div>

          {/* Completadas Normales */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Completadas</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{statsNormales.completadas}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Normales</p>
              </div>
              <div className="p-3 bg-green-50 dark:bg-green-900/30 rounded-lg">
                <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </div>

          {/* En Progreso Normales */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">En Progreso</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{statsNormales.enProgreso}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Normales</p>
              </div>
              <div className="p-3 bg-yellow-50 dark:bg-yellow-900/30 rounded-lg">
                <Clock className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
              </div>
            </div>
          </div>

          {/* Pendientes Normales */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Pendientes</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{statsNormales.pendientes}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Normales</p>
              </div>
              <div className="p-3 bg-orange-50 dark:bg-orange-900/30 rounded-lg">
                <Calendar className="h-6 w-6 text-orange-600 dark:text-orange-400" />
              </div>
            </div>
          </div>

          {/* Tareas del Día Normales */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Para Hoy</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{statsNormales.hoy}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Normales</p>
              </div>
              <div className="p-3 bg-cyan-50 dark:bg-cyan-900/30 rounded-lg">
                <Calendar className="h-6 w-6 text-cyan-600 dark:text-cyan-400" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Cards de Estadísticas de Tareas de Consorcio */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
          <Building className="h-5 w-5 mr-2 text-indigo-600 dark:text-indigo-400" />
          Tareas de Consorcio
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Total de Tareas de Consorcio */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total de Tareas</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{stats.total}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">De consorcio</p>
              </div>
              <div className="p-3 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
                <CheckSquare className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </div>

          {/* Pendientes de Consorcio */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Pendientes</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{stats.pendientes}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">De consorcio</p>
              </div>
              <div className="p-3 bg-yellow-50 dark:bg-yellow-900/30 rounded-lg">
                <Clock className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
              </div>
            </div>
          </div>

          {/* En Progreso de Consorcio */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">En Progreso</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{stats.enProgreso}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">De consorcio</p>
              </div>
              <div className="p-3 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
                <Activity className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </div>

          {/* Completadas de Consorcio */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Completadas</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{stats.completadas}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">De consorcio</p>
              </div>
              <div className="p-3 bg-green-50 dark:bg-green-900/30 rounded-lg">
                <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </div>
        </div>
      </div>


      {/* Acciones Rápidas - Separadas por tipo */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Acciones de Tareas Normales */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
            <Calendar className="h-5 w-5 mr-2 text-blue-600 dark:text-blue-400" />
            Tareas Normales
          </h2>
          <div className="space-y-3">
            <Link
              to="/tasks"
              className="flex items-center justify-between p-4 bg-blue-50 dark:bg-blue-900/30 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors group"
            >
              <div className="flex items-center space-x-3">
                <Calendar className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                <span className="text-sm font-medium text-blue-700 dark:text-blue-300">Ver Tareas Normales</span>
              </div>
              <ChevronRight className="h-4 w-4 text-blue-600 dark:text-blue-400 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link
              to="/calendar"
              className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors group"
            >
              <div className="flex items-center space-x-3">
                <Calendar className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Calendario Normal</span>
              </div>
              <ChevronRight className="h-4 w-4 text-gray-600 dark:text-gray-400 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </div>

        {/* Acciones de Tareas de Consorcio */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
            <Building className="h-5 w-5 mr-2 text-indigo-600 dark:text-indigo-400" />
            Tareas de Consorcio
          </h2>
          <div className="space-y-3">
            <Link
              to="/tecnico/tareas-consorcio"
              className="flex items-center justify-between p-4 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors group"
            >
              <div className="flex items-center space-x-3">
                <Wrench className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                <span className="text-sm font-medium text-indigo-700 dark:text-indigo-300">Ver Tareas de Consorcio</span>
              </div>
              <ChevronRight className="h-4 w-4 text-indigo-600 dark:text-indigo-400 group-hover:translate-x-1 transition-transform" />
            </Link>
            <button
              onClick={() => {
                fetchMisTareas();
                fetchTareasNormales();
              }}
              className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors group w-full"
            >
              <div className="flex items-center space-x-3">
                <RefreshCw className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Actualizar Datos</span>
              </div>
              <ChevronRight className="h-4 w-4 text-gray-600 dark:text-gray-400 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>
      </div>

      {/* Próximas Tareas Normales */}
      {tareasNormales.length > 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
              <Calendar className="h-5 w-5 mr-2 text-blue-600 dark:text-blue-400" />
              Próximas Tareas Normales
            </h2>
            <Link
              to="/tasks"
              className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
            >
              Ver todas
            </Link>
          </div>
          <div className="space-y-3">
            {tareasNormales.slice(0, 5).map((tarea) => (
              <div key={tarea._id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{tarea.titulo}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{tarea.cliente || 'Sin cliente'} • {formatDate(tarea.fechaEjecucion)}</p>
                </div>
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${getEstadoColor(tarea.estado)}`}>
                  {getEstadoTexto(tarea.estado)}
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        !loading && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
                <Calendar className="h-5 w-5 mr-2 text-blue-600 dark:text-blue-400" />
                Próximas Tareas Normales
              </h2>
              <Link
                to="/tasks"
                className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
              >
                Ver todas
              </Link>
            </div>
            <div className="text-center py-8">
              <div className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500">
                <Calendar className="h-full w-full" />
              </div>
              <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No tienes tareas normales</h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Las tareas normales asignadas aparecerán aquí
              </p>
            </div>
          </div>
        )
      )}

      {/* Próximas Tareas de Consorcio */}
      {tareas.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
              <Building className="h-5 w-5 mr-2 text-indigo-600 dark:text-indigo-400" />
              Próximas Tareas de Consorcio
            </h2>
            <Link
              to="/tecnico/tareas-consorcio"
              className="text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300"
            >
              Ver todas
            </Link>
          </div>
          <div className="space-y-3">
            {tareas.slice(0, 5).map((tarea) => (
              <div key={tarea._id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{tarea.titulo}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{tarea.cliente} • {formatDate(tarea.fechaEjecucion)}</p>
                </div>
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${getEstadoColor(tarea.estado)}`}>
                  {getEstadoTexto(tarea.estado)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default TecnicoDashboard;

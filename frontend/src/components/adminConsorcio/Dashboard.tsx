import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAppSelector } from '../../store';
import { 
  Calendar, 
  CheckCircle, 
  Clock, 
  Activity,
  ChevronRight,
  Building,
  DollarSign,
  TrendingUp,
  CheckSquare,
  Home
} from 'lucide-react';

const AdminConsorcioDashboard: React.FC = () => {
  const { user } = useAppSelector((state) => state.auth);
  
  // Estados para las tareas de consorcio
  const [tareas, setTareas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    presupuesto: 0,
    pendientesConfirmacion: 0,
    confirmadas: 0,
    enProgreso: 0,
    finalizadas: 0,
    canceladas: 0,
    pendientesPago: 0,
    facturadas: 0,
    pagadas: 0
  });

  useEffect(() => {
    fetchTareasConsorcio();
  }, []);

  const fetchTareasConsorcio = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('accessToken');
      
      const response = await fetch('/api/tareas-consorcio', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        const tareasData = data.tareas || [];
        setTareas(tareasData);
        calculateStats(tareasData);
      } else {
        if (response.status === 401) {
          localStorage.removeItem('accessToken');
          window.location.href = '/login';
          return;
        }
      }
    } catch (error) {
      console.error('Error al cargar tareas:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (tareasData: any[]) => {
    const newStats = {
      total: tareasData.length,
      presupuesto: tareasData.filter(t => t.estado === 'presupuesto').length,
      pendientesConfirmacion: tareasData.filter(t => t.estado === 'pendiente_confirmacion').length,
      confirmadas: tareasData.filter(t => t.estado === 'confirmada').length,
      enProgreso: tareasData.filter(t => t.estado === 'en_progreso').length,
      finalizadas: tareasData.filter(t => t.estado === 'finalizada').length,
      canceladas: tareasData.filter(t => t.estado === 'cancelada').length,
      pendientesPago: tareasData.filter(t => t.estado === 'pendiente_pago').length,
      facturadas: tareasData.filter(t => t.estado === 'facturada').length,
      pagadas: tareasData.filter(t => t.estado === 'pagada').length
    };
    setStats(newStats);
  };

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const tareasHoy = tareas.filter(task => {
    if (!task.fechaEjecucion) return false;
    const taskDate = new Date(task.fechaEjecucion);
    return taskDate.toDateString() === today.toDateString();
  });

  const tareasRecientes = tareas
    .filter(task => task.estado === 'presupuesto' || task.estado === 'pendiente_confirmacion')
    .slice(0, 5);

  const statCards = [
    {
      name: 'Tareas de Consorcio',
      value: stats.total,
      icon: Building,
      color: 'bg-blue-500',
      change: 'Gestionar tareas',
      changeType: 'neutral',
      hideChange: false,
      description: 'Gestiona todas las tareas del consorcio',
      showDescription: true
    },
    {
      name: 'En Presupuesto',
      value: stats.presupuesto,
      icon: DollarSign,
      color: 'bg-orange-500',
      change: 'Ver presupuestos',
      changeType: 'neutral',
      description: 'Tareas en fase de presupuesto',
      showDescription: true
    },
    {
      name: 'Pendientes de Confirmación',
      value: stats.pendientesConfirmacion,
      icon: Clock,
      color: 'bg-yellow-500',
      change: 'Confirmar tareas',
      changeType: 'neutral',
      description: 'Tareas esperando tu confirmación',
      showDescription: true
    },
    {
      name: 'Confirmadas',
      value: stats.confirmadas,
      icon: CheckCircle,
      color: 'bg-green-500',
      change: 'Ver confirmadas',
      changeType: 'positive'
    },
    {
      name: 'En Progreso',
      value: stats.enProgreso,
      icon: Activity,
      color: 'bg-purple-500',
      change: 'Ver progreso',
      changeType: 'neutral'
    },
    {
      name: 'Finalizadas',
      value: stats.finalizadas,
      icon: CheckSquare,
      color: 'bg-indigo-500',
      change: 'Subir comprobantes',
      changeType: 'neutral'
    },
    {
      name: 'Pendientes de Pago',
      value: stats.pendientesPago,
      icon: DollarSign,
      color: 'bg-orange-500',
      change: 'Gestionar pagos',
      changeType: 'neutral',
      description: 'Tareas listas para facturar',
      showDescription: true
    }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <Home className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Dashboard de Consorcio
              </h1>
              <p className="text-gray-600 dark:text-gray-300">
                Bienvenido, {user?.nombre}. Gestiona las tareas del consorcio.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {statCards.map((stat, index) => (
          <div key={index} className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
                  {stat.name}
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {stat.value}
                </p>
                {stat.showDescription && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {stat.description}
                  </p>
                )}
              </div>
              <div className={`${stat.color} p-3 rounded-full`}>
                <stat.icon className="h-6 w-6 text-white" />
              </div>
            </div>
            {!stat.hideChange && (
              <div className="mt-4 flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-300">
                  {stat.change}
                </span>
                <ChevronRight className="h-4 w-4 text-gray-400" />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tareas Recientes - Pendientes de Confirmación */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Pendientes de Confirmación
              </h2>
              <Link
                to="/adminConsorcio/tareas?estado=pendiente_confirmacion"
                className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
              >
                Ver todos
              </Link>
            </div>
          </div>
          <div className="p-6">
            {tareasRecientes.length === 0 ? (
              <div className="text-center py-8">
                <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 dark:text-gray-300">
                  No hay tareas pendientes de confirmación
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {tareasRecientes.map((tarea) => (
                  <div key={tarea._id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900 dark:text-white">
                        {tarea.titulo}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-300">
                        {tarea.cliente} • {tarea.direccion}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {tarea.fechaEjecucion}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300 rounded-full">
                        Pendiente
                      </span>
                      <ChevronRight className="h-4 w-4 text-gray-400" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Tareas de Hoy */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Tareas para Hoy
              </h2>
              <Link
                to="/adminConsorcio/calendario"
                className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
              >
                Ver calendario
              </Link>
            </div>
          </div>
          <div className="p-6">
            {tareasHoy.length === 0 ? (
              <div className="text-center py-8">
                <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 dark:text-gray-300">
                  No hay tareas programadas para hoy
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {tareasHoy.map((tarea) => (
                  <div key={tarea._id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900 dark:text-white">
                        {tarea.titulo}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-300">
                        {tarea.cliente} • {tarea.franja_horaria}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        tarea.estado === 'confirmada' 
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                          : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
                      }`}>
                        {tarea.estado === 'confirmada' ? 'Confirmada' : 'Pendiente'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Acciones Rápidas
          </h2>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link
              to="/adminConsorcio/tareas"
              className="flex items-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
            >
              <Building className="h-8 w-8 text-blue-600 dark:text-blue-400 mr-3" />
              <div>
                <h3 className="font-medium text-gray-900 dark:text-white">
                  Gestionar Tareas
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  Ver y administrar todas las tareas
                </p>
              </div>
            </Link>
            
            <Link
              to="/adminConsorcio/calendario"
              className="flex items-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors"
            >
              <Calendar className="h-8 w-8 text-green-600 dark:text-green-400 mr-3" />
              <div>
                <h3 className="font-medium text-gray-900 dark:text-white">
                  Calendario
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  Ver tareas por fecha
                </p>
              </div>
            </Link>
            
            <Link
              to="/adminConsorcio/analytics"
              className="flex items-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors"
            >
              <TrendingUp className="h-8 w-8 text-purple-600 dark:text-purple-400 mr-3" />
              <div>
                <h3 className="font-medium text-gray-900 dark:text-white">
                  Análisis
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  Estadísticas y reportes
                </p>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminConsorcioDashboard;

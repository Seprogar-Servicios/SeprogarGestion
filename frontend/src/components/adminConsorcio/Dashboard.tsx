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
  RefreshCw,
} from 'lucide-react';

const AdminConsorcioDashboard: React.FC = () => {
  const { user } = useAppSelector((state) => state.auth);

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
    pagadas: 0,
  });

  const today = new Date();

  useEffect(() => {
    fetchTareasConsorcio();
  }, []);

  const fetchTareasConsorcio = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('accessToken');

      const response = await fetch('/api/tareas-consorcio', {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        const tareasData = data.tareas || [];
        setTareas(tareasData);
        calculateStats(tareasData);
      } else if (response.status === 401) {
        localStorage.removeItem('accessToken');
        window.location.href = '/login';
      }
    } catch (error) {
      console.error('Error al cargar tareas:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (tareasData: any[]) => {
    setStats({
      total: tareasData.length,
      presupuesto: tareasData.filter((t) => t.estado === 'presupuesto').length,
      pendientesConfirmacion: tareasData.filter((t) => t.estado === 'pendiente_confirmacion').length,
      confirmadas: tareasData.filter((t) => t.estado === 'confirmada').length,
      enProgreso: tareasData.filter((t) => t.estado === 'en_progreso').length,
      finalizadas: tareasData.filter((t) => t.estado === 'finalizada').length,
      canceladas: tareasData.filter((t) => t.estado === 'cancelada').length,
      pendientesPago: tareasData.filter((t) => t.estado === 'pendiente_pago').length,
      facturadas: tareasData.filter((t) => t.estado === 'facturada').length,
      pagadas: tareasData.filter((t) => t.estado === 'pagada').length,
    });
  };

  const dayStart = new Date();
  dayStart.setHours(0, 0, 0, 0);

  const tareasHoy = tareas.filter((task) => {
    if (!task.fechaEjecucion) return false;
    const taskDate = new Date(task.fechaEjecucion);
    return taskDate.toDateString() === dayStart.toDateString();
  });

  const tareasRecientes = tareas
    .filter((task) => task.estado === 'presupuesto' || task.estado === 'pendiente_confirmacion')
    .slice(0, 5);

  const statCards = [
    {
      name: 'Tareas de consorcio',
      value: stats.total,
      icon: Building,
      tone: { bar: 'bg-blue-500', icon: 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' },
      change: 'Gestionar tareas',
      to: '/adminConsorcio/tareas',
    },
    {
      name: 'En presupuesto',
      value: stats.presupuesto,
      icon: DollarSign,
      tone: { bar: 'bg-orange-500', icon: 'bg-orange-50 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400' },
      change: 'Ver presupuestos',
      to: '/adminConsorcio/tareas?estado=presupuesto',
    },
    {
      name: 'Pendientes de confirmación',
      value: stats.pendientesConfirmacion,
      icon: Clock,
      tone: { bar: 'bg-amber-500', icon: 'bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400' },
      change: 'Confirmar tareas',
      to: '/adminConsorcio/tareas?estado=pendiente_confirmacion',
    },
    {
      name: 'Confirmadas',
      value: stats.confirmadas,
      icon: CheckCircle,
      tone: { bar: 'bg-emerald-500', icon: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400' },
      change: 'Ver confirmadas',
      to: '/adminConsorcio/tareas?estado=confirmada',
    },
    {
      name: 'En progreso',
      value: stats.enProgreso,
      icon: Activity,
      tone: { bar: 'bg-orange-500', icon: 'bg-orange-50 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400' },
      change: 'Ver progreso',
      to: '/adminConsorcio/tareas?estado=en_progreso',
    },
    {
      name: 'Finalizadas',
      value: stats.finalizadas,
      icon: CheckSquare,
      tone: { bar: 'bg-blue-500', icon: 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' },
      change: 'Ver finalizadas',
      to: '/adminConsorcio/tareas?estado=finalizada',
    },
    {
      name: 'Pendientes de pago',
      value: stats.pendientesPago,
      icon: DollarSign,
      tone: { bar: 'bg-orange-500', icon: 'bg-orange-50 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400' },
      change: 'Gestionar pagos',
      to: '/adminConsorcio/tareas?estado=pendiente_pago',
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-orange-600 dark:text-orange-400 mb-1">
            {today.toLocaleDateString('es-AR', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
            })}
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            Hola, {user?.nombre?.split(' ')[0] || 'administrador'}
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Resumen operativo del consorcio
          </p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={fetchTareasConsorcio}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
            Actualizar
          </button>
          <Link
            to="/adminConsorcio/tareas"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-sm shadow-blue-600/25 transition-colors"
          >
            <Building className="h-4 w-4" />
            Ver tareas
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <Link
              key={stat.name}
              to={stat.to}
              className="relative overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 transition-colors hover:border-blue-300 dark:hover:border-blue-500 hover:bg-slate-50/80 dark:hover:bg-slate-800/80"
            >
              <div className={`absolute left-0 top-0 bottom-0 w-1 ${stat.tone.bar}`} />
              <div className="flex items-start justify-between gap-3 pl-2">
                <div>
                  <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{stat.name}</p>
                  <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
                    {stat.value}
                  </p>
                  <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{stat.change}</p>
                </div>
                <div className={`p-2.5 rounded-xl ${stat.tone.icon}`}>
                  <Icon className="h-5 w-5" />
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700">
          <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Pendientes de confirmación</h2>
            <Link
              to="/adminConsorcio/tareas?estado=pendiente_confirmacion"
              className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700"
            >
              Ver todos
            </Link>
          </div>
          <div className="p-6">
            {tareasRecientes.length === 0 ? (
              <div className="text-center py-8">
                <Clock className="h-10 w-10 text-slate-400 mx-auto mb-3" />
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  No hay tareas pendientes de confirmación
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {tareasRecientes.map((tarea) => (
                  <div
                    key={tarea._id}
                    className="flex items-center justify-between p-4 rounded-xl bg-slate-50 dark:bg-slate-700/40"
                  >
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-slate-900 dark:text-white truncate">{tarea.titulo}</h3>
                      <p className="text-sm text-slate-500 dark:text-slate-400 truncate">
                        {tarea.cliente} • {tarea.direccion}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 ml-3">
                      <span className="px-2 py-1 text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 rounded-full">
                        Pendiente
                      </span>
                      <ChevronRight className="h-4 w-4 text-slate-400" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700">
          <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Tareas para hoy</h2>
            <Link
              to="/adminConsorcio/calendario"
              className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700"
            >
              Ver calendario
            </Link>
          </div>
          <div className="p-6">
            {tareasHoy.length === 0 ? (
              <div className="text-center py-8">
                <Calendar className="h-10 w-10 text-slate-400 mx-auto mb-3" />
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  No hay tareas programadas para hoy
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {tareasHoy.map((tarea) => (
                  <div
                    key={tarea._id}
                    className="flex items-center justify-between p-4 rounded-xl bg-slate-50 dark:bg-slate-700/40"
                  >
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-slate-900 dark:text-white truncate">{tarea.titulo}</h3>
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        {tarea.cliente} • {tarea.franja_horaria}
                      </p>
                    </div>
                    <span
                      className={`ml-3 px-2 py-1 text-xs font-medium rounded-full ${
                        tarea.estado === 'confirmada'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300'
                          : 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300'
                      }`}
                    >
                      {tarea.estado === 'confirmada' ? 'Confirmada' : 'Pendiente'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Acciones rápidas</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link
            to="/adminConsorcio/tareas"
            className="flex items-center p-4 rounded-xl bg-blue-50/80 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
          >
            <Building className="h-7 w-7 text-blue-600 dark:text-blue-400 mr-3" />
            <div>
              <h3 className="font-medium text-slate-900 dark:text-white">Gestionar tareas</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">Ver y administrar todas las tareas</p>
            </div>
          </Link>
          <Link
            to="/adminConsorcio/calendario"
            className="flex items-center p-4 rounded-xl bg-emerald-50/80 dark:bg-emerald-900/20 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 transition-colors"
          >
            <Calendar className="h-7 w-7 text-emerald-600 dark:text-emerald-400 mr-3" />
            <div>
              <h3 className="font-medium text-slate-900 dark:text-white">Calendario</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">Ver tareas por fecha</p>
            </div>
          </Link>
          <Link
            to="/adminConsorcio/analytics"
            className="flex items-center p-4 rounded-xl bg-orange-50/80 dark:bg-orange-900/20 hover:bg-orange-100 dark:hover:bg-orange-900/30 transition-colors"
          >
            <TrendingUp className="h-7 w-7 text-orange-600 dark:text-orange-400 mr-3" />
            <div>
              <h3 className="font-medium text-slate-900 dark:text-white">Análisis</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">Estadísticas y reportes</p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default AdminConsorcioDashboard;

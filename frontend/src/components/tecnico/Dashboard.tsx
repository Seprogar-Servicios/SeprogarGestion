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
  Wrench,
} from 'lucide-react';
import { showError } from '../../utils/toastUtils';
import { useAppSelector } from '../../store';

const TecnicoDashboard: React.FC = () => {
  const { user } = useAppSelector((state) => state.auth);

  const [tareas, setTareas] = useState<any[]>([]);
  const [tareasNormales, setTareasNormales] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    pendientes: 0,
    enProgreso: 0,
    completadas: 0,
    hoy: 0,
  });
  const [statsNormales, setStatsNormales] = useState({
    total: 0,
    completadas: 0,
    enProgreso: 0,
    pendientes: 0,
    canceladas: 0,
    hoy: 0,
  });

  const today = new Date();

  useEffect(() => {
    fetchMisTareas();
    fetchTareasNormales();
  }, []);

  const fetchMisTareas = async () => {
    try {
      const token = localStorage.getItem('accessToken');

      const response = await fetch('/api/tareas-consorcio/mis-tareas', {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
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

      const response = await fetch(`/api/tareas?usuario=${user?._id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        setTareasNormales([]);
        setStatsNormales({
          total: 0,
          completadas: 0,
          enProgreso: 0,
          pendientes: 0,
          canceladas: 0,
          hoy: 0,
        });
        return;
      }

      const data = await response.json();
      const tareasData = data.data || [];
      setTareasNormales(tareasData);
      calcularEstadisticasNormales(tareasData);
    } catch (error) {
      console.error('Error:', error);
      setTareasNormales([]);
      setStatsNormales({
        total: 0,
        completadas: 0,
        enProgreso: 0,
        pendientes: 0,
        canceladas: 0,
        hoy: 0,
      });
    } finally {
      setLoading(false);
    }
  };

  const calcularEstadisticas = (tareasData: any[]) => {
    const ahora = new Date();
    const hoy = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate());

    const estadisticas = tareasData.reduce(
      (acc, tarea) => {
        acc.total++;

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

        const fechaTarea = new Date(tarea.fechaEjecucion);
        if (fechaTarea >= hoy && fechaTarea < new Date(hoy.getTime() + 24 * 60 * 60 * 1000)) {
          acc.hoy++;
        }

        return acc;
      },
      {
        total: 0,
        pendientes: 0,
        enProgreso: 0,
        completadas: 0,
        hoy: 0,
      }
    );

    setStats(estadisticas);
  };

  const calcularEstadisticasNormales = (tareasData: any[]) => {
    const day = new Date();
    day.setHours(0, 0, 0, 0);

    const todayStr = [
      day.getFullYear(),
      String(day.getMonth() + 1).padStart(2, '0'),
      String(day.getDate()).padStart(2, '0'),
    ].join('-');

    const todayTasks =
      tareasData?.filter((task) => {
        if (!task.fechaEjecucion) return false;

        const taskDate = new Date(task.fechaEjecucion);
        taskDate.setDate(taskDate.getDate() + 1);

        const taskDateStr = [
          taskDate.getFullYear(),
          String(taskDate.getMonth() + 1).padStart(2, '0'),
          String(taskDate.getDate()).padStart(2, '0'),
        ].join('-');

        return taskDateStr === todayStr;
      }) || [];

    setStatsNormales({
      total: tareasData?.length || 0,
      completadas: tareasData?.filter((task) => task.estado === 'completada').length || 0,
      enProgreso: tareasData?.filter((task) => task.estado === 'en progreso').length || 0,
      pendientes: tareasData?.filter((task) => task.estado === 'pendiente').length || 0,
      canceladas: tareasData?.filter((task) => task.estado === 'cancelada').length || 0,
      hoy: todayTasks.length,
    });
  };

  const getEstadoColor = (estado: string) => {
    switch (estado) {
      case 'pendiente':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300';
      case 'en_progreso':
      case 'en progreso':
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
      case 'en progreso':
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
      year: 'numeric',
    });
  };

  const StatCard = ({
    name,
    value,
    icon: Icon,
    tone,
    hint,
  }: {
    name: string;
    value: number;
    icon: React.ElementType;
    tone: { bar: string; icon: string };
    hint?: string;
  }) => (
    <div className="relative overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5">
      <div className={`absolute left-0 top-0 bottom-0 w-1 ${tone.bar}`} />
      <div className="flex items-start justify-between gap-3 pl-2">
        <div>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{name}</p>
          <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900 dark:text-white">{value}</p>
          {hint && <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{hint}</p>}
        </div>
        <div className={`p-2.5 rounded-xl ${tone.icon}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[16rem]">
        <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
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
            Hola, {user?.nombre?.split(' ')[0] || 'técnico'}
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Resumen de tus tareas normales y de consorcio
          </p>
        </div>
        <button
          onClick={() => {
            fetchMisTareas();
            fetchTareasNormales();
          }}
          className="inline-flex items-center gap-2 self-start sm:self-auto px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-sm shadow-blue-600/25 transition-colors"
        >
          <RefreshCw className="h-4 w-4" />
          Actualizar
        </button>
      </div>

      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">
          Tareas normales
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
          <StatCard
            name="Total"
            value={statsNormales.total}
            icon={CheckSquare}
            tone={{ bar: 'bg-blue-500', icon: 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' }}
          />
          <StatCard
            name="Completadas"
            value={statsNormales.completadas}
            icon={CheckCircle}
            tone={{ bar: 'bg-emerald-500', icon: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400' }}
          />
          <StatCard
            name="En progreso"
            value={statsNormales.enProgreso}
            icon={Clock}
            tone={{ bar: 'bg-amber-500', icon: 'bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400' }}
          />
          <StatCard
            name="Pendientes"
            value={statsNormales.pendientes}
            icon={Calendar}
            tone={{ bar: 'bg-orange-500', icon: 'bg-orange-50 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400' }}
          />
          <StatCard
            name="Para hoy"
            value={statsNormales.hoy}
            icon={Calendar}
            tone={{ bar: 'bg-blue-500', icon: 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' }}
          />
        </div>
      </div>

      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">
          Tareas de consorcio
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <StatCard
            name="Total"
            value={stats.total}
            icon={Building}
            tone={{ bar: 'bg-blue-500', icon: 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' }}
          />
          <StatCard
            name="Pendientes"
            value={stats.pendientes}
            icon={Clock}
            tone={{ bar: 'bg-amber-500', icon: 'bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400' }}
          />
          <StatCard
            name="En progreso"
            value={stats.enProgreso}
            icon={Activity}
            tone={{ bar: 'bg-orange-500', icon: 'bg-orange-50 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400' }}
          />
          <StatCard
            name="Completadas"
            value={stats.completadas}
            icon={CheckCircle}
            tone={{ bar: 'bg-emerald-500', icon: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400' }}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Tareas normales</h2>
          <div className="space-y-3">
            <Link
              to="/tasks"
              className="flex items-center justify-between p-4 rounded-xl bg-blue-50/80 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors group"
            >
              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                <span className="text-sm font-medium text-blue-700 dark:text-blue-300">Ver tareas normales</span>
              </div>
              <ChevronRight className="h-4 w-4 text-blue-600 dark:text-blue-400 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link
              to="/calendar"
              className="flex items-center justify-between p-4 rounded-xl bg-slate-50 dark:bg-slate-700/50 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors group"
            >
              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5 text-slate-600 dark:text-slate-400" />
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Calendario</span>
              </div>
              <ChevronRight className="h-4 w-4 text-slate-500 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Tareas de consorcio</h2>
          <div className="space-y-3">
            <Link
              to="/tecnico/tareas-consorcio"
              className="flex items-center justify-between p-4 rounded-xl bg-orange-50/80 dark:bg-orange-900/20 hover:bg-orange-100 dark:hover:bg-orange-900/30 transition-colors group"
            >
              <div className="flex items-center gap-3">
                <Wrench className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                <span className="text-sm font-medium text-orange-700 dark:text-orange-300">Ver tareas de consorcio</span>
              </div>
              <ChevronRight className="h-4 w-4 text-orange-600 dark:text-orange-400 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Próximas tareas normales</h2>
          <Link to="/tasks" className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700">
            Ver todas
          </Link>
        </div>
        {tareasNormales.length > 0 ? (
          <div className="space-y-3">
            {tareasNormales.slice(0, 5).map((tarea) => (
              <div
                key={tarea._id}
                className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-700/40"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{tarea.titulo}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {tarea.cliente || 'Sin cliente'} • {formatDate(tarea.fechaEjecucion)}
                  </p>
                </div>
                <span className={`ml-3 px-2 py-1 text-xs font-medium rounded-full ${getEstadoColor(tarea.estado)}`}>
                  {getEstadoTexto(tarea.estado)}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <Calendar className="mx-auto h-10 w-10 text-slate-400" />
            <h3 className="mt-2 text-sm font-medium text-slate-900 dark:text-white">No tienes tareas normales</h3>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Las tareas normales asignadas aparecerán aquí
            </p>
          </div>
        )}
      </div>

      {tareas.length > 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Próximas tareas de consorcio</h2>
            <Link
              to="/tecnico/tareas-consorcio"
              className="text-sm text-orange-600 dark:text-orange-400 hover:text-orange-700"
            >
              Ver todas
            </Link>
          </div>
          <div className="space-y-3">
            {tareas.slice(0, 5).map((tarea) => (
              <div
                key={tarea._id}
                className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-700/40"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{tarea.titulo}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {tarea.cliente} • {formatDate(tarea.fechaEjecucion)}
                  </p>
                </div>
                <span className={`ml-3 px-2 py-1 text-xs font-medium rounded-full ${getEstadoColor(tarea.estado)}`}>
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

import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../store';
import { fetchTasks, setFilters } from '../../store/slices/tasksSlice';
import { fetchUsers } from '../../store/slices/usersSlice';
import { fetchEspecialidades } from '../../store/slices/especialidadesSlice';
import UpcomingTasksFilter from '../filters/UpcomingTasksFilter';
import type { TaskFilters } from '../../types';
import { isAdminRole } from '../../utils/roles';
import { 
  Calendar, 
  CheckCircle, 
  CheckCircle2,
  Clock, 
  Users, 
  AlertCircle,
  Activity,
  ChevronRight,
  BarChart2,
  Settings,
  ArrowRight,
  XCircle,
  Tag
} from 'lucide-react';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);
  const { tasks, loading: tasksLoading } = useAppSelector((state) => state.tasks);
  const { users } = useAppSelector((state) => state.users);
  const { especialidades } = useAppSelector((state) => state.especialidades);
  
  // Estado para tareas de consorcio
  const [tareasConsorcio, setTareasConsorcio] = useState<any[]>([]);
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const todayStr = [
    today.getFullYear(),
    String(today.getMonth() + 1).padStart(2, '0'),
    String(today.getDate()).padStart(2, '0')
  ].join('-')

  const todayTasks = tasks?.filter(task => {
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
  
  const [currentFilters, setCurrentFilters] = useState<TaskFilters>({});

  // Función para obtener tareas de consorcio
  const fetchTareasConsorcio = async () => {
    if (!isAdminRole(user)) {
      return;
    }
    
    try {
      const token = localStorage.getItem('accessToken');
      
      const response = await fetch('/api/tareas-consorcio', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setTareasConsorcio(data.tareas || []);
      } else {
        setTareasConsorcio([]);
      }
    } catch (error) {
      console.error('Error al cargar tareas de consorcio:', error);
      setTareasConsorcio([]);
    }
  };

  useEffect(() => {
    dispatch(fetchTasks(currentFilters));
    if (isAdminRole(user)) {
      dispatch(fetchUsers());
      dispatch(fetchEspecialidades());
      fetchTareasConsorcio();
    }
  }, [dispatch, user?.rol, currentFilters]);

  const handleFiltersChange = (updatedFilters: TaskFilters) => {
    const mergedFilters = {
      ...currentFilters,
      ...updatedFilters,
      ...Object.fromEntries(
        Object.entries(updatedFilters).filter(([_, v]) => v !== undefined)
      )
    };
    
    setCurrentFilters(mergedFilters);
    dispatch(setFilters(mergedFilters));
  };

  const completedTasks = tasks?.filter(task => task.estado === 'completada').length || 0;
  const pendingTasks = tasks?.filter(task => task.estado === 'pendiente').length || 0;
  const inProgressTasks = tasks?.filter(task => task.estado === 'en progreso').length || 0;
  const canceledTasks = tasks?.filter(task => task.estado === 'cancelada').length || 0;
  const myTasks = tasks?.filter(task => 
    task.creadoPor?._id === user?._id || 
    task.tecnicos?.some(tecnico => tecnico._id === user?._id)
  ) || [];

  // Calculate real percentage changes based on task completion rates
  const totalTasks = tasks?.length || 0;
  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  const progressRate = totalTasks > 0 ? Math.round((inProgressTasks / totalTasks) * 100) : 0;
  const pendingRate = totalTasks > 0 ? Math.round((pendingTasks / totalTasks) * 100) : 0;
  const canceledRate = totalTasks > 0 ? Math.round((canceledTasks / totalTasks) * 100) : 0;

  // Calculate consorcio tasks statistics
  const totalConsorcioTasks = tareasConsorcio.length || 0;
  const consorcioPendientesConfirmacion = tareasConsorcio.filter(t => t.estado === 'pendiente_confirmacion').length;

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
      color: 'bg-amber-500',
      change: `${pendingRate}% del total`,
      changeType: pendingRate > 70 ? 'negative' : 'neutral'
    },
    {
      name: 'Canceladas',
      value: canceledTasks,
      icon: XCircle,
      color: 'bg-red-500',
      change: `${canceledRate}% del total`,
      changeType: 'neutral',
      description: 'Tareas que han sido canceladas',
      showDescription: false
    }
  ];

  // Add today's tasks card for all users
  stats.push({
    name: 'Tareas del Día',
    value: todayTasks.length,
    icon: Calendar,
    color: 'bg-cyan-500',
    change: 'Ver tareas de hoy',
    changeType: 'neutral',
    hideChange: false,
    description: 'Tareas programadas para hoy',
    showDescription: true
  });

  if (isAdminRole(user)) {
    stats.push(
      {
        name: 'Usuarios',
        value: users?.length || 0,
        icon: Users,
        color: 'bg-orange-500',
        change: 'Gestionar usuarios',
        changeType: 'neutral',
        hideChange: false,
        description: 'Administra los usuarios del sistema',
        showDescription: true
      },
      {
        name: 'Especialidades',
        value: especialidades?.length || 0,
        icon: Tag,
        color: 'bg-teal-500',
        change: 'Gestionar especialidades',
        changeType: 'neutral',
        hideChange: false,
        description: 'Administra las especialidades',
        showDescription: true
      },
      {
        name: 'Tareas de Consorcio',
        value: totalConsorcioTasks,
        icon: BarChart2,
        color: 'bg-orange-500',
        change: 'Gestionar tareas de consorcio',
        changeType: 'neutral',
        hideChange: false,
        description: 'Todas las tareas de consorcio del sistema',
        showDescription: true
      },
      {
        name: 'Pendientes de Confirmación',
        value: consorcioPendientesConfirmacion,
        icon: Clock,
        color: 'bg-yellow-500',
        change: 'Confirmar tareas',
        changeType: 'neutral',
        hideChange: false,
        description: 'Tareas esperando confirmación de admin de consorcio',
        showDescription: true
      }
    );
  }

  const recentTasks = tasks
    ? [...tasks] // Create a new array to avoid modifying the original
      .sort((a, b) => new Date(b.fechaCreacion).getTime() - new Date(a.fechaCreacion).getTime())
      .slice(0, 5)
    : [];

  // Función para formatear fechas en la zona horaria de Argentina
  const formatDateToArgentina = (dateString: string) => {
    if (!dateString) return '';
    
    // Crear la fecha y ajustar a la zona horaria de Argentina (UTC-3)
    const date = new Date(dateString);
    
    // Ajustar la fecha sumando 3 horas para compensar la diferencia con UTC
    const adjustedDate = new Date(date.getTime() + (3 * 60 * 60 * 1000));
    
    const options: Intl.DateTimeFormatOptions = {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      timeZone: 'America/Argentina/Buenos_Aires'
    };
    
    return adjustedDate.toLocaleDateString('es-AR', options);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
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
            Hola, {user?.nombre?.split(' ')[0] || 'equipo'}
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Resumen operativo de Seprogar
          </p>
        </div>
        {isAdminRole(user) && (
          <Link
            to="/tasks"
            className="inline-flex items-center gap-2 self-start sm:self-auto px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-sm shadow-blue-600/25 transition-colors"
          >
            <Calendar className="h-4 w-4" />
            Ver tareas
          </Link>
        )}
      </div>

      {isAdminRole(user) && (
        <UpcomingTasksFilter
          filters={currentFilters}
          onFiltersChange={handleFiltersChange}
        />
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          const clickable =
            stat.name === 'Usuarios' ||
            stat.name === 'Tareas Totales' ||
            stat.name === 'Tareas del Día' ||
            stat.name === 'Especialidades' ||
            stat.name === 'Tareas de Consorcio' ||
            stat.name === 'Pendientes de Confirmación' ||
            (isAdminRole(user) &&
              (stat.name === 'Completadas' ||
                stat.name === 'En Progreso' ||
                stat.name === 'Pendientes' ||
                stat.name === 'Canceladas'));

          const tone =
            stat.name === 'Completadas'
              ? { bar: 'bg-emerald-500', icon: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400' }
              : stat.name === 'En Progreso'
                ? { bar: 'bg-amber-500', icon: 'bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400' }
                : stat.name === 'Pendientes' || stat.name === 'Pendientes de Confirmación'
                  ? { bar: 'bg-orange-500', icon: 'bg-orange-50 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400' }
                  : stat.name === 'Canceladas'
                    ? { bar: 'bg-red-500', icon: 'bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400' }
                    : stat.name === 'Usuarios' || stat.name === 'Tareas de Consorcio'
                      ? { bar: 'bg-orange-500', icon: 'bg-orange-50 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400' }
                      : { bar: 'bg-blue-500', icon: 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' };

          return (
            <div
              key={stat.name}
              role={clickable ? 'button' : undefined}
              tabIndex={clickable ? 0 : undefined}
              onClick={() => {
                if (stat.name === 'Usuarios') navigate('/admin/users');
                else if (stat.name === 'Tareas Totales') navigate('/tasks');
                else if (stat.name === 'Tareas del Día') {
                  navigate('/tasks?fecha=' + today.toISOString().split('T')[0]);
                } else if (stat.name === 'Especialidades') navigate('/admin/especialidades');
                else if (
                  stat.name === 'Tareas de Consorcio' ||
                  stat.name === 'Pendientes de Confirmación'
                ) {
                  navigate('/admin/tareas-consorcio');
                } else if (
                  isAdminRole(user) &&
                  (stat.name === 'Completadas' ||
                    stat.name === 'En Progreso' ||
                    stat.name === 'Pendientes' ||
                    stat.name === 'Canceladas')
                ) {
                  navigate('/admin/analytics');
                }
              }}
              onKeyDown={(e) => {
                if (clickable && (e.key === 'Enter' || e.key === ' ')) {
                  e.preventDefault();
                  (e.currentTarget as HTMLDivElement).click();
                }
              }}
              className={`relative overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 transition-colors ${
                clickable
                  ? 'cursor-pointer hover:border-blue-300 dark:hover:border-blue-500 hover:bg-slate-50/80 dark:hover:bg-slate-800/80'
                  : ''
              }`}
            >
              <div className={`absolute left-0 top-0 bottom-0 w-1 ${tone.bar}`} />
              <div className="flex items-start justify-between gap-3 pl-2">
                <div>
                  <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                    {stat.name}
                  </p>
                  <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
                    {stat.value}
                  </p>
                  {!stat.hideChange && (
                    <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                      {stat.change}
                    </p>
                  )}
                </div>
                <div className={`rounded-xl p-2.5 ${tone.icon}`}>
                  <Icon className="h-5 w-5" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Tasks */}
        <section className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                Tareas recientes
              </h2>
            </div>
            <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
              {recentTasks.length}
            </span>
          </div>
          <div className="p-4">
            {tasksLoading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div
                    key={i}
                    className="animate-pulse flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-700/40"
                  >
                    <div className="h-10 w-10 rounded-xl bg-slate-200 dark:bg-slate-600" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-slate-200 dark:bg-slate-600 rounded w-3/4" />
                      <div className="h-3 bg-slate-200 dark:bg-slate-600 rounded w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : recentTasks.length > 0 ? (
              <div className="space-y-2">
                {recentTasks.map((task) => (
                  <button
                    key={task._id}
                    type="button"
                    onClick={() => navigate(`/tasks/${task._id}`)}
                    className="w-full text-left group flex items-center gap-3 p-3 rounded-xl border border-transparent hover:border-slate-200 dark:hover:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700/40 transition-colors"
                  >
                    <div
                      className={`flex-shrink-0 h-10 w-10 rounded-xl flex items-center justify-center ${
                        task.estado === 'completada'
                          ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400'
                          : task.estado === 'en progreso'
                            ? 'bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400'
                            : 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
                      }`}
                    >
                      <Calendar className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex justify-between gap-2">
                        <h3 className="text-sm font-medium text-slate-900 dark:text-white truncate">
                          {task.titulo}
                        </h3>
                        {task.fechaEjecucion && (
                          <span className="text-xs text-slate-400 whitespace-nowrap">
                            {formatDateToArgentina(task.fechaEjecucion)}
                          </span>
                        )}
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${
                            task.estado === 'completada'
                              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                              : task.estado === 'en progreso'
                                ? 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                                : 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                          }`}
                        >
                          {task.estado.charAt(0).toUpperCase() + task.estado.slice(1)}
                        </span>
                        {task.cliente && (
                          <span className="text-xs text-slate-500 dark:text-slate-400 truncate">
                            {task.cliente}
                          </span>
                        )}
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-blue-500 transition-colors" />
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-center py-10">
                <Clock className="mx-auto h-10 w-10 text-slate-300" />
                <h3 className="mt-3 text-sm font-medium text-slate-900 dark:text-white">
                  No hay tareas recientes
                </h3>
                <p className="mt-1 text-sm text-slate-500">Las tareas recientes aparecerán acá</p>
              </div>
            )}
          </div>
        </section>

        {/* Quick Actions / My Tasks */}
        <section className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-orange-500" />
              <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                {isAdminRole(user) ? 'Acciones rápidas' : 'Mis tareas'}
              </h2>
            </div>
            {!isAdminRole(user) && (
              <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-orange-50 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300">
                {myTasks.length}
              </span>
            )}
          </div>
          <div className="p-4">
            {isAdminRole(user) ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  {
                    to: '/tasks',
                    title: 'Gestionar tareas',
                    desc: 'Ver y administrar el trabajo',
                    icon: Calendar,
                    tone: 'blue',
                  },
                  {
                    to: '/admin/users',
                    title: 'Usuarios',
                    desc: 'Cuentas y aprobaciones',
                    icon: Users,
                    tone: 'orange',
                  },
                  {
                    to: '/admin/analytics',
                    title: 'Reportes',
                    desc: 'Estadísticas y análisis',
                    icon: BarChart2,
                    tone: 'blue',
                  },
                  {
                    to: '/admin/pagos-manuales',
                    title: 'Pagos',
                    desc: 'Pagos manuales y PDF',
                    icon: Settings,
                    tone: 'orange',
                  },
                ].map((action) => {
                  const Icon = action.icon;
                  const isOrange = action.tone === 'orange';
                  return (
                    <Link
                      key={action.to}
                      to={action.to}
                      className={`group flex items-start gap-3 p-4 rounded-xl border border-slate-200 dark:border-slate-700 transition-colors ${
                        isOrange
                          ? 'hover:border-orange-300 dark:hover:border-orange-500'
                          : 'hover:border-blue-300 dark:hover:border-blue-500'
                      }`}
                    >
                      <div
                        className={`p-2.5 rounded-xl ${
                          isOrange
                            ? 'bg-orange-50 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400'
                            : 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
                        }`}
                      >
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="font-medium text-slate-900 dark:text-white text-sm">
                          {action.title}
                        </h3>
                        <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                          {action.desc}
                        </p>
                      </div>
                      <ChevronRight
                        className={`h-4 w-4 mt-1 text-slate-300 ${
                          isOrange ? 'group-hover:text-orange-500' : 'group-hover:text-blue-500'
                        }`}
                      />
                    </Link>
                  );
                })}
              </div>
            ) : myTasks.length > 0 ? (
              <div className="space-y-2">
                {myTasks.slice(0, 5).map((task) => (
                  <button
                    key={task._id}
                    type="button"
                    onClick={() => navigate(`/tasks/${task._id}`)}
                    className="w-full text-left group flex items-center gap-3 p-3 rounded-xl border border-transparent hover:border-slate-200 dark:hover:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700/40 transition-colors"
                  >
                    <div
                      className={`flex-shrink-0 h-10 w-10 rounded-xl flex items-center justify-center font-semibold ${
                        task.estado === 'completada'
                          ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400'
                          : task.estado === 'en progreso'
                            ? 'bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400'
                            : 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
                      }`}
                    >
                      {task.titulo.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex justify-between gap-2">
                        <h3 className="text-sm font-medium text-slate-900 dark:text-white truncate">
                          {task.titulo}
                        </h3>
                        {task.fechaEjecucion && (
                          <span className="text-xs text-slate-400 whitespace-nowrap">
                            {new Date(task.fechaEjecucion).toLocaleDateString('es-AR', {
                              day: '2-digit',
                              month: 'short',
                            })}
                          </span>
                        )}
                      </div>
                      <div className="mt-1 flex items-center gap-2">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${
                            task.estado === 'completada'
                              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                              : task.estado === 'en progreso'
                                ? 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                                : 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                          }`}
                        >
                          {task.estado.charAt(0).toUpperCase() + task.estado.slice(1)}
                        </span>
                        {task.cliente && (
                          <span className="text-xs text-slate-500 truncate">• {task.cliente}</span>
                        )}
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-blue-500" />
                  </button>
                ))}
                {myTasks.length > 5 && (
                  <div className="text-center pt-2">
                    <Link
                      to="/tasks"
                      className="inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400"
                    >
                      Ver todas mis tareas
                      <ArrowRight className="ml-1 h-4 w-4" />
                    </Link>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-10">
                <CheckCircle2 className="mx-auto h-10 w-10 text-slate-300" />
                <h3 className="mt-3 text-sm font-medium text-slate-900 dark:text-white">
                  No tenés tareas asignadas
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  Las que te asignen van a aparecer acá
                </p>
                <Link
                  to="/tasks"
                  className="mt-4 inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700"
                >
                  Ver todas las tareas
                </Link>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};

export default Dashboard;

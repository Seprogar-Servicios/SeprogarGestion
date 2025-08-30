import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../store';
import { fetchTaskById, clearCurrentTask } from '../../store/slices/tasksSlice';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  ArrowLeft,
  Calendar,
  MapPin,
  User,
  Users,
  Phone,
  CheckCircle,
  XCircle,
  Edit,
  Trash2,
  MessageSquare,
  Clock,
  FileText,
  Eye,
} from 'lucide-react';
import ObservationsList from '../observations/ObservationsList';
import type { RootState } from '../../store';

type RouteParams = {
  id: string;
  [key: string]: string | undefined;
};

const TaskDetails: React.FC = () => {
  const { id } = useParams<RouteParams>();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  const { currentTask, loading, error } = useAppSelector((state: RootState) => ({
    currentTask: state.tasks.currentTask,
    loading: state.tasks.loading,
    error: state.tasks.error,
  }));

  const { user } = useAppSelector((state: RootState) => state.auth);

  useEffect(() => {
    if (id) {
      dispatch(fetchTaskById(id));
    }
    
    return () => {
      dispatch(clearCurrentTask());
    };
  }, [dispatch, id]);

  const renderStatusBadge = (estado?: string): JSX.Element | null => {
    if (!estado) return null;
    
    const baseClasses = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium shadow-sm';
    
    switch (estado.toLowerCase()) {
      case 'pendiente':
        return (
          <span className={`${baseClasses} bg-gradient-to-r from-yellow-100 to-yellow-200 text-yellow-800 dark:from-yellow-900/70 dark:to-yellow-800/70 dark:text-yellow-200`}>
            Pendiente
          </span>
        );
      case 'en progreso':
        return (
          <span className={`${baseClasses} bg-gradient-to-r from-blue-100 to-blue-200 text-blue-800 dark:from-blue-900/70 dark:to-blue-800/70 dark:text-blue-200`}>
            En progreso
          </span>
        );
      case 'completada':
        return (
          <span className={`${baseClasses} bg-gradient-to-r from-green-100 to-green-200 text-green-800 dark:from-green-900/70 dark:to-green-800/70 dark:text-green-200`}>
            <CheckCircle className="h-3 w-3 mr-1" />
            Completada
          </span>
        );
      case 'cancelada':
        return (
          <span className={`${baseClasses} bg-gradient-to-r from-red-100 to-red-200 text-red-800 dark:from-red-900/70 dark:to-red-800/70 dark:text-red-200`}>
            <XCircle className="h-3 w-3 mr-1" />
            Cancelada
          </span>
        );
      default:
        return <span className={`${baseClasses} bg-gray-100 text-gray-800 dark:bg-gray-700/50 dark:text-gray-300`}>{estado}</span>;
    }
  };

  const formatDate = (dateString: string | undefined): string => {
    if (!dateString) return 'No programada';
    try {
      const date = parseISO(dateString);
      // Ajustar para la zona horaria de Argentina (UTC-3)
      date.setDate(date.getDate() + 1);
      return format(date, 'EEEE d \'de\' MMMM \'de\' yyyy', { locale: es });
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Fecha inválida';
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 h-full flex flex-col animate-fadeIn" style={{ minHeight: '85vh' }}>
        {/* Header Skeleton */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border-t-4 border-blue-500 p-4 mb-4 animate-fadeIn">
          <div className="animate-pulse">
            <div className="flex items-center">
              <div className="bg-gray-200 dark:bg-gray-700 p-3 rounded-full mr-4 w-14 h-14"></div>
              <div>
                <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-64 mb-2"></div>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-48"></div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Content Skeleton */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 animate-pulse">
          <div className="space-y-4">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-5/6"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !currentTask) {
    return (
      <div className="space-y-6 h-full flex flex-col animate-fadeIn" style={{ minHeight: '85vh' }}>
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border-t-4 border-red-500 p-4 mb-4 animate-fadeIn">
          <div className="flex items-center">
            <div className="bg-red-100 dark:bg-red-900/30 p-3 rounded-full mr-4">
              <XCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-red-600 to-red-800 bg-clip-text text-transparent">
                Error al cargar la tarea
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {error || 'No se pudo cargar la tarea solicitada'}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
          <button
            onClick={() => navigate('/tasks')}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver al listado
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 h-full flex flex-col animate-fadeIn" style={{ minHeight: '85vh' }}>
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border-t-4 border-blue-500 p-4 mb-4 animate-fadeIn">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center">
            <div className="bg-blue-100 dark:bg-blue-900/30 p-3 rounded-full mr-4">
              <Eye className="h-8 w-8 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Detalles de la Tarea
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 flex items-center">
                Información completa de la tarea #{currentTask.numero || 'N/A'}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate(-1)}
              className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors duration-200 text-sm font-medium flex items-center gap-2 cursor-pointer"
            >
              <ArrowLeft className="h-4 w-4" />
              Volver
            </button>
            
            {user?.rol === 'admin' && (
              <>
                <button
                  onClick={() => navigate(`/tasks/edit/${currentTask._id}`)}
                  className="px-4 py-2 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-md hover:bg-blue-200 dark:hover:bg-blue-800/50 transition-colors duration-200 text-sm font-medium flex items-center gap-2 cursor-pointer"
                >
                  <Edit className="h-4 w-4" />
                  Editar
                </button>
                <button
                  onClick={() => {}}
                  className="px-4 py-2 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-md hover:bg-red-200 dark:hover:bg-red-800/50 transition-colors duration-200 text-sm font-medium flex items-center gap-2 cursor-pointer"
                >
                  <Trash2 className="h-4 w-4" />
                  Eliminar
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border-t-4 border-blue-500 p-6 animate-fadeIn" style={{ animationDelay: '100ms' }}>
        {/* Task Header */}
        <div className="flex justify-between items-start mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              {currentTask.titulo || 'Tarea sin título'}
            </h2>
            <div className="flex items-center gap-3">
              {renderStatusBadge(currentTask.estado)}
              <span className="text-sm text-gray-500 dark:text-gray-400">
                Tarea #{currentTask.numero || 'N/A'}
              </span>
            </div>
          </div>
        </div>

        {/* Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column */}
          <div className="space-y-6">
            {/* Client Info */}
            <div className="bg-white dark:bg-gray-800 shadow-lg rounded-xl overflow-hidden border border-gray-100 dark:border-gray-700 transition-all duration-300 hover:shadow-xl">
              <div className="px-6 py-4 bg-gradient-to-r from-blue-500/10 to-purple-500/10 dark:from-blue-900/30 dark:to-purple-900/30">
                <div className="flex items-center">
                  <div className="flex-shrink-0 mr-4">
                    <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                      <User className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      Información del Cliente
                    </h3>
                  </div>
                </div>
              </div>
              <div className="border-t border-gray-200 dark:border-gray-700">
                <dl className="divide-y divide-gray-200 dark:divide-gray-700">
                  <div className="px-6 py-4 flex items-center transition-all duration-300 hover:bg-blue-50/50 dark:hover:bg-blue-900/10">
                    <dt className="w-10 flex-shrink-0">
                      <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                        <User className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                      </div>
                    </dt>
                    <div className="ml-4 flex-1">
                      <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                        Nombre
                      </dt>
                      <dd className="mt-1 text-base font-medium text-gray-900 dark:text-white">
                        {currentTask.cliente || 'No especificado'}
                      </dd>
                    </div>
                  </div>
                  
                  <div className="px-6 py-4 flex items-center transition-all duration-300 hover:bg-blue-50/50 dark:hover:bg-blue-900/10">
                    <dt className="w-10 flex-shrink-0">
                      <div className="h-10 w-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                        <Phone className="h-5 w-5 text-green-600 dark:text-green-400" />
                      </div>
                    </dt>
                    <div className="ml-4 flex-1">
                      <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                        Teléfono
                      </dt>
                      <dd className="mt-1 text-base font-medium text-gray-900 dark:text-white">
                        {currentTask.numeroTitular || 'Sin teléfono'}
                      </dd>
                    </div>
                  </div>
                  
                  <div className="px-6 py-4 flex items-center transition-all duration-300 hover:bg-blue-50/50 dark:hover:bg-blue-900/10">
                    <dt className="w-10 flex-shrink-0">
                      <div className="h-10 w-10 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                        <MapPin className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                      </div>
                    </dt>
                    <div className="ml-4 flex-1">
                      <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                        Dirección
                      </dt>
                      <dd className="mt-1 text-base font-medium text-gray-900 dark:text-white">
                        {currentTask.direccion || 'Sin dirección'}
                      </dd>
                    </div>
                  </div>
                </dl>
              </div>
            </div>

            {/* Schedule Info */}
            <div className="bg-white dark:bg-gray-800 shadow-lg rounded-xl overflow-hidden border border-gray-100 dark:border-gray-700 transition-all duration-300 hover:shadow-xl">
              <div className="px-6 py-4 bg-gradient-to-r from-blue-500/10 to-purple-500/10 dark:from-blue-900/30 dark:to-purple-900/30">
                <div className="flex items-center">
                  <div className="flex-shrink-0 mr-4">
                    <div className="h-10 w-10 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
                      <Calendar className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      Programación
                    </h3>
                  </div>
                </div>
              </div>
              <div className="border-t border-gray-200 dark:border-gray-700">
                <dl className="divide-y divide-gray-200 dark:divide-gray-700">
                  <div className="px-6 py-4 flex items-center transition-all duration-300 hover:bg-blue-50/50 dark:hover:bg-blue-900/10">
                    <dt className="w-10 flex-shrink-0">
                      <div className="h-10 w-10 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
                        <Calendar className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                      </div>
                    </dt>
                    <div className="ml-4 flex-1">
                      <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                        Fecha de Ejecución
                      </dt>
                      <dd className="mt-1 text-base font-medium text-gray-900 dark:text-white">
                        {formatDate(currentTask.fechaEjecucion)}
                      </dd>
                    </div>
                  </div>
                  
                  {currentTask.franja_horaria && (
                    <div className="px-6 py-4 flex items-center transition-all duration-300 hover:bg-blue-50/50 dark:hover:bg-blue-900/10">
                      <dt className="w-10 flex-shrink-0">
                        <div className="h-10 w-10 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                          <Clock className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                        </div>
                      </dt>
                      <div className="ml-4 flex-1">
                        <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                          Horario
                        </dt>
                        <dd className="mt-1 text-base font-medium text-gray-900 dark:text-white">
                          {currentTask.franja_horaria}
                        </dd>
                      </div>
                    </div>
                  )}
                </dl>
              </div>
            </div>

            {/* Technicians */}
            {currentTask.tecnicos && currentTask.tecnicos.length > 0 && (
              <div className="bg-white dark:bg-gray-800 shadow-lg rounded-xl overflow-hidden border border-gray-100 dark:border-gray-700 transition-all duration-300 hover:shadow-xl">
                <div className="px-6 py-4 bg-gradient-to-r from-blue-500/10 to-purple-500/10 dark:from-blue-900/30 dark:to-purple-900/30">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
                    <div className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded-lg mr-3">
                      <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    Técnicos Asignados
                  </h3>
                </div>
                <div className="p-6 space-y-3">
                  {currentTask.tecnicos.map((tecnico: any, index: number) => (
                    <div key={index} className="flex items-center">
                      <div className="flex-shrink-0 h-8 w-8 rounded-full bg-gradient-to-r from-blue-100 to-purple-100 dark:from-blue-900/50 dark:to-purple-900/50 flex items-center justify-center mr-3">
                        <User className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div>
                        <p className="text-gray-900 dark:text-white font-medium">{tecnico.nombre || `Técnico ${index + 1}`}</p>
                        {tecnico.telefono && (
                          <p className="text-sm text-gray-500 dark:text-gray-400">{tecnico.telefono}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Description */}
            <div className="bg-white dark:bg-gray-800 shadow-lg rounded-xl overflow-hidden border border-gray-100 dark:border-gray-700 transition-all duration-300 hover:shadow-xl">
              <div className="px-6 py-4 bg-gradient-to-r from-blue-500/10 to-purple-500/10 dark:from-blue-900/30 dark:to-purple-900/30">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
                  <div className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded-lg mr-3">
                    <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  Descripción
                </h3>
              </div>
              <div className="p-6">
                <div className="prose dark:prose-invert max-w-none">
                  <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                    {currentTask.descripcion || 'No hay descripción disponible para esta tarea.'}
                  </p>
                </div>
              </div>
            </div>

            {/* Observations */}
            <div className="bg-white dark:bg-gray-800 shadow-lg rounded-xl overflow-hidden border border-gray-100 dark:border-gray-700 transition-all duration-300 hover:shadow-xl">
              <div className="px-6 py-4 bg-gradient-to-r from-blue-500/10 to-purple-500/10 dark:from-blue-900/30 dark:to-purple-900/30">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
                  <div className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded-lg mr-3">
                    <MessageSquare className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  Observaciones
                </h3>
              </div>
              <div className="p-6">
                <ObservationsList 
                  taskId={currentTask._id} 
                  currentUserId={user?._id || ''} 
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TaskDetails;

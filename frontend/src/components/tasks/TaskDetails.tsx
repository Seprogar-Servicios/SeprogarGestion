import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../store';
import { fetchTaskById, clearCurrentTask, deleteTask, updateTask } from '../../store/slices/tasksSlice';
import { fetchUsers } from '../../store/slices/usersSlice';
import { showSuccess, showError } from '../../utils/toastUtils';
import { preventEnterSubmit } from '../../utils/formGuards';
import { format } from 'date-fns';
import type { User as UserType } from '../../types';
import { es } from 'date-fns/locale';
import {
  ArrowLeft,
  Calendar,
  MapPin,
  User as UserIcon,
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
  Package,
  DollarSign,
} from 'lucide-react';
import ObservationsList from '../observations/ObservationsList';
import TaskMaterials from './TaskMaterials';
import TaskLiquidacion from './TaskLiquidacion';
import AddressAutocomplete from '../common/AddressAutocomplete';
import TecnicoRecommendSelect from './TecnicoRecommendSelect';
import type { RootState } from '../../store';
import { isAdminRole } from '../../utils/roles';

type RouteParams = {
  id: string;
  [key: string]: string | undefined;
};

const TaskDetails: React.FC = () => {
  const { id } = useParams<RouteParams>();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  // Memoized selectors
  const currentTask = useAppSelector((state: RootState) => state.tasks.currentTask);
  const loading = useAppSelector((state: RootState) => state.tasks.loading);
  const error = useAppSelector((state: RootState) => state.tasks.error);
  const users = useAppSelector((state: RootState) => state.users.users);
  const user = useAppSelector((state: RootState) => state.auth.user);
  const [showEditModal, setShowEditModal] = useState(false);
  const [activeTab, setActiveTab] = useState('detalles');
  const [formData, setFormData] = useState({
    numero: '',
    titulo: '',
    descripcion: '',
    cliente: '',
    cuentaCliente: '' as '' | 'IKE' | 'VAITTY' | 'MDO' | 'Particular' | 'Consorcio' | 'Otro',
    numeroTitular: '',
    direccion: '',
    fechaEjecucion: '',
    horaInicio: '',
    horaFin: '',
    franja_horaria: '',
    tecnicos: [] as UserType[],
    estado: 'pendiente' as 'pendiente' | 'en progreso' | 'completada' | 'cancelada',
    origen: 'manual' as 'manual' | 'whatsapp' | string,
    ubicacionMapa: null as null | { lat: number; lng: number; fuente?: string },
  });

  useEffect(() => {
    if (id) {
      dispatch(fetchTaskById(id));
    }
    dispatch(fetchUsers());
    
    return () => {
      dispatch(clearCurrentTask());
    };
  }, [dispatch, id]);

  // Update form data when currentTask changes
  useEffect(() => {
    if (currentTask) {
      // Parse the date string manually to avoid timezone issues
      let fechaEjecucion = '';
      if (currentTask.fechaEjecucion) {
        try {
          const [year, month, day] = currentTask.fechaEjecucion.split('-').map(Number);
          const date = new Date(year, month - 1, day);
          if (!isNaN(date.getTime())) {
            fechaEjecucion = format(date, 'yyyy-MM-dd');
          }
        } catch (error) {
          console.error('Error al formatear fecha de ejecución:', error);
        }
      }

      setFormData(prev => ({
        ...prev,
        numero: currentTask.numero || '',
        titulo: currentTask.titulo || '',
        descripcion: currentTask.descripcion || '',
        cliente: currentTask.cliente || '',
        cuentaCliente: currentTask.cuentaCliente || '',
        numeroTitular: currentTask.numeroTitular || '',
        direccion: currentTask.direccion || '',
        fechaEjecucion,
        horaInicio: currentTask.franja_horaria?.split('-')[0]?.trim() || '',
        horaFin: currentTask.franja_horaria?.split('-')[1]?.trim() || '',
        franja_horaria: currentTask.franja_horaria || '',
        tecnicos: Array.isArray(currentTask.tecnicos) 
          ? currentTask.tecnicos.filter((t): t is UserType => t !== null && typeof t === 'object' && '_id' in t)
          : [],
        estado: currentTask.estado || 'pendiente',
        origen: currentTask.origen || 'manual',
        ubicacionMapa:
          currentTask.ubicacionMapa?.lat != null && currentTask.ubicacionMapa?.lng != null
            ? {
                lat: currentTask.ubicacionMapa.lat,
                lng: currentTask.ubicacionMapa.lng,
                fuente: currentTask.ubicacionMapa.fuente || 'direccion',
              }
            : null,
      }));
    }
  }, [currentTask]);

  const handleUpdateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentTask) return;
    
    try {
      // Format the time range if both start and end times are provided
      let franjaHoraria = '';
      if (formData.horaInicio && formData.horaFin) {
        franjaHoraria = `${formData.horaInicio} - ${formData.horaFin}`;
      }
      
      // Convert tecnicos array from objects to just the _id strings
      const tecnicosIds = formData.tecnicos.map(tecnico => 
        typeof tecnico === 'string' ? tecnico : tecnico._id
      );
      
      // Only include fields that are allowed to be updated
      const taskUpdate = {
        numero: formData.numero,
        titulo: formData.titulo,
        cliente: formData.cliente,
        ...(formData.cuentaCliente ? { cuentaCliente: formData.cuentaCliente } : { cuentaCliente: '' }),
        descripcion: formData.descripcion,
        direccion: formData.direccion,
        numeroTitular: formData.numeroTitular,
        fechaEjecucion: formData.fechaEjecucion,
        franja_horaria: franjaHoraria,
        estado: formData.estado,
        tecnicos: tecnicosIds, // Use the array of IDs instead of objects
        ...(formData.ubicacionMapa
          ? {
              ubicacionMapa: {
                lat: formData.ubicacionMapa.lat,
                lng: formData.ubicacionMapa.lng,
                fuente: 'direccion' as const,
              },
            }
          : {}),
      };
      
      await dispatch(updateTask({ 
        id: currentTask._id, 
        data: taskUpdate
      })).unwrap();
      
      setShowEditModal(false);
      showSuccess('Tarea actualizada correctamente');
      dispatch(fetchTaskById(currentTask._id)); // Refresh task data
    } catch (error) {
      console.error('Error updating task:', error);
      showError('Error al actualizar la tarea');
    }
  };

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
      // Parse the date string manually to avoid timezone issues
      const [year, month, day] = dateString.split('-').map(Number);
      // Create a date in local time (months are 0-indexed in JS)
      const date = new Date(year, month - 1, day);
      
      // Verify the date is valid
      if (isNaN(date.getTime())) {
        throw new Error('Fecha inválida');
      }
      
      // Format as "Día DD de Mes de AAAA" (e.g., "Viernes 5 de Septiembre de 2025")
      return format(date, "EEEE d 'de' MMMM 'de' yyyy", { locale: es });
    } catch (error) {
      console.error('Error al formatear fecha:', error);
      return 'Fecha inválida';
    }
  };

  const handleDelete = () => {
    if (!currentTask) return;
    
    import('react-toastify').then(({ toast }) => {
      const CustomToast: React.FC<{closeToast?: () => void}> = ({ closeToast }) => (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden w-full">
          <div className="p-6">
            <div className="flex items-start">
              <div className="flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400">
                <Trash2 className="h-6 w-6" />
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">Eliminar tarea</h3>
                <div className="mt-2">
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    ¿Estás seguro de que deseas eliminar esta tarea? Esta acción no se puede deshacer.
                  </p>
                </div>
              </div>
            </div>
            <div className="mt-6 flex justify-end space-x-3">
              <button
                type="button"
                onClick={closeToast}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-150"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={async () => {
                  closeToast?.();
                  try {
                    await dispatch(deleteTask(currentTask._id)).unwrap();
                    showSuccess('Tarea eliminada correctamente');
                    navigate('/tasks');
                  } catch (error) {
                    console.error('Error deleting task:', error);
                    showError('Error al eliminar la tarea');
                  }
                }}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors duration-150"
              >
                <Trash2 className="-ml-1 mr-2 h-4 w-4" />
                Eliminar
              </button>
            </div>
          </div>
        </div>
      );

      toast(<CustomToast />, {
        position: "top-center",
        autoClose: false,
        closeOnClick: false,
        draggable: false,
        closeButton: false,
        className: '!bg-transparent !p-0 !shadow-none',
        bodyClassName: '!p-0',
      });
    });
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
              <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent">
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
            
            {isAdminRole(user) && (
              <>
                <button
                  onClick={() => setShowEditModal(true)}
                  className="px-4 py-2 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-md hover:bg-blue-200 dark:hover:bg-blue-800/50 transition-colors duration-200 text-sm font-medium flex items-center gap-2 cursor-pointer"
                >
                  <Edit className="h-4 w-4" />
                  Editar
                </button>
                <button
                  onClick={handleDelete}
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

        {/* Tabs Navigation */}
        <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
          <nav className="flex space-x-8">
            <button
              onClick={() => setActiveTab('detalles')}
              className={`flex items-center px-1 py-4 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'detalles'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              <FileText className="h-4 w-4 mr-2" />
              Detalles
            </button>
            <button
              onClick={() => setActiveTab('materiales')}
              className={`flex items-center px-1 py-4 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'materiales'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              <Package className="h-4 w-4 mr-2" />
              Materiales
            </button>
            {isAdminRole(user) && (
              <button
                onClick={() => setActiveTab('liquidacion')}
                className={`flex items-center px-1 py-4 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'liquidacion'
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                <DollarSign className="h-4 w-4 mr-2" />
                Liquidación
              </button>
            )}
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === 'materiales' ? (
          <TaskMaterials
            taskId={currentTask._id}
            userRole={user?.rol || ''}
            userId={user?._id || ''}
            taskTechnicians={currentTask.tecnicos || []}
          />
        ) : activeTab === 'liquidacion' ? (
          <TaskLiquidacion
            taskId={currentTask._id}
            userRole={user?.rol || ''}
          />
        ) : (
          <>
            {/* Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left Column */}
              <div className="space-y-6">
                {/* Client Info */}
                <div className="bg-white dark:bg-gray-800 shadow-lg rounded-xl overflow-hidden border border-gray-100 dark:border-gray-700 transition-all duration-300 hover:shadow-xl">
                  <div className="px-6 py-4 bg-gradient-to-r from-blue-500/10 to-orange-500/10 dark:from-blue-900/30 dark:to-orange-900/20">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 mr-4">
                        <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                          <UserIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
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
                            <UserIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
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
                          <div className="h-10 w-10 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                            <MapPin className="h-5 w-5 text-orange-600 dark:text-orange-400" />
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
                  <div className="px-6 py-4 bg-gradient-to-r from-blue-500/10 to-orange-500/10 dark:from-blue-900/30 dark:to-orange-900/20">
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
                    <div className="px-6 py-4 bg-gradient-to-r from-blue-500/10 to-orange-500/10 dark:from-blue-900/30 dark:to-orange-900/20">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
                        <div className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded-lg mr-3">
                          <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        Técnicos Asignados
                      </h3>
                    </div>
                    <div className="p-6 space-y-3">
                      {currentTask.tecnicos.map((tecnico: UserType, index: number) => (
                        <div key={index} className="flex items-center">
                          <div className="flex-shrink-0 h-8 w-8 rounded-full bg-gradient-to-r from-blue-100 to-orange-100 dark:from-blue-900/50 dark:to-orange-900/40 flex items-center justify-center mr-3">
                            <UserIcon className="h-4 w-4 text-blue-600 dark:text-blue-400" />
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
                  <div className="px-6 py-4 bg-gradient-to-r from-blue-500/10 to-orange-500/10 dark:from-blue-900/30 dark:to-orange-900/20">
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
                  <div className="px-6 py-4 bg-gradient-to-r from-blue-500/10 to-orange-500/10 dark:from-blue-900/30 dark:to-orange-900/20">
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
          </>
        )}
      </div>

      {/* Modal de edición */}
      {showEditModal && (
        <div className="fixed inset-0 bg-gray-900/70 backdrop-blur-sm z-50 flex items-start justify-center p-4 overflow-y-auto pt-20">
          <div className="relative w-full max-w-4xl bg-white dark:bg-gray-800 rounded-2xl shadow-2xl overflow-hidden">
            <div className="px-6 py-5 bg-gradient-to-r from-blue-600 to-blue-800">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-white">Editar Tarea #{currentTask?.numero || ''}</h3>
                <button
                  onClick={() => setShowEditModal(false)}
                  className="text-white hover:text-gray-200"
                >
                  <XCircle className="h-6 w-6" />
                </button>
              </div>
            </div>
            
            <form onSubmit={handleUpdateTask} onKeyDown={preventEnterSubmit} className="p-6">
              <div className="space-y-5">
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  <div className="space-y-1">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Número de Tarea <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.numero || ''}
                      onChange={(e) => setFormData({...formData, numero: e.target.value})}
                      className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>
                  
                  <div className="space-y-1">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Título <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.titulo}
                      onChange={(e) => setFormData({...formData, titulo: e.target.value})}
                      className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>
                  
                  <div className="space-y-1">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Cliente
                    </label>
                    <input
                      type="text"
                      value={formData.cliente || ''}
                      onChange={(e) => setFormData({...formData, cliente: e.target.value})}
                      className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Cuenta comercial <span className="text-slate-400 font-normal">(opcional)</span>
                    </label>
                    <select
                      value={formData.cuentaCliente || ''}
                      onChange={(e) =>
                        setFormData({ ...formData, cuentaCliente: e.target.value as any })
                      }
                      className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Sin clasificar / inferir del nombre</option>
                      <option value="IKE">IKE</option>
                      <option value="VAITTY">VAITTY</option>
                      <option value="MDO">MDO</option>
                      <option value="Particular">Particular</option>
                      <option value="Consorcio">Consorcio</option>
                      <option value="Otro">Otro</option>
                    </select>
                  </div>
                  
                  <div className="space-y-1">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Teléfono del Titular
                    </label>
                    <input
                      type="text"
                      value={formData.numeroTitular || ''}
                      onChange={(e) => setFormData({...formData, numeroTitular: e.target.value})}
                      className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  
                  <div className="space-y-1">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Fecha de Ejecución
                    </label>
                    <input
                      type="date"
                      value={formData.fechaEjecucion || ''}
                      onChange={(e) => setFormData({...formData, fechaEjecucion: e.target.value})}
                      className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  
                  <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Hora de inicio
                      </label>
                      <input
                        type="time"
                        value={formData.horaInicio}
                        onChange={(e) => setFormData({...formData, horaInicio: e.target.value})}
                        className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Hora de fin
                      </label>
                      <input
                        type="time"
                        value={formData.horaFin}
                        onChange={(e) => setFormData({...formData, horaFin: e.target.value})}
                        className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  
                  <div className="space-y-1">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Estado
                    </label>
                    <select
                      value={formData.estado}
                      onChange={(e) => setFormData({...formData, estado: e.target.value as any})}
                      className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="pendiente">Pendiente</option>
                      <option value="en progreso">En Progreso</option>
                      <option value="completada">Completada</option>
                      <option value="cancelada">Cancelada</option>
                    </select>
                  </div>
                  
                  <div className="space-y-1 sm:col-span-2">
                    <AddressAutocomplete
                      label="Dirección"
                      value={formData.direccion || ''}
                      onChange={(direccion) =>
                        setFormData({
                          ...formData,
                          direccion,
                          ubicacionMapa: null,
                        })
                      }
                      onSelect={(s) =>
                        setFormData({
                          ...formData,
                          direccion: s.label,
                          ubicacionMapa: {
                            lat: s.lat,
                            lng: s.lng,
                            fuente: 'direccion',
                          },
                        })
                      }
                    />
                  </div>

                  <div className="space-y-1 sm:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Técnicos Asignados
                    </label>
                    <TecnicoRecommendSelect
                      users={users}
                      value={
                        Array.isArray(formData.tecnicos)
                          ? formData.tecnicos.map((t) => (typeof t === 'string' ? t : t._id))
                          : []
                      }
                      onChange={(ids) => {
                        const selectedUsers = ids
                          .map((id) => users.find((u) => u._id === id))
                          .filter((u): u is UserType => u !== undefined);
                        setFormData((prev) => ({ ...prev, tecnicos: selectedUsers }));
                      }}
                      taskLat={formData.ubicacionMapa?.lat}
                      taskLng={formData.ubicacionMapa?.lng}
                      taskDireccion={formData.direccion}
                    />
                  </div>
                  
                  <div className="space-y-1 sm:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Descripción
                    </label>
                    <textarea
                      value={formData.descripcion || ''}
                      onChange={(e) => setFormData({...formData, descripcion: e.target.value})}
                      rows={3}
                      className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  </div>
                </div>
                
                <div className="mt-6 flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowEditModal(false)}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Guardar cambios
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
    </div>
  );
};

export default TaskDetails;

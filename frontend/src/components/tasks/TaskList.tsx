import React, { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../../store';
import { fetchTasks, createTask, updateTask, deleteTask, deleteMultipleTasks, setFilters } from '../../store/slices/tasksSlice';
import { fetchUsers } from '../../store/slices/usersSlice';
import UpcomingTasksFilter from '../filters/UpcomingTasksFilter';
import TasksFilter from '../filters/TasksFilter';
import { 
  Plus, 
  Search, 
  Filter, 
  Edit, 
  Trash2, 
  Calendar,
  User,
  CheckCircle,
  MapPin,
  Send,
  CheckSquare,
  Square,
  Trash,
  X,
} from 'lucide-react';
import type { User as UserType } from '../../types';
import type { Task, TaskFilters } from '../../types';

const TaskList: React.FC = () => {
  const dispatch = useAppDispatch();
  const { tasks, loading, filters } = useAppSelector((state) => state.tasks);
  const { users } = useAppSelector((state) => state.users);
  const { user } = useAppSelector((state) => state.auth);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedTasks, setSelectedTasks] = useState<string[]>([]);
  const [showWhatsAppPanel] = useState(true);
  
  // Estados para paginación
  const [currentPage, setCurrentPage] = useState(1);
  const [tasksPerPage] = useState(10); 

  const handleFiltersChange = (newFilters: TaskFilters) => {
    dispatch(setFilters(newFilters));
    // Forzar la recarga de tareas con los nuevos filtros
    dispatch(fetchTasks(newFilters));
  };

  const [formData, setFormData] = useState({
    numero: '',
    titulo: '',
    descripcion: '',
    cliente: '',
    numeroTitular: '',
    direccion: '',
    fechaEjecucion: '',
    tecnicos: [] as string[],
    estado: 'pendiente' as 'pendiente' | 'en progreso' | 'completada'
  });

  useEffect(() => {
    // Cargar usuarios solo una vez y solo si el usuario es admin
    if (user && user.rol === 'admin') {
      dispatch(fetchUsers());
    }
  }, [dispatch, user]);
  
  useEffect(() => {
    // Cargar tareas cada vez que cambien los filtros
    // Si el usuario no es admin, filtrar solo sus tareas
    const taskFilters = { ...filters };
    if (user && user.rol !== 'admin') {
      taskFilters.tecnico = user._id;
    }
    dispatch(fetchTasks(taskFilters));
  }, [dispatch, filters, user]);

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await dispatch(createTask(formData as any)).unwrap();
      resetForm();
      setShowCreateModal(false);
      import('react-toastify').then(({ toast }) => {
        toast.success('Tarea creada correctamente', {
          position: "top-right",
          autoClose: 3000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true
        });
      });
      // Recargar tareas para asegurar que los datos estén actualizados
      dispatch(fetchTasks(filters));
    } catch (error) {
      console.error('Error creating task:', error);
    }
  };

  const handleUpdateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTask) return;
    
    try {
      await dispatch(updateTask({ id: editingTask._id, data: formData as any })).unwrap();
      
      // Mostrar mensaje de éxito con toast
      import('react-toastify').then(({ toast }) => {
        toast.success('Tarea actualizada correctamente', {
          position: "top-right",
          autoClose: 3000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true
        });
      });
      
      // Cerrar el modal y resetear
      setShowCreateModal(false);
      setEditingTask(null);
      resetForm();
      
      // Recargar las tareas
      dispatch(fetchTasks(filters));
      
    } catch (error) {
      console.error('Error updating task:', error);
      import('react-toastify').then(({ toast }) => {
        toast.error('Error al actualizar la tarea. Por favor, inténtalo de nuevo.', {
          position: "top-right",
          autoClose: 3000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true
        });
      });
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    import('react-toastify').then(({ toast }) => {
      const CustomToast = ({ closeToast }: { closeToast?: () => void }) => (
        <div>
          <p>¿Estás seguro de que quieres eliminar esta tarea?</p>
          <div className="flex justify-end mt-2 space-x-2">
            <button 
              onClick={async () => {
                try {
                  await dispatch(deleteTask(taskId)).unwrap();
                  toast.success('Tarea eliminada correctamente', {
                    position: "top-right",
                    autoClose: 3000,
                    hideProgressBar: false,
                    closeOnClick: true,
                    pauseOnHover: true,
                    draggable: true
                  });
                } catch (error) {
                  console.error('Error deleting task:', error);
                  toast.error('Error al eliminar la tarea', {
                    position: "top-right",
                    autoClose: 3000,
                    hideProgressBar: false,
                    closeOnClick: true,
                    pauseOnHover: true,
                    draggable: true
                  });
                }
                closeToast?.();
              }}
              className="px-3 py-1 text-sm text-white bg-red-500 rounded hover:bg-red-600"
            >
              Eliminar
            </button>
            <button 
              onClick={() => closeToast?.()}
              className="px-3 py-1 text-sm text-gray-700 bg-gray-200 rounded hover:bg-gray-300"
            >
              Cancelar
            </button>
          </div>
        </div>
      );

      toast(<CustomToast />, {
        position: "top-center",
        autoClose: false,
        closeButton: false,
        closeOnClick: false,
        draggable: true,
        className: 'w-full max-w-md'
      });
    });
  };

  const resetForm = () => {
    setFormData({
      numero: '',
      titulo: '',
      descripcion: '',
      cliente: '',
      numeroTitular: '',
      direccion: '',
      fechaEjecucion: '',
      tecnicos: [],
      estado: 'pendiente' as 'pendiente' | 'en progreso' | 'completada'
    });
  };

  const openEditModal = (task: Task) => {
    setEditingTask(task);
    setFormData({
      numero: task.numero,
      titulo: task.titulo,
      descripcion: task.descripcion || '',
      cliente: task.cliente || '',
      numeroTitular: task.numeroTitular || '',
      direccion: task.direccion || '',
      fechaEjecucion: task.fechaEjecucion ? new Date(task.fechaEjecucion).toISOString().split('T')[0] : '',
      tecnicos: task.tecnicos?.map(t => t._id) || [],
      estado: task.estado
    });
    setShowCreateModal(true);
  };

  // Aplicar filtros locales (búsqueda por texto)  // Filtrar tareas según el término de búsqueda
  const filteredTasks = tasks.filter(task => {
    const searchLower = searchTerm.toLowerCase();
    return (
      task.titulo.toLowerCase().includes(searchLower) ||
      task.descripcion?.toLowerCase().includes(searchLower) ||
      task.cliente?.toLowerCase().includes(searchLower) ||
      task.direccion?.toLowerCase().includes(searchLower) ||
      task.numero.toLowerCase().includes(searchLower)
    );
  });
  
  // Obtener tareas para la página actual
  const indexOfLastTask = currentPage * tasksPerPage;
  const indexOfFirstTask = indexOfLastTask - tasksPerPage;
  const currentTasks = filteredTasks.slice(indexOfFirstTask, indexOfLastTask);
  
  // Ir a la página anterior
  const goToPreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };
  
  // Ir a la página siguiente
  const goToNextPage = () => {
    if (currentPage < Math.ceil(filteredTasks.length / tasksPerPage)) {
      setCurrentPage(currentPage + 1);
    }
  };
  
  // Manejar selección/deselección de una tarea individual
  const handleSelectTask = (taskId: string) => {
    
    // Crear una nueva copia del array para evitar problemas de referencia
    let newSelectedTasks;
    
    if (selectedTasks.includes(taskId)) {
      newSelectedTasks = selectedTasks.filter(id => id !== taskId);
    } else {
      newSelectedTasks = [...selectedTasks, taskId];
    }
    setSelectedTasks(newSelectedTasks);
  };
  
  // Agrupar tareas por técnico para el WhatsApp
  const groupedTasks = React.useMemo(() => {
    const grouped: Record<string, { tecnico: UserType; tasks: Task[] }> = {};
    
    tasks.forEach(task => {
      if (task.tecnicos && task.tecnicos.length > 0) {
        task.tecnicos.forEach(tecnico => {
          // Verificar que el técnico tenga un ID válido
          if (tecnico && tecnico._id) {
            if (!grouped[tecnico._id]) {
              // Crear una copia del objeto técnico para evitar problemas de referencia
              grouped[tecnico._id] = {
                tecnico: { ...tecnico },
                tasks: []
              };
            }
            // Verificar que la tarea no esté ya en el array
            if (!grouped[tecnico._id].tasks.some(t => t._id === task._id)) {
              grouped[tecnico._id].tasks.push(task);
            }
          }
        });
      }
    });
    
    return grouped;
  }, [tasks]);
  
  // Eliminar múltiples tareas seleccionadas
  const handleDeleteMultipleTasks = async () => {
    if (selectedTasks.length === 0) return;
    
    import('react-toastify').then(({ toast }) => {
      const CustomToast = ({ closeToast }: { closeToast?: () => void }) => (
        <div>
          <p>¿Estás seguro de que quieres eliminar {selectedTasks.length} tareas?</p>
          <div className="flex justify-end mt-2 space-x-2">
            <button 
              onClick={async () => {
                try {
                  await dispatch(deleteMultipleTasks(selectedTasks)).unwrap();
                  setSelectedTasks([]);
                  toast.success(`${selectedTasks.length} tareas eliminadas correctamente`, {
                    position: "top-right",
                    autoClose: 3000,
                    hideProgressBar: false,
                    closeOnClick: true,
                    pauseOnHover: true,
                    draggable: true
                  });
                } catch (error) {
                  console.error('Error deleting tasks:', error);
                  toast.error('Error al eliminar las tareas', {
                    position: "top-right",
                    autoClose: 3000,
                    hideProgressBar: false,
                    closeOnClick: true,
                    pauseOnHover: true,
                    draggable: true
                  });
                }
                closeToast?.();
              }}
              className="px-3 py-1 text-sm text-white bg-red-500 rounded hover:bg-red-600"
            >
              Eliminar
            </button>
            <button 
              onClick={() => closeToast?.()}
              className="px-3 py-1 text-sm text-gray-700 bg-gray-200 rounded hover:bg-gray-300"
            >
              Cancelar
            </button>
          </div>
        </div>
      );

      toast(<CustomToast />, {
        position: "top-center",
        autoClose: false,
        closeButton: false,
        closeOnClick: false,
        draggable: true,
        className: 'w-full max-w-md'
      });
    });
  };
  
  // Seleccionar/deseleccionar todas las tareas visibles
  const handleSelectAllTasks = () => {
    if (selectedTasks.length === filteredTasks.length) {
      // Si todas están seleccionadas, deseleccionar todas
      setSelectedTasks([]);
    } else {
      // Seleccionar todas las tareas visibles
      setSelectedTasks(filteredTasks.map(task => task._id));
    }
  };
  
  // Manejar selección/deselección de todas las tareas de un técnico
  const handleSelectAllForTecnico = (tecnicoId: string) => {
    const tecnicoTasks = groupedTasks[tecnicoId]?.tasks || [];
    const tecnicoTaskIds = tecnicoTasks.map(task => task._id);
    
    // Verificar si todas las tareas del técnico ya están seleccionadas
    const allSelected = tecnicoTaskIds.every(id => selectedTasks.includes(id));
    
    if (allSelected) {
      // Deseleccionar todas las tareas del técnico
      setSelectedTasks(selectedTasks.filter(id => !tecnicoTaskIds.includes(id)));
    } else {
      // Seleccionar todas las tareas del técnico
      const newSelectedTasks = [...selectedTasks];
      tecnicoTaskIds.forEach(id => {
        if (!newSelectedTasks.includes(id)) {
          newSelectedTasks.push(id);
        }
      });
      setSelectedTasks(newSelectedTasks);
    }
  };
  
  // Generar mensaje de WhatsApp para el técnico seleccionado
  const generateWhatsAppMessage = (tecnicoId: string) => {
    const tecnico = groupedTasks[tecnicoId]?.tecnico;
    // Verificar si el técnico existe y tiene un teléfono válido (no vacío)
    if (!tecnico || !tecnico.telefono || tecnico.telefono.trim() === '') {
      alert('El técnico no tiene un número de teléfono registrado');
      return;
    }

    // Obtener las tareas del técnico que están seleccionadas
    const tecnicoTasks = groupedTasks[tecnicoId]?.tasks || [];
    const selectedTasksForTecnico = [];
    
    for (const task of tecnicoTasks) {
      if (selectedTasks.includes(task._id)) {
        selectedTasksForTecnico.push(task);
      }
    }
    
    
    if (selectedTasksForTecnico.length === 0) {
      alert('No hay tareas seleccionadas para este técnico');
      return;
    }
    
    // Construir el mensaje con formato mejorado
    let message = `*=== TAREAS ASIGNADAS ===*\n\n`;
    
    selectedTasksForTecnico.forEach((task, index) => {
      message += `*TAREA ${index + 1}: ${task.titulo.toUpperCase()}*\n`;
      message += `--------------------------------\n`;
      message += `• *Numero:* ${task.numero}\n`;
      if (task.descripcion) message += `• *Descripcion:* ${task.descripcion}\n`;
      if (task.cliente) message += `• *Cliente:* ${task.cliente}\n`;
      if (task.numeroTitular) message += `• *Teléfono del Titular:* ${task.numeroTitular}\n`;
      if (task.direccion) message += `• *Direccion:* ${task.direccion}\n`;
      // Siempre mostrar información sobre la fecha de ejecución
      if (task.fechaEjecucion) {
        // Obtener la fecha original
        const fecha = new Date(task.fechaEjecucion);
        // Ajustar para la zona horaria de Argentina (UTC-3)
        // Añadir un día completo para compensar el problema
        const fechaAjustada = new Date(fecha);
        fechaAjustada.setDate(fecha.getDate() + 1);
        
        message += `• *Fecha de Ejecución:* ${fechaAjustada.toLocaleDateString('es-AR', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        })}\n`;
      } else {
        message += `• *Fecha de Ejecución:* No programada\n`;
      }
      message += '\n';
    });
    
    message += '*Tareas listadas correctamente*\n';
    message += '*Recorda:* Puedes usar este mensaje como recordatorio de tus tareas pendientes.';
    
    // Codificar el mensaje para URL
    const encodedMessage = encodeURIComponent(message);
    
    // Abrir WhatsApp con el mensaje predefinido
    const whatsappUrl = `https://wa.me/${tecnico.telefono?.replace(/\D/g, '')}?text=${encodedMessage}`;
    window.open(whatsappUrl, '_blank');
  };

  // Estas funciones se han eliminado porque ya no se utilizan

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Tareas</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Gestiona todas las tareas del sistema
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center px-4 py-2.5 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-[#0056a2] hover:bg-[#003b6f] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#0056a2] transition-colors"
        >
          <Plus className="h-4 w-4 mr-2" />
          Nueva Tarea
        </button>
      </div>

      {/* Upcoming Tasks Filter - Only for Admin */}
      {user?.rol === 'admin' && (
        <UpcomingTasksFilter
          filters={filters}
          onFiltersChange={handleFiltersChange}
        />
      )}

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4 overflow-x-auto">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar tareas..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white transition-colors"
          />
        </div>
        <div className="flex gap-2">
          {/* Selección múltiple y eliminación */}
          <div className="flex items-center">
            {selectedTasks.length > 0 ? (
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {selectedTasks.length} seleccionadas
                </span>
                <button
                  onClick={handleDeleteMultipleTasks}
                  className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors"
                  disabled={selectedTasks.length === 0}
                >
                  <Trash className="h-4 w-4 mr-1" />
                  Eliminar
                </button>
                <button
                  onClick={() => setSelectedTasks([])}
                  className="inline-flex items-center px-2 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={handleSelectAllTasks}
                className="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors"
              >
                <CheckSquare className="h-4 w-4 mr-1" />
                Seleccionar
              </button>
            )}
          </div>
          
          {/* Filters Button */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="inline-flex items-center px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors"
          >
            <Filter className="h-4 w-4 mr-2" />
            Filtros
          </button>
        </div>
      </div>

      {/* Filtros avanzados */}
      {showFilters && (
        <div className="space-y-4 overflow-y-auto max-h-[80vh]">
          <TasksFilter
            filters={filters}
            onFiltersChange={handleFiltersChange}
          />
        </div>
      )}
      
      {/* Panel de WhatsApp */}
      {showWhatsAppPanel && (
        <div className="my-4 overflow-y-auto max-h-[60vh] bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <div className="mb-4">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white flex items-center justify-between">
              <div className="flex items-center">
                <Send className="h-5 w-5 mr-2" />
                {user?.rol === 'admin' ? 'Enviar tareas por WhatsApp' : 'Mis Tareas Pendientes'}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                {selectedTasks.length} {user?.rol === 'admin' ? 'seleccionadas' : 'tareas seleccionadas'}
              </div>
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {user?.rol === 'admin' 
                ? 'Envía un recordatorio de sus tareas al técnico por WhatsApp'
                : 'Envía un recordatorio de tus tareas a tu WhatsApp'}
            </p>
          </div>
        
        <div className="space-y-4">
          {Object.keys(groupedTasks).length > 0 ? (
            Object.entries(groupedTasks).map(([tecnicoId, { tecnico, tasks }]) => (
              <div key={tecnicoId} className="border border-gray-200 dark:border-gray-700 rounded-lg p-3">
                <div className="flex justify-between items-center mb-3">
                  <div className="flex items-center">
                    <button 
                      onClick={() => handleSelectAllForTecnico(tecnicoId)}
                      className="text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 mr-2"
                    >
                      {tasks.every(task => selectedTasks.includes(task._id)) ? (
                        <CheckSquare className="h-5 w-5" />
                      ) : (
                        <Square className="h-5 w-5" />
                      )}
                    </button>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {tecnico.nombre} {user?.rol === 'admin' ? (tecnico.telefono ? `(${tecnico.telefono})` : '(Sin teléfono)') : '(Mis tareas)'}
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      generateWhatsAppMessage(tecnicoId);
                    }}
                    disabled={!tecnico.telefono || tecnico.telefono.trim() === '' || !tasks.some(task => selectedTasks.includes(task._id))}
                    className={`inline-flex items-center px-3 py-1 text-sm rounded-md ${
                      !tecnico.telefono || tecnico.telefono.trim() === '' || !tasks.some(task => selectedTasks.includes(task._id))
                        ? 'bg-gray-200 text-gray-500 cursor-not-allowed dark:bg-gray-700 dark:text-gray-400'
                        : 'bg-[#f7941d] text-white hover:bg-[#e07c0a]'
                    }`}
                  >
                    <Send className="h-4 w-4 mr-1" />
                    WhatsApp
                  </button>
                </div>
              </div>
            ))
          ) : (
            <p className="text-gray-500 dark:text-gray-400">
              No hay tareas asignadas a técnicos
            </p>
          )}
        </div>
      </div>
      )}

      {/* Tasks List View */}
      {loading ? (
        // List loading skeleton
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="animate-pulse border-b border-gray-200 dark:border-gray-700 p-4">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-4"></div>
              <div className="flex space-x-4">
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
              </div>
            </div>
          ))}
        </div>
      ) : filteredTasks.length === 0 ? (
        <div className="text-center py-10">
          <h3 className="text-lg font-medium">No se encontraron tareas</h3>
          <p>Intenta ajustar los filtros o crear una nueva tarea.</p>
        </div>
      ) : (
        // List View
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
          {currentTasks.map((task) => (
            <div 
              key={task._id} 
              className={`border-b border-gray-200 dark:border-gray-700 p-4 hover:bg-gray-50 dark:hover:bg-gray-700 ${task.estado === 'completada' ? 'border-l-4 border-green-500' : ''} relative`}
            >
              {/* Checkbox para seleccionar tarea */}
              <div className="absolute top-2 right-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSelectTask(task._id);
                  }}
                  className="text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400"
                >
                  {selectedTasks.includes(task._id) ? (
                    <CheckSquare className="h-5 w-5" />
                  ) : (
                    <Square className="h-5 w-5" />
                  )}
                </button>
              </div>
              <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                <div className="flex-1 min-w-0 mb-2 md:mb-0">
                  <div className="flex items-center">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white truncate mr-2">
                      {task.titulo}
                    </h3>
                    <span className="text-xs font-medium px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300">
                      #{task.numero}
                    </span>
                    <span
                      className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        task.estado === 'pendiente'
                          ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                          : task.estado === 'en progreso'
                          ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                          : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                      }`}
                    >
                      {task.estado === 'pendiente' && 'Pendiente'}
                      {task.estado === 'en progreso' && 'En progreso'}
                      {task.estado === 'completada' && (
                        <>
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Completada
                        </>
                      )}
                    </span>
                  </div>
                  
                  <div className="mt-1 flex flex-wrap items-center text-sm text-gray-600 dark:text-gray-400">
                    {task.cliente && (
                      <div className="flex items-center mr-4 mb-1">
                        <User className="h-3 w-3 mr-1" />
                        {task.cliente}
                      </div>
                    )}
                    
                    {task.numeroTitular && (
                      <div className="flex items-center mr-4 mb-1">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                        </svg>
                        {task.numeroTitular}
                      </div>
                    )}
                    
                    {task.direccion && (
                      <div className="flex items-center mr-4 mb-1">
                        <MapPin className="h-3 w-3 mr-1" />
                        <span className="text-gray-600 dark:text-gray-400 truncate max-w-[200px]">
                          {task.direccion}
                        </span>
                      </div>
                    )}
                    
                    <div className="flex items-center mr-4 mb-1">
                      <Calendar className="h-3 w-3 mr-1" />
                      {task.fechaEjecucion 
                        ? (() => {
                            // Obtener la fecha original
                            const fecha = new Date(task.fechaEjecucion);
                            // Ajustar para la zona horaria de Argentina (UTC-3)
                            // Añadir un día completo para compensar el problema
                            const fechaAjustada = new Date(fecha);
                            fechaAjustada.setDate(fecha.getDate() + 1);
                            return fechaAjustada.toLocaleDateString('es-AR');
                          })() 
                        : <span className="text-gray-400 italic">Fecha no programada</span>}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center justify-end w-full md:w-auto">
                  {task.tecnicos.length > 0 && (
                    <div className="mr-4">
                      <span className="text-xs text-gray-500 dark:text-gray-400 block mb-1">Técnicos</span>
                      <div className="text-sm">
                        {task.tecnicos.map((t: any) => t.nombre).join(', ')}
                      </div>
                    </div>
                  )}
                  
                  {user?.rol === 'admin' && (
                    <div className="flex space-x-2 ml-4">
                      <button
                        onClick={() => openEditModal(task)}
                        className="text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteTask(task._id)}
                        className="text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
          {/* Controles de paginación */}
          <div className="flex justify-between items-center p-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Página {currentPage} de {Math.max(1, Math.ceil(filteredTasks.length / tasksPerPage))}
              </span>
              <div className="flex space-x-2">
                <button
                  onClick={goToPreviousPage}
                  disabled={currentPage === 1}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 ${currentPage === 1 ? 'bg-gray-200 text-gray-500 cursor-not-allowed dark:bg-gray-700 dark:text-gray-400' : 'bg-gray-200 hover:bg-gray-300 text-gray-700 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-300'}`}
                >
                  <div className="flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    Anterior
                  </div>
                </button>
                <button
                  onClick={goToNextPage}
                  disabled={currentPage >= Math.ceil(filteredTasks.length / tasksPerPage)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 ${currentPage >= Math.ceil(filteredTasks.length / tasksPerPage) ? 'bg-gray-200 text-gray-500 cursor-not-allowed dark:bg-gray-700 dark:text-gray-400' : 'bg-gray-200 hover:bg-gray-300 text-gray-700 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-300'}`}
                >
                  <div className="flex items-center">
                    Siguiente
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create/Edit Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
          <div className="relative max-w-md w-full bg-white dark:bg-gray-800 rounded-xl shadow-xl p-6 max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => {
                setShowCreateModal(false);
                setEditingTask(null);
                resetForm();
              }}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              aria-label="Cerrar"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
            
            <div className="mt-1">
              <div className="flex items-center mb-6">
                {editingTask ? (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                )}
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                  {editingTask ? 'Editar Tarea' : 'Nueva Tarea'}
                </h3>
              </div>
              
              <form onSubmit={editingTask ? handleUpdateTask : handleCreateTask} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Número de Tarea *
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
                      </svg>
                    </div>
                    <input
                      type="text"
                      required
                      value={formData.numero}
                      onChange={(e) => setFormData({ ...formData, numero: e.target.value })}
                      className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-colors"
                      placeholder="Ej: T-001, 2024-001, etc."
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Título *
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                      </svg>
                    </div>
                    <input
                      type="text"
                      required
                      value={formData.titulo}
                      onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
                      className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-colors"
                      placeholder="Título de la tarea"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Descripción
                  </label>
                  <div className="relative">
                    <div className="absolute top-3 left-3 flex items-start pointer-events-none">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
                      </svg>
                    </div>
                    <textarea
                      value={formData.descripcion}
                      onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                      rows={3}
                      className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-colors"
                      placeholder="Detalles de la tarea"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Cliente
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                    <input
                      type="text"
                      value={formData.cliente}
                      onChange={(e) => setFormData({ ...formData, cliente: e.target.value })}
                      className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-colors"
                      placeholder="Nombre del cliente"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Teléfono del Titular
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                    </div>
                    <input
                      type="tel"
                      value={formData.numeroTitular}
                      onChange={(e) => setFormData({ ...formData, numeroTitular: e.target.value })}
                      className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-colors"
                      placeholder="Número de teléfono del titular"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Dirección
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </div>
                    <input
                      type="text"
                      value={formData.direccion}
                      onChange={(e) => setFormData({ ...formData, direccion: e.target.value })}
                      className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-colors"
                      placeholder="Calle, número, ciudad"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Fecha de Ejecución
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <input
                      type="date"
                      value={formData.fechaEjecucion}
                      onChange={(e) => setFormData({ ...formData, fechaEjecucion: e.target.value })}
                      className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Estado
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <select
                      value={formData.estado}
                      onChange={(e) => setFormData({ ...formData, estado: e.target.value as any })}
                      className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-colors appearance-none"
                    >
                      <option value="pendiente">Pendiente</option>
                      <option value="en progreso">En Progreso</option>
                      <option value="completada">Completada</option>
                    </select>
                    <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                      <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Técnicos Asignados
                  </label>
                  <div className="relative">
                    <div className="absolute top-3 left-3 flex items-start pointer-events-none">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                    </div>
                    <select
                      multiple
                      value={formData.tecnicos}
                      onChange={(e) => {
                        const selectedOptions = Array.from(e.target.selectedOptions, option => option.value);
                        setFormData({ ...formData, tecnicos: selectedOptions });
                      }}
                      className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-colors"
                      size={4}
                    >
                      {users?.filter(u => u.rol === 'usuario').map((usuario) => (
                        <option key={usuario._id} value={usuario._id}>
                          {usuario.nombre}
                        </option>
                      ))}
                    </select>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5 ml-1">
                    Mantén presionado Ctrl (Cmd en Mac) para seleccionar múltiples técnicos
                  </p>
                </div>

                <div className="flex justify-end space-x-3 pt-5">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateModal(false);
                      setEditingTask(null);
                      resetForm();
                    }}
                    className="px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 flex items-center"
                  >
                    {editingTask ? (
                      <>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Actualizar
                      </>
                    ) : (
                      <>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                        Crear
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TaskList;

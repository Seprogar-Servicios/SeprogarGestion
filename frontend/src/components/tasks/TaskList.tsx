import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../store';
import { fetchTasks, createTask, updateTask, deleteTask, deleteMultipleTasks, setFilters } from '../../store/slices/tasksSlice';
import { fetchUsers } from '../../store/slices/usersSlice';
import UpcomingTasksFilter from '../filters/UpcomingTasksFilter';
import TasksFilter from '../filters/TasksFilter';
import { format } from 'date-fns';
import { Plus, Search, Filter, X, Calendar, Trash2, FileText, User, Phone, MapPin, CheckCircle, Hash, CheckSquare, Square, Send, Download, XCircle, Edit, Clock, ChevronDown } from 'lucide-react';
import type { User as UserType } from '../../types';
import type { Task, TaskFilters } from '../../types';
import { downloadICSFile } from '../../utils/calendarUtils';
import { formatDireccionToMapsUrl } from '../../utils/mapsUtils';

// Las clases de botones se definen directamente en los componentes

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
  const [showWhatsAppPanel, setShowWhatsAppPanel] = useState(false);
  const [selectedTecnico, setSelectedTecnico] = useState<string | null>(null);
  const [initialFiltersLoaded, setInitialFiltersLoaded] = useState(false);
  
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
    horaInicio: '',
    horaFin: '',
    franja_horaria: '',
    tecnicos: [] as string[],
    estado: 'pendiente' as 'pendiente' | 'en progreso' | 'completada' | 'cancelada'
  });
  
  // Función para actualizar la franja horaria cuando cambian las horas
  const actualizarFranjaHoraria = (inicio: string, fin: string) => {
    if (inicio && fin) {
      return `${inicio}-${fin}`;
    } else if (inicio) {
      return `${inicio}-`;
    } else if (fin) {
      return `-${fin}`;
    }
    return '';
  };

  // Initialize filters on component mount
  useEffect(() => {
    if (!initialFiltersLoaded) {
      const today = format(new Date(), 'yyyy-MM-dd');
      const initialFilters: TaskFilters = {
        fechaDesde: today
      };
      
      // If user is not admin, filter only their tasks
      if (user && user.rol !== 'admin') {
        initialFilters.tecnico = user._id;
      }
      
      dispatch(setFilters(initialFilters));
      dispatch(fetchTasks(initialFilters));
      setInitialFiltersLoaded(true);
    }
    
    // Load users if admin
    if (user && user.rol === 'admin') {
      dispatch(fetchUsers());
    }
  }, [dispatch, user, initialFiltersLoaded]);
  
  // Handle filter changes
  useEffect(() => {
    if (initialFiltersLoaded) {
      const taskFilters = { ...filters };
      
      // Ensure non-admin users can only see their tasks
      if (user && user.rol !== 'admin') {
        taskFilters.tecnico = user._id;
      }
      
      dispatch(fetchTasks(taskFilters));
    }
  }, [dispatch, filters, user, initialFiltersLoaded]);

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Concatenar horaInicio y horaFin para crear franja_horaria
      const franja_horaria = actualizarFranjaHoraria(formData.horaInicio, formData.horaFin);
      
      // Crear objeto con los datos del formulario incluyendo franja_horaria pero excluyendo horaInicio y horaFin
      const { horaInicio, horaFin, ...restFormData } = formData;
      
      // Ajustar la fecha de ejecución para evitar problemas de zona horaria
      let fechaEjecucionAjustada = restFormData.fechaEjecucion;
      
      if (fechaEjecucionAjustada) {
        // Si la fecha viene en formato YYYY-MM-DD (sin tiempo)
        // La dejamos tal cual para que se maneje como string en el backend
        // y no se convierta automáticamente a Date con zona horaria UTC
        console.log('Fecha de ejecución original:', fechaEjecucionAjustada);
        console.log('Fecha de ejecución ajustada:', fechaEjecucionAjustada);
      }
      
      const taskData = {
        ...restFormData,
        franja_horaria
      };
      
      await dispatch(createTask(taskData as any)).unwrap();
      resetForm();
      setShowCreateModal(false);
      import('react-toastify').then(({ toast }) => {
        toast.success('Tarea creada correctamente', {
          position: "top-right",
          autoClose: 3000,
        });
      });
      
      // Recargar las tareas
      dispatch(fetchTasks(filters));
    } catch (error: any) {
      import('react-toastify').then(({ toast }) => {
        toast.error(`Error al crear la tarea: ${error.message || 'Error desconocido'}`, {
          position: "top-right",
          autoClose: 5000,
        });
      });
    }
  };

  const handleUpdateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTask) return;
    
    try {
      // Concatenar horaInicio y horaFin para crear franja_horaria
      const franja_horaria = actualizarFranjaHoraria(formData.horaInicio, formData.horaFin);
      
      // Crear objeto con los datos del formulario incluyendo franja_horaria pero excluyendo horaInicio y horaFin
      const { horaInicio, horaFin, ...restFormData } = formData;
      const taskData = {
        ...restFormData,
        franja_horaria
      };
      
      await dispatch(updateTask({ id: editingTask._id, data: taskData as any })).unwrap();
      
      // Mostrar mensaje de éxito con toast
      import('react-toastify').then(({ toast }) => {
        toast.success('Tarea actualizada correctamente', {
          position: "top-right",
          autoClose: 3000,
        });
      });
      
      // Cerrar el modal y resetear
      setShowCreateModal(false);
      setEditingTask(null);
      resetForm();
      
      // Recargar las tareas
      dispatch(fetchTasks(filters));
    } catch (error: any) {
      import('react-toastify').then(({ toast }) => {
        toast.error(`Error al actualizar la tarea: ${error.message || 'Error desconocido'}`, {
          position: "top-right",
          autoClose: 5000,
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
              className="px-3 py-1 text-sm text-white bg-red-500 rounded hover:bg-red-600 cursor-pointer"
            >
              Eliminar
            </button>
            <button 
              onClick={() => closeToast?.()}
              className="px-3 py-1 text-sm text-gray-700 bg-gray-200 rounded hover:bg-gray-300 cursor-pointer"
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
      horaInicio: '',
      horaFin: '',
      franja_horaria: '',
      tecnicos: [],
      estado: 'pendiente'
    });
  };

  const openEditModal = (task: Task) => {
    setEditingTask(task);
    
    // Extraer hora de inicio y hora de fin si existe franja_horaria
    let horaInicio = '';
    let horaFin = '';
    if (task.franja_horaria) {
      const partes = task.franja_horaria.split('-');
      horaInicio = partes[0] || '';
      horaFin = partes[1] || '';
    }
    
    setFormData({
      numero: task.numero,
      titulo: task.titulo,
      descripcion: task.descripcion || '',
      cliente: task.cliente || '',
      numeroTitular: task.numeroTitular || '',
      direccion: task.direccion || '',
      fechaEjecucion: task.fechaEjecucion ? new Date(task.fechaEjecucion).toISOString().split('T')[0] : '',
      horaInicio,
      horaFin,
      franja_horaria: task.franja_horaria || '',
      tecnicos: task.tecnicos ? task.tecnicos.map(t => t._id) : [],
      estado: task.estado as 'pendiente' | 'en progreso' | 'completada'
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
              className="px-3 py-1 text-sm text-white bg-red-500 rounded hover:bg-red-600 cursor-pointer"
            >
              Eliminar
            </button>
            <button 
              onClick={() => closeToast?.()}
              className="px-3 py-1 text-sm text-gray-700 bg-gray-200 rounded hover:bg-gray-300 cursor-pointer"
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
      setSelectedTecnico(null);
    } else {
      // Primero deseleccionar todas las tareas actuales
      setSelectedTasks([]);
      
      // Luego seleccionar solo las tareas del técnico actual
      setSelectedTasks(tecnicoTaskIds);
      setSelectedTecnico(tecnicoId);
    }
  };
  
  // Generar mensaje de WhatsApp y archivo .ics para el técnico seleccionado
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
      if (task.direccion) {
        const mapsUrl = formatDireccionToMapsUrl(task.direccion);
        message += `• *Direccion:* ${task.direccion}\n  *Ver en Google Maps:* ${mapsUrl}\n`;
      }
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
        })}`;
        
        // Agregar franja horaria si existe
        if (task.franja_horaria) {
          message += ` - *Horario:* ${task.franja_horaria}`;
        }
        
        message += '\n';
      } else {
        message += `• *Fecha de Ejecución:* No programada\n`;
      }
      message += '\n';
    });
    
    message += '*Tareas listadas correctamente*\n';
    message += '*Recorda:* Puedes usar este mensaje como recordatorio de tus tareas pendientes.';
    message += '\n\n*Nota:* También puedes descargar estas tareas como eventos para tu calendario.';
    
    // Codificar el mensaje para URL
    const encodedMessage = encodeURIComponent(message);
    
    // Abrir WhatsApp con el mensaje predefinido
    const whatsappUrl = `https://wa.me/${tecnico.telefono?.replace(/\D/g, '')}?text=${encodedMessage}`;
    window.open(whatsappUrl, '_blank');
    
    return selectedTasksForTecnico;
  };
  
  // Generar y descargar archivo .ics para las tareas seleccionadas (para administradores)
  const handleDownloadCalendar = (tecnicoId: string) => {
    const tecnico = groupedTasks[tecnicoId]?.tecnico;
    if (!tecnico) {
      alert('No se encontró el técnico seleccionado');
      return;
    }
    
    // Obtener las tareas del técnico que están seleccionadas
    const tecnicoTasks = groupedTasks[tecnicoId]?.tasks || [];
    const selectedTasksForTecnico = tecnicoTasks.filter(task => selectedTasks.includes(task._id));
    
    if (selectedTasksForTecnico.length === 0) {
      alert('No hay tareas seleccionadas para este técnico');
      return;
    }
    
    // Generar nombre base del archivo con el nombre del técnico
    const baseFileName = `tareas-${tecnico.nombre.toLowerCase().replace(/\s+/g, '-')}`;
    
    // Descargar el archivo .ics (la fecha actual se añadirá automáticamente)
    downloadICSFile(selectedTasksForTecnico, baseFileName);
  };

  // Generar y descargar archivo .ics para las tareas seleccionadas (para usuarios normales)
  const handleDownloadCalendarForUser = () => {
    if (selectedTasks.length === 0) {
      alert('No hay tareas seleccionadas');
      return;
    }
    
    // Obtener las tareas seleccionadas del usuario actual
    const userSelectedTasks = filteredTasks.filter(task => selectedTasks.includes(task._id));
    
    if (userSelectedTasks.length === 0) {
      alert('No hay tareas seleccionadas');
      return;
    }
    
    // Generar nombre base del archivo con el nombre del usuario
    const baseFileName = `mis-tareas-${user?.nombre?.toLowerCase().replace(/\s+/g, '-') || 'usuario'}`;
    
    // Descargar el archivo .ics (la fecha actual se añadirá automáticamente)
    downloadICSFile(userSelectedTasks, baseFileName);
  };

  // Generar mensaje de WhatsApp para usuario normal
  const generateWhatsAppMessageForUser = () => {
    if (!user || !user.telefono || user.telefono.trim() === '') {
      alert('No tienes un número de teléfono registrado');
      return;
    }
    
    if (selectedTasks.length === 0) {
      alert('No hay tareas seleccionadas');
      return;
    }
    
    // Obtener las tareas seleccionadas del usuario actual
    const userSelectedTasks = filteredTasks.filter(task => selectedTasks.includes(task._id));
    
    if (userSelectedTasks.length === 0) {
      alert('No hay tareas seleccionadas');
      return;
    }
    
    // Generar el mensaje para WhatsApp
    let message = `*Recordatorio de Tareas Pendientes*\n\n`;
    message += `Hola ${user.nombre},\n\n`;
    message += `Aquí tienes un resumen de tus tareas pendientes:\n\n`;
    
    userSelectedTasks.forEach((task, index) => {
      message += `*Tarea ${index + 1}: ${task.titulo}*\n`;
      if (task.descripcion) {
        message += `• *Descripción:* ${task.descripcion}\n`;
      }
      if (task.cliente) {
        message += `• *Cliente:* ${task.cliente}\n`;
      }
      if (task.numeroTitular) {
        message += `• *Teléfono:* ${task.numeroTitular}\n`;
      }
      if (task.direccion) {
        const mapsUrl = formatDireccionToMapsUrl(task.direccion);
        message += `• *Dirección:* ${task.direccion}\n  🗺️ *Ver en Google Maps:* ${mapsUrl}\n`;
      }
      
      if (task.fechaEjecucion) {
        // Obtener la fecha original
        const fecha = new Date(task.fechaEjecucion);
        // Ajustar para la zona horaria de Argentina (UTC-3)
        // Añadir un día completo para compensar el problema
        const fechaAjustada = new Date(fecha);
        fechaAjustada.setDate(fecha.getDate() + 1);
        
        message += `• *Fecha de Ejecución:* ${fechaAjustada.toLocaleDateString('es-AR', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric'
        })}`;
        
        if (task.franja_horaria) {
          message += ` - ${task.franja_horaria}`;
        }
        
        message += '\n';
      } else {
        message += `• *Fecha de Ejecución:* No programada\n`;
      }
      message += '\n';
    });
    
    message += '*Tareas listadas correctamente*\n';
    message += '*Recorda:* Puedes usar este mensaje como recordatorio de tus tareas pendientes.';
    message += '\n\n*Nota:* También puedes descargar estas tareas como eventos para tu calendario.';
    
    // Codificar el mensaje para URL
    const encodedMessage = encodeURIComponent(message);
    
    // Abrir WhatsApp con el mensaje predefinido
    const whatsappUrl = `https://wa.me/${user.telefono?.replace(/\D/g, '')}?text=${encodedMessage}`;
    window.open(whatsappUrl, '_blank');
    
    return userSelectedTasks;
  };

  // Estas funciones se han eliminado porque ya no se utilizan

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border-t-4 border-blue-500 p-4 mb-4 animate-fadeIn">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center">
            <div className="bg-blue-100 dark:bg-blue-900/30 p-3 rounded-full mr-4">
              <CheckSquare className="h-8 w-8 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-500 to-purple-600 bg-clip-text text-transparent">
                Gestión de Tareas
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 flex items-center">
                Administra y organiza todas las tareas del sistema
              </p>
            </div>
          </div>
          
          <button 
            onClick={() => setShowCreateModal(true)} 
            className="px-4 py-2.5 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-md hover:from-blue-600 hover:to-purple-700 transition-all duration-200 text-sm font-medium flex items-center gap-2 shadow-md hover:shadow-lg transform hover:scale-105 cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            Nueva Tarea
          </button>
        </div>
      </div>

      {/* Upcoming Tasks Filter - Only for Admin */}
      {user?.rol === 'admin' && (
        <UpcomingTasksFilter
          filters={filters}
          onFiltersChange={handleFiltersChange}
        />
      )}

      {/* Search and Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 border-t-4 border-purple-500 animate-fadeIn" style={{ animationDelay: '100ms' }}>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative mb-3 sm:mb-0">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-blue-500 dark:text-blue-400" />
            <input
              type="text"
              placeholder="Buscar tareas..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-3 h-10 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white transition-colors"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2 justify-center sm:justify-start">
            {/* Selección múltiple y eliminación */}
            <div className="flex items-center">
              {selectedTasks.length > 0 ? (
                <div className="flex items-center gap-2">
                  <span className="text-sm bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-3 py-2 rounded-md h-10 flex items-center">
                    {selectedTasks.length} seleccionadas
                  </span>
                  <button
                    onClick={handleDeleteMultipleTasks}
                    disabled={selectedTasks.length === 0}
                    className="px-3 py-2 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-md hover:bg-red-200 dark:hover:bg-red-800/50 transition-colors duration-200 text-sm font-medium flex items-center gap-2 cursor-pointer"
                  >
                    <Trash2 className="h-4 w-4" />
                    Eliminar
                  </button>
                  <button
                    onClick={() => setSelectedTasks([])}
                    className="p-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors duration-200 cursor-pointer"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleSelectAllTasks}
                  className="px-3 py-2 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-md hover:bg-blue-200 dark:hover:bg-blue-800/50 transition-colors duration-200 text-sm font-medium flex items-center gap-2 cursor-pointer"
                >
                  <CheckSquare className="h-4 w-4" />
                  Seleccionar
                </button>
              )}
            </div>
            
            {/* Filters Button */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="px-3 py-2 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-md hover:bg-purple-200 dark:hover:bg-purple-800/50 transition-colors duration-200 text-sm font-medium flex items-center gap-2 cursor-pointer"
            >
              <Filter className="h-4 w-4" />
              Filtros
              {showFilters && (
                <span className="ml-1 w-2 h-2 rounded-full bg-purple-500 animate-pulse"></span>
              )}
            </button>
            
            {/* WhatsApp Button */}
            <button
              onClick={() => setShowWhatsAppPanel(!showWhatsAppPanel)}
              className="px-3 py-2 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-md hover:bg-green-200 dark:hover:bg-green-800/50 transition-colors duration-200 text-sm font-medium flex items-center gap-2 cursor-pointer"
            >
              <Send className="h-4 w-4" />
              {showWhatsAppPanel ? 'Ocultar WhatsApp' : 'Enviar WhatsApp'}
              {selectedTasks.length > 0 && (
                <span className="ml-1 px-1.5 py-0.5 bg-white dark:bg-gray-800 text-green-700 dark:text-green-300 text-xs rounded-full shadow-sm">
                  {selectedTasks.length}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Filtros avanzados */}
      {showFilters && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 border-t-4 border-purple-500 animate-fadeIn space-y-4" style={{ animationDelay: '150ms' }}>
          <div className="flex items-center mb-2">
            <Filter className="h-5 w-5 mr-2 text-purple-500" />
            <h3 className="text-lg font-medium bg-gradient-to-r from-blue-500 to-purple-600 bg-clip-text text-transparent">
              Filtros avanzados
            </h3>
          </div>
          <TasksFilter
            filters={filters}
            onFiltersChange={handleFiltersChange}
          />
        </div>
      )}
      
      {/* Panel de WhatsApp */}
      {showWhatsAppPanel && (
        <div className="my-4 bg-white dark:bg-gray-800 rounded-lg shadow-md border-t-4 border-green-500 animate-fadeIn transition-all duration-300 ease-in-out" style={{ animationDelay: '200ms' }}>
          <div className="p-4">
            <div className="flex items-center mb-2">
              <Send className="h-5 w-5 mr-2 text-green-500" />
              <h3 className="text-lg font-medium bg-gradient-to-r from-green-500 to-blue-500 bg-clip-text text-transparent">
                Enviar tareas por WhatsApp
              </h3>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
              {user?.rol === 'admin'
                ? 'Envía un recordatorio de sus tareas al técnico por WhatsApp. Solo puedes seleccionar un técnico a la vez.'
                : 'Envía un recordatorio de tus tareas a tu WhatsApp o descárgalas como eventos para tu calendario.'}
            </p>
          
            <div>
              <div className="space-y-4 py-2">
                {user?.rol === 'admin' ? (
                  // Panel para administradores
                  Object.keys(groupedTasks).length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {Object.entries(groupedTasks).map(([tecnicoId, { tecnico, tasks }]) => (
                        <div key={tecnicoId} className={`border ${selectedTecnico === tecnicoId ? 'border-[#f7941d] bg-orange-50 dark:bg-gray-700/50' : 'border-gray-200 dark:border-gray-700'} rounded-lg p-4 hover:shadow-md transition-shadow`}>
                          <div className="flex flex-col space-y-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center">
                                <button 
                                  onClick={() => handleSelectAllForTecnico(tecnicoId)}
                                  className="text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 mr-2 cursor-pointer"
                                >
                                  {tasks.every(task => selectedTasks.includes(task._id)) ? (
                                    <CheckSquare className="h-5 w-5" />
                                  ) : (
                                    <Square className="h-5 w-5" />
                                  )}
                                </button>
                                <span className="font-medium text-gray-900 dark:text-white truncate max-w-[150px]">
                                  {tecnico.nombre}
                                </span>
                              </div>
                              <div className="text-sm text-gray-500 dark:text-gray-400">
                                {tasks.filter(task => selectedTasks.includes(task._id)).length}/{tasks.length} tareas
                              </div>
                            </div>
                            
                            <div className="flex items-center text-sm text-gray-600 dark:text-gray-300">
                              <Phone className="h-4 w-4 mr-1" />
                              <span className="truncate">{tecnico.telefono || 'Sin teléfono'}</span>
                            </div>
                            
                            <div className="flex flex-col sm:flex-row gap-2">
                              <button
                                onClick={() => {
                                  generateWhatsAppMessage(tecnicoId);
                                }}
                                disabled={!tecnico.telefono || tecnico.telefono.trim() === '' || !tasks.some(task => selectedTasks.includes(task._id))}
                                className={`inline-flex items-center justify-center px-3 py-2 text-sm rounded-md w-full ${
                                  !tecnico.telefono || tecnico.telefono.trim() === '' || !tasks.some(task => selectedTasks.includes(task._id))
                                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                    : 'bg-green-600 text-white hover:bg-green-700 cursor-pointer'
                                }`}
                              >
                                <Send className="h-4 w-4 mr-1" />
                                Enviar por WhatsApp
                              </button>
                              <button
                                onClick={() => handleDownloadCalendar(tecnicoId)}
                                disabled={!tasks.some(task => selectedTasks.includes(task._id))}
                                className={`inline-flex items-center justify-center px-3 py-2 text-sm rounded-md w-full ${
                                  !tasks.some(task => selectedTasks.includes(task._id))
                                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                    : 'bg-blue-600 text-white hover:bg-blue-700 cursor-pointer'
                                }`}
                              >
                                <Download className="h-4 w-4 mr-1" />
                                Descargar Calendario
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 dark:text-gray-400 py-4 text-center">
                      No hay tareas asignadas a técnicos
                    </p>
                  )
                ) : (
                  // Panel para usuarios normales
                  <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                    <div className="flex flex-col space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <span className="font-medium text-gray-900 dark:text-white">
                            Mis tareas seleccionadas
                          </span>
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {selectedTasks.length} tareas seleccionadas
                        </div>
                      </div>
                      
                      {user?.telefono ? (
                        <div className="flex items-center text-sm text-gray-600 dark:text-gray-300">
                          <Phone className="h-4 w-4 mr-1" />
                          <span className="truncate">{user.telefono || 'Sin teléfono'}</span>
                        </div>
                      ) : (
                        <div className="text-sm text-yellow-600 dark:text-yellow-400">
                          No tienes un número de teléfono registrado. Contacta al administrador para actualizar tu perfil.
                        </div>
                      )}
                      
                      <div className="flex flex-col sm:flex-row gap-2">
                        <button
                          onClick={generateWhatsAppMessageForUser}
                          disabled={!user?.telefono || user.telefono.trim() === '' || selectedTasks.length === 0}
                          className={`inline-flex items-center justify-center px-3 py-2 text-sm rounded-md w-full ${
                            !user?.telefono || user.telefono.trim() === '' || selectedTasks.length === 0
                              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                              : 'bg-green-600 text-white hover:bg-green-700 cursor-pointer'
                          }`}
                        >
                          <Send className="h-4 w-4 mr-1" />
                          Enviar a mi WhatsApp
                        </button>
                        <button
                          onClick={handleDownloadCalendarForUser}
                          disabled={selectedTasks.length === 0}
                          className={`inline-flex items-center justify-center px-3 py-2 text-sm rounded-md w-full ${
                            selectedTasks.length === 0
                              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                              : 'bg-blue-600 text-white hover:bg-blue-700 cursor-pointer'
                          }`}
                        >
                          <Download className="h-4 w-4 mr-1" />
                          Descargar Calendario
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
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
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden">
          {currentTasks.map((task) => (
            <div 
              key={task._id} 
              className={`group border-b border-gray-200 dark:border-gray-700 p-4 hover:bg-blue-50/50 dark:hover:bg-blue-900/10 transition-all duration-200 relative animate-fadeIn
                ${task.estado === 'completada' 
                  ? 'border-l-4 border-green-500 dark:border-green-600' 
                  : task.estado === 'en progreso' 
                    ? 'border-l-4 border-amber-500 dark:border-amber-600' 
                    : 'border-l-4 border-blue-500 dark:border-blue-600'}`}
              style={{ 
                animationDelay: `${currentTasks.indexOf(task) * 50}ms`,
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
              }}
            >
              {/* Checkbox para seleccionar tarea */}
              <div className="absolute top-2 right-2 z-10">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSelectTask(task._id);
                  }}
                  className="text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 bg-white dark:bg-gray-800 p-1 rounded"
                >
                  {selectedTasks.includes(task._id) ? (
                    <CheckSquare className="h-5 w-5" />
                  ) : (
                    <Square className="h-5 w-5" />
                  )}
                </button>
              </div>
              <Link 
                to={`/tasks/${task._id}`} 
                className="flex-1 min-w-0 mb-2 md:mb-0 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors cursor-pointer block"
              >
                <div className="flex flex-col w-full">
                  <div className="flex items-start w-full">
                    {/* Left side - Task info */}
                    <div className="flex-1 min-w-0 py-2">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <h3 className="text-lg font-medium text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors truncate">
                          {task.titulo}
                        </h3>
                        <span className="text-xs font-medium px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300 shadow-sm whitespace-nowrap">
                          #{task.numero}
                        </span>
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium shadow-sm whitespace-nowrap ${
                            task.estado === 'pendiente'
                              ? 'bg-gradient-to-r from-yellow-100 to-yellow-200 text-yellow-800 dark:from-yellow-900/70 dark:to-yellow-800/70 dark:text-yellow-200'
                              : task.estado === 'en progreso'
                              ? 'bg-gradient-to-r from-blue-100 to-blue-200 text-blue-800 dark:from-blue-900/70 dark:to-blue-800/70 dark:text-blue-200'
                              : task.estado === 'cancelada'
                              ? 'bg-gradient-to-r from-red-100 to-red-200 text-red-800 dark:from-red-900/70 dark:to-red-800/70 dark:text-red-200'
                              : 'bg-gradient-to-r from-green-100 to-green-200 text-green-800 dark:from-green-900/70 dark:to-green-800/70 dark:text-green-200'
                          }`}
                        >
                          {task.estado === 'pendiente' && 'Pendiente'}
                          {task.estado === 'en progreso' && 'En Progreso'}
                          {task.estado === 'completada' && <CheckCircle className="h-3 w-3 mr-1" />}
                          {task.estado === 'cancelada' && <XCircle className="h-3 w-3 mr-1" />}
                        </span>
                      </div>
                      
                      <div className="flex flex-wrap items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                        {task.cliente && (
                          <div className="flex items-center px-2 py-1 bg-gray-50 dark:bg-gray-700/50 rounded-md shadow-sm">
                            <User className="h-3 w-3 mr-1.5 text-blue-500 dark:text-blue-400" />
                            <span className="font-medium truncate max-w-[120px]">{task.cliente}</span>
                          </div>
                        )}
                        
                        {task.numeroTitular && (
                          <div className="flex items-center px-2 py-1 bg-gray-50 dark:bg-gray-700/50 rounded-md shadow-sm">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1.5 text-green-500 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                            </svg>
                            <span className="truncate max-w-[100px]">{task.numeroTitular}</span>
                          </div>
                        )}
                        
                        {task.direccion && (
                          <div className="flex items-center px-2 py-1 bg-gray-50 dark:bg-gray-700/50 rounded-md shadow-sm">
                            <MapPin className="h-3 w-3 mr-1.5 text-red-500 dark:text-red-400" />
                            <span className="truncate max-w-[150px]">{task.direccion}</span>
                          </div>
                        )}
                        
                        <div className="flex items-center px-2 py-1 bg-gray-50 dark:bg-gray-700/50 rounded-md shadow-sm">
                          <Calendar className="h-3 w-3 mr-1.5 text-purple-500 dark:text-purple-400" />
                          <span className="whitespace-nowrap">
                            {task.fechaEjecucion 
                              ? (() => {
                                  const fecha = new Date(task.fechaEjecucion);
                                  const fechaAjustada = new Date(fecha);
                                  fechaAjustada.setDate(fecha.getDate() + 1);
                                  return fechaAjustada.toLocaleDateString('es-AR', {
                                    day: '2-digit',
                                    month: '2-digit',
                                    year: 'numeric'
                                  });
                                })()
                              : "Sin fecha"}
                          </span>
                          {task.franja_horaria && (
                            <span className="ml-2 text-xs font-medium bg-gradient-to-r from-blue-100 to-purple-100 text-blue-800 dark:from-blue-900/70 dark:to-purple-900/70 dark:text-blue-200 py-0.5 px-1.5 rounded shadow-sm whitespace-nowrap">
                              {task.franja_horaria}
                            </span>
                          )}
                        </div>
                        
                        {task.tecnicos.length > 0 && (
                          <div className="flex items-center px-2 py-1 bg-gray-50 dark:bg-gray-700/50 rounded-md shadow-sm">
                            <span className="text-xs text-gray-500 dark:text-gray-400 font-medium mr-1">Técnicos:</span>
                            <div className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate max-w-[150px]">
                              {task.tecnicos.map((t: any) => t.nombre).join(', ')}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* Right side - Action buttons */}
                    {user?.rol === 'admin' && (
                      <div className="flex items-start space-x-2 ml-4 pt-9 flex-shrink-0">
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            openEditModal(task);
                          }}
                          className="p-2 bg-blue-50 hover:bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:hover:bg-blue-800/50 dark:text-blue-400 rounded-md transition-colors duration-200 shadow-sm"
                          aria-label="Editar tarea"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleDeleteTask(task._id);
                          }}
                          className="p-2 bg-red-50 hover:bg-red-100 text-red-600 dark:bg-red-900/30 dark:hover:bg-red-800/50 dark:text-red-400 rounded-md transition-colors duration-200 shadow-sm"
                          aria-label="Eliminar tarea"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                  )}
                </div>
              </div>
            </Link>
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
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 ${currentPage === 1 ? 'bg-gray-200 text-gray-500 cursor-not-allowed dark:bg-gray-700 dark:text-gray-400' : 'bg-gray-200 hover:bg-gray-300 text-gray-700 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-300'}`}
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
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 ${currentPage >= Math.ceil(filteredTasks.length / tasksPerPage) ? 'bg-gray-200 text-gray-500 cursor-not-allowed dark:bg-gray-700 dark:text-gray-400' : 'bg-gray-200 hover:bg-gray-300 text-gray-700 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-300'}`}
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
        <div className="fixed inset-0 bg-gray-900/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="relative w-full max-w-2xl bg-white dark:bg-gray-800 rounded-2xl shadow-2xl overflow-hidden">
            <div className="px-6 py-5 bg-gradient-to-r from-blue-600 to-purple-600">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  {editingTask ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                  )}
                  <h3 className="text-xl font-bold text-white">
                    {editingTask ? 'Editar Tarea' : 'Nueva Tarea'}
                  </h3>
                </div>
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    setEditingTask(null);
                    resetForm();
                  }}
                  className="p-1.5 rounded-full hover:bg-white/10 transition-colors"
                  aria-label="Cerrar"
                >
                  <X className="h-5 w-5 text-white" />
                </button>
              </div>
            </div>
            
            <div className="p-6 max-h-[80vh] overflow-y-auto">
              <form onSubmit={editingTask ? handleUpdateTask : handleCreateTask} className="space-y-6">
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Número de Tarea <span className="text-red-500">*</span>
                  </label>
                  <div className="relative rounded-lg shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Hash className="h-4 w-4 text-gray-400" />
                    </div>
                    <input
                      type="text"
                      required
                      value={formData.numero}
                      onChange={(e) => setFormData({ ...formData, numero: e.target.value })}
                      className="block w-full pl-10 pr-3 py-3 border-0 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                      placeholder="Ej: T-001, 2024-001, etc."
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Título <span className="text-red-500">*</span>
                  </label>
                  <div className="relative rounded-lg shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <FileText className="h-4 w-4 text-gray-400" />
                    </div>
                    <input
                      type="text"
                      required
                      value={formData.titulo}
                      onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
                      className="block w-full pl-10 pr-3 py-3 border-0 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                      placeholder="Título de la tarea"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Descripción
                  </label>
                  <div className="relative rounded-lg shadow-sm">
                    <div className="absolute top-3 left-3 text-gray-400">
                      <FileText className="h-4 w-4" />
                    </div>
                    <textarea
                      value={formData.descripcion}
                      onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                      className="block w-full pl-10 pr-3 py-3 border-0 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 min-h-[120px]"
                      placeholder="Descripción detallada de la tarea"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Cliente
                  </label>
                  <div className="relative rounded-lg shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <User className="h-4 w-4 text-gray-400" />
                    </div>
                    <input
                      type="text"
                      value={formData.cliente}
                      onChange={(e) => setFormData({ ...formData, cliente: e.target.value })}
                      className="block w-full pl-10 pr-3 py-3 border-0 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                      placeholder="Nombre del cliente"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Teléfono del Titular
                  </label>
                  <div className="relative rounded-lg shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Phone className="h-4 w-4 text-gray-400" />
                    </div>
                    <input
                      type="tel"
                      value={formData.numeroTitular}
                      onChange={(e) => {
                        // Only allow numbers, plus sign, and spaces
                        const value = e.target.value.replace(/[^0-9+\s]/g, '');
                        setFormData({ ...formData, numeroTitular: value });
                      }}
                      onKeyPress={(e) => {
                        // Prevent typing non-numeric characters
                        if (!/[0-9+\s]/.test(e.key)) {
                          e.preventDefault();
                        }
                      }}
                      className="block w-full pl-10 pr-3 py-3 border-0 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                      placeholder="Ej: +54 9 11 12345678"
                      pattern="[0-9+\s]+"
                      title="Solo se permiten números, el signo + y espacios"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Dirección
                  </label>
                  <div className="relative rounded-lg shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <MapPin className="h-4 w-4 text-gray-400" />
                    </div>
                    <input
                      type="text"
                      value={formData.direccion}
                      onChange={(e) => setFormData({ ...formData, direccion: e.target.value })}
                      className="block w-full pl-10 pr-3 py-3 border-0 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                      placeholder="Dirección completa"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Fecha de Ejecución
                  </label>
                  <div className="relative rounded-lg shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Calendar className="h-4 w-4 text-gray-400" />
                    </div>
                    <input
                      type="date"
                      value={formData.fechaEjecucion}
                      onChange={(e) => setFormData({ ...formData, fechaEjecucion: e.target.value })}
                      className="block w-full pl-10 pr-3 py-3 border-0 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                      Franja Horaria - Desde
                    </label>
                    <div className="relative">
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 pl-3 flex items-center pointer-events-none">
                        <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <input
                        type="time"
                        value={formData.horaInicio}
                        onChange={(e) => {
                          const newHoraInicio = e.target.value;
                          const newFranjaHoraria = actualizarFranjaHoraria(newHoraInicio, formData.horaFin);
                          setFormData({ 
                            ...formData, 
                            horaInicio: newHoraInicio,
                            franja_horaria: newFranjaHoraria
                          });
                        }}
                        className="block w-full pl-10 pr-3 py-3 border-0 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Hasta
                    </label>
                    <div className="relative rounded-lg shadow-sm">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Clock className="h-4 w-4 text-gray-400" />
                      </div>
                      <input
                        type="time"
                        value={formData.horaFin}
                        onChange={(e) => {
                          const newHoraFin = e.target.value;
                          const newFranjaHoraria = actualizarFranjaHoraria(formData.horaInicio, newHoraFin);
                          setFormData({ 
                            ...formData, 
                            horaFin: newHoraFin,
                            franja_horaria: newFranjaHoraria
                          });
                        }}
                        className="block w-full pl-10 pr-3 py-3 border-0 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Estado
                  </label>
                  <div className="relative rounded-lg shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <CheckCircle className="h-4 w-4 text-gray-400" />
                    </div>
                    <select
                      value={formData.estado}
                      onChange={(e) => setFormData({ ...formData, estado: e.target.value as any })}
                      className="block w-full pl-10 pr-10 py-3 border-0 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 appearance-none"
                    >
                      <option value="pendiente">Pendiente</option>
                      <option value="en progreso">En Progreso</option>
                      <option value="completada">Completada</option>
                      <option value="cancelada">Cancelada</option>
                    </select>
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                      <ChevronDown className="h-4 w-4 text-gray-400" />
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
                    className="px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 flex items-center cursor-pointer"
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
                        Crear Tarea
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

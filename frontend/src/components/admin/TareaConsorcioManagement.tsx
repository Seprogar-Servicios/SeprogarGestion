import React, { useEffect, useState, useRef, useCallback, memo } from 'react';
import { useAppSelector, useAppDispatch } from '../../store';
import { fetchUsers } from '../../store/slices/usersSlice';
import { Plus, Search, Edit, Trash2, FileText, User, DollarSign, Image, CreditCard, RefreshCw, Users, Eye, X } from 'lucide-react';
import type { TareaConsorcio } from '../../types';
import { showError, showSuccess } from '../../utils/toastUtils';

// Componente LazyImage optimizado con Intersection Observer
const LazyImage = memo(({ 
  src, 
  alt, 
  className, 
  onClick, 
  onError,
  onLoad 
}: {
  src: string;
  alt: string;
  className: string;
  onClick?: () => void;
  onError?: () => void;
  onLoad?: () => void;
}) => {
  const [isIntersecting, setIsIntersecting] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !isLoaded) {
          setIsIntersecting(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );
    
    if (imgRef.current) {
      observer.observe(imgRef.current);
    }
    
    return () => observer.disconnect();
  }, [isLoaded]);
  
  const handleLoad = useCallback(() => {
    setIsLoaded(true);
    onLoad?.();
  }, [onLoad]);
  
  const handleError = useCallback(() => {
    onError?.();
  }, [onError]);
  
  if (!isIntersecting) {
    return (
      <div 
        ref={imgRef} 
        className={`${className} bg-gray-200 dark:bg-gray-700 animate-pulse`}
        style={{ aspectRatio: '1/1' }}
      />
    );
  }
  
  return (
    <img
      ref={imgRef}
      src={src}
      alt={alt}
      className={className}
      loading="lazy"
      onClick={onClick}
      onLoad={handleLoad}
      onError={handleError}
      style={{ 
        opacity: isLoaded ? 1 : 0.7,
        transition: 'opacity 0.3s ease'
      }}
    />
  );
});

LazyImage.displayName = 'LazyImage';

const TareaConsorcioManagement: React.FC = () => {
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);
  const { users } = useAppSelector((state) => state.users);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingTask, setEditingTask] = useState<TareaConsorcio | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [tasksPerPage] = useState(10);
  
  // Estados para modales de confirmación y asignación
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<TareaConsorcio | null>(null);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [taskToAssign, setTaskToAssign] = useState<TareaConsorcio | null>(null);
  const [selectedTechnicians, setSelectedTechnicians] = useState<string[]>([]);
  
  // Estados para filtros
  const [estadoFilter, setEstadoFilter] = useState('');
  const [adminConsorcioFilter, setAdminConsorcioFilter] = useState('');
  const [tasks, setTasks] = useState<TareaConsorcio[]>([]);
  const [loading, setLoading] = useState(false);
  const [totalTasks, setTotalTasks] = useState(0);
  const [formData, setFormData] = useState({
    titulo: '',
    descripcion: '',
    precio: '',
    cliente: '',
    direccion: '',
    fechaEjecucion: '',
    franja_horaria: '',
    administradorConsorcio: '',
    estado: '',
    tecnicos: [] as string[]
  });

  // Estados para manejo de archivos
  const [selectedPhotos, setSelectedPhotos] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);

  // Estados para modales
  const [viewingTask, setViewingTask] = useState<TareaConsorcio | null>(null);
  const [showEditTecnicosModal, setShowEditTecnicosModal] = useState(false);
  const [editTecnicosSelected, setEditTecnicosSelected] = useState<string[]>([]);

  // Funciones para manejar el formulario
  const resetForm = () => {
    setFormData({
      titulo: '',
      descripcion: '',
      precio: '',
      cliente: '',
      direccion: '',
      fechaEjecucion: '',
      franja_horaria: '',
      administradorConsorcio: '',
      estado: '',
      tecnicos: []
    });
    setSelectedPhotos([]);
  };
  
  // Funciones para manejo de archivos
  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    
    const photoArray = Array.from(files);
    const validPhotos = photoArray.filter(photo => {
      if (photo.size > 2 * 1024 * 1024) {
        showError(`La foto ${photo.name} excede el tamaño máximo de 2MB`);
        return false;
      }
      if (!photo.type.startsWith('image/')) {
        showError(`El archivo ${photo.name} no es una imagen válida`);
        return false;
      }
      return true;
    });

    if (selectedPhotos.length + validPhotos.length > 4) {
      showError('No se pueden seleccionar más de 4 fotos');
      return;
    }

    setSelectedPhotos([...selectedPhotos, ...validPhotos]);
  };

  const removePhoto = useCallback((index: number) => {
    const photoToRemove = selectedPhotos[index];
    if (photoToRemove) {
      URL.revokeObjectURL(URL.createObjectURL(photoToRemove));
    }
    setSelectedPhotos(selectedPhotos.filter((_, i) => i !== index));
  }, [selectedPhotos]);

  useEffect(() => {
    const urls = selectedPhotos.map(photo => URL.createObjectURL(photo));
    
    return () => {
      urls.forEach(url => URL.revokeObjectURL(url));
    };
  }, [selectedPhotos]);

  // Debounce para evitar múltiples llamadas rápidas
  const debouncedDeletePhoto = useCallback(
    debounce(async (taskId: string, photoFilename: string) => {
      try {
        const token = localStorage.getItem('accessToken');
        const response = await fetch(`/api/tareas-consorcio/${taskId}/fotos/${photoFilename}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!response.ok) {
          throw new Error('Error al eliminar la foto');
        }

        // Actualizar el estado local eliminando la foto
        if (editingTask) {
          const updatedFotos = editingTask.fotos.filter((foto: any) => foto.filename !== photoFilename);
          setEditingTask({ ...editingTask, fotos: updatedFotos });
        }

        showSuccess('Foto eliminada correctamente');
      } catch (error) {
        console.error('Error:', error);
        showError('Error al eliminar la foto');
      }
    }, 300),
    [editingTask]
  );

  const handleDeleteExistingPhoto = (taskId: string, photoFilename: string) => {
    debouncedDeletePhoto(taskId, photoFilename);
  };

  // Función debounce simple
  function debounce<T extends (...args: any[]) => any>(
    func: T,
    wait: number
  ): (...args: Parameters<T>) => void {
    let timeout: ReturnType<typeof setTimeout>;
    return (...args: Parameters<T>) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func(...args), wait);
    };
  }

  const handlePhotoDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    if (!files) return;
    
    const photoArray = Array.from(files);
    const validPhotos = photoArray.filter(photo => {
      if (photo.size > 2 * 1024 * 1024) {
        showError(`La foto ${photo.name} excede el tamaño máximo de 2MB`);
        return false;
      }
      if (!photo.type.startsWith('image/')) {
        showError(`El archivo ${photo.name} no es una imagen`);
        return false;
      }
      return true;
    });

    if (selectedPhotos.length + validPhotos.length > 4) {
      showError('No se pueden seleccionar más de 4 fotos');
      return;
    }

    setSelectedPhotos([...selectedPhotos, ...validPhotos]);
  };

  const uploadPhotos = async (taskId: string) => {
    if (selectedPhotos.length === 0) return;
    
    try {
      setUploading(true);
      const formData = new FormData();
      selectedPhotos.forEach(photo => {
        formData.append('fotos', photo);
      });

      const response = await fetch(`/api/tareas-consorcio/${taskId}/fotos`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        },
        body: formData
      });

      if (!response.ok) {
        throw new Error('Error al subir las fotos');
      }

    } catch (error) {
      console.error('Error:', error);
      showError('Error al subir las fotos');
    } finally {
      setUploading(false);
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch('/api/tareas-consorcio', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          ...formData,
          precio: parseFloat(formData.precio) || 0
        })
      });

      if (!response.ok) {
        throw new Error('Error al crear la tarea');
      }

      const responseData = await response.json();
      const newTask = responseData.tarea;
      setTasks([newTask, ...tasks]);
      
      // Subir fotos si hay seleccionadas
      if (selectedPhotos.length > 0) {
        await uploadPhotos(newTask._id);
      }
      
      setShowCreateModal(false);
      resetForm();
      showSuccess('Tarea de consorcio creada exitosamente');
      
      } catch (error) {
      console.error('Error:', error);
      showError('Error al crear la tarea de consorcio');
    }
  };

  // Funciones para manejar la edición
  const handleEditTask = (task: TareaConsorcio) => {
    // Buscar la versión más reciente de la tarea en el estado local
    const latestTask = tasks.find(t => t._id === task._id) || task;
    
    setEditingTask(latestTask);
    
    const tecnicosIds = latestTask.tecnicos ? latestTask.tecnicos.map(t => t._id) : [];
    
    setFormData({
      titulo: latestTask.titulo,
      descripcion: latestTask.descripcion,
      precio: latestTask.precio.toString(),
      cliente: latestTask.cliente,
      direccion: latestTask.direccion,
      fechaEjecucion: latestTask.fechaEjecucion,
      franja_horaria: latestTask.franja_horaria || '',
      administradorConsorcio: latestTask.administradorConsorcio?._id || '',
      estado: latestTask.estado || '',
      tecnicos: tecnicosIds
    });
  };

  // Función para asignar técnico
  const handleAssignTechnician = (task: TareaConsorcio) => {
    setTaskToAssign(task);
    setSelectedTechnicians((task as any).tecnicos?.map((t: any) => t._id) || []);
    setShowAssignModal(true);
  };

  // Función para ver tarea
  const handleViewTask = (task: TareaConsorcio) => {
    setViewingTask(task);
  };

  // Funciones para manejar el submodal de técnicos
  const handleOpenEditTecnicos = () => {
    if (editingTask) {
      // Cargar los técnicos actuales de la tarea, no del formData
      const currentTecnicos = editingTask.tecnicos ? editingTask.tecnicos.map(t => t._id) : [];
      setEditTecnicosSelected(currentTecnicos);
      setShowEditTecnicosModal(true);
    }
  };

  const handleCloseEditTecnicos = () => {
    setShowEditTecnicosModal(false);
    setEditTecnicosSelected([]);
  };

  const handleConfirmEditTecnicos = async () => {
    if (!editingTask) return;

    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`/api/tareas-consorcio/${editingTask._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          tecnicos: editTecnicosSelected
        })
      });

      if (!response.ok) {
        throw new Error('Error al actualizar los técnicos');
      }

      const updatedTask = await response.json();
      setTasks(tasks.map(task => task._id === updatedTask._id ? updatedTask : task));
      
      // Actualizar el formData y editingTask con los nuevos técnicos
      setFormData({ ...formData, tecnicos: editTecnicosSelected });
      setEditingTask({ ...editingTask, tecnicos: editTecnicosSelected.map(id => ({ _id: id, nombre: tecnicoUsers.find(t => t._id === id)?.nombre || '' })) });

      showSuccess('Técnicos actualizados correctamente');
      handleCloseEditTecnicos();
    } catch (error) {
      console.error('Error:', error);
      showError('Error al actualizar los técnicos');
    }
  };

  // Función para eliminar tarea
  const handleDeleteTask = (task: TareaConsorcio) => {
    setTaskToDelete(task);
    setShowDeleteModal(true);
  };

  // Confirmar eliminación
  const confirmDeleteTask = async () => {
    if (!taskToDelete) return;

    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`/api/tareas-consorcio/${taskToDelete._id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Error al eliminar la tarea');
      }

      setTasks(tasks.filter(task => task._id !== taskToDelete._id));
      setShowDeleteModal(false);
      setTaskToDelete(null);
    } catch (error) {
      console.error('Error:', error);
      showError('Error al eliminar la tarea');
    }
  };

  // Confirmar asignación de técnicos
  const confirmAssignTechnicians = async () => {
    if (!taskToAssign) return;

    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`/api/tareas-consorcio/${taskToAssign._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          tecnicos: selectedTechnicians,
          estado: selectedTechnicians.length > 0 ? 'en_progreso' : taskToAssign.estado
        })
      });

      if (!response.ok) {
        throw new Error('Error al asignar técnicos');
      }

      const result = await response.json();
      const updatedTask = result.tarea; // Extraer la tarea del objeto response
      
      // Actualizar la tarea en el estado local manteniendo todos los datos
      setTasks(tasks.map(task => {
        if (task._id === updatedTask._id) {
          return { ...task, ...updatedTask };
        }
        return task;
      }));
      
      // Mostrar toast de éxito
      showSuccess(`Técnicos asignados correctamente: ${selectedTechnicians.length} técnico(s)`);
      
      // Cerrar modal y limpiar estado
      setShowAssignModal(false);
      setTaskToAssign(null);
      setSelectedTechnicians([]);
      
    } catch (error) {
      console.error('Error:', error);
      showError('Error al asignar técnicos');
    }
  };

  const handleUpdateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTask) return;
    
    try {
      // Preparar los datos a actualizar
      const updateData: any = {
        ...formData,
        precio: parseFloat(formData.precio) || 0
      };
      
      // Solo incluir el estado si se seleccionó uno diferente a vacío
      if (formData.estado && formData.estado !== '') {
        updateData.estado = formData.estado;
      }
      
      // Incluir siempre los técnicos (pueden ser modificados)
      updateData.tecnicos = formData.tecnicos;
      
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`/api/tareas-consorcio/${editingTask._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(updateData)
      });

      if (!response.ok) {
        throw new Error('Error al actualizar la tarea');
      }

      const responseData = await response.json();
      
      // La respuesta puede venir como { tarea: updatedTask } o directamente updatedTask
      const tareaActualizada = responseData.tarea || responseData;
      
      // Actualizar el estado local con la tarea actualizada
      setTasks(prevTasks => prevTasks.map(task => task._id === tareaActualizada._id ? tareaActualizada : task));
      
      // También actualizar viewingTask si está viendo esta tarea
      if (viewingTask && viewingTask._id === tareaActualizada._id) {
        setViewingTask(tareaActualizada);
      }
      
      // Subir fotos si hay seleccionadas
      if (selectedPhotos.length > 0) {
        await uploadPhotos(tareaActualizada._id);
      }
      
      setEditingTask(null);
      resetForm();
      
      showSuccess('Tarea actualizada exitosamente');
      
    } catch (error) {
      console.error('Error:', error);
      showError('Error al actualizar la tarea de consorcio');
    }
  };

  // Obtener usuarios con rol adminConsorcio para el selector
  const adminConsorcioUsers = users.filter(u => u.rol === 'adminConsorcio');
  
  
  // Obtener técnicos disponibles para el selector
  const tecnicoUsers = users.filter(u => u.rol === 'usuario');

  // Cargar tareas
  const fetchTasks = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: tasksPerPage.toString(),
        ...(estadoFilter && { estado: estadoFilter }),
        ...(adminConsorcioFilter && { administradorConsorcio: adminConsorcioFilter }),
        ...(searchTerm && { search: searchTerm })
      });

      const response = await fetch(`/api/tareas-consorcio?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        }
      });

      if (!response.ok) {
        // Si no hay tareas o hay error, simplemente mostrar array vacío
        setTasks([]);
        setTotalTasks(0);
        return;
      }

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        // La respuesta no es JSON, probablemente HTML de error
        setTasks([]);
        setTotalTasks(0);
        return;
      }

      const data = await response.json();
      setTasks(data.tareas || []);
      setTotalTasks(data.pagination?.totalItems || 0);
    } catch (error) {
      console.error('Error:', error);
      showError('Error al cargar las tareas de consorcio');
      // En caso de error, mostrar tareas vacías
      setTasks([]);
      setTotalTasks(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
    // Cargar usuarios para poder mostrar nombres de técnicos
    if (user?.rol === 'admin' || user?.rol === 'adminConsorcio') {
      dispatch(fetchUsers());
    }
  }, [currentPage, estadoFilter, adminConsorcioFilter, searchTerm, dispatch, user?.rol]);

  // Estados y colores
  const estadoColors: Record<string, string> = {
    presupuesto: 'bg-gray-100 text-gray-800',
    confirmado: 'bg-blue-100 text-blue-800',
    pendiente: 'bg-yellow-100 text-yellow-800',
    en_progreso: 'bg-orange-100 text-orange-800',
    completada: 'bg-green-100 text-green-800',
    cancelada: 'bg-red-100 text-red-800',
    PENDIENTE_PAGO: 'bg-purple-100 text-purple-800',
    FACTURADO: 'bg-indigo-100 text-indigo-800',
    PAGADO: 'bg-emerald-100 text-emerald-800'
  };

  const estadoLabels: Record<string, string> = {
    presupuesto: 'Presupuesto',
    confirmado: 'Confirmado',
    pendiente: 'Pendiente',
    en_progreso: 'En Progreso',
    completada: 'Completada',
    cancelada: 'Cancelada',
    PENDIENTE_PAGO: 'Pendiente de Pago',
    FACTURADO: 'Facturado',
    PAGADO: 'Pagado'
  };

  // Verificar permisos
  if (!user || !['admin', 'adminConsorcio'].includes(user.rol)) {
    return (
      <div className="p-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border-t-4 border-red-500 p-6">
          <div className="flex items-center gap-4">
            <div className="bg-red-100 dark:bg-red-900/30 p-3 rounded-full">
              <User className="h-6 w-6 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-red-600 dark:text-red-400">Acceso denegado</h2>
              <p className="text-gray-600 dark:text-gray-300">No tienes permisos para acceder a esta sección.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4">
      {/* Header Card */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <Plus className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Tareas de Consorcio</h1>
              <p className="text-gray-600 dark:text-gray-300">Gestiona las tareas de consorcio del sistema</p>
            </div>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Nueva Tarea
          </button>
        </div>
      </div>

      {/* Filters Card */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
        <div className="flex flex-wrap gap-4 mb-4">
          <div className="flex-1 min-w-48">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Estado
            </label>
            <select
              value={estadoFilter}
              onChange={(e) => setEstadoFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
            >
              <option value="">Todos los estados</option>
              {Object.entries(estadoLabels).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>

          {user?.rol === 'admin' && (
            <div className="flex-1 min-w-48">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Administrador de Consorcio
              </label>
              <select
                value={adminConsorcioFilter}
                onChange={(e) => setAdminConsorcioFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              >
                <option value="">Todos</option>
                {adminConsorcioUsers.map(admin => (
                  <option key={admin._id} value={admin._id}>{admin.nombre}</option>
                ))}
              </select>
            </div>
          )}

          <div className="flex-1 min-w-48">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Buscar
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por número, título o cliente..."
                className="w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Lista de Tareas */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto text-blue-600" />
            <p className="mt-2 text-gray-600 dark:text-gray-300">Cargando tareas...</p>
          </div>
        ) : tasks.length === 0 ? (
          <div className="p-8 text-center">
            <FileText className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600 dark:text-gray-300">No se encontraron tareas de consorcio</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Título</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Cliente</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Precio</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Estado</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Fotos</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Comprobante</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {tasks.map((task, index) => (
                  <tr key={task._id || `task-${index}`} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900 dark:text-white">{task.titulo}</div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                      {task.cliente || 'Sin cliente'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-green-600" />
                        <span className="font-medium">${task.precio?.toFixed(2) || '0.00'}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${estadoColors[task.estado] || 'bg-gray-100 text-gray-800'}`}>
                        {estadoLabels[task.estado] || task.estado}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Image className="h-4 w-4 text-gray-400" />
                        <span className="text-sm">{task.fotos?.length || 0}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {task.comprobantePago && task.comprobantePago.filename ? (
                        <div className="flex items-center gap-2">
                          <CreditCard className="h-4 w-4 text-gray-400" />
                          <span className="text-sm">Sí</span>
                        </div>
                      ) : (
                        <span className="text-gray-400 text-sm">No</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleViewTask(task)}
                          className="inline-flex items-center px-3 py-1 text-xs font-medium text-blue-700 bg-blue-100 border border-blue-300 rounded-md hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-600 dark:hover:bg-blue-900/50"
                        >
                          <Eye className="h-3 w-3 mr-1" />
                          Ver
                        </button>
                        <button
                          onClick={() => handleEditTask(task)}
                          className="inline-flex items-center px-3 py-1 text-xs font-medium text-green-700 bg-green-100 border border-green-300 rounded-md hover:bg-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-600 dark:hover:bg-green-900/50"
                        >
                          <Edit className="h-3 w-3 mr-1" />
                          Editar
                        </button>
                        {(task.estado === 'pendiente' || task.estado === 'confirmado') && (
                          <button
                            onClick={() => handleAssignTechnician(task)}
                            disabled={users.filter(user => user.rol === 'usuario').length === 0}
                            className={`inline-flex items-center px-3 py-1 text-xs font-medium rounded-md ${
                              users.filter(user => user.rol === 'usuario').length === 0
                                ? 'text-gray-400 bg-gray-100 border border-gray-300 cursor-not-allowed dark:bg-gray-700 dark:border-gray-600'
                                : 'text-purple-700 bg-purple-100 border border-purple-300 hover:bg-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-600 dark:hover:bg-purple-900/50'
                            }`}
                          >
                            <Users className="h-3 w-3 mr-1" />
                            Asignar
                          </button>
                        )}
                        {user?.rol === 'admin' && !['completada', 'PENDIENTE_PAGO', 'FACTURADO', 'PAGADO'].includes(task.estado) && (
                          <button
                            onClick={() => handleDeleteTask(task)}
                            className="inline-flex items-center px-3 py-1 text-xs font-medium text-red-700 bg-red-100 border border-red-300 rounded-md hover:bg-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-600 dark:hover:bg-red-900/50"
                          >
                            <Trash2 className="h-3 w-3 mr-1" />
                            Eliminar
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Paginación */}
      {totalTasks > tasksPerPage && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 mt-4">
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-700 dark:text-gray-300">
              Mostrando {((currentPage - 1) * tasksPerPage) + 1} a {Math.min(currentPage * tasksPerPage, totalTasks)} de {totalTasks} tareas
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 bg-gray-200 dark:bg-gray-700 rounded disabled:opacity-50"
              >
                Anterior
              </button>
              <span className="px-3 py-1">
                Página {currentPage} de {Math.ceil(totalTasks / tasksPerPage)}
              </span>
              <button
                onClick={() => setCurrentPage(prev => Math.min(Math.ceil(totalTasks / tasksPerPage), prev + 1))}
                disabled={currentPage >= Math.ceil(totalTasks / tasksPerPage)}
                className="px-3 py-1 bg-gray-200 dark:bg-gray-700 rounded disabled:opacity-50"
              >
                Siguiente
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Creación de Tarea */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6 bg-gradient-to-r from-blue-500 to-purple-600 p-4 -mx-6 -mt-6 rounded-t-xl">
                <div className="flex items-center space-x-3">
                  <div className="p-2 rounded-full bg-white/20 backdrop-blur-sm">
                    <Plus className="h-5 w-5 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-white">
                    Nueva Tarea de Consorcio
                  </h3>
                </div>
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    resetForm();
                  }}
                  className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 transition-colors"
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <form onSubmit={handleCreateTask} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Título *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.titulo}
                      onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
                      className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                      placeholder="Título de la tarea"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Precio *
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <DollarSign className="h-4 w-4 text-gray-400" />
                      </div>
                      <input
                        type="number"
                        step="0.01"
                        required
                        value={formData.precio}
                        onChange={(e) => setFormData({ ...formData, precio: e.target.value })}
                        className="block w-full pl-8 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Descripción *
                  </label>
                  <textarea
                    required
                    value={formData.descripcion}
                    onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                    rows={3}
                    className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                    placeholder="Descripción detallada de la tarea"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Cliente *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.cliente}
                      onChange={(e) => setFormData({ ...formData, cliente: e.target.value })}
                      className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                      placeholder="Nombre del cliente"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Dirección *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.direccion}
                      onChange={(e) => setFormData({ ...formData, direccion: e.target.value })}
                      className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                      placeholder="Dirección del cliente"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Fecha de Ejecución *
                    </label>
                    <input
                      type="date"
                      required
                      value={formData.fechaEjecucion}
                      onChange={(e) => setFormData({ ...formData, fechaEjecucion: e.target.value })}
                      className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Franja Horaria
                    </label>
                    <select
                      value={formData.franja_horaria}
                      onChange={(e) => setFormData({ ...formData, franja_horaria: e.target.value })}
                      className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                    >
                      <option value="">Seleccionar franja</option>
                      <option value="09-12">09:00 - 12:00</option>
                      <option value="12-15">12:00 - 15:00</option>
                      <option value="15-18">15:00 - 18:00</option>
                    </select>
                  </div>
                </div>

                {user?.rol === 'admin' && (
                  <div className="space-y-1">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Administrador de Consorcio
                    </label>
                    <select
                      value={formData.administradorConsorcio}
                      onChange={(e) => setFormData({ ...formData, administradorConsorcio: e.target.value })}
                      className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                    >
                      <option value="">Sin asignar</option>
                      {adminConsorcioUsers.map(admin => (
                        <option key={admin._id} value={admin._id}>{admin.nombre}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Sección de Archivos */}
                <div className="space-y-4">
                  <div className="border-t pt-4">
                    <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Archivos Adjuntos</h4>
                    
                    {/* Fotos */}
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Fotos de la Tarea (opcional, máximo 4)
                      </label>
                      <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-4">
                        <input
                          type="file"
                          multiple
                          accept="image/*"
                          onChange={handlePhotoSelect}
                          className="hidden"
                          id="photo-upload"
                        />
                        <label
                          htmlFor="photo-upload"
                          className="cursor-pointer flex flex-col items-center justify-center text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                        >
                          <Image className="h-8 w-8 mb-2" />
                          <span className="text-sm">Hacer clic para seleccionar fotos</span>
                          <span className="text-xs">O arrastrar y soltar</span>
                        </label>
                      </div>
                      
                      {/* Vista previa de fotos seleccionadas */}
                      {selectedPhotos.length > 0 && (
                        <div className="grid grid-cols-3 gap-2 mt-2">
                          {selectedPhotos.map((photo, index) => (
                            <div key={index} className="relative group">
                              <LazyImage
                                src={URL.createObjectURL(photo)}
                                alt={`Foto ${index + 1}`}
                                className="w-full h-20 object-cover rounded-lg border"
                              />
                              <button
                                type="button"
                                onClick={() => removePhoto(index)}
                                className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Comprobante de Pago - Eliminado del modal de creación */}
                    {/* El comprobante solo se puede subir después de finalizar la tarea */}
                  </div>
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateModal(false);
                      resetForm();
                    }}
                    className="px-4 py-2.5 text-sm font-medium text-gray-800 dark:text-gray-200 bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-500 hover:bg-gray-50 dark:hover:bg-gray-500 rounded-lg transition-colors shadow-sm"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={uploading}
                    className="px-4 py-2.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {uploading ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        Creando Tarea...
                      </>
                    ) : (
                      <>
                        <Plus className="h-4 w-4" />
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

      {/* Modal de Edición de Tarea */}
      {editingTask && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto scroll-smooth">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6 bg-gradient-to-r from-orange-500 to-amber-600 p-4 -mx-6 -mt-6 rounded-t-xl">
                <div className="flex items-center space-x-3">
                  <div className="p-2 rounded-full bg-white/20 backdrop-blur-sm">
                    <Edit className="h-5 w-5 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-white">
                    Editar Tarea de Consorcio
                  </h3>
                </div>
                <button
                  onClick={() => {
                    setEditingTask(null);
                    resetForm();
                  }}
                  className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 transition-colors"
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <form onSubmit={handleUpdateTask} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Título *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.titulo}
                      onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
                      className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                      placeholder="Título de la tarea"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Precio *
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <DollarSign className="h-4 w-4 text-gray-400" />
                      </div>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        required
                        value={formData.precio}
                        onChange={(e) => setFormData({ ...formData, precio: e.target.value })}
                        className="block w-full pl-8 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Descripción *
                  </label>
                  <textarea
                    required
                    value={formData.descripcion}
                    onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                    rows={3}
                    className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                    placeholder="Descripción detallada de la tarea"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Cliente *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.cliente}
                      onChange={(e) => setFormData({ ...formData, cliente: e.target.value })}
                      className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                      placeholder="Nombre del cliente"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Dirección *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.direccion}
                      onChange={(e) => setFormData({ ...formData, direccion: e.target.value })}
                      className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                      placeholder="Dirección del cliente"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Fecha de Ejecución *
                    </label>
                    <input
                      type="date"
                      required
                      value={formData.fechaEjecucion}
                      onChange={(e) => setFormData({ ...formData, fechaEjecucion: e.target.value })}
                      className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Franja Horaria
                    </label>
                    <select
                      value={formData.franja_horaria}
                      onChange={(e) => setFormData({ ...formData, franja_horaria: e.target.value })}
                      className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                    >
                      <option value="">Seleccionar franja</option>
                      <option value="09-12">09:00 - 12:00</option>
                      <option value="12-15">12:00 - 15:00</option>
                      <option value="15-18">15:00 - 18:00</option>
                    </select>
                  </div>
                </div>

                {user?.rol === 'admin' && (
                  <div className="space-y-1">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Administrador de Consorcio
                    </label>
                    <div className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-gray-300">
                      {editingTask?.administradorConsorcio?.nombre || 'No asignado'}
                    </div>
                    <p className="text-xs text-gray-500">El administrador de consorcio no puede ser modificado.</p>
                  </div>
                )}

                {user?.rol === 'admin' && (
                  <div className="space-y-1">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Estado de la Tarea
                    </label>
                    <select
                      value={formData.estado}
                      onChange={(e) => setFormData({ ...formData, estado: e.target.value })}
                      className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                    >
                      <option value={editingTask?.estado || ''}>
                        {editingTask?.estado === 'presupuesto' ? 'Presupuesto' :
                         editingTask?.estado === 'confirmado' ? 'Confirmado' :
                         editingTask?.estado === 'pendiente' ? 'Pendiente' :
                         editingTask?.estado === 'en_progreso' ? 'En Progreso' :
                         editingTask?.estado === 'completada' ? 'Completada' :
                         editingTask?.estado === 'cancelada' ? 'Cancelada' :
                         editingTask?.estado === 'PENDIENTE_PAGO' ? 'Pendiente de Pago' :
                         editingTask?.estado === 'FACTURADO' ? 'Facturado' :
                         editingTask?.estado === 'PAGADO' ? 'Pagado' :
                         'Sin cambios'}
                      </option>
                      
                      {/* Estados disponibles para Admin */}
                      <option value="en_progreso">En Progreso</option>
                      <option value="completada">Completada</option>
                      
                      {/* Estados financieros */}
                      <option value="PENDIENTE_PAGO">Pendiente de Pago</option>
                      
                      {/* Estado final solo si está facturado */}
                      {editingTask?.estado === 'FACTURADO' && (
                        <option value="PAGADO">Pagado</option>
                      )}
                      
                      {/* Cancelación solo si no está en estado final */}
                      {!['completada', 'PENDIENTE_PAGO', 'FACTURADO', 'PAGADO'].includes(editingTask?.estado || '') && (
                        <option value="cancelada">Cancelada</option>
                      )}
                    </select>
                  </div>
                )}

                {/* Sección de Técnicos */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Técnicos Asignados
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      readOnly
                      value={(() => {
                        if (editingTask?.tecnicos && editingTask.tecnicos.length > 0) {
                          const nombres = editingTask.tecnicos.map((t: any) => {
                            return t.nombre || '';
                          }).filter((n: string) => n);
                          return nombres.join(', ');
                        }
                        return 'No hay técnicos asignados';
                      })()}
                      placeholder="No hay técnicos asignados"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <button
                      type="button"
                      onClick={handleOpenEditTecnicos}
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 px-3 py-1 text-xs font-medium text-blue-700 bg-blue-100 border border-blue-300 rounded hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-600 dark:hover:bg-blue-900/50"
                    >
                      Cambiar
                    </button>
                  </div>
                  <p className="text-xs text-gray-500">Haz clic en "Cambiar" para modificar los técnicos asignados.</p>
                </div>

                {/* Sección de Archivos */}
                <div className="space-y-4">
                  <div className="border-t pt-4">
                    <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Archivos Adjuntos</h4>
                    
                    {/* Fotos */}
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Fotos de la Tarea
                      </label>
                      
                      {/* Mostrar fotos existentes */}
                      {editingTask.fotos && editingTask.fotos.length > 0 && (
                        <div className="mb-4">
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                            Fotos actuales ({editingTask.fotos.length})
                          </p>
                          <div className="grid grid-cols-3 gap-2">
                            {editingTask.fotos.map((foto: any, index: number) => (
                              <div key={index} className="relative group">
                                <LazyImage
                                  src={`/uploads/consorcio/fotos/${foto.filename}`}
                                  alt={`Foto ${index + 1}`}
                                  className="w-full h-20 object-cover rounded-lg border cursor-pointer hover:opacity-90"
                                  onClick={() => window.open(`/uploads/consorcio/fotos/${foto.filename}`, '_blank')}
                                />
                                <button
                                  type="button"
                                  onClick={() => handleDeleteExistingPhoto(editingTask._id, foto.filename)}
                                  className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                  title="Eliminar foto"
                                >
                                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                  </svg>
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      <div
                        className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-4 text-center hover:border-gray-400 dark:hover:border-gray-500 transition-colors cursor-pointer"
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={handlePhotoDrop}
                        onClick={() => document.getElementById('photo-upload-edit')?.click()}
                      >
                        <input
                          id="photo-upload-edit"
                          type="file"
                          multiple
                          accept="image/*"
                          className="hidden"
                          onChange={handlePhotoSelect}
                        />
                        <label
                          htmlFor="photo-upload-edit"
                          className="cursor-pointer flex flex-col items-center justify-center text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                        >
                          <Image className="h-8 w-8 mb-2" />
                          <span className="text-sm">Hacer clic para seleccionar fotos</span>
                          <span className="text-xs">O arrastrar y soltar</span>
                        </label>
                      </div>
                      
                      {/* Vista previa de fotos seleccionadas */}
                      {selectedPhotos.length > 0 && (
                        <div className="grid grid-cols-3 gap-2 mt-2">
                          {selectedPhotos.map((photo, index) => (
                            <div key={index} className="relative group">
                              <LazyImage
                                src={URL.createObjectURL(photo)}
                                alt={`Foto ${index + 1}`}
                                className="w-full h-20 object-cover rounded-lg border"
                              />
                              <button
                                type="button"
                                onClick={() => removePhoto(index)}
                                className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                      
                      {/* Mostrar límite disponible */}
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                        Límite disponible: {4 - (editingTask.fotos?.length || 0) - selectedPhotos.length} de 4 fotos
                      </p>
                    </div>

                    {/* Comprobante de Pago - Eliminado del modal de edición */}
                    {/* El comprobante solo se puede subir después de finalizar la tarea */}
                  </div>
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingTask(null);
                      resetForm();
                    }}
                    className="px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 rounded-lg transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={uploading}
                    className="px-4 py-2.5 text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {uploading ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        Actualizando Tarea...
                      </>
                    ) : (
                      <>
                        <Edit className="h-4 w-4" />
                        Actualizar Tarea
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Visualización de Tarea */}
      {viewingTask && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto scroll-smooth">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6 bg-gradient-to-r from-blue-500 to-indigo-600 p-4 -mx-6 -mt-6 rounded-t-xl">
                <div className="flex items-center space-x-3">
                  <div className="p-2 rounded-full bg-white/20 backdrop-blur-sm">
                    <Eye className="h-5 w-5 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-white">
                    Detalles de Tarea de Consorcio
                  </h3>
                </div>
                <button
                  onClick={() => setViewingTask(null)}
                  className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 transition-colors"
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Número</label>
                    <p className="mt-1 text-sm text-gray-900 dark:text-white">{viewingTask.numero}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Estado</label>
                    <span className={`inline-block mt-1 px-2 py-1 text-xs font-medium rounded-full ${
                      viewingTask.estado === 'presupuesto' ? 'bg-yellow-100 text-yellow-800' :
                      viewingTask.estado === 'confirmado' ? 'bg-blue-100 text-blue-800' :
                      viewingTask.estado === 'pendiente' ? 'bg-orange-100 text-orange-800' :
                      viewingTask.estado === 'en_progreso' ? 'bg-purple-100 text-purple-800' :
                      viewingTask.estado === 'completada' ? 'bg-green-100 text-green-800' :
                      viewingTask.estado === 'cancelada' ? 'bg-red-100 text-red-800' :
                      viewingTask.estado === 'PENDIENTE_PAGO' ? 'bg-indigo-100 text-indigo-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {viewingTask.estado === 'presupuesto' ? 'Presupuesto' :
                       viewingTask.estado === 'confirmado' ? 'Confirmado' :
                       viewingTask.estado === 'pendiente' ? 'Pendiente' :
                       viewingTask.estado === 'en_progreso' ? 'En Progreso' :
                       viewingTask.estado === 'completada' ? 'Completada' :
                       viewingTask.estado === 'cancelada' ? 'Cancelada' :
                       viewingTask.estado === 'PENDIENTE_PAGO' ? 'Pendiente de Pago' :
                       viewingTask.estado === 'FACTURADO' ? 'Facturado' :
                       viewingTask.estado === 'PAGADO' ? 'Pagado' :
                       viewingTask.estado}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Título</label>
                  <p className="mt-1 text-sm text-gray-900 dark:text-white">{viewingTask.titulo}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Descripción</label>
                  <p className="mt-1 text-sm text-gray-900 dark:text-white">{viewingTask.descripcion || 'Sin descripción'}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Precio</label>
                    <p className="mt-1 text-sm text-gray-900 dark:text-white">${viewingTask.precio.toFixed(2)}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Fecha de Ejecución</label>
                    <p className="mt-1 text-sm text-gray-900 dark:text-white">{viewingTask.fechaEjecucion}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Cliente</label>
                    <p className="mt-1 text-sm text-gray-900 dark:text-white">{viewingTask.cliente}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Dirección</label>
                    <p className="mt-1 text-sm text-gray-900 dark:text-white">{viewingTask.direccion}</p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Franja Horaria</label>
                  <p className="mt-1 text-sm text-gray-900 dark:text-white">{viewingTask.franja_horaria || 'No especificada'}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Administrador de Consorcio</label>
                  <p className="mt-1 text-sm text-gray-900 dark:text-white">
                    {viewingTask.administradorConsorcio?.nombre || 'No asignado'}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Técnicos Asignados</label>
                  <div className="mt-1">
                    {viewingTask.tecnicos && viewingTask.tecnicos.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {viewingTask.tecnicos.map((tecnico: any) => (
                          <span key={tecnico._id} className="inline-flex items-center px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                            <Users className="h-3 w-3 mr-1" />
                            {tecnico.nombre}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500 dark:text-gray-400">No hay técnicos asignados</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Fotos</label>
                    <div className="mt-1">
                      {viewingTask.fotos && viewingTask.fotos.length > 0 ? (
                        <div className="grid grid-cols-3 gap-2">
                          {viewingTask.fotos.map((foto: any, index: number) => (
                            <div key={index}>
                              <LazyImage
                                src={`/uploads/consorcio/fotos/${foto.filename}`}
                                alt={`Foto ${index + 1}`}
                                className="w-full h-32 object-cover rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                                onClick={() => window.open(`/uploads/consorcio/fotos/${foto.filename}`, '_blank')}
                                onError={() => console.error('Error al cargar imagen:', foto.filename)}
                              />
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500">No hay fotos</p>
                      )}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Comprobante de Pago</label>
                    <div className="mt-1">
                      {viewingTask.comprobantePago && viewingTask.comprobantePago.filename ? (
                        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                          <div className="flex flex-col space-y-3">
                            <div className="flex items-center justify-between">
                              <div className="text-sm text-gray-600 dark:text-gray-300">
                                <span className="font-medium">Archivo:</span> {viewingTask.comprobantePago.originalName || 'comprobante.pdf'}
                              </div>
                              <div className="text-xs text-gray-500 dark:text-gray-400">
                                {viewingTask.comprobantePago.uploadDate ? 
                                  new Date(viewingTask.comprobantePago.uploadDate).toLocaleDateString() : 
                                  'Fecha no disponible'
                                }
                              </div>
                            </div>
                            <button
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  
                                  // Usar el path correcto del comprobante
                                  const comprobantePath = viewingTask.comprobantePago?.path;
                                  if (comprobantePath) {
                                    // Convertir backslashes a forward slashes y codificar
                                    const cleanPath = comprobantePath.replace(/\\/g, '/');
                                    const url = `/${cleanPath}`;
                                    
                                    // Abre el comprobante en una nueva pestaña
                                    window.open(url, '_blank');
                                  }
                                }}
                                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center"
                              >
                                <FileText className="h-4 w-4 mr-2" />
                                Ver Comprobante
                              </button>
                              <div className="text-xs text-gray-500 dark:text-gray-400">
                                {viewingTask.comprobantePago.mimetype?.startsWith('image/') ? 
                                  'Imagen' : 
                                  viewingTask.comprobantePago.mimetype === 'application/pdf' ? 
                                  'PDF' : 
                                  'Documento'
                                }
                              </div>
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500">No hay comprobante</p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <div className="flex justify-end">
                    <button
                      onClick={() => setViewingTask(null)}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Cerrar
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmación de Eliminación */}
      {showDeleteModal && taskToDelete && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">Confirmar Eliminación</h3>
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setTaskToDelete(null);
                }}
                className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            
            <div className="mb-6">
              <p className="text-gray-600 dark:text-gray-300 mb-2">
                ¿Estás seguro de que deseas eliminar esta tarea de consorcio?
              </p>
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                <p className="font-medium text-gray-900 dark:text-white">{taskToDelete.titulo}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Cliente: {taskToDelete.cliente}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Precio: ${taskToDelete.precio}</p>
              </div>
              <p className="text-red-600 text-sm mt-3 font-medium">
                Esta acción no se puede deshacer.
              </p>
            </div>
            
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setTaskToDelete(null);
                }}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-600"
              >
                Cancelar
              </button>
              <button
                onClick={confirmDeleteTask}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Eliminar Tarea
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Asignación de Técnicos */}
      {showAssignModal && taskToAssign && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">Asignar Técnicos</h3>
              <button
                onClick={() => {
                  setShowAssignModal(false);
                  setTaskToAssign(null);
                  setSelectedTechnicians([]);
                }}
                className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            
            <div className="mb-6">
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 mb-4">
                <p className="font-medium text-gray-900 dark:text-white">{taskToAssign.titulo}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Cliente: {taskToAssign.cliente}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Estado: {taskToAssign.estado}</p>
              </div>
              
              <div className="space-y-3">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Seleccionar Técnicos
                </label>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {users
                    .filter(user => user.rol === 'usuario')
                    .map(technician => (
                      <label
                        key={technician._id}
                        className="flex items-center p-3 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={selectedTechnicians.includes(technician._id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedTechnicians([...selectedTechnicians, technician._id]);
                            } else {
                              setSelectedTechnicians(selectedTechnicians.filter(id => id !== technician._id));
                            }
                          }}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <div className="ml-3">
                          <p className="font-medium text-gray-900 dark:text-white">
                            {technician.nombre} {technician.apellido}
                          </p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {technician.email}
                          </p>
                        </div>
                      </label>
                    ))}
                </div>
              </div>
            </div>
            
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowAssignModal(false);
                  setTaskToAssign(null);
                  setSelectedTechnicians([]);
                }}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-600"
              >
                Cancelar
              </button>
              <button
                onClick={confirmAssignTechnicians}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Asignar Técnicos
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Submodal para Cambiar Técnicos */}
      {showEditTecnicosModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6 bg-gradient-to-r from-blue-500 to-indigo-600 p-4 -mx-6 -mt-6 rounded-t-xl">
                <div className="flex items-center space-x-3">
                  <div className="p-2 rounded-full bg-white/20 backdrop-blur-sm">
                    <Users className="h-5 w-5 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-white">
                    Cambiar Técnicos Asignados
                  </h3>
                </div>
                <button
                  onClick={handleCloseEditTecnicos}
                  className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 transition-colors"
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Seleccionar Técnicos
                  </label>
                  <div className="border border-gray-300 dark:border-gray-600 rounded-lg p-3 max-h-64 overflow-y-auto">
                    {tecnicoUsers.length > 0 ? (
                      tecnicoUsers.map(tecnico => (
                        <label key={tecnico._id} className="flex items-center p-3 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={editTecnicosSelected.includes(tecnico._id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setEditTecnicosSelected([...editTecnicosSelected, tecnico._id]);
                              } else {
                                setEditTecnicosSelected(editTecnicosSelected.filter(id => id !== tecnico._id));
                              }
                            }}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                          <div className="ml-3">
                            <p className="font-medium text-gray-900 dark:text-white">
                              {tecnico.nombre}
                            </p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              {tecnico.email}
                            </p>
                          </div>
                        </label>
                      ))
                    ) : (
                      <p className="text-sm text-gray-500">No hay técnicos disponibles</p>
                    )}
                  </div>
                </div>

                {editTecnicosSelected.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Técnicos Seleccionados ({editTecnicosSelected.length})
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {editTecnicosSelected.map(tecnicoId => {
                        const tecnico = tecnicoUsers.find(t => t._id === tecnicoId);
                        return tecnico ? (
                          <span key={tecnicoId} className="inline-flex items-center px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                            <Users className="h-3 w-3 mr-1" />
                            {tecnico.nombre}
                          </span>
                        ) : null;
                      })}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={handleCloseEditTecnicos}
                  className="px-4 py-2 text-gray-700 bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200 dark:bg-gray-600 dark:text-gray-300 dark:border-gray-500 dark:hover:bg-gray-500"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleConfirmEditTecnicos}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Guardar Cambios
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TareaConsorcioManagement;

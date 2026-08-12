import React, { useEffect, useState } from 'react';
import { useAppSelector } from '../../store';
import { 
  Building, 
  CheckCircle, 
  XCircle, 
  DollarSign,
  FileText,
  Plus,
  Search,
  Filter,
  RefreshCw,
  Eye,
  CreditCard
} from 'lucide-react';
import { preventEnterSubmit } from '../../utils/formGuards';

const AdminConsorcioTareasManagement: React.FC = () => {
  const { user } = useAppSelector((state) => state.auth);
  
  // Estados
  const [tareas, setTareas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [estadoFilter, setEstadoFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalTasks, setTotalTasks] = useState(0);
  const tasksPerPage = 10;

  // Estados para modales
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState<any>(null);
  
  // Estados para notificaciones toast
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Función para mostrar notificaciones toast
  const showToast = (message: string, type: 'success' | 'error' | 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Estados para modales de confirmación
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [taskToConfirm, setTaskToConfirm] = useState<any>(null);
  const [taskToReject, setTaskToReject] = useState<any>(null);
  
  // Estados para carga de comprobante
  const [showComprobanteModal, setShowComprobanteModal] = useState(false);
  const [taskForComprobante, setTaskForComprobante] = useState<any>(null);
  const [comprobanteFile, setComprobanteFile] = useState<File | null>(null);
  const [uploadingComprobante, setUploadingComprobante] = useState(false);

  // Estados para formulario
  const [formData, setFormData] = useState({
    titulo: '',
    descripcion: '',
    cliente: '',
    fechaEjecucion: '',
    direccion: '',
    franja_horaria: '',
    prioridad: 'media',
    fotos: []
  });

  // Definición de estados
  const estadoLabels: Record<string, string> = {
    'presupuesto': 'Presupuesto',
    'pendiente_confirmacion': 'Pendiente de Confirmación',
    'confirmada': 'Confirmada',
    'en_progreso': 'En Progreso',
    'finalizada': 'Finalizada',
    'cancelada': 'Cancelada',
    'pendiente_pago': 'Pendiente de Pago',
    'PENDIENTE_PAGO': 'Pendiente de Pago',
    'facturada': 'Facturada',
    'FACTURADO': 'Facturada',
    'pagada': 'Pagada',
    'PAGADO': 'Pagada'
  };

  const estadoColors: Record<string, string> = {
    'presupuesto': 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
    'pendiente_confirmacion': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
    'confirmada': 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
    'en_progreso': 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
    'finalizada': 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
    'cancelada': 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
    'pendiente_pago': 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
    'PENDIENTE_PAGO': 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
    'facturada': 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300',
    'FACTURADO': 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300',
    'pagada': 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
    'PAGADO': 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300'
  };

  useEffect(() => {
    fetchTasks();
  }, [currentPage, estadoFilter, searchTerm]);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('accessToken');
      
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: tasksPerPage.toString(),
        ...(estadoFilter && { estado: estadoFilter }),
        ...(searchTerm && { search: searchTerm })
      });

      const response = await fetch(`/api/tareas-consorcio?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        if (response.status === 401) {
          console.error('Error 401 - No autorizado');
          localStorage.removeItem('accessToken');
          window.location.href = '/login';
          return;
        }
        setTareas([]);
        setTotalTasks(0);
        return;
      }

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        setTareas([]);
        setTotalTasks(0);
        return;
      }

      const data = await response.json();
      setTareas(data.tareas || []);
      setTotalTasks(data.pagination?.totalItems || 0);
    } catch (error) {
      setTareas([]);
      setTotalTasks(0);
    } finally {
      setLoading(false);
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
          administradorConsorcio: user?._id
        })
      });

      if (!response.ok) {
        throw new Error('Error al crear la tarea');
      }

      const newTask = await response.json();
      setTareas([newTask, ...tareas]);
      
      setShowCreateModal(false);
      resetForm();
      
      // Refrescar los datos para asegurar consistencia
      await fetchTasks();
      
      showToast('Tarea creada exitosamente', 'success');
      
    } catch (error: any) {
      console.error('Error:', error);
      showToast(`Error al crear la tarea: ${error.message}`, 'error');
    }
  };

  const handleConfirmTask = async (taskId: string) => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`/api/tareas-consorcio/${taskId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ estado: 'pendiente' })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.message || `Error ${response.status}: ${response.statusText}`;
        throw new Error(errorMessage);
      }

      const updatedTask = await response.json();
      // Actualizar la tarea manteniendo todos los datos existentes
      setTareas(tareas.map(task => {
        if (task._id === taskId) {
          return { ...task, ...updatedTask, estado: updatedTask.estado || 'pendiente' };
        }
        return task;
      }));
      setShowConfirmModal(false);
      setTaskToConfirm(null);
      showToast('Tarea confirmada exitosamente', 'success');
    } catch (error: any) {
      console.error('Error:', error);
      showToast(`Error al confirmar la tarea: ${error.message}`, 'error');
    }
  };

  const handleRejectTask = async (taskId: string) => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`/api/tareas-consorcio/${taskId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ estado: 'cancelada' })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.message || `Error ${response.status}: ${response.statusText}`;
        throw new Error(errorMessage);
      }

      const updatedTask = await response.json();
      // Actualizar la tarea manteniendo todos los datos existentes
      setTareas(tareas.map(task => {
        if (task._id === taskId) {
          return { ...task, ...updatedTask, estado: updatedTask.estado || 'cancelada' };
        }
        return task;
      }));
      setShowRejectModal(false);
      setTaskToReject(null);
      showToast('Tarea rechazada exitosamente', 'success');
    } catch (error: any) {
      console.error('Error:', error);
      showToast(`Error al rechazar la tarea: ${error.message}`, 'error');
    }
  };

  const openConfirmModal = (task: any) => {
    setTaskToConfirm(task);
    setShowConfirmModal(true);
  };

  const openRejectModal = (task: any) => {
    setTaskToReject(task);
    setShowRejectModal(true);
  };

  // Funciones para manejo de comprobantes
  const openComprobanteModal = (task: any) => {
    setTaskForComprobante(task);
    setShowComprobanteModal(true);
    setComprobanteFile(null);
  };

  const handleComprobanteUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!comprobanteFile || !taskForComprobante) return;

    try {
      setUploadingComprobante(true);
      const token = localStorage.getItem('accessToken');
      
      // Crear FormData para subir el archivo
      const formData = new FormData();
      formData.append('comprobante', comprobanteFile);
      
      const response = await fetch(`/api/tareas-consorcio/${taskForComprobante._id}/comprobante`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (!response.ok) {
        throw new Error('Error al subir el comprobante');
      }

      const result = await response.json();
      
      // Actualizar la tarea en la lista
      setTareas(tareas.map((task: any) => 
        task._id === taskForComprobante._id 
          ? { ...task, comprobantePago: result.comprobantePago, estado: 'FACTURADO' }
          : task
      ));

      setShowComprobanteModal(false);
      setComprobanteFile(null);
      setTaskForComprobante(null);
      showToast('Comprobante subido exitosamente', 'success');
      
    } catch (error: any) {
      console.error('Error:', error);
      showToast(`Error al subir comprobante: ${error.message}`, 'error');
    } finally {
      setUploadingComprobante(false);
    }
  };

  const resetForm = () => {
    setFormData({
      titulo: '',
      descripcion: '',
      cliente: '',
      direccion: '',
      fechaEjecucion: '',
      franja_horaria: '',
      prioridad: 'media',
      fotos: []
    });
  };

  const totalPages = Math.ceil(totalTasks / tasksPerPage);

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
              <Building className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Gestión de Tareas de Consorcio
              </h1>
              <p className="text-gray-600 dark:text-gray-300">
                Administra las tareas asignadas a tu consorcio
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => fetchTasks()}
              className="inline-flex items-center px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Actualizar
            </button>
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
            >
              <Plus className="h-4 w-4 mr-2" />
              Nueva Tarea
            </button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar tareas..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Filter className="h-4 w-4 text-gray-400" />
            <select
              value={estadoFilter}
              onChange={(e) => setEstadoFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
            >
              <option value="">Todos los estados</option>
              {Object.entries(estadoLabels).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Tasks List */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden border border-gray-200 dark:border-gray-700">
        {tareas.length === 0 ? (
          <div className="p-8 text-center">
            <Building className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600 dark:text-gray-300">No se encontraron tareas de consorcio</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Título</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Cliente</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Precio</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Fecha</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Estado</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Comprobante</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {tareas.map((task: any, index: number) => (
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
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                      {task.fechaEjecucion || 'Sin fecha'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${estadoColors[task.estado] || 'bg-gray-100 text-gray-800'}`}>
                        {estadoLabels[task.estado] || task.estado}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <CreditCard className="h-4 w-4 text-gray-400" />
                        <span className="text-sm">{task.comprobantePago && task.comprobantePago.filename ? 'Sí' : 'No'}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => {
                            setSelectedTask(task);
                            setShowDetailsModal(true);
                          }}
                          className="inline-flex items-center px-3 py-1 text-xs font-medium text-blue-700 bg-blue-100 border border-blue-300 rounded-md hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-600 dark:hover:bg-blue-900/50"
                        >
                          <Eye className="h-3 w-3 mr-1" />
                          Ver
                        </button>
                        {task.estado === 'presupuesto' && task.precio !== undefined && task.precio !== null && task.precio > 0 && (
                          <>
                            <button
                              onClick={() => openConfirmModal(task)}
                              className="inline-flex items-center px-3 py-1 text-xs font-medium text-green-700 bg-green-100 border border-green-300 rounded-md hover:bg-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-600 dark:hover:bg-green-900/50"
                            >
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Aceptar
                            </button>
                            <button
                              onClick={() => openRejectModal(task)}
                              className="inline-flex items-center px-3 py-1 text-xs font-medium text-red-700 bg-red-100 border border-red-300 rounded-md hover:bg-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-600 dark:hover:bg-red-900/50"
                            >
                              <XCircle className="h-3 w-3 mr-1" />
                              Rechazar
                            </button>
                          </>
                        )}
                        {task.estado === 'PENDIENTE_PAGO' && (
                          <button
                            onClick={() => openComprobanteModal(task)}
                            className="inline-flex items-center px-3 py-1 text-xs font-medium text-indigo-700 bg-indigo-100 border border-indigo-300 rounded-md hover:bg-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-300 dark:border-indigo-600 dark:hover:bg-indigo-900/50"
                          >
                            <CreditCard className="h-3 w-3 mr-1" />
                            Cargar Comprobante
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

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between bg-white dark:bg-gray-800 px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-lg">
          <div className="text-sm text-gray-700 dark:text-gray-300">
            Mostrando {((currentPage - 1) * tasksPerPage) + 1} a {Math.min(currentPage * tasksPerPage, totalTasks)} de {totalTasks} tareas
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setCurrentPage(currentPage - 1)}
              disabled={currentPage === 1}
              className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md disabled:opacity-50 disabled:cursor-not-allowed dark:bg-gray-700 dark:text-white"
            >
              Anterior
            </button>
            <span className="px-3 py-1 text-sm dark:text-white">
              Página {currentPage} de {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md disabled:opacity-50 disabled:cursor-not-allowed dark:bg-gray-700 dark:text-white"
            >
              Siguiente
            </button>
          </div>
        </div>
      )}

      {/* Modal de Creación */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto scroll-smooth">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Crear Nueva Tarea de Consorcio
              </h2>
            </div>
            <form onSubmit={handleCreateTask} onKeyDown={preventEnterSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Título
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.titulo}
                    onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Cliente
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.cliente}
                    onChange={(e) => setFormData({ ...formData, cliente: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Fecha de Ejecución
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.fechaEjecucion}
                    onChange={(e) => setFormData({ ...formData, fechaEjecucion: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Descripción
                </label>
                <textarea
                  required
                  rows={3}
                  value={formData.descripcion}
                  onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Dirección
                </label>
                <input
                  type="text"
                  required
                  value={formData.direccion}
                  onChange={(e) => setFormData({ ...formData, direccion: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Franja Horaria
                </label>
                <select
                  required
                  value={formData.franja_horaria}
                  onChange={(e) => setFormData({ ...formData, franja_horaria: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                >
                  <option value="">Seleccionar franja</option>
                  <option value="09-12">09:00 - 12:00</option>
                  <option value="12-15">12:00 - 15:00</option>
                  <option value="15-18">15:00 - 18:00</option>
                </select>
              </div>
              
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    resetForm();
                  }}
                  className="px-6 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Creando...
                    </>
                  ) : (
                    'Crear Tarea'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Detalles */}
      {showDetailsModal && selectedTask && (
        <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto scroll-smooth">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Detalles de la Tarea
              </h2>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Número</label>
                  <p className="text-gray-900 dark:text-white">{selectedTask.numero}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Estado</label>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${estadoColors[selectedTask.estado]}`}>
                    {estadoLabels[selectedTask.estado]}
                  </span>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Título</label>
                  <p className="text-gray-900 dark:text-white">{selectedTask.titulo}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Cliente</label>
                  <p className="text-gray-900 dark:text-white">{selectedTask.cliente}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Precio</label>
                  <p className="text-gray-900 dark:text-white">${selectedTask.precio}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Fecha de Ejecución</label>
                  <p className="text-gray-900 dark:text-white">{selectedTask.fechaEjecucion}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Franja Horaria</label>
                  <p className="text-gray-900 dark:text-white">{selectedTask.franja_horaria}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Dirección</label>
                  <p className="text-gray-900 dark:text-white">{selectedTask.direccion}</p>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Descripción</label>
                <p className="text-gray-900 dark:text-white">{selectedTask.descripcion}</p>
              </div>
              
              {/* Fotos */}
              {selectedTask.fotos && selectedTask.fotos.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Fotos</label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {selectedTask.fotos.map((foto: any, index: number) => (
                      <div key={index}>
                        <img
                          src={`/uploads/consorcio/fotos/${foto.filename}`}
                          alt={`Foto ${index + 1}`}
                          className="w-full h-32 object-cover rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                          onClick={() => window.open(`/uploads/consorcio/fotos/${foto.filename}`, '_blank')}
                          onError={(e) => {
                            console.error('Error al cargar imagen:', foto.filename);
                            e.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHZpZXdCb3g9IjAgMCAzMiAzMiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjMyIiBoZWlnaHQ9IjMyIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0xNiA4QzEyLjY4NjMgOCAxMCAxMi42ODYzIDEwIDE2QzEwIDE5LjMxMzcgMTIuNjg2MyAyMiAxNiAyMkMxOS4zMTM3IDIyIDIyIDE5LjMxMzcgMjIgMTZDMjIgMTIuNjg2MyAxOS4zMTM3IDggMTYgOFoiIGZpbGw9IiM5Q0EzQUYiLz4KPC9zdmc+';
                          }}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Comprobante de pago */}
              {selectedTask.comprobantePago && selectedTask.comprobantePago.filename && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Comprobante de Pago</label>
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                    <div className="flex flex-col space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="text-sm text-gray-600 dark:text-gray-300">
                          <span className="font-medium">Archivo:</span> {selectedTask.comprobantePago.originalName || 'comprobante.pdf'}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {selectedTask.comprobantePago.uploadDate ? 
                            new Date(selectedTask.comprobantePago.uploadDate).toLocaleDateString() : 
                            'Fecha no disponible'
                          }
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();                            
                            // Obtener el filename y limpiar caracteres problemáticos
                            let filename = selectedTask.comprobantePago.filename;
                            
                            // Reemplazar caracteres codificados incorrectamente
                            filename = filename.replace(/Ã\x93N/g, 'Ó');
                            filename = filename.replace(/Ã\x81/g, 'Á');
                            filename = filename.replace(/Ã\x89/g, 'É');
                            filename = filename.replace(/Ã\x8D/g, 'Í');
                            filename = filename.replace(/Ã\x91/g, 'Ú');
                            filename = filename.replace(/Ã\x91/g, 'Ñ');
                            
                            // Usar el path correcto del comprobante
                            const comprobantePath = selectedTask.comprobantePago.path;
                            // Convertir backslashes a forward slashes y codificar
                            const cleanPath = comprobantePath.replace(/\\/g, '/');
                            const url = `/${cleanPath}`;
                            
                            // Abrir en una nueva pestaña
                            window.open(url, '_blank', 'noopener,noreferrer');
                          }}
                          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center"
                        >
                          <FileText className="h-4 w-4 mr-2" />
                          Ver Comprobante
                        </button>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {selectedTask.comprobantePago.mimetype?.startsWith('image/') ? 
                            'Imagen' : 
                            selectedTask.comprobantePago.mimetype === 'application/pdf' ? 
                            'PDF' : 
                            'Documento'
                          }
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Acciones según estado */}
              {selectedTask.estado === 'presupuesto' && selectedTask.precio !== undefined && selectedTask.precio !== null && selectedTask.precio > 0 && (
                <div className="flex space-x-3 pt-4 border-t">
                  <button
                    onClick={() => {
                      handleConfirmTask(selectedTask._id);
                      setShowDetailsModal(false);
                    }}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Confirmar Tarea
                  </button>
                  <button
                    onClick={() => {
                      handleRejectTask(selectedTask._id);
                      setShowDetailsModal(false);
                    }}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Rechazar Tarea
                  </button>
                </div>
              )}
            </div>
            <div className="p-6 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => setShowDetailsModal(false)}
                className="w-full px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmación */}
      {showConfirmModal && taskToConfirm && (
        <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              <div className="flex items-center mb-4">
                <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg mr-3">
                  <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Confirmar Tarea
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    ¿Estás seguro de que deseas aceptar esta tarea?
                  </p>
                </div>
              </div>
              
              <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {taskToConfirm.titulo}
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-300">
                  Cliente: {taskToConfirm.cliente} | Precio: ${taskToConfirm.precio}
                </p>
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={() => handleConfirmTask(taskToConfirm._id)}
                  className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                >
                  <CheckCircle className="h-4 w-4 mr-2 inline" />
                  Sí, Aceptar
                </button>
                <button
                  onClick={() => {
                    setShowConfirmModal(false);
                    setTaskToConfirm(null);
                  }}
                  className="flex-1 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Rechazo */}
      {showRejectModal && taskToReject && (
        <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              <div className="flex items-center mb-4">
                <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg mr-3">
                  <XCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Rechazar Tarea
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    ¿Estás seguro de que deseas rechazar esta tarea?
                  </p>
                </div>
              </div>
              
              <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {taskToReject.titulo}
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-300">
                  Cliente: {taskToReject.cliente} | Precio: ${taskToReject.precio}
                </p>
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={() => handleRejectTask(taskToReject._id)}
                  className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                >
                  <XCircle className="h-4 w-4 mr-2 inline" />
                  Sí, Rechazar
                </button>
                <button
                  onClick={() => {
                    setShowRejectModal(false);
                    setTaskToReject(null);
                  }}
                  className="flex-1 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Carga de Comprobante */}
      {showComprobanteModal && taskForComprobante && (
        <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              <div className="flex items-center mb-4">
                <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg mr-3">
                  <CreditCard className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Cargar Comprobante de Pago
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    Sube el comprobante de pago para esta tarea
                  </p>
                </div>
              </div>
              
              <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {taskForComprobante.titulo}
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-300">
                  Cliente: {taskForComprobante.cliente} | Precio: ${taskForComprobante.precio}
                </p>
              </div>

              <form onSubmit={handleComprobanteUpload} onKeyDown={preventEnterSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Comprobante de Pago
                  </label>
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    required
                    onChange={(e) => setComprobanteFile(e.target.files?.[0] || null)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
                  />
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Formatos aceptados: JPG, PNG, PDF
                  </p>
                </div>

                <div className="flex space-x-3">
                  <button
                    type="submit"
                    disabled={!comprobanteFile || uploadingComprobante}
                    className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white rounded-lg transition-colors disabled:cursor-not-allowed"
                  >
                    {uploadingComprobante ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 inline animate-spin" />
                        Subiendo...
                      </>
                    ) : (
                      <>
                        <CreditCard className="h-4 w-4 mr-2 inline" />
                        Subir Comprobante
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowComprobanteModal(false);
                      setComprobanteFile(null);
                      setTaskForComprobante(null);
                    }}
                    className="flex-1 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notifications */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg transition-all duration-300 ${
          toast.type === 'success' 
            ? 'bg-green-500 text-white' 
            : toast.type === 'error' 
            ? 'bg-red-500 text-white' 
            : 'bg-blue-500 text-white'
        }`}>
          <div className="flex items-center">
            {toast.type === 'success' && (
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 0116 0zm-2-8a1 1 0 011-1h1a1 1 0 110 2h-1a1 1 0 01-1-1zm0 4a1 1 0 011-1h1a1 1 0 110 2h-1a1 1 0 01-1-1z" clipRule="evenodd" />
              </svg>
            )}
            {toast.type === 'error' && (
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 0116 0zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.586l1.293 1.293a1 1 0 001.414-1.414L11.586 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707z" clipRule="evenodd" />
              </svg>
            )}
            {toast.type === 'info' && (
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 001-1v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            )}
            <span className="font-medium">{toast.message}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminConsorcioTareasManagement;

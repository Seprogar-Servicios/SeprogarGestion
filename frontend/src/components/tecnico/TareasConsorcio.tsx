import React, { useEffect, useState } from 'react';
import { 
  Building, 
  CheckCircle, 
  Search,
  Filter,
  RefreshCw,
  Eye,
  Calendar,
  MapPin
} from 'lucide-react';
import type { TareaConsorcio } from '../../types';
import { showSuccess, showError } from '../../utils/toastUtils';
import AdminPageHeader from '../common/AdminPageHeader';

const TecnicoTareasConsorcio: React.FC = () => {
  
  // Estados
  const [tareas, setTareas] = useState<TareaConsorcio[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [estadoFilter, setEstadoFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalTasks, setTotalTasks] = useState(0);
  const tasksPerPage = 10;

  // Estados para modales
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState<TareaConsorcio | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{taskId: string, nuevoEstado: string, accion: string} | null>(null);

  // Función para cargar tareas del técnico
  const fetchTecnicasTasks = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('accessToken');
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: tasksPerPage.toString(),
        ...(searchTerm && { search: searchTerm }),
        ...(estadoFilter && { estado: estadoFilter })
      });

      const response = await fetch(`/api/tareas-consorcio/mis-tareas?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Error al cargar las tareas');
      }

      const data = await response.json();
      setTareas(data.tasks || data || []);
      setTotalTasks(data.total || data.length || 0);
    } catch (error) {
      console.error('Error:', error);
      showError('Error al cargar las tareas asignadas');
    } finally {
      setLoading(false);
    }
  };

  // Función para ver detalles de tarea
  const handleViewDetails = (task: TareaConsorcio) => {
    setSelectedTask(task);
    setShowDetailsModal(true);
  };

  // Función para mostrar confirmación de cambio de estado
  const handleChangeState = (taskId: string, nuevoEstado: string, accion: string) => {
    setConfirmAction({ taskId, nuevoEstado, accion });
    setShowConfirmModal(true);
  };

  // Función para ejecutar cambio de estado
  const executeChangeState = async () => {
    if (!confirmAction) return;
    
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`/api/tareas-consorcio/${confirmAction.taskId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ estado: confirmAction.nuevoEstado })
      });

      if (!response.ok) {
        throw new Error('Error al actualizar el estado');
      }

      showSuccess(`Estado actualizado correctamente: ${confirmAction.accion}`);
      fetchTecnicasTasks();
      setShowConfirmModal(false);
      setConfirmAction(null);
    } catch (error) {
      console.error('Error:', error);
      showError('Error al actualizar el estado');
    }
  };

  // Cargar datos al montar el componente
  useEffect(() => {
    fetchTecnicasTasks();
  }, [currentPage, searchTerm, estadoFilter]);

  // Función para obtener el color del estado
  const getEstadoColor = (estado: string) => {
    switch (estado) {
      case 'presupuesto':
        return 'bg-yellow-100 text-yellow-800';
      case 'confirmado':
        return 'bg-blue-100 text-blue-800';
      case 'pendiente':
        return 'bg-orange-100 text-orange-800';
      case 'en_progreso':
        return 'bg-orange-100 text-orange-800';
      case 'completada':
        return 'bg-green-100 text-green-800';
      case 'cancelada':
        return 'bg-red-100 text-red-800';
      case 'PENDIENTE_PAGO':
        return 'bg-indigo-100 text-indigo-800';
      case 'FACTURADO':
        return 'bg-pink-100 text-pink-800';
      case 'PAGADO':
        return 'bg-emerald-100 text-emerald-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Función para obtener el texto del estado
  const getEstadoTexto = (estado: string) => {
    switch (estado) {
      case 'presupuesto':
        return 'Presupuesto';
      case 'confirmado':
        return 'Confirmado';
      case 'pendiente':
        return 'Pendiente';
      case 'en_progreso':
        return 'En Progreso';
      case 'completada':
        return 'Completada';
      case 'cancelada':
        return 'Cancelada';
      case 'PENDIENTE_PAGO':
        return 'Pendiente de Pago';
      case 'FACTURADO':
        return 'Facturado';
      case 'PAGADO':
        return 'Pagado';
      default:
        return estado;
    }
  };

  // Función para formatear fecha
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  // Calcular páginas totales
  const totalPages = Math.ceil(totalTasks / tasksPerPage);

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Mis Tareas de Consorcio"
        description="Gestioná las tareas asignadas a tu perfil"
        eyebrow="Técnico"
        icon={<Building className="h-5 w-5" />}
        actions={
          <button
            onClick={fetchTecnicasTasks}
            className="inline-flex items-center px-4 py-2.5 text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Actualizar
          </button>
        }
      />

      {/* Filtros */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar tareas..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
            />
          </div>
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <select
              value={estadoFilter}
              onChange={(e) => setEstadoFilter(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white appearance-none"
            >
              <option value="">Todos los estados</option>
              <option value="presupuesto">Presupuesto</option>
              <option value="confirmado">Confirmado</option>
              <option value="pendiente">Pendiente</option>
              <option value="en_progreso">En Progreso</option>
              <option value="completada">Completada</option>
              <option value="cancelada">Cancelada</option>
              <option value="PENDIENTE_PAGO">Pendiente de Pago</option>
              <option value="FACTURADO">Facturado</option>
              <option value="PAGADO">Pagado</option>
            </select>
          </div>
        </div>
      </div>

      {/* Lista de Tareas */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto text-blue-600 mb-4" />
            <p className="text-gray-600 dark:text-gray-400">Cargando tareas...</p>
          </div>
        ) : tareas.length === 0 ? (
          <div className="p-8 text-center">
            <Building className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600 dark:text-gray-400">
              {searchTerm || estadoFilter ? 'No hay tareas que coincidan con los filtros' : 'No tienes tareas asignadas'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Título
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Cliente
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Dirección
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Fecha
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {tareas.map((task) => (
                  <tr key={task._id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {task.titulo}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {task.descripcion}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {task.cliente}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      <div className="flex items-center">
                        <MapPin className="h-4 w-4 mr-1 text-gray-400" />
                        {task.direccion}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 mr-1 text-gray-400" />
                        {formatDate(task.fechaEjecucion)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${getEstadoColor(task.estado)}`}>
                        {getEstadoTexto(task.estado)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleViewDetails(task)}
                          className="flex items-center space-x-1 px-2 py-1 text-xs bg-blue-50 text-blue-700 rounded-md hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-300 dark:hover:bg-blue-900/50 transition-colors cursor-pointer"
                          title="Ver detalles"
                        >
                          <Eye className="h-3 w-3" />
                          <span>Ver</span>
                        </button>
                        
                        {/* Botones de acción según el estado */}
                        {task.estado === 'pendiente' && (
                          <button
                            onClick={() => handleChangeState(task._id, 'en_progreso', 'Iniciar tarea')}
                            className="flex items-center space-x-1 px-2 py-1 text-xs bg-green-50 text-green-700 rounded-md hover:bg-green-100 dark:bg-green-900/30 dark:text-green-300 dark:hover:bg-green-900/50 transition-colors cursor-pointer"
                            title="Iniciar tarea"
                          >
                            <CheckCircle className="h-3 w-3" />
                            <span>Iniciar</span>
                          </button>
                        )}
                        
                        {task.estado === 'en_progreso' && (
                          <button
                            onClick={() => handleChangeState(task._id, 'completada', 'Completar tarea')}
                            className="flex items-center space-x-1 px-2 py-1 text-xs bg-green-50 text-green-700 rounded-md hover:bg-green-100 dark:bg-green-900/30 dark:text-green-300 dark:hover:bg-green-900/50 transition-colors cursor-pointer"
                            title="Completar tarea"
                          >
                            <CheckCircle className="h-3 w-3" />
                            <span>Completar</span>
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
      {!loading && tareas.length > 0 && (
        <div className="mt-6 flex items-center justify-between">
          <div className="text-sm text-gray-700 dark:text-gray-300">
            Mostrando {((currentPage - 1) * tasksPerPage) + 1} a {Math.min(currentPage * tasksPerPage, totalTasks)} de {totalTasks} tareas
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-md disabled:opacity-50 disabled:cursor-not-allowed dark:bg-gray-700 dark:text-white"
            >
              Anterior
            </button>
            <span className="px-3 py-1 text-sm text-gray-700 dark:text-gray-300">
              Página {currentPage} de {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-md disabled:opacity-50 disabled:cursor-not-allowed dark:bg-gray-700 dark:text-white"
            >
              Siguiente
            </button>
          </div>
        </div>
      )}

      {/* Modal de Detalles */}
      {showDetailsModal && selectedTask && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-200 dark:border-slate-700">
                <div className="flex items-center space-x-3">
                  <div className="h-10 w-10 rounded-lg bg-blue-50 dark:bg-blue-900/25 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                    <Eye className="h-5 w-5" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                    Detalles de Tarea #{selectedTask.numero}
                  </h3>
                </div>
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Número de Tarea</label>
                    <p className="mt-1 text-sm text-gray-900 dark:text-white">{selectedTask.numero}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Estado</label>
                    <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${getEstadoColor(selectedTask.estado)}`}>
                      {getEstadoTexto(selectedTask.estado)}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Título</label>
                  <p className="mt-1 text-sm text-gray-900 dark:text-white">{selectedTask.titulo}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Descripción</label>
                  <p className="mt-1 text-sm text-gray-900 dark:text-white">{selectedTask.descripcion}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Cliente</label>
                    <p className="mt-1 text-sm text-gray-900 dark:text-white">{selectedTask.cliente}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Precio</label>
                    <p className="mt-1 text-sm text-gray-900 dark:text-white">${selectedTask.precio}</p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Dirección</label>
                  <p className="mt-1 text-sm text-gray-900 dark:text-white">{selectedTask.direccion}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Fecha de Ejecución</label>
                    <p className="mt-1 text-sm text-gray-900 dark:text-white">{formatDate(selectedTask.fechaEjecucion)}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Franja Horaria</label>
                    <p className="mt-1 text-sm text-gray-900 dark:text-white">{selectedTask.franja_horaria || 'No especificada'}</p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Administrador de Consorcio</label>
                  <p className="mt-1 text-sm text-gray-900 dark:text-white">
                    {selectedTask.administradorConsorcio?.nombre || 'No asignado'}
                  </p>
                </div>

                {/* Fotos */}
                {selectedTask.fotos && selectedTask.fotos.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Fotos de la Tarea</label>
                    <div className="mt-2 grid grid-cols-3 gap-2">
                      {selectedTask.fotos.map((foto, index) => (
                        <div key={index} className="relative group">
                          <img
                            src={`/uploads/${foto.filename}`}
                            alt={`Foto ${index + 1}`}
                            className="w-full h-24 object-cover rounded-lg cursor-pointer"
                            onClick={() => window.open(`/uploads/${foto.filename}`, '_blank')}
                          />
                          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all rounded-lg flex items-center justify-center">
                            <Eye className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition-all" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Comprobante de Pago */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Comprobante de Pago</label>
                  <div className="mt-1">
                    {selectedTask.comprobantePago ? (
                      <div className="flex items-center space-x-2">
                        <span className={`text-sm font-medium ${
                          selectedTask.comprobantePago.estadoValidacion === 'aprobado' ? 'text-green-600' :
                          selectedTask.comprobantePago.estadoValidacion === 'rechazado' ? 'text-red-600' :
                          'text-orange-600'
                        }`}>
                          {selectedTask.comprobantePago.estadoValidacion === 'aprobado' ? '✓ Aprobado' :
                           selectedTask.comprobantePago.estadoValidacion === 'rechazado' ? '✗ Rechazado' :
                           '⏳ Pendiente'}
                        </span>
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500">No hay comprobante</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmación */}
      {showConfirmModal && confirmAction && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Confirmar Acción
                </h3>
                <button
                  onClick={() => setShowConfirmModal(false)}
                  className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 transition-colors"
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="mb-6">
                <p className="text-gray-600 dark:text-gray-300">
                  ¿Estás seguro de que deseas <span className="font-semibold text-gray-900 dark:text-white">{confirmAction.accion}</span>?
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                  Esta acción actualizará el estado de la tarea.
                </p>
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={() => setShowConfirmModal(false)}
                  className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={executeChangeState}
                  className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
                >
                  Confirmar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TecnicoTareasConsorcio;

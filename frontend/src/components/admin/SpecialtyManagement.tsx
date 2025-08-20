import React, { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../../store';
import { fetchEspecialidades, createEspecialidad, updateEspecialidad, deleteEspecialidad } from '../../store/slices/especialidadesSlice';
import { 
  Briefcase, 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
} from 'lucide-react';
import type { Especialidad } from '../../types';

const SpecialtyManagement: React.FC = () => {
  const dispatch = useAppDispatch();
  const { especialidades, loading } = useAppSelector((state) => state.especialidades);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingEspecialidad, setEditingEspecialidad] = useState<Especialidad | null>(null);

  const [formData, setFormData] = useState({
    nombre: '',
    descripcion: ''
  });

  useEffect(() => {
    dispatch(fetchEspecialidades());
  }, [dispatch]);

  const handleCreateEspecialidad = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await dispatch(createEspecialidad(formData)).unwrap();
      // Recargar la lista de especialidades después de crear una nueva
      await dispatch(fetchEspecialidades());
      setShowCreateModal(false);
      resetForm();
      
      // Mostrar notificación de éxito
      const { toast } = await import('react-toastify');
      toast.success('Especialidad creada correctamente', {
        position: "top-right",
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });
    } catch (error) {
      console.error('Error creating especialidad:', error);
      const { toast } = await import('react-toastify');
      toast.error('Error al crear la especialidad', {
        position: "top-right",
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });
    }
  };

  const handleUpdateEspecialidad = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEspecialidad) return;
    
    try {
      await dispatch(updateEspecialidad({ id: editingEspecialidad._id, data: formData })).unwrap();
      // Recargar la lista de especialidades después de actualizar una especialidad
      await dispatch(fetchEspecialidades());
      setEditingEspecialidad(null);
      setShowCreateModal(false);
      resetForm();
      
      // Mostrar notificación de éxito
      const { toast } = await import('react-toastify');
      toast.success('Especialidad actualizada correctamente', {
        position: "top-right",
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });
    } catch (error) {
      console.error('Error updating especialidad:', error);
      const { toast } = await import('react-toastify');
      toast.error('Error al actualizar la especialidad', {
        position: "top-right",
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });
    }
  };

  const handleDeleteEspecialidad = async (especialidadId: string) => {
    const { toast } = await import('react-toastify');
    
    const CustomToast = ({ closeToast }: { closeToast?: () => void }) => (
      <div>
        <p>¿Estás seguro de que quieres eliminar esta especialidad?</p>
        <div className="flex justify-end mt-2 space-x-2">
          <button 
            onClick={async () => {
              try {
                await dispatch(deleteEspecialidad(especialidadId)).unwrap();
                await dispatch(fetchEspecialidades());
                closeToast?.();
                toast.success('Especialidad eliminada correctamente', {
                  position: "top-right",
                  autoClose: 3000,
                  hideProgressBar: false,
                  closeOnClick: true,
                  pauseOnHover: true,
                  draggable: true,
                });
              } catch (error) {
                console.error('Error deleting especialidad:', error);
                toast.error('Error al eliminar la especialidad', {
                  position: "top-right",
                  autoClose: 3000,
                  hideProgressBar: false,
                  closeOnClick: true,
                  pauseOnHover: true,
                  draggable: true,
                });
              }
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
  };

  const resetForm = () => {
    setFormData({
      nombre: '',
      descripcion: ''
    });
  };

  const openEditModal = (especialidad: Especialidad) => {
    setEditingEspecialidad(especialidad);
    setFormData({
      nombre: especialidad.nombre,
      descripcion: especialidad.descripcion || ''
    });
    setShowCreateModal(true);
  };

  const filteredEspecialidades = especialidades?.filter(especialidad =>
    especialidad.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    especialidad.descripcion?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Gestión de Especialidades</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Administra las especialidades técnicas del sistema
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center px-4 py-2.5 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
        >
          <Plus className="h-4 w-4 mr-2" />
          Nueva Especialidad
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          type="text"
          placeholder="Buscar especialidades..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white transition-colors"
        />
      </div>

      {/* Especialidades Grid */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {loading ? (
          [...Array(6)].map((_, i) => (
            <div key={i} className="animate-pulse bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-full mb-2"></div>
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-2/3"></div>
            </div>
          ))
        ) : (
          filteredEspecialidades?.map((especialidad) => (
            <div key={especialidad._id} className="bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-md transition-shadow">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center">
                    <Briefcase className="h-8 w-8 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => openEditModal(especialidad)}
                      className="text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteEspecialidad(especialidad._id)}
                      className="text-gray-400 hover:text-red-600 dark:hover:text-red-400"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  {especialidad.nombre}
                </h3>

                {especialidad.descripcion && (
                  <p className="text-gray-600 dark:text-gray-400 text-sm mb-3 line-clamp-3">
                    {especialidad.descripcion}
                  </p>
                )}

                <div className="pt-2 text-xs text-gray-400 dark:text-gray-500 border-t border-gray-200 dark:border-gray-700">
                  Creada: {new Date(especialidad.createdAt).toLocaleDateString()}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {filteredEspecialidades?.length === 0 && !loading && (
        <div className="text-center py-12">
          <Briefcase className="mx-auto h-12 w-12 text-gray-400" />
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            {searchTerm ? 'No se encontraron especialidades' : 'No hay especialidades registradas'}
          </p>
          {!searchTerm && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="mt-4 inline-flex items-center px-4 py-2.5 border border-transparent text-sm font-medium rounded-lg text-blue-700 bg-blue-100 hover:bg-blue-200 dark:bg-blue-900 dark:text-blue-200 dark:hover:bg-blue-800 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <Plus className="h-4 w-4 mr-2" />
              Agregar primera especialidad
            </button>
          )}
        </div>
      )}

      {/* Create/Edit Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
          <div className="relative max-w-md w-full bg-white dark:bg-gray-800 rounded-xl shadow-xl p-6 max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => {
                setShowCreateModal(false);
                setEditingEspecialidad(null);
                resetForm();
              }}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 rounded-full p-1"
              aria-label="Cerrar"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
            <div className="mt-1">
              <div className="flex items-center mb-6">
                {editingEspecialidad ? (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-600 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-600 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                )}
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                  {editingEspecialidad ? 'Editar Especialidad' : 'Nueva Especialidad'}
                </h3>
              </div>
              
              <form onSubmit={editingEspecialidad ? handleUpdateEspecialidad : handleCreateEspecialidad} className="space-y-4">
                <div className="relative">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Nombre *
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <input
                      type="text"
                      required
                      placeholder="ej: Electricidad, Plomería, Gas"
                      value={formData.nombre}
                      onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                      className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-colors"
                    />
                  </div>
                </div>

                <div className="relative">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Descripción
                  </label>
                  <div className="relative">
                    <div className="absolute top-3 left-0 pl-3 flex items-start pointer-events-none">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
                      </svg>
                    </div>
                    <textarea
                      value={formData.descripcion}
                      onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                      rows={4}
                      placeholder="Describe las actividades y responsabilidades de esta especialidad..."
                      className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-colors"
                    />
                  </div>
                </div>

                <div className="flex justify-end space-x-3 pt-5">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateModal(false);
                      setEditingEspecialidad(null);
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
                    {editingEspecialidad ? (
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

export default SpecialtyManagement;

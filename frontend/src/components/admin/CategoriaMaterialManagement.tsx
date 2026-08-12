import React, { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../../store';
import { fetchCategoriasMateriales, createCategoriaMaterial, updateCategoriaMaterial, deleteCategoriaMaterial } from '../../store/slices/categoriaMaterialSlice';
import { 
  FolderOpen, 
  Edit, 
  Plus, 
  Search, 
  Trash2,
  X,
} from 'lucide-react';
import type { CategoriaMaterial } from '../../types';
import EmptyCrudState from '../common/EmptyCrudState';
import { preventEnterSubmit } from '../../utils/formGuards';

const CategoriaMaterialManagement: React.FC = () => {
  const dispatch = useAppDispatch();
  const { categorias = [], loading } = useAppSelector((state) => state.categoriaMaterial);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingCategoria, setEditingCategoria] = useState<CategoriaMaterial | null>(null);

  const [formData, setFormData] = useState({
    nombre: '',
    descripcion: ''
  });

  useEffect(() => {
    dispatch(fetchCategoriasMateriales());
  }, [dispatch]);

  const handleCreateCategoria = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await dispatch(createCategoriaMaterial(formData)).unwrap();
      await dispatch(fetchCategoriasMateriales());
      setShowCreateModal(false);
      resetForm();
    } catch (error) {
      console.error('Error creating categoria:', error);
    }
  };

  const handleUpdateCategoria = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCategoria) return;
    
    try {
      await dispatch(updateCategoriaMaterial({ id: editingCategoria._id, data: formData })).unwrap();
      await dispatch(fetchCategoriasMateriales());
      setEditingCategoria(null);
      setShowCreateModal(false);
      resetForm();
    } catch (error) {
      console.error('Error updating categoria:', error);
    }
  };

  const handleDeleteCategoria = async (categoriaId: string) => {
    const CustomToast = ({ closeToast }: { closeToast?: () => void }) => (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden w-full">
        <div className="p-6">
          <div className="flex items-start">
            <div className="flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400">
              <Trash2 className="h-6 w-6" />
            </div>
            <div className="ml-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                Eliminar categoría
              </h3>
              <div className="mt-2">
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  ¿Estás seguro de que deseas eliminar esta categoría? Esta
                  acción no se puede deshacer.
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
                  await dispatch(deleteCategoriaMaterial(categoriaId)).unwrap();
                  await dispatch(fetchCategoriasMateriales());
                } catch (error) {
                  console.error('Error deleting categoria:', error);
                }
              }}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors duration-150"
            >
              Eliminar
            </button>
          </div>
        </div>
      </div>
    );
  
    const { toast } = await import('react-toastify');
    toast(<CustomToast />, {
      position: "top-center",
      autoClose: false,
      closeButton: false,
      closeOnClick: false,
      draggable: false,
      className: '!bg-transparent !p-0 !shadow-none',
      bodyClassName: '!p-0',
    });
  };
  
  const resetForm = () => {
    setFormData({
      nombre: '',
      descripcion: ''
    });
  };

  const openEditModal = (categoria: CategoriaMaterial) => {
    setEditingCategoria(categoria);
    setFormData({
      nombre: categoria.nombre,
      descripcion: categoria.descripcion || ''
    });
    setShowCreateModal(true);
  };

  const filteredCategorias = (categorias || []).filter(categoria => {
    if (!categoria) return false;
    const nombreMatch = categoria.nombre?.toLowerCase().includes(searchTerm.toLowerCase());
    const descripcionMatch = categoria.descripcion?.toLowerCase().includes(searchTerm.toLowerCase());
    return nombreMatch || descripcionMatch;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border-t-4 border-blue-500 p-6 mb-6 animate-fadeIn">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center">
            <div className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded-lg mr-4">
              <FolderOpen className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Gestión de Categorías de Materiales</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 flex items-center">
                Administra las categorías para organizar los materiales
              </p>
            </div>
          </div>
          <button
            data-sepi-target="categorias-create"
            onClick={() => {
              setEditingCategoria(null);
              resetForm();
              setShowCreateModal(true);
            }}
            className="inline-flex items-center px-4 py-2.5 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200 cursor-pointer"
          >
            <Plus className="h-4 w-4 mr-2" />
            Nueva Categoría
          </button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border-t-4 border-blue-500 p-6 mb-6">
        <div className="flex flex-col md:flex-row gap-4 items-end">
          <div className="flex-1 w-full">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Buscar categorías
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Buscar por nombre o descripción..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Categorias Grid */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {loading ? (
          [...Array(6)].map((_, i) => (
            <div key={i} className="bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden border border-gray-200 dark:border-gray-700">
              <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700 bg-blue-50 dark:bg-blue-900/20">
                <div className="animate-pulse h-6 w-3/4 bg-gray-200 dark:bg-gray-600 rounded"></div>
              </div>
              <div className="p-5">
                <div className="animate-pulse h-4 w-full bg-gray-200 dark:bg-gray-700 rounded mb-3"></div>
                <div className="animate-pulse h-3 w-2/3 bg-gray-200 dark:bg-gray-700 rounded"></div>
              </div>
            </div>
          ))
        ) : filteredCategorias.length > 0 ? (
          filteredCategorias.map((categoria) => (
            <div key={categoria._id} className="bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden border border-gray-200 dark:border-gray-700 hover:shadow-lg hover:scale-[1.02] transition-all duration-300 transform">
              <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700 bg-blue-50 dark:bg-blue-900/20">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {categoria.nombre}
                  </h3>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => openEditModal(categoria)}
                      className="p-1.5 text-gray-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-md hover:text-blue-600 dark:hover:text-blue-400 transition-colors duration-200 cursor-pointer"
                      title="Editar categoría"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteCategoria(categoria._id)}
                      className="p-1.5 text-gray-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md hover:text-red-600 dark:hover:text-red-400 transition-colors duration-200 cursor-pointer"
                      title="Eliminar categoría"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
              <div className="p-5">
                <div className="flex items-center mb-4">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg mr-3">
                    <FolderOpen className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
                    {categoria.nombre}
                  </span>
                </div>
                
                {categoria.descripcion ? (
                  <p className="text-gray-600 dark:text-gray-300 text-sm mb-4">
                    {categoria.descripcion}
                  </p>
                ) : (
                  <p className="text-gray-400 dark:text-gray-500 text-sm italic mb-4">
                    Sin descripción
                  </p>
                )}
                
                <div className="pt-3 mt-4 border-t border-gray-100 dark:border-gray-700">
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    <span className="font-medium">Creada:</span>{' '}
                    {new Date(categoria.createdAt).toLocaleDateString('es-AR', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                </div>
              </div>
            </div>
          ))
        ) : null}
      </div>

      {filteredCategorias.length === 0 && !loading && (
        <EmptyCrudState
          title={searchTerm ? 'No se encontraron categorías' : 'No hay categorías registradas'}
          description={
            searchTerm
              ? 'No hay categorías que coincidan con tu búsqueda.'
              : 'Creá la primera categoría o pedile a Sepi un tutorial rápido.'
          }
          tutorialId="categorias"
          showTutorial={!searchTerm && (categorias || []).length === 0}
          icon={<FolderOpen className="h-8 w-8" />}
          onCreateClick={() => {
            if (searchTerm) setSearchTerm('');
            else {
              setEditingCategoria(null);
              resetForm();
              setShowCreateModal(true);
            }
          }}
          createLabel={searchTerm ? 'Limpiar búsqueda' : 'Nueva categoría'}
        />
      )}

      {/* Create/Edit Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6 bg-gradient-to-r from-blue-500 to-purple-600 p-4 -mx-6 -mt-6 rounded-t-xl">
                <div className="flex items-center space-x-3">
                  <div className="p-2 rounded-full bg-white/20 backdrop-blur-sm">
                    {editingCategoria ? (
                      <Edit className="h-5 w-5 text-white" />
                    ) : (
                      <Plus className="h-5 w-5 text-white" />
                    )}
                  </div>
                  <h3 className="text-xl font-bold text-white">
                    {editingCategoria ? 'Editar Categoría' : 'Nueva Categoría'}
                  </h3>
                </div>
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    setEditingCategoria(null);
                    resetForm();
                  }}
                  className="text-white hover:text-gray-200 focus:outline-none"
                  aria-label="Cerrar"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              
              <form onSubmit={editingCategoria ? handleUpdateCategoria : handleCreateCategoria} onKeyDown={preventEnterSubmit} className="space-y-4">
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
                      data-sepi-target="categorias-nombre"
                      type="text"
                      required
                      placeholder="ej: Electricidad, Plomería, Pintura"
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
                      placeholder="Describe el tipo de materiales que pertenecen a esta categoría..."
                      className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-colors"
                    />
                  </div>
                </div>

                <div className="flex justify-end space-x-3 pt-5">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateModal(false);
                      setEditingCategoria(null);
                      resetForm();
                    }}
                    className="px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    data-sepi-target="categorias-guardar"
                    type="submit"
                    className="px-4 py-2.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 flex items-center cursor-pointer"
                  >
                    {editingCategoria ? (
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
                        Crear Categoría
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

export default CategoriaMaterialManagement;

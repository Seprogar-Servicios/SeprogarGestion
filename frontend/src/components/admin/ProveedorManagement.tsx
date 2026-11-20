import React, { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../../store';
import {
  fetchProveedores,
  createProveedor,
  updateProveedor,
  deleteProveedor,
} from '../../store/slices/proveedoresSlice';
import { Building2, Edit, Plus, Search, Trash2, X } from 'lucide-react';
import { showSuccess, showError } from '../../utils/toastUtils';
import type { Proveedor } from '../../types';
import AdminPageHeader from '../common/AdminPageHeader';
import { preventEnterSubmit } from '../../utils/formGuards';

const ProveedorManagement: React.FC = () => {
  const dispatch = useAppDispatch();
  const { proveedores, loading } = useAppSelector((state) => state.proveedores);

  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editing, setEditing] = useState<Proveedor | null>(null);
  const [formData, setFormData] = useState({
    nombre: '',
    descripcion: '',
    activo: true,
  });

  useEffect(() => {
    dispatch(fetchProveedores());
  }, [dispatch]);

  const resetForm = () => {
    setFormData({ nombre: '', descripcion: '', activo: true });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editing) {
        await dispatch(updateProveedor({ id: editing._id, data: formData })).unwrap();
        showSuccess('Proveedor actualizado');
      } else {
        await dispatch(createProveedor(formData)).unwrap();
        showSuccess('Proveedor creado');
      }
      await dispatch(fetchProveedores());
      setShowCreateModal(false);
      setEditing(null);
      resetForm();
    } catch (error) {
      console.error(error);
      showError(editing ? 'Error al actualizar proveedor' : 'Error al crear proveedor');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('¿Eliminar este proveedor?')) return;
    try {
      await dispatch(deleteProveedor(id)).unwrap();
      showSuccess('Proveedor eliminado');
    } catch (error) {
      console.error(error);
      showError('Error al eliminar proveedor');
    }
  };

  const openEdit = (p: Proveedor) => {
    setEditing(p);
    setFormData({
      nombre: p.nombre,
      descripcion: p.descripcion || '',
      activo: p.activo !== false,
    });
    setShowCreateModal(true);
  };

  const filtered =
    proveedores?.filter(
      (p) =>
        p.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.descripcion?.toLowerCase().includes(searchTerm.toLowerCase())
    ) || [];

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Gestión de Proveedores"
        description="Catálogo de proveedores para asignar en tareas"
        eyebrow="Administración"
        icon={<Building2 className="h-5 w-5" />}
        actions={
          <button
            type="button"
            onClick={() => {
              setEditing(null);
              resetForm();
              setShowCreateModal(true);
            }}
            className="inline-flex items-center px-4 py-2.5 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-blue-600 hover:bg-blue-700 cursor-pointer"
          >
            <Plus className="h-4 w-4 mr-2" />
            Nuevo Proveedor
          </button>
        }
      />

      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Buscar proveedores
        </label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por nombre..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {loading
          ? [...Array(3)].map((_, i) => (
              <div
                key={i}
                className="h-32 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-700"
              />
            ))
          : filtered.map((p) => (
              <div
                key={p._id}
                className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">{p.nombre}</h3>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                      {p.descripcion || 'Sin descripción'}
                    </p>
                    <span
                      className={`mt-2 inline-flex text-xs font-medium px-2 py-0.5 rounded-full ${
                        p.activo !== false
                          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                          : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {p.activo !== false ? 'Activo' : 'Inactivo'}
                    </span>
                  </div>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => openEdit(p)}
                      className="p-1.5 text-gray-500 hover:text-blue-600 cursor-pointer"
                      title="Editar"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(p._id)}
                      className="p-1.5 text-gray-500 hover:text-red-600 cursor-pointer"
                      title="Eliminar"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
      </div>

      {!loading && filtered.length === 0 && (
        <div className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-600 p-10 text-center">
          <Building2 className="mx-auto h-8 w-8 text-slate-400 mb-3" />
          <h3 className="text-lg font-medium text-slate-900 dark:text-white">
            {searchTerm ? 'No se encontraron proveedores' : 'No hay proveedores'}
          </h3>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {searchTerm
              ? 'Probá con otro término de búsqueda.'
              : 'Creá el primero para usarlo en el alta de tareas.'}
          </p>
          <button
            type="button"
            onClick={() => {
              if (searchTerm) setSearchTerm('');
              else {
                setEditing(null);
                resetForm();
                setShowCreateModal(true);
              }
            }}
            className="mt-4 inline-flex items-center px-4 py-2 rounded-lg bg-blue-600 text-white text-sm cursor-pointer"
          >
            {searchTerm ? 'Limpiar búsqueda' : 'Nuevo proveedor'}
          </button>
        </div>
      )}

      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6 bg-gradient-to-r from-blue-600 to-blue-800 p-4 -mx-6 -mt-6 rounded-t-xl">
                <h3 className="text-xl font-bold text-white">
                  {editing ? 'Editar Proveedor' : 'Nuevo Proveedor'}
                </h3>
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    setEditing(null);
                    resetForm();
                  }}
                  className="text-white cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} onKeyDown={preventEnterSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Nombre *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.nombre}
                    onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                    className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="Texto libre (ej: IKE, VAITTY, Proveedor 24...)"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Descripción
                  </label>
                  <textarea
                    rows={3}
                    value={formData.descripcion}
                    onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                    className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                <label className="inline-flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.activo}
                    onChange={(e) => setFormData({ ...formData, activo: e.target.checked })}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  Activo (visible en el select de tareas)
                </label>
                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateModal(false);
                      setEditing(null);
                      resetForm();
                    }}
                    className="px-4 py-2.5 text-sm rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2.5 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700 cursor-pointer"
                  >
                    {editing ? 'Actualizar' : 'Crear'}
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

export default ProveedorManagement;

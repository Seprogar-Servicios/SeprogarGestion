import React, { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../../store';
import {
  fetchMotivosPago,
  createMotivoPago,
  updateMotivoPago,
  deleteMotivoPago,
} from '../../store/slices/motivoPagoSlice';
import { Tag, Edit, Plus, Search, Trash2, X } from 'lucide-react';
import type { MotivoPago } from '../../types';
import { toast } from 'react-toastify';
import EmptyCrudState from '../common/EmptyCrudState';
import AdminPageHeader from '../common/AdminPageHeader';
import { preventEnterSubmit } from '../../utils/formGuards';

type Props = { embedded?: boolean };

const MotivoPagoManagement: React.FC<Props> = ({ embedded = false }) => {
  const dispatch = useAppDispatch();
  const { motivos = [], loading } = useAppSelector((state) => state.motivoPago);

  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingMotivo, setEditingMotivo] = useState<MotivoPago | null>(null);
  const [formData, setFormData] = useState({
    nombre: '',
    descripcion: '',
    activo: true,
  });

  useEffect(() => {
    dispatch(fetchMotivosPago());
  }, [dispatch]);

  const resetForm = () => {
    setFormData({ nombre: '', descripcion: '', activo: true });
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await dispatch(createMotivoPago(formData)).unwrap();
      await dispatch(fetchMotivosPago());
      toast.success('Motivo creado');
      setShowCreateModal(false);
      resetForm();
    } catch (error: any) {
      toast.error(typeof error === 'string' ? error : 'Error al crear motivo');
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMotivo) return;
    try {
      await dispatch(updateMotivoPago({ id: editingMotivo._id, data: formData })).unwrap();
      await dispatch(fetchMotivosPago());
      toast.success('Motivo actualizado');
      setEditingMotivo(null);
      setShowCreateModal(false);
      resetForm();
    } catch (error: any) {
      toast.error(typeof error === 'string' ? error : 'Error al actualizar motivo');
    }
  };

  const handleDelete = async (motivoId: string) => {
    if (!window.confirm('¿Eliminar este motivo de pago?')) return;
    try {
      await dispatch(deleteMotivoPago(motivoId)).unwrap();
      toast.success('Motivo eliminado');
    } catch (error: any) {
      toast.error(typeof error === 'string' ? error : 'Error al eliminar motivo');
    }
  };

  const openEditModal = (motivo: MotivoPago) => {
    setEditingMotivo(motivo);
    setFormData({
      nombre: motivo.nombre,
      descripcion: motivo.descripcion || '',
      activo: motivo.activo,
    });
    setShowCreateModal(true);
  };

  const filteredMotivos = (motivos || []).filter((motivo) => {
    if (!motivo) return false;
    const term = searchTerm.toLowerCase();
    return (
      motivo.nombre?.toLowerCase().includes(term) ||
      motivo.descripcion?.toLowerCase().includes(term)
    );
  });

  const createBtn = (
    <button
      data-sepi-target="motivos-create"
      onClick={() => {
        setEditingMotivo(null);
        resetForm();
        setShowCreateModal(true);
      }}
      className="inline-flex items-center px-4 py-2.5 text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700"
    >
      <Plus className="h-4 w-4 mr-2" />
      Nuevo motivo
    </button>
  );

  return (
    <div className="space-y-6">
      {!embedded ? (
        <AdminPageHeader
          title="Motivos de pago"
          description="Catálogo para clasificar pagos manuales (adelanto, pago extra, etc.)"
          eyebrow="Administración"
          icon={<Tag className="h-5 w-5" />}
          actions={createBtn}
        />
      ) : (
        <div className="flex justify-end">{createBtn}</div>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-none p-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por nombre o descripción..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {loading ? (
          [...Array(3)].map((_, i) => (
            <div key={i} className="bg-white dark:bg-gray-800 rounded-xl p-5 animate-pulse h-40" />
          ))
        ) : filteredMotivos.length > 0 ? (
          filteredMotivos.map((motivo) => (
            <div
              key={motivo._id}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 overflow-hidden"
            >
              <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700 bg-blue-50 dark:bg-blue-900/20 flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{motivo.nombre}</h3>
                <div className="flex items-center space-x-2">
                  <button onClick={() => openEditModal(motivo)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-md">
                    <Edit className="h-4 w-4" />
                  </button>
                  <button onClick={() => handleDelete(motivo._id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded-md">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <div className="p-5">
                <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
                  {motivo.descripcion || 'Sin descripción'}
                </p>
                <span
                  className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    motivo.activo
                      ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                      : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                  }`}
                >
                  {motivo.activo ? 'Activo' : 'Inactivo'}
                </span>
              </div>
            </div>
          ))
        ) : (
          <EmptyCrudState
            title={searchTerm ? 'No se encontraron motivos' : 'No hay motivos registrados'}
            description={
              searchTerm
                ? 'Probá con otros términos de búsqueda.'
                : 'Todavía no hay motivos. Sepi puede guiarte para crear el primero.'
            }
            tutorialId="motivos"
            showTutorial={!searchTerm && !loading && (motivos || []).length === 0}
            icon={<Tag className="h-8 w-8" />}
            onCreateClick={() => {
              setEditingMotivo(null);
              resetForm();
              setShowCreateModal(true);
            }}
            createLabel="Nuevo motivo"
          />
        )}
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                  {editingMotivo ? 'Editar motivo' : 'Nuevo motivo'}
                </h3>
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    setEditingMotivo(null);
                    resetForm();
                  }}
                >
                  <X className="h-5 w-5 text-gray-400" />
                </button>
              </div>
              <form onSubmit={editingMotivo ? handleUpdate : handleCreate} onKeyDown={preventEnterSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nombre *</label>
                  <input
                    data-sepi-target="motivos-nombre"
                    type="text"
                    required
                    value={formData.nombre}
                    onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                    className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="ej: Adelanto"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Descripción</label>
                  <textarea
                    data-sepi-target="motivos-descripcion"
                    rows={3}
                    value={formData.descripcion}
                    onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                    className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                <label
                  data-sepi-target="motivos-activo"
                  className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300"
                >
                  <input
                    type="checkbox"
                    checked={formData.activo}
                    onChange={(e) => setFormData({ ...formData, activo: e.target.checked })}
                    className="rounded border-gray-300"
                  />
                  Activo
                </label>
                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateModal(false);
                      setEditingMotivo(null);
                      resetForm();
                    }}
                    className="px-4 py-2 text-sm rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200"
                  >
                    Cancelar
                  </button>
                  <button
                    data-sepi-target="motivos-guardar"
                    type="submit"
                    className="px-4 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700"
                  >
                    {editingMotivo ? 'Actualizar' : 'Crear'}
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

export default MotivoPagoManagement;

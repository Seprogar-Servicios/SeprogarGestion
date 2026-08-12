import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../../store';
import {
  fetchPagosManuales,
  createPagoManual,
  updatePagoManual,
  deletePagoManual,
  downloadPagoManualPdf,
} from '../../store/slices/pagoManualSlice';
import { fetchMotivosPago } from '../../store/slices/motivoPagoSlice';
import { fetchUsers } from '../../store/slices/usersSlice';
import api from '../../config/api';
import type { PagoManual, Task } from '../../types';
import { toast } from 'react-toastify';
import {
  DollarSign,
  Plus,
  Search,
  Edit,
  Trash2,
  X,
  Download,
  FileText,
} from 'lucide-react';
import EmptyCrudState from '../common/EmptyCrudState';
import AdminPageHeader from '../common/AdminPageHeader';
import { preventEnterSubmit } from '../../utils/formGuards';

type TareaSeleccionada = {
  _id: string;
  numero: string;
  titulo: string;
};

const emptyForm = {
  monto: '',
  fechaEmision: new Date().toISOString().slice(0, 10),
  tecnico: '',
  motivo: '',
  observaciones: '',
};

const PagoManualManagement: React.FC = () => {
  const dispatch = useAppDispatch();
  const { pagos, loading } = useAppSelector((state) => state.pagoManual);
  const { motivos } = useAppSelector((state) => state.motivoPago);
  const { users } = useAppSelector((state) => state.users);

  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingPago, setEditingPago] = useState<PagoManual | null>(null);
  const [formData, setFormData] = useState(emptyForm);
  const [selectedTareas, setSelectedTareas] = useState<TareaSeleccionada[]>([]);
  const [tareaSearch, setTareaSearch] = useState('');
  const [tareaSuggestions, setTareaSuggestions] = useState<TareaSeleccionada[]>([]);
  const [searchingTareas, setSearchingTareas] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [saving, setSaving] = useState(false);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    dispatch(fetchPagosManuales());
    dispatch(fetchMotivosPago({ activo: true }));
    dispatch(fetchUsers());
  }, [dispatch]);

  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const tecnicos = useMemo(
    () => (users || []).filter((u) => u.rol === 'usuario' && u.aprobado),
    [users]
  );

  const motivosActivos = useMemo(
    () => (motivos || []).filter((m) => m.activo),
    [motivos]
  );

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(amount || 0);

  const resetForm = () => {
    setFormData(emptyForm);
    setEditingPago(null);
    setSelectedTareas([]);
    setTareaSearch('');
    setTareaSuggestions([]);
    setShowSuggestions(false);
  };

  const openCreate = () => {
    resetForm();
    setShowModal(true);
  };

  const openEdit = (pago: PagoManual) => {
    setEditingPago(pago);
    setFormData({
      monto: String(pago.monto),
      fechaEmision: pago.fechaEmision.slice(0, 10),
      tecnico: pago.tecnico?._id || '',
      motivo: pago.motivo?._id || '',
      observaciones: pago.observaciones || '',
    });
    setSelectedTareas(
      (pago.tareas || []).map((t) => ({
        _id: t._id,
        numero: t.numero,
        titulo: t.titulo,
      }))
    );
    setTareaSearch('');
    setTareaSuggestions([]);
    setShowModal(true);
  };

  const searchTareasByNumero = async (numero: string) => {
    const term = numero.trim();
    if (term.length < 1) {
      setTareaSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    setSearchingTareas(true);
    try {
      const params: Record<string, string> = {
        numero: term,
        limit: '10',
      };
      if (formData.tecnico) {
        params.usuario = formData.tecnico;
      }

      const response = await api.get<{ success: boolean; data: Task[] }>('/tareas', { params });
      const results = (response.data.data || [])
        .filter((t) => !selectedTareas.some((s) => s._id === t._id))
        .map((t) => ({
          _id: t._id,
          numero: t.numero,
          titulo: t.titulo,
        }));

      setTareaSuggestions(results);
      setShowSuggestions(true);
    } catch {
      setTareaSuggestions([]);
      toast.error('Error al buscar tareas');
    } finally {
      setSearchingTareas(false);
    }
  };

  const handleTareaSearchChange = (value: string) => {
    setTareaSearch(value);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => {
      searchTareasByNumero(value);
    }, 300);
  };

  const addTarea = (tarea: TareaSeleccionada) => {
    if (selectedTareas.some((t) => t._id === tarea._id)) {
      toast.info('Esa tarea ya está seleccionada');
      return;
    }
    setSelectedTareas((prev) => [...prev, tarea]);
    setTareaSearch('');
    setTareaSuggestions([]);
    setShowSuggestions(false);
  };

  const removeTarea = (tareaId: string) => {
    setSelectedTareas((prev) => prev.filter((t) => t._id !== tareaId));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.tecnico || !formData.motivo || !formData.monto) {
      toast.error('Completá técnico, motivo y monto');
      return;
    }

    const payload = {
      monto: Number(formData.monto),
      fechaEmision: formData.fechaEmision,
      tecnico: formData.tecnico,
      motivo: formData.motivo,
      tareas: selectedTareas.map((t) => t._id),
      observaciones: formData.observaciones,
    };

    setSaving(true);
    try {
      if (editingPago) {
        await dispatch(updatePagoManual({ id: editingPago._id, data: payload })).unwrap();
        toast.success('Pago actualizado');
      } else {
        await dispatch(createPagoManual(payload)).unwrap();
        toast.success('Pago creado. Descargá el PDF y subilo en Recibos si corresponde.');
      }
      await dispatch(fetchPagosManuales());
      setShowModal(false);
      resetForm();
    } catch (error: any) {
      toast.error(typeof error === 'string' ? error : 'Error al guardar el pago');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('¿Eliminar este pago manual?')) return;
    try {
      await dispatch(deletePagoManual(id)).unwrap();
      toast.success('Pago eliminado');
    } catch (error: any) {
      toast.error(typeof error === 'string' ? error : 'Error al eliminar');
    }
  };

  const handleDownloadPdf = async (id: string) => {
    try {
      await dispatch(downloadPagoManualPdf(id)).unwrap();
      toast.success('PDF descargado. Podés subirlo en la sección Recibos.');
    } catch (error: any) {
      toast.error(typeof error === 'string' ? error : 'Error al descargar PDF');
    }
  };

  const filteredPagos = (pagos || []).filter((pago) => {
    const term = searchTerm.toLowerCase();
    if (!term) return true;
    return (
      pago.tecnico?.nombre?.toLowerCase().includes(term) ||
      pago.motivo?.nombre?.toLowerCase().includes(term) ||
      String(pago.monto).includes(term) ||
      (pago.observaciones || '').toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Pagos manuales"
        description="Cargá adelantos u otros pagos. Generá el PDF y subilo luego en Recibos."
        eyebrow="Administración"
        icon={<DollarSign className="h-5 w-5" />}
        actions={
          <button
            data-sepi-target="pagos-create"
            onClick={openCreate}
            className="inline-flex items-center px-4 py-2.5 text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            Nuevo pago
          </button>
        }
      />

      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-none p-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por técnico, motivo o monto..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden border border-gray-200 dark:border-gray-700">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900/40">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Técnico</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Motivo</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Monto</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tareas</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                    Cargando...
                  </td>
                </tr>
              ) : filteredPagos.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-6">
                    <EmptyCrudState
                      title={searchTerm ? 'No se encontraron pagos' : 'No hay pagos manuales'}
                      description={
                        searchTerm
                          ? 'Probá con otros filtros de búsqueda.'
                          : 'Aún no cargaste pagos. Sepi puede explicarte cómo crear el primero y generar el PDF.'
                      }
                      tutorialId="pagos"
                      showTutorial={!searchTerm && !loading && (pagos || []).length === 0}
                      icon={<DollarSign className="h-8 w-8" />}
                      onCreateClick={openCreate}
                      createLabel="Nuevo pago"
                    />
                  </td>
                </tr>
              ) : (
                filteredPagos.map((pago) => (
                  <tr key={pago._id} className="hover:bg-gray-50 dark:hover:bg-gray-700/40">
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-white whitespace-nowrap">
                      {new Date(pago.fechaEmision).toLocaleDateString('es-AR')}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                      {pago.tecnico?.nombre || '—'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                      {pago.motivo?.nombre || '—'}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white whitespace-nowrap">
                      {formatCurrency(pago.monto)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                      {(pago.tareas || []).length === 0
                        ? 'Ninguna'
                        : `${pago.tareas.length} tarea(s)`}
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <button
                        onClick={() => handleDownloadPdf(pago._id)}
                        className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-md mr-1"
                        title="Descargar PDF para Recibos"
                      >
                        <Download className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => openEdit(pago)}
                        className="p-1.5 text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md mr-1"
                        title="Editar"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(pago._id)}
                        className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md"
                        title="Eliminar"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-blue-600" />
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                    {editingPago ? 'Editar pago manual' : 'Nuevo pago manual'}
                  </h3>
                </div>
                <button
                  onClick={() => {
                    setShowModal(false);
                    resetForm();
                  }}
                >
                  <X className="h-5 w-5 text-gray-400" />
                </button>
              </div>

              <form onSubmit={handleSubmit} onKeyDown={preventEnterSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Técnico *
                    </label>
                    <select
                      data-sepi-target="pagos-tecnico"
                      required
                      value={formData.tecnico}
                      onChange={(e) => {
                        setFormData({ ...formData, tecnico: e.target.value });
                        setTareaSearch('');
                        setTareaSuggestions([]);
                        setShowSuggestions(false);
                      }}
                      className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                      <option value="">Seleccionar técnico</option>
                      {tecnicos.map((t) => (
                        <option key={t._id} value={t._id}>
                          {t.nombre}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Motivo *
                    </label>
                    <select
                      data-sepi-target="pagos-motivo"
                      required
                      value={formData.motivo}
                      onChange={(e) => setFormData({ ...formData, motivo: e.target.value })}
                      className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                      <option value="">Seleccionar motivo</option>
                      {motivosActivos.map((m) => (
                        <option key={m._id} value={m._id}>
                          {m.nombre}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Fecha de emisión *
                    </label>
                    <input
                      type="date"
                      required
                      value={formData.fechaEmision}
                      onChange={(e) => setFormData({ ...formData, fechaEmision: e.target.value })}
                      className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Monto *
                    </label>
                    <input
                      data-sepi-target="pagos-monto"
                      type="number"
                      required
                      min="0.01"
                      step="0.01"
                      value={formData.monto}
                      onChange={(e) => setFormData({ ...formData, monto: e.target.value })}
                      className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Tareas asociadas (opcional)
                  </label>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                    Buscá por número de tarea y seleccioná las que quieras asociar
                    {formData.tecnico ? ' (filtradas por el técnico elegido)' : ''}.
                  </p>

                  <div className="relative" ref={suggestionsRef}>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input
                        type="text"
                        value={tareaSearch}
                        onChange={(e) => handleTareaSearchChange(e.target.value)}
                        onFocus={() => {
                          if (tareaSuggestions.length > 0) setShowSuggestions(true);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            if (tareaSuggestions.length === 1) {
                              addTarea(tareaSuggestions[0]);
                            } else if (tareaSuggestions.length > 1) {
                              toast.info('Seleccioná una tarea de la lista');
                            }
                          }
                        }}
                        placeholder="Ej: 1234 o número de tarea..."
                        className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                    </div>

                    {showSuggestions && (
                      <div className="absolute z-20 mt-1 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                        {searchingTareas ? (
                          <p className="px-3 py-2 text-sm text-gray-500">Buscando...</p>
                        ) : tareaSuggestions.length === 0 ? (
                          <p className="px-3 py-2 text-sm text-gray-500">
                            No se encontraron tareas con ese número
                          </p>
                        ) : (
                          tareaSuggestions.map((tarea) => (
                            <button
                              key={tarea._id}
                              type="button"
                              onClick={() => addTarea(tarea)}
                              className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 dark:hover:bg-blue-900/30 text-gray-900 dark:text-white border-b border-gray-100 dark:border-gray-700 last:border-b-0"
                            >
                              <span className="font-semibold text-blue-600 dark:text-blue-400">
                                {tarea.numero}
                              </span>
                              <span className="text-gray-500 dark:text-gray-400"> — </span>
                              {tarea.titulo}
                            </button>
                          ))
                        )}
                      </div>
                    )}
                  </div>

                  {selectedTareas.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {selectedTareas.map((tarea) => (
                        <span
                          key={tarea._id}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-sm bg-blue-50 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 border border-blue-200 dark:border-blue-800"
                        >
                          <span className="font-medium">{tarea.numero}</span>
                          <span className="text-blue-500/70 max-w-[140px] truncate">{tarea.titulo}</span>
                          <button
                            type="button"
                            onClick={() => removeTarea(tarea._id)}
                            className="p-0.5 rounded hover:bg-blue-100 dark:hover:bg-blue-800"
                            title="Quitar"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Observaciones
                  </label>
                  <textarea
                    rows={3}
                    value={formData.observaciones}
                    onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })}
                    className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false);
                      resetForm();
                    }}
                    className="px-4 py-2 text-sm rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200"
                  >
                    Cancelar
                  </button>
                  <button
                    data-sepi-target="pagos-guardar"
                    type="submit"
                    disabled={saving}
                    className="px-4 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                  >
                    {saving ? 'Guardando...' : editingPago ? 'Actualizar' : 'Crear pago'}
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

export default PagoManualManagement;

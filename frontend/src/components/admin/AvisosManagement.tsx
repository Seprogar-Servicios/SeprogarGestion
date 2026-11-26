import React, { useEffect, useState } from 'react';
import { Bell, Edit, Plus, Trash2, X } from 'lucide-react';
import api from '../../config/api';
import AdminPageHeader from '../common/AdminPageHeader';
import { preventEnterSubmit } from '../../utils/formGuards';
import { getErrorMessage } from '../../utils/errorMessage';
import { showError, showSuccess } from '../../utils/toastUtils';
import {
  type Aviso,
  type AvisoUnidad,
  estaVigente,
  formatFechaHora,
  formatVencimiento,
  duracionMs,
} from '../avisos/avisosUtils';

type AvisoForm = {
  titulo: string;
  mensaje: string;
  duracionValor: string;
  duracionUnidad: AvisoUnidad;
};

const emptyForm: AvisoForm = {
  titulo: '',
  mensaje: '',
  duracionValor: '1',
  duracionUnidad: 'dias',
};

const MAX_DURACION_DIAS = 365;

const AvisosManagement: React.FC = () => {
  const [avisos, setAvisos] = useState<Aviso[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Aviso | null>(null);
  const [form, setForm] = useState<AvisoForm>(emptyForm);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get<{ success: boolean; data: Aviso[] }>('/avisos');
      setAvisos(res.data.data || []);
    } catch (err) {
      showError(getErrorMessage(err, 'No se pudieron cargar los avisos'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setShowModal(true);
  };

  const openEdit = (aviso: Aviso) => {
    setEditing(aviso);
    setForm({
      titulo: aviso.titulo,
      mensaje: aviso.mensaje,
      duracionValor: String(aviso.duracionValor),
      duracionUnidad: aviso.duracionUnidad,
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditing(null);
    setForm(emptyForm);
  };

  const valorNumerico = Number(form.duracionValor);
  const duracionValida =
    Number.isInteger(valorNumerico) &&
    valorNumerico >= 1 &&
    duracionMs(valorNumerico, form.duracionUnidad) <= duracionMs(MAX_DURACION_DIAS, 'dias');

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.titulo.trim() || !form.mensaje.trim()) {
      showError('Título y mensaje son obligatorios');
      return;
    }
    if (!duracionValida) {
      showError(`La duración debe ser un número entero y no superar ${MAX_DURACION_DIAS} días`);
      return;
    }

    const payload = {
      titulo: form.titulo.trim(),
      mensaje: form.mensaje.trim(),
      duracionValor: valorNumerico,
      duracionUnidad: form.duracionUnidad,
    };

    setSaving(true);
    try {
      if (editing) {
        await api.put(`/avisos/${editing._id}`, payload);
        showSuccess('Aviso actualizado');
      } else {
        await api.post('/avisos', payload);
        showSuccess('Aviso creado');
      }
      closeModal();
      await load();
    } catch (err) {
      showError(getErrorMessage(err, 'No se pudo guardar el aviso'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (aviso: Aviso) => {
    if (!window.confirm(`¿Eliminar el aviso "${aviso.titulo}"? Esta acción no se puede deshacer.`)) {
      return;
    }
    try {
      await api.delete(`/avisos/${aviso._id}`);
      showSuccess('Aviso eliminado');
      await load();
    } catch (err) {
      showError(getErrorMessage(err, 'No se pudo eliminar el aviso'));
    }
  };

  const vigentes = avisos.filter((a) => estaVigente(a));

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Avisos"
        description="Avisos internos que se muestran en el dashboard de administración"
        eyebrow="Operación"
        icon={<Bell className="h-5 w-5" />}
        actions={
          <button
            onClick={openCreate}
            className="inline-flex items-center px-4 py-2.5 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200 cursor-pointer"
          >
            <Plus className="h-4 w-4 mr-2" />
            Nuevo aviso
          </button>
        }
      />

      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 text-sm text-slate-600 dark:text-slate-300">
        Vigentes: <span className="font-semibold">{vigentes.length}</span> · Total: {avisos.length}
      </div>

      {loading ? (
        <div className="text-sm text-slate-500 dark:text-slate-400">Cargando avisos…</div>
      ) : avisos.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-dashed border-slate-300 dark:border-slate-600 p-10 text-center">
          <Bell className="h-8 w-8 mx-auto text-slate-400" />
          <h3 className="mt-3 font-semibold text-slate-900 dark:text-white">No hay avisos</h3>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Creá el primero para que aparezca en el dashboard.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {avisos.map((aviso) => {
            const vigente = estaVigente(aviso);
            return (
              <div
                key={aviso._id}
                className={`rounded-xl border p-5 bg-white dark:bg-gray-800 shadow-sm ${
                  vigente
                    ? 'border-amber-300 dark:border-amber-600'
                    : 'border-slate-200 dark:border-slate-700 opacity-75'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{aviso.titulo}</h3>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openEdit(aviso)}
                      className="p-1.5 text-gray-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-md hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer"
                      title="Editar aviso"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(aviso)}
                      className="p-1.5 text-gray-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md hover:text-red-600 dark:hover:text-red-400 cursor-pointer"
                      title="Eliminar aviso"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <p className="mt-2 text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                  {aviso.mensaje}
                </p>
                <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                  <span
                    className={`px-2 py-0.5 rounded-full font-medium ${
                      vigente
                        ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200'
                        : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {formatVencimiento(aviso.venceAt)}
                  </span>
                  <span>
                    Duración: {aviso.duracionValor} {aviso.duracionUnidad}
                  </span>
                  <span>· Creado {formatFechaHora(aviso.createdAt)}</span>
                  {aviso.creadoPor?.nombre && <span>· por {aviso.creadoPor.nombre}</span>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto p-3 sm:p-6 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md lg:max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6 bg-gradient-to-r from-amber-500 to-orange-600 p-4 -mx-6 -mt-6 rounded-t-xl">
                <h3 className="text-xl font-bold text-white">
                  {editing ? 'Editar aviso' : 'Nuevo aviso'}
                </h3>
                <button onClick={closeModal} className="text-white hover:text-gray-200 focus:outline-none" aria-label="Cerrar">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleSave} onKeyDown={preventEnterSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Título *</label>
                  <input
                    type="text"
                    required
                    maxLength={120}
                    placeholder='Ej. "Técnico no trabaja mañana"'
                    value={form.titulo}
                    onChange={(e) => setForm({ ...form, titulo: e.target.value })}
                    className="block w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Mensaje *</label>
                  <textarea
                    required
                    rows={4}
                    maxLength={1000}
                    placeholder="Detalle del aviso…"
                    value={form.mensaje}
                    onChange={(e) => setForm({ ...form, mensaje: e.target.value })}
                    className="block w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Se muestra durante *</label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      min={1}
                      step={1}
                      required
                      value={form.duracionValor}
                      onChange={(e) => setForm({ ...form, duracionValor: e.target.value })}
                      className="w-28 px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <select
                      value={form.duracionUnidad}
                      onChange={(e) => setForm({ ...form, duracionUnidad: e.target.value as AvisoUnidad })}
                      className="flex-1 px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="horas">horas</option>
                      <option value="dias">días</option>
                    </select>
                  </div>
                  <p className={`mt-1 text-xs ${duracionValida ? 'text-slate-500 dark:text-slate-400' : 'text-red-600 dark:text-red-400'}`}>
                    {duracionValida
                      ? `Máximo ${MAX_DURACION_DIAS} días. Después del tiempo indicado deja de mostrarse.`
                      : `Ingresá un número entero y no superes ${MAX_DURACION_DIAS} días.`}
                  </p>
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-4 py-2.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-60 cursor-pointer"
                  >
                    {saving ? 'Guardando…' : editing ? 'Actualizar' : 'Crear aviso'}
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

export default AvisosManagement;

import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Plus, RefreshCw, Search, Trash2, X } from 'lucide-react';
import api from '../../config/api';
import AdminPageHeader from '../common/AdminPageHeader';
import { preventEnterSubmit } from '../../utils/formGuards';
import { showError, showSuccess } from '../../utils/toastUtils';
import type { Reclamo, ReclamoEstado, ReclamoMotivo, Task, User } from '../../types';
import {
  CUENTAS_CLIENTE,
  RECLAMO_ESTADO_LABELS,
  RECLAMO_MOTIVO_LABELS,
} from '../../utils/cuentaCliente';
import { useAppDispatch, useAppSelector } from '../../store';
import { fetchUsers } from '../../store/slices/usersSlice';
import { fetchTasks } from '../../store/slices/tasksSlice';

const emptyForm = {
  tarea: '',
  cliente: '',
  cuentaCliente: '' as '' | (typeof CUENTAS_CLIENTE)[number],
  tecnicos: [] as string[],
  motivo: 'otro' as ReclamoMotivo,
  estado: 'abierto' as ReclamoEstado,
  descripcion: '',
  fechaReclamo: new Date().toISOString().slice(0, 10),
};

const ReclamosManagement: React.FC = () => {
  const dispatch = useAppDispatch();
  const { users } = useAppSelector((s) => s.users);
  const { tasks } = useAppSelector((s) => s.tasks);

  const [reclamos, setReclamos] = useState<Reclamo[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Reclamo | null>(null);
  const [form, setForm] = useState(emptyForm);

  const tecnicos = useMemo(
    () =>
      (Array.isArray(users) ? users : []).filter(
        (u) => u.rol === 'usuario' || u.rol === 'tecnico'
      ),
    [users]
  );

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get<{ success: boolean; data: Reclamo[] }>('/reclamos');
      setReclamos(res.data.data || []);
    } catch (err: any) {
      showError(err.response?.data?.message || 'Error al cargar reclamos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    dispatch(fetchUsers());
    dispatch(fetchTasks({}));
  }, [dispatch]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setShowModal(true);
  };

  const openEdit = (r: Reclamo) => {
    setEditing(r);
    const tareaId =
      typeof r.tarea === 'object' && r.tarea ? r.tarea._id : (r.tarea as string) || '';
    setForm({
      tarea: tareaId,
      cliente: r.cliente || '',
      cuentaCliente: (r.cuentaCliente as any) || '',
      tecnicos: (r.tecnicos || []).map((t) => (typeof t === 'object' ? t._id : String(t))),
      motivo: r.motivo,
      estado: r.estado,
      descripcion: r.descripcion || '',
      fechaReclamo: r.fechaReclamo
        ? new Date(r.fechaReclamo).toISOString().slice(0, 10)
        : emptyForm.fechaReclamo,
    });
    setShowModal(true);
  };

  const onSelectTarea = (taskId: string) => {
    const task = (tasks as Task[]).find((t) => t._id === taskId);
    setForm((prev) => ({
      ...prev,
      tarea: taskId,
      cliente: task?.cliente || prev.cliente,
      cuentaCliente: (task?.cuentaCliente as any) || prev.cuentaCliente,
      tecnicos: task?.tecnicos?.map((t) => (typeof t === 'object' ? t._id : String(t))) || prev.tecnicos,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      tarea: form.tarea || null,
      cliente: form.cliente,
      cuentaCliente: form.cuentaCliente || '',
      tecnicos: form.tecnicos,
      motivo: form.motivo,
      estado: form.estado,
      descripcion: form.descripcion,
      fechaReclamo: form.fechaReclamo,
    };
    try {
      if (editing) {
        await api.put(`/reclamos/${editing._id}`, payload);
        showSuccess('Reclamo actualizado');
      } else {
        await api.post('/reclamos', payload);
        showSuccess('Reclamo registrado');
      }
      setShowModal(false);
      setEditing(null);
      setForm(emptyForm);
      await load();
    } catch (err: any) {
      showError(err.response?.data?.message || 'No se pudo guardar');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('¿Eliminar este reclamo?')) return;
    try {
      await api.delete(`/reclamos/${id}`);
      showSuccess('Reclamo eliminado');
      await load();
    } catch (err: any) {
      showError(err.response?.data?.message || 'No se pudo eliminar');
    }
  };

  const filtered = reclamos.filter((r) => {
    const term = search.toLowerCase();
    if (!term) return true;
    const tareaLabel =
      typeof r.tarea === 'object' && r.tarea
        ? `${r.tarea.numero || ''} ${r.tarea.titulo || ''}`
        : '';
    return (
      (r.cliente || '').toLowerCase().includes(term) ||
      (r.descripcion || '').toLowerCase().includes(term) ||
      tareaLabel.toLowerCase().includes(term) ||
      (RECLAMO_MOTIVO_LABELS[r.motivo] || '').toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Reclamos y calidad"
        description="Registro opcional de reclamos por motivo, cuenta y técnico. Alimenta el tab Cierre/Calidad en Análisis."
        eyebrow="Calidad"
        icon={<AlertTriangle className="h-5 w-5" />}
        actions={
          <div className="flex gap-2">
            <button
              type="button"
              onClick={load}
              className="inline-flex items-center px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-600"
            >
              <RefreshCw className={`h-4 w-4 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
              Actualizar
            </button>
            <button
              type="button"
              onClick={openCreate}
              className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="h-4 w-4 mr-1.5" />
              Nuevo reclamo
            </button>
          </div>
        }
      />

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por cliente, motivo, tarea…"
          className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-gray-800 text-sm"
        />
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        {loading ? (
          <p className="p-6 text-sm text-slate-500">Cargando…</p>
        ) : filtered.length === 0 ? (
          <p className="p-6 text-sm text-slate-500">
            No hay reclamos cargados. El alta es opcional y no afecta tareas existentes.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-900/40 text-left text-xs text-slate-500">
                <tr>
                  <th className="px-4 py-3">Fecha</th>
                  <th className="px-4 py-3">Cliente / cuenta</th>
                  <th className="px-4 py-3">Motivo</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3">Tarea</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {filtered.map((r) => (
                  <tr key={r._id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/60">
                    <td className="px-4 py-3 whitespace-nowrap">
                      {new Date(r.fechaReclamo).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-900 dark:text-white">
                        {r.cliente || '—'}
                      </div>
                      <div className="text-xs text-slate-400">{r.cuentaCliente || 'Sin cuenta'}</div>
                    </td>
                    <td className="px-4 py-3">{RECLAMO_MOTIVO_LABELS[r.motivo] || r.motivo}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex px-2 py-0.5 rounded-full text-xs bg-slate-100 dark:bg-slate-700">
                        {RECLAMO_ESTADO_LABELS[r.estado] || r.estado}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      {typeof r.tarea === 'object' && r.tarea
                        ? `#${r.tarea.numero || ''} ${r.tarea.titulo || ''}`
                        : '—'}
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => openEdit(r)}
                        className="text-blue-600 text-xs mr-3 hover:underline"
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(r._id)}
                        className="text-rose-600 inline-flex items-center text-xs hover:underline"
                      >
                        <Trash2 className="h-3.5 w-3.5 mr-0.5" />
                        Borrar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="w-full max-w-lg bg-white dark:bg-gray-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-700">
              <h3 className="font-semibold text-slate-900 dark:text-white">
                {editing ? 'Editar reclamo' : 'Nuevo reclamo'}
              </h3>
              <button type="button" onClick={() => setShowModal(false)}>
                <X className="h-5 w-5 text-slate-400" />
              </button>
            </div>
            <form onSubmit={handleSubmit} onKeyDown={preventEnterSubmit} className="p-5 space-y-3">
              <div>
                <label className="text-xs text-slate-500">Tarea (opcional)</label>
                <select
                  value={form.tarea}
                  onChange={(e) => onSelectTarea(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-gray-700 text-sm py-2 px-2"
                >
                  <option value="">Sin vincular</option>
                  {(Array.isArray(tasks) ? tasks : []).slice(0, 400).map((t: Task) => (
                    <option key={t._id} value={t._id}>
                      #{t.numero} · {t.titulo} · {t.cliente || 's/cliente'}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-500">Cliente</label>
                  <input
                    value={form.cliente}
                    onChange={(e) => setForm({ ...form, cliente: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-gray-700 text-sm py-2 px-2"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-500">Cuenta (opcional)</label>
                  <select
                    value={form.cuentaCliente}
                    onChange={(e) =>
                      setForm({ ...form, cuentaCliente: e.target.value as any })
                    }
                    className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-gray-700 text-sm py-2 px-2"
                  >
                    <option value="">Inferir / sin clasificar</option>
                    {CUENTAS_CLIENTE.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-500">Motivo *</label>
                  <select
                    required
                    value={form.motivo}
                    onChange={(e) =>
                      setForm({ ...form, motivo: e.target.value as ReclamoMotivo })
                    }
                    className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-gray-700 text-sm py-2 px-2"
                  >
                    {Object.entries(RECLAMO_MOTIVO_LABELS).map(([k, label]) => (
                      <option key={k} value={k}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-slate-500">Estado</label>
                  <select
                    value={form.estado}
                    onChange={(e) =>
                      setForm({ ...form, estado: e.target.value as ReclamoEstado })
                    }
                    className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-gray-700 text-sm py-2 px-2"
                  >
                    {Object.entries(RECLAMO_ESTADO_LABELS).map(([k, label]) => (
                      <option key={k} value={k}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs text-slate-500">Técnicos (opcional)</label>
                <select
                  multiple
                  value={form.tecnicos}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      tecnicos: Array.from(e.target.selectedOptions, (o) => o.value),
                    })
                  }
                  className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-gray-700 text-sm py-1.5 min-h-[80px]"
                >
                  {tecnicos.map((u: User) => (
                    <option key={u._id} value={u._id}>
                      {u.nombre}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-500">Fecha</label>
                <input
                  type="date"
                  value={form.fechaReclamo}
                  onChange={(e) => setForm({ ...form, fechaReclamo: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-gray-700 text-sm py-2 px-2"
                />
              </div>
              <div>
                <label className="text-xs text-slate-500">Descripción</label>
                <textarea
                  rows={3}
                  value={form.descripcion}
                  onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-gray-700 text-sm py-2 px-2"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-600"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700"
                >
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReclamosManagement;

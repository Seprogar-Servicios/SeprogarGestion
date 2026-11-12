import React, { useEffect, useState } from 'react';
import { X, Calendar, Clock, User, Hash } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../../store';
import { createTask, fetchCalendarTasks } from '../../store/slices/tasksSlice';
import { fetchUsers } from '../../store/slices/usersSlice';
import { showError, showSuccess } from '../../utils/toastUtils';
import { preventEnterSubmit } from '../../utils/formGuards';
import AddressAutocomplete from '../common/AddressAutocomplete';
import { CUENTAS_CLIENTE } from '../../utils/cuentaCliente';
import type { CuentaCliente } from '../../types';

export interface QuickCreateDefaults {
  fechaEjecucion: string; // YYYY-MM-DD
  horaInicio?: string; // HH:mm
  horaFin?: string;
  allDay?: boolean;
}

interface TaskQuickCreateModalProps {
  defaults: QuickCreateDefaults;
  onClose: () => void;
  onCreated?: () => void;
  calendarFilters?: Record<string, string>;
}

const TaskQuickCreateModal: React.FC<TaskQuickCreateModalProps> = ({
  defaults,
  onClose,
  onCreated,
  calendarFilters,
}) => {
  const dispatch = useAppDispatch();
  const { users } = useAppSelector((s) => s.users);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    numero: '',
    titulo: '',
    cliente: '',
    cuentaCliente: '' as '' | CuentaCliente,
    direccion: '',
    descripcion: '',
    fechaEjecucion: defaults.fechaEjecucion,
    horaInicio: defaults.horaInicio || '09:00',
    horaFin: defaults.horaFin || '10:00',
    allDay: !!defaults.allDay,
    tecnicos: [] as string[],
  });
  const [ubicacionCoords, setUbicacionCoords] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    dispatch(fetchUsers());
  }, [dispatch]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.numero.trim() || !form.titulo.trim()) {
      showError('Número y título son obligatorios');
      return;
    }

    setSaving(true);
    try {
      const franja_horaria = form.allDay
        ? ''
        : `${form.horaInicio} - ${form.horaFin}`;

      await dispatch(
        createTask({
          numero: form.numero.trim(),
          titulo: form.titulo.trim(),
          cliente: form.cliente.trim(),
          ...(form.cuentaCliente ? { cuentaCliente: form.cuentaCliente } : {}),
          direccion: form.direccion.trim(),
          descripcion: form.descripcion.trim(),
          fechaEjecucion: form.fechaEjecucion,
          franja_horaria,
          estado: 'pendiente',
          tecnicos: form.tecnicos,
          ...(ubicacionCoords
            ? {
                ubicacionMapa: {
                  lat: ubicacionCoords.lat,
                  lng: ubicacionCoords.lng,
                  fuente: 'direccion',
                },
              }
            : {}),
        } as any)
      ).unwrap();

      showSuccess('Tarea creada');
      if (calendarFilters) {
        dispatch(fetchCalendarTasks(calendarFilters as any));
      }
      onCreated?.();
      onClose();
    } catch (err: any) {
      showError(typeof err === 'string' ? err : 'Error al crear la tarea');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="relative w-full max-w-md rounded-2xl bg-white dark:bg-gray-800 shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Nueva tarea
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          onKeyDown={preventEnterSubmit}
          className="px-5 py-4 space-y-3 max-h-[75vh] overflow-y-auto"
        >
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">
              Número *
            </label>
            <div className="relative">
              <Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                autoFocus
                value={form.numero}
                onChange={(e) => setForm({ ...form, numero: e.target.value })}
                className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white"
                placeholder="Ej. 245001"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">
              Título *
            </label>
            <input
              value={form.titulo}
              onChange={(e) => setForm({ ...form, titulo: e.target.value })}
              className="w-full px-3 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white"
              placeholder="Descripción corta"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">
                Fecha
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="date"
                  value={form.fechaEjecucion}
                  onChange={(e) => setForm({ ...form, fechaEjecucion: e.target.value })}
                  className="w-full pl-9 pr-2 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm"
                />
              </div>
            </div>
            <div className="flex items-end pb-1">
              <label className="inline-flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.allDay}
                  onChange={(e) => setForm({ ...form, allDay: e.target.checked })}
                  className="rounded border-gray-300"
                />
                Todo el día
              </label>
            </div>
          </div>

          {!form.allDay && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">
                  Desde
                </label>
                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="time"
                    value={form.horaInicio}
                    onChange={(e) => setForm({ ...form, horaInicio: e.target.value })}
                    className="w-full pl-9 pr-2 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">
                  Hasta
                </label>
                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="time"
                    value={form.horaFin}
                    onChange={(e) => setForm({ ...form, horaFin: e.target.value })}
                    className="w-full pl-9 pr-2 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm"
                  />
                </div>
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">
              Cliente
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                value={form.cliente}
                onChange={(e) => setForm({ ...form, cliente: e.target.value })}
                className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">
              Proveedor / Cuenta
            </label>
            <select
              value={form.cuentaCliente}
              onChange={(e) =>
                setForm({ ...form, cuentaCliente: e.target.value as '' | CuentaCliente })
              }
              className="w-full px-3 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm"
            >
              <option value="">Sin clasificar</option>
              {CUENTAS_CLIENTE.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <AddressAutocomplete
            label="Dirección"
            value={form.direccion}
            onChange={(direccion) => {
              setForm({ ...form, direccion });
              setUbicacionCoords(null);
            }}
            onSelect={(s) => {
              setForm((prev) => ({ ...prev, direccion: s.label }));
              setUbicacionCoords({ lat: s.lat, lng: s.lng });
            }}
          />

          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">
              Técnicos
            </label>
            <select
              multiple
              value={form.tecnicos}
              onChange={(e) =>
                setForm({
                  ...form,
                  tecnicos: Array.from(e.target.selectedOptions, (o) => o.value),
                })
              }
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm py-1.5 min-h-[88px]"
            >
              {(Array.isArray(users) ? users : [])
                .filter((u) => u.rol === 'usuario' || u.rol === 'tecnico')
                .map((u) => (
                  <option key={u._id} value={u._id}>
                    {u.nombre}
                    {u.localidad ? ` · ${u.localidad}` : ''}
                  </option>
                ))}
            </select>
            <p className="mt-1 text-[11px] text-gray-400">
              Opcional. Sin técnico = gris en el calendario. Ctrl/Cmd + clic para varios.
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm rounded-full border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 text-sm font-medium rounded-full bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {saving ? 'Guardando…' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TaskQuickCreateModal;

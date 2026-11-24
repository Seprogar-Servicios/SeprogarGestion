import React, { useEffect, useState } from 'react';
import { X, Calendar, Clock, User, Hash, Briefcase } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../../store';
import { createTask, fetchCalendarTasks } from '../../store/slices/tasksSlice';
import { fetchUsers } from '../../store/slices/usersSlice';
import { fetchEspecialidades } from '../../store/slices/especialidadesSlice';
import { fetchProveedores } from '../../store/slices/proveedoresSlice';
import { showError, showSuccess } from '../../utils/toastUtils';
import { getErrorMessage } from '../../utils/errorMessage';
import { preventEnterSubmit } from '../../utils/formGuards';
import AddressAutocomplete from '../common/AddressAutocomplete';
import TecnicoMultiSelect from '../common/TecnicoMultiSelect';

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
  const { especialidades } = useAppSelector((s) => s.especialidades);
  const { proveedores } = useAppSelector((s) => s.proveedores);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    numero: '',
    titulo: '',
    cliente: '',
    direccion: '',
    direccionExtra: '',
    entreCalles: '',
    especialidad: '',
    proveedor: '',
    vip: false,
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
    dispatch(fetchEspecialidades());
    dispatch(fetchProveedores());
  }, [dispatch]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.numero.trim() || !form.titulo.trim()) {
      showError('Número y título son obligatorios');
      return;
    }
    if (form.direccion.trim() && !ubicacionCoords) {
      showError('Elegí la dirección de la lista para confirmar el punto exacto (WhatsApp / Maps).');
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
          direccion: form.direccion.trim(),
          direccionExtra: form.direccionExtra.trim(),
          entreCalles: form.entreCalles.trim(),
          ...(form.especialidad ? { especialidad: form.especialidad } : {}),
          ...(form.proveedor ? { proveedor: form.proveedor } : {}),
          vip: Boolean(form.vip),
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
                ubicacionDireccion: {
                  lat: ubicacionCoords.lat,
                  lng: ubicacionCoords.lng,
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
      showError(getErrorMessage(err, 'Error al crear la tarea'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto p-3 sm:p-6 bg-black/40 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="relative w-full max-w-md lg:max-w-lg xl:max-w-2xl my-4 rounded-2xl bg-white dark:bg-gray-800 shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden"
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
              Proveedor
            </label>
            <select
              value={form.proveedor}
              onChange={(e) => setForm({ ...form, proveedor: e.target.value })}
              className="w-full px-3 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm"
            >
              <option value="">Sin proveedor</option>
              {proveedores
                .filter((p) => p.activo !== false)
                .map((p) => (
                  <option key={p._id} value={p._id}>
                    {p.nombre}
                  </option>
                ))}
            </select>
          </div>

          <label className="inline-flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
            <input
              type="checkbox"
              checked={form.vip}
              onChange={(e) => setForm({ ...form, vip: e.target.checked })}
              className="h-4 w-4 rounded border-gray-300 text-amber-600 focus:ring-amber-500"
            />
            VIP
          </label>

          <AddressAutocomplete
            label="Dirección"
            value={form.direccion}
            requireSelect
            confirmed={Boolean(ubicacionCoords)}
            onChange={(direccion) => {
              setForm({ ...form, direccion });
              setUbicacionCoords(null);
            }}
            onSelect={(s) => {
              setForm((prev) => ({ ...prev, direccion: s.label }));
              setUbicacionCoords({ lat: s.lat, lng: s.lng });
            }}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">
                Datos extras
              </label>
              <input
                type="text"
                value={form.direccionExtra}
                onChange={(e) => setForm({ ...form, direccionExtra: e.target.value })}
                placeholder="Piso 2D, timbre…"
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">
                Entre calles
              </label>
              <input
                type="text"
                value={form.entreCalles}
                onChange={(e) => setForm({ ...form, entreCalles: e.target.value })}
                placeholder="Entre X y Y"
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">
              Especialidad
            </label>
            <div className="relative">
              <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <select
                value={form.especialidad}
                onChange={(e) => setForm({ ...form, especialidad: e.target.value })}
                className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm"
              >
                <option value="">Sin especialidad</option>
                {especialidades.map((esp) => (
                  <option key={esp._id} value={esp._id}>
                    {esp.nombre}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <TecnicoMultiSelect
            users={Array.isArray(users) ? users : []}
            value={form.tecnicos}
            onChange={(tecnicos) => setForm({ ...form, tecnicos })}
            label="Técnicos"
            hint="Opcional: sin técnico, uno o varios."
          />

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

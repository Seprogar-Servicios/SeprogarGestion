import React, { useEffect, useState } from 'react';
import {
  Lightbulb,
  MapPin,
  Clock,
  Calendar,
  Search,
  AlertTriangle,
  Home,
  Route,
  Phone,
  Sparkles,
  Briefcase,
  Hash,
  Loader2,
  UserPlus,
  Plus,
  X,
} from 'lucide-react';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import api from '../../config/api';
import { useAppDispatch, useAppSelector } from '../../store';
import { fetchEspecialidades } from '../../store/slices/especialidadesSlice';
import { updateTask } from '../../store/slices/tasksSlice';
import AdminPageHeader from '../common/AdminPageHeader';
import AddressAutocomplete, { type AddressSuggestion } from '../common/AddressAutocomplete';
import { showError, showSuccess } from '../../utils/toastUtils';
import { parseFranjaHoraria, toFechaEjecucionYmd } from '../../utils/franjaHoraria';
import type { Task } from '../../types';
import type { RecommendCreatePrefill } from '../../types/recommendPrefill';

type Recomendacion = {
  tecnico: {
    _id: string;
    nombre: string;
    telefono?: string;
    localidad?: string;
    direccion?: string;
    color?: string;
    especialidad?: { nombre?: string } | string;
  };
  distanciaKm: number | null;
  modo: string;
  motivo: string;
  conflictoFranja: boolean;
  tareasDelDia: number;
  ancla: { lat: number; lng: number; fuente: string; label: string } | null;
  tareaAncla: {
    _id: string;
    numero?: string;
    titulo?: string;
    franja_horaria?: string;
    direccion?: string;
  } | null;
  score: number;
};

type RecommendResponse = {
  fecha: string;
  direccion: string | null;
  franja: { inicio: string; fin: string };
  destino: { lat: number; lng: number };
  recomendaciones: Recomendacion[];
  meta: {
    tecnicosEvaluados: number;
    tecnicosConCoords?: number;
    tecnicosOmitidosSinCoords?: number;
    tareasDelDia: number;
    tareasDelDiaConCoords?: number;
    filtroEspecialidad?: boolean;
  };
};

const TecnicoRecommendPage: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { especialidades } = useAppSelector((state) => state.especialidades);
  const [direccion, setDireccion] = useState('');
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [fecha, setFecha] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [horaInicio, setHoraInicio] = useState('10:00');
  const [horaFin, setHoraFin] = useState('12:00');
  const [especialidadId, setEspecialidadId] = useState('');
  const [numeroTarea, setNumeroTarea] = useState('');
  const [loadingTarea, setLoadingTarea] = useState(false);
  const [tareaCargadaId, setTareaCargadaId] = useState<string | null>(null);
  const [tareaCargadaLabel, setTareaCargadaLabel] = useState<string | null>(null);
  const [autoWarnings, setAutoWarnings] = useState<string[]>([]);
  /** true = rankear por cercanía aunque solape franja (puede terminar antes) */
  const [priorizarCercania, setPriorizarCercania] = useState(false);
  const [loading, setLoading] = useState(false);
  const [assigningId, setAssigningId] = useState<string | null>(null);
  const [result, setResult] = useState<RecommendResponse | null>(null);

  /** Modo autocompletar: hay tarea existente sin técnico (o a completar). */
  const modoAsignar = Boolean(tareaCargadaId);

  useEffect(() => {
    dispatch(fetchEspecialidades());
  }, [dispatch]);

  const clearTareaCargada = () => {
    setTareaCargadaId(null);
    setTareaCargadaLabel(null);
    setAutoWarnings([]);
    setNumeroTarea('');
  };

  const especialidadIdOf = (esp: Task['especialidad']) => {
    if (!esp) return '';
    if (typeof esp === 'string') return esp;
    return esp._id || '';
  };

  const buildUpdateFromTask = (task: Task, tecnicos: string[]) => {
    const origenRaw = String(task.origen || 'sistema');
    const origen =
      origenRaw === 'whatsapp' || origenRaw === 'web' || origenRaw === 'sistema'
        ? origenRaw
        : 'sistema';
    return {
      numero: task.numero,
      titulo: task.titulo,
      descripcion: task.descripcion || '',
      estado: task.estado,
      tecnicos,
      fechaEjecucion: toFechaEjecucionYmd(task.fechaEjecucion || null) || '',
      franja_horaria: task.franja_horaria || '',
      cliente: task.cliente || '',
      cuentaCliente: task.cuentaCliente || '',
      numeroTitular: task.numeroTitular || '',
      direccion: task.direccion || '',
      direccionExtra: task.direccionExtra || '',
      entreCalles: task.entreCalles || '',
      especialidad: especialidadIdOf(task.especialidad) || null,
      origen,
      ...(task.ubicacionMapa?.lat != null && task.ubicacionMapa?.lng != null
        ? {
            ubicacionMapa: {
              lat: task.ubicacionMapa.lat,
              lng: task.ubicacionMapa.lng,
              fuente: task.ubicacionMapa.fuente || 'direccion',
            },
          }
        : {}),
    };
  };

  const assignTecnicoToLoadedTask = async (tecnicoId: string, tecnicoNombre: string) => {
    if (!tareaCargadaId) return;
    setAssigningId(tecnicoId);
    try {
      const res = await api.get<{ success: boolean; data: Task }>(`/tareas/${tareaCargadaId}`);
      const task = res.data.data;
      const existing = Array.isArray(task.tecnicos)
        ? task.tecnicos.map((t) => (typeof t === 'string' ? t : t._id)).filter(Boolean)
        : [];
      if (existing.includes(tecnicoId)) {
        showSuccess(`${tecnicoNombre} ya está asignado a esta tarea`);
        return;
      }
      const tecnicos = [...existing, tecnicoId];
      await dispatch(
        updateTask({ id: tareaCargadaId, data: buildUpdateFromTask(task, tecnicos) })
      ).unwrap();
      showSuccess(`Asignado ${tecnicoNombre} a ${tareaCargadaLabel || 'la tarea'}`);
    } catch (err: any) {
      showError(typeof err === 'string' ? err : err?.message || 'No se pudo asignar el técnico');
    } finally {
      setAssigningId(null);
    }
  };

  const openCreateTaskWithTecnico = (tecnicoId: string) => {
    const prefill: RecommendCreatePrefill = {
      direccion: direccion.trim(),
      especialidadId: especialidadId || '',
      fechaEjecucion: fecha,
      horaInicio,
      horaFin,
      tecnicoId,
      coords: coords || undefined,
    };
    navigate('/tasks', { state: { createFromRecommend: prefill } });
  };

  const especialidadLabel = (esp: Recomendacion['tecnico']['especialidad']) => {
    if (!esp) return null;
    if (typeof esp === 'object') return esp.nombre || null;
    return String(esp);
  };

  const loadFromTaskNumber = async () => {
    const numero = numeroTarea.trim();
    if (!numero) {
      showError('Ingresá el número de tarea');
      return;
    }
    setLoadingTarea(true);
    setAutoWarnings([]);
    try {
      const res = await api.get<{ success: boolean; data: Task }>(
        `/tareas/numero/${encodeURIComponent(numero)}`
      );
      const task = res.data.data;
      const missing: string[] = [];

      // Reset completo para no mezclar con una carga anterior
      setDireccion('');
      setCoords(null);
      setEspecialidadId('');
      setHoraInicio('10:00');
      setHoraFin('12:00');
      setFecha(format(new Date(), 'yyyy-MM-dd'));

      const dir = (task.direccion || '').trim();
      if (dir) {
        setDireccion(dir);
      } else {
        missing.push('dirección');
      }

      const dirLat = task.ubicacionDireccion?.lat;
      const dirLng = task.ubicacionDireccion?.lng;
      const mapLat = task.ubicacionMapa?.lat;
      const mapLng = task.ubicacionMapa?.lng;
      const mapFuente = task.ubicacionMapa?.fuente;
      if (typeof dirLat === 'number' && typeof dirLng === 'number') {
        setCoords({ lat: dirLat, lng: dirLng });
      } else if (
        typeof mapLat === 'number' &&
        typeof mapLng === 'number' &&
        (mapFuente === 'direccion' || mapFuente == null || mapFuente === '')
      ) {
        setCoords({ lat: mapLat, lng: mapLng });
      } else {
        setCoords(null);
        if (dir) missing.push('coordenadas confirmadas (elegí sugerencia)');
      }

      const ymd = toFechaEjecucionYmd(task.fechaEjecucion || null);
      if (ymd) setFecha(ymd);
      else missing.push('fecha de ejecución');

      const franja = parseFranjaHoraria(task.franja_horaria);
      if (franja) {
        setHoraInicio(franja.startTime);
        setHoraFin(franja.endTime);
      } else {
        missing.push('franja horaria');
      }

      const espId = especialidadIdOf(task.especialidad);
      if (espId) setEspecialidadId(espId);
      else missing.push('especialidad');

      setTareaCargadaId(task._id);
      setTareaCargadaLabel(`#${task.numero}${task.titulo ? ` · ${task.titulo}` : ''}`);
      setAutoWarnings(missing);
      if (missing.length) {
        showSuccess('Tarea cargada. Completá o revisá lo que falta y calculá igual.');
      } else {
        showSuccess('Tarea cargada con todos los datos');
      }
    } catch (err: any) {
      setTareaCargadaId(null);
      setTareaCargadaLabel(null);
      showError(err.response?.data?.message || 'No se encontró la tarea');
    } finally {
      setLoadingTarea(false);
    }
  };

  const handleRecommend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!coords) {
      showError(
        'Para recomendar elegí la dirección de la lista (punto confirmado). No usamos coordenadas inventadas.'
      );
      return;
    }
    setLoading(true);
    try {
      const res = await api.post<{ success: boolean; data: RecommendResponse }>(
        '/tareas/recomendar-tecnicos',
        {
          direccion: direccion.trim(),
          fecha,
          horaInicio,
          horaFin,
          priorizarCercania,
          ...(especialidadId ? { especialidadId } : {}),
          ...(tareaCargadaId ? { excludeTareaId: tareaCargadaId } : {}),
          ...(coords ? { lat: coords.lat, lng: coords.lng } : {}),
        }
      );
      setResult(res.data.data);
      showSuccess('Recomendaciones actualizadas');
    } catch (err: any) {
      setResult(null);
      showError(err.response?.data?.message || 'No se pudo calcular la recomendación');
    } finally {
      setLoading(false);
    }
  };

  const top = result?.recomendaciones?.[0];

  return (
    <div className="space-y-4 pb-8 animate-fadeIn">
      <AdminPageHeader
        title="Recomendación de técnico"
        description="Sugiere quién puede tomar una tarea según zona, franja y especialidad."
        eyebrow="Operaciones"
        icon={<Lightbulb className="h-5 w-5" />}
      />

      <div className="rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800 px-4 py-3 text-sm text-amber-900 dark:text-amber-100">
        <strong>Cómo funciona:</strong> con <em>número de tarea</em> podés asignar el técnico
        sugerido a esa tarea. Sin número (solo dirección/filtro) podés abrir el alta de
        tarea con esos datos y el técnico ya elegido. Si falta algo al autocompletar, te
        avisa pero igual podés calcular.
      </div>

      <form
        onSubmit={handleRecommend}
        className="bg-white dark:bg-gray-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 space-y-4"
      >
        <div className="rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50/70 dark:bg-slate-900/30 p-3 space-y-2">
          <label className="block text-xs font-medium text-slate-500">
            Cargar desde número de tarea (opcional)
          </label>
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={numeroTarea}
                onChange={(e) => setNumeroTarea(e.target.value)}
                placeholder="Ej. 1234"
                className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-gray-700 text-sm"
              />
            </div>
            <button
              type="button"
              onClick={loadFromTaskNumber}
              disabled={loadingTarea}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-700 disabled:opacity-60"
            >
              {loadingTarea ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}
              Autocompletar
            </button>
          </div>
          {tareaCargadaLabel && (
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs text-emerald-700 dark:text-emerald-300">
                Cargada: {tareaCargadaLabel} · modo asignar técnico
              </p>
              <button
                type="button"
                onClick={clearTareaCargada}
                className="inline-flex items-center gap-1 text-[11px] text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
              >
                <X className="h-3 w-3" />
                Quitar
              </button>
            </div>
          )}
          {!tareaCargadaId && (
            <p className="text-[11px] text-slate-500">
              Sin tarea cargada · modo crear tarea nueva desde el filtro
            </p>
          )}
          {autoWarnings.length > 0 && (
            <div className="text-xs text-amber-800 dark:text-amber-200 flex items-start gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
              <span>
                Falta o incompleto: {autoWarnings.join(', ')}. Podés completar a mano y
                calcular igual.
              </span>
            </div>
          )}
        </div>

        <AddressAutocomplete
          label="Dirección de la tarea"
          value={direccion}
          requireSelect
          confirmed={Boolean(coords)}
          onChange={(v) => {
            setDireccion(v);
            setCoords(null);
          }}
          onSelect={(s: AddressSuggestion) => {
            setDireccion(s.label);
            setCoords({ lat: s.lat, lng: s.lng });
          }}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Especialidad</label>
            <div className="relative">
              <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <select
                value={especialidadId}
                onChange={(e) => setEspecialidadId(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-gray-700 text-sm"
              >
                <option value="">Todas</option>
                {especialidades.map((esp) => (
                  <option key={esp._id} value={esp._id}>
                    {esp.nombre}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Día</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="date"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-gray-700 text-sm"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Desde</label>
            <div className="relative">
              <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="time"
                value={horaInicio}
                onChange={(e) => setHoraInicio(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-gray-700 text-sm"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Hasta</label>
            <div className="relative">
              <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="time"
                value={horaFin}
                onChange={(e) => setHoraFin(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-gray-700 text-sm"
              />
            </div>
          </div>
        </div>

        <label className="flex items-start gap-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50/80 dark:bg-slate-900/30 px-3 py-3 cursor-pointer">
          <input
            type="checkbox"
            checked={priorizarCercania}
            onChange={(e) => setPriorizarCercania(e.target.checked)}
            className="mt-1 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
          />
          <span className="text-sm text-slate-700 dark:text-slate-200">
            <span className="font-medium">Priorizar cercanía aunque solape franja</span>
            <span className="block text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Activado: gana el más cerca (puede terminar antes y llegar). Desactivado:
              prioriza a quien no tenga franja coincidente y, entre esos, el más cerca.
            </span>
          </span>
        </label>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-60"
          >
            <Search className={`h-4 w-4 ${loading ? 'animate-pulse' : ''}`} />
            {loading ? 'Calculando…' : 'Recomendar técnicos'}
          </button>
        </div>
      </form>

      {result && (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2 text-xs text-slate-500">
            <span className="px-2 py-1 rounded-full bg-slate-100 dark:bg-slate-700">
              {result.meta.tecnicosConCoords ?? result.recomendaciones.length} con
              ubicación
            </span>
            {(result.meta.tecnicosOmitidosSinCoords || 0) > 0 && (
              <span className="px-2 py-1 rounded-full bg-amber-100 dark:bg-amber-950/40 text-amber-800 dark:text-amber-200">
                {result.meta.tecnicosOmitidosSinCoords} omitidos sin coords
              </span>
            )}
            <span className="px-2 py-1 rounded-full bg-slate-100 dark:bg-slate-700">
              {result.meta.tareasDelDiaConCoords ?? '—'} / {result.meta.tareasDelDia}{' '}
              tareas con punto
            </span>
            <span className="px-2 py-1 rounded-full bg-slate-100 dark:bg-slate-700">
              Franja {result.franja.inicio} – {result.franja.fin}
            </span>
            {result.meta.filtroEspecialidad && (
              <span className="px-2 py-1 rounded-full bg-indigo-100 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-200">
                Filtrado por especialidad
              </span>
            )}
          </div>

          {result.recomendaciones.length === 0 && (
            <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-gray-800 px-4 py-6 text-sm text-slate-600 dark:text-slate-300 text-center">
              No hay técnicos con ubicación cargada
              {especialidadId ? ' para esa especialidad' : ''}. Cargá localidad base
              (sugerencia) en los técnicos o usá otro filtro.
            </div>
          )}

          {top && (
            <div className="rounded-2xl border-2 border-emerald-400/70 bg-emerald-50/80 dark:bg-emerald-950/20 dark:border-emerald-700 p-4">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-200 text-sm font-semibold mb-2">
                    <Sparkles className="h-4 w-4" />
                    Mejor opción sugerida
                  </div>
                  <p className="text-lg font-bold text-slate-900 dark:text-white">
                    {top.tecnico.nombre}
                    {top.distanciaKm != null ? (
                      <span className="ml-2 text-base font-semibold text-emerald-700 dark:text-emerald-300">
                        ~{top.distanciaKm} km
                      </span>
                    ) : null}
                  </p>
                  <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">{top.motivo}</p>
                  {top.conflictoFranja && (
                    <p className="mt-2 text-xs text-amber-800 dark:text-amber-200 inline-flex items-center gap-1">
                      <AlertTriangle className="h-3.5 w-3.5" />
                      Tiene solapamiento de franja ese día
                    </p>
                  )}
                </div>
                {modoAsignar ? (
                  <button
                    type="button"
                    disabled={assigningId === top.tecnico._id}
                    onClick={() =>
                      assignTecnicoToLoadedTask(top.tecnico._id, top.tecnico.nombre)
                    }
                    className="inline-flex items-center justify-center gap-1.5 text-sm px-4 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60 shrink-0"
                  >
                    {assigningId === top.tecnico._id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <UserPlus className="h-4 w-4" />
                    )}
                    Asignar a tarea
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => openCreateTaskWithTecnico(top.tecnico._id)}
                    className="inline-flex items-center justify-center gap-1.5 text-sm px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 shrink-0"
                  >
                    <Plus className="h-4 w-4" />
                    Crear tarea
                  </button>
                )}
              </div>
            </div>
          )}

          <ul className="space-y-2">
            {result.recomendaciones.map((r, idx) => {
              const esp = especialidadLabel(r.tecnico.especialidad);
              const isTop = idx === 0;
              return (
                <li
                  key={r.tecnico._id}
                  className={`rounded-xl border p-4 bg-white dark:bg-gray-800 ${
                    isTop
                      ? 'border-emerald-300 dark:border-emerald-700'
                      : 'border-slate-200 dark:border-slate-700'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-slate-400 tabular-nums">
                          #{idx + 1}
                        </span>
                        <span
                          className="h-3 w-3 rounded-full shrink-0"
                          style={{ background: r.tecnico.color || '#9aa0a6' }}
                        />
                        <h3 className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                          {r.tecnico.nombre}
                        </h3>
                        {r.distanciaKm != null ? (
                          <span className="text-xs font-semibold text-blue-700 dark:text-blue-300">
                            ~{r.distanciaKm} km
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400">Sin distancia</span>
                        )}
                      </div>
                      <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
                        {r.motivo}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2 text-[11px]">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                          {r.modo === 'base' || r.modo === 'base_antes_recorrido' ? (
                            <Home className="h-3 w-3" />
                          ) : (
                            <Route className="h-3 w-3" />
                          )}
                          {r.tareasDelDia} tareas ese día
                        </span>
                        {esp && (
                          <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                            {esp}
                          </span>
                        )}
                        {r.tecnico.localidad && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                            <MapPin className="h-3 w-3" />
                            {r.tecnico.localidad}
                          </span>
                        )}
                        {r.conflictoFranja && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
                            <AlertTriangle className="h-3 w-3" />
                            Conflicto de franja
                          </span>
                        )}
                      </div>
                      {r.tecnico.telefono && (
                        <p className="mt-2 text-xs text-slate-500 flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {r.tecnico.telefono}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col gap-2 shrink-0">
                      {modoAsignar ? (
                        <button
                          type="button"
                          disabled={assigningId === r.tecnico._id}
                          onClick={() =>
                            assignTecnicoToLoadedTask(r.tecnico._id, r.tecnico.nombre)
                          }
                          className="inline-flex items-center justify-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60"
                        >
                          {assigningId === r.tecnico._id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <UserPlus className="h-3.5 w-3.5" />
                          )}
                          Asignar a tarea
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => openCreateTaskWithTecnico(r.tecnico._id)}
                          className="inline-flex items-center justify-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          Crear tarea
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() =>
                          navigate(
                            `/admin/mapa-dia?fecha=${encodeURIComponent(result.fecha)}&tecnico=${r.tecnico._id}`
                          )
                        }
                        className="text-xs px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700"
                      >
                        Ver mapa del día
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
};

export default TecnicoRecommendPage;

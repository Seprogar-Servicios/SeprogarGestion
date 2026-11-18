import React, { useState } from 'react';
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
} from 'lucide-react';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import api from '../../config/api';
import AdminPageHeader from '../common/AdminPageHeader';
import AddressAutocomplete, { type AddressSuggestion } from '../common/AddressAutocomplete';
import { showError, showSuccess } from '../../utils/toastUtils';

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
  meta: { tecnicosEvaluados: number; tareasDelDia: number };
};

const TecnicoRecommendPage: React.FC = () => {
  const navigate = useNavigate();
  const [direccion, setDireccion] = useState('');
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [fecha, setFecha] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [horaInicio, setHoraInicio] = useState('10:00');
  const [horaFin, setHoraFin] = useState('12:00');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<RecommendResponse | null>(null);

  const especialidadLabel = (esp: Recomendacion['tecnico']['especialidad']) => {
    if (!esp) return null;
    if (typeof esp === 'object') return esp.nombre || null;
    return String(esp);
  };

  const handleRecommend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!direccion.trim()) {
      showError('Ingresá una dirección');
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
        description="Pantalla de prueba: sugiere quién puede tomar una tarea según zona y franja."
        eyebrow="Operaciones · prueba"
        icon={<Lightbulb className="h-5 w-5" />}
      />

      <div className="rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800 px-4 py-3 text-sm text-amber-900 dark:text-amber-100">
        <strong>Cómo funciona:</strong> si el técnico no tiene tareas ese día, se mide
        distancia a su domicilio/base. Si ya tiene recorrido, se mira quién quedaría más
        cerca al terminar la tarea anterior a esa franja. Los conflictos de horario se
        marcan pero igual aparecen en el ranking.
      </div>

      <form
        onSubmit={handleRecommend}
        className="bg-white dark:bg-gray-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 space-y-4"
      >
        <AddressAutocomplete
          label="Dirección de la nueva tarea"
          value={direccion}
          onChange={(v) => {
            setDireccion(v);
            setCoords(null);
          }}
          onSelect={(s: AddressSuggestion) => {
            setDireccion(s.label);
            setCoords({ lat: s.lat, lng: s.lng });
          }}
        />

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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
              {result.meta.tecnicosEvaluados} técnicos evaluados
            </span>
            <span className="px-2 py-1 rounded-full bg-slate-100 dark:bg-slate-700">
              {result.meta.tareasDelDia} tareas ese día
            </span>
            <span className="px-2 py-1 rounded-full bg-slate-100 dark:bg-slate-700">
              Franja {result.franja.inicio} – {result.franja.fin}
            </span>
          </div>

          {top && (
            <div className="rounded-2xl border-2 border-emerald-400/70 bg-emerald-50/80 dark:bg-emerald-950/20 dark:border-emerald-700 p-4">
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

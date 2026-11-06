import React, { useEffect, useMemo, useState } from 'react';
import { Sparkles, MapPin, User } from 'lucide-react';
import api from '../../config/api';
import type { User as AppUser } from '../../types';

type Ranked = {
  _id: string;
  nombre: string;
  especialidad?: { _id: string; nombre: string } | string | null;
  localidad?: string | null;
  distanciaKm: number | null;
  tieneUbicacion: boolean;
};

type Props = {
  users: AppUser[];
  value: string[];
  onChange: (ids: string[]) => void;
  taskLat?: number | null;
  taskLng?: number | null;
  taskDireccion?: string;
  className?: string;
};

const TecnicoRecommendSelect: React.FC<Props> = ({
  users,
  value,
  onChange,
  taskLat,
  taskLng,
  taskDireccion,
  className = '',
}) => {
  const [ranked, setRanked] = useState<Ranked[]>([]);
  const [loading, setLoading] = useState(false);

  const tecnicos = useMemo(
    () => users.filter((u) => u.rol === 'usuario' || u.rol === 'tecnico'),
    [users]
  );

  useEffect(() => {
    const hasCoords =
      typeof taskLat === 'number' &&
      typeof taskLng === 'number' &&
      !Number.isNaN(taskLat) &&
      !Number.isNaN(taskLng);
    const hasDir = Boolean(taskDireccion?.trim());
    if (!hasCoords && !hasDir) {
      setRanked([]);
      return;
    }

    let cancelled = false;
    const run = async () => {
      setLoading(true);
      try {
        const res = await api.get<{
          success: boolean;
          data: { tecnicos: Ranked[] };
        }>('/tareas/recomendar-tecnicos', {
          params: hasCoords
            ? { lat: taskLat, lng: taskLng }
            : { direccion: taskDireccion },
        });
        if (!cancelled) setRanked(res.data.data?.tecnicos || []);
      } catch {
        if (!cancelled) setRanked([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    const t = window.setTimeout(run, 300);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [taskLat, taskLng, taskDireccion]);

  const recommended = ranked.filter((r) => r.distanciaKm != null).slice(0, 5);
  const recommendedIds = new Set(recommended.map((r) => r._id));

  const toggle = (id: string) => {
    if (value.includes(id)) onChange(value.filter((x) => x !== id));
    else onChange([...value, id]);
  };

  return (
    <div className={`space-y-3 ${className}`}>
      {recommended.length > 0 && (
        <div className="rounded-xl border border-emerald-200 dark:border-emerald-800/50 bg-emerald-50/70 dark:bg-emerald-950/20 p-3">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-800 dark:text-emerald-300 mb-2">
            <Sparkles className="h-3.5 w-3.5" />
            Recomendados (especialidad + cercanía)
            {loading && <span className="font-normal text-emerald-600/80">· calculando…</span>}
          </div>
          <div className="space-y-1.5">
            {recommended.map((r) => {
              const selected = value.includes(r._id);
              return (
                <button
                  key={r._id}
                  type="button"
                  onClick={() => toggle(r._id)}
                  className={`w-full flex items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-left text-sm border transition-colors ${
                    selected
                      ? 'border-emerald-500 bg-white dark:bg-emerald-900/40'
                      : 'border-transparent hover:bg-white/80 dark:hover:bg-emerald-900/20'
                  }`}
                >
                  <span className="flex items-center gap-2 min-w-0">
                    <User className="h-3.5 w-3.5 text-emerald-600 flex-shrink-0" />
                    <span className="truncate font-medium text-slate-800 dark:text-slate-100">
                      {r.nombre}
                    </span>
                    {r.localidad && (
                      <span className="text-[11px] text-slate-500 truncate hidden sm:inline">
                        · {r.localidad}
                      </span>
                    )}
                  </span>
                  <span className="inline-flex items-center gap-1 text-[11px] tabular-nums text-emerald-700 dark:text-emerald-300 flex-shrink-0">
                    <MapPin className="h-3 w-3" />
                    {r.distanciaKm} km
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div>
        <label className="block text-xs font-medium text-slate-500 mb-1.5">
          Todos los técnicos (podés elegir cualquiera)
        </label>
        <select
          multiple
          value={value}
          onChange={(e) =>
            onChange(Array.from(e.target.selectedOptions, (o) => o.value))
          }
          className="w-full rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700 text-sm py-1.5 min-h-[96px]"
        >
          {tecnicos.map((u) => (
            <option key={u._id} value={u._id}>
              {u.nombre}
              {recommendedIds.has(u._id) ? ' ★' : ''}
              {u.localidad ? ` · ${u.localidad}` : ''}
            </option>
          ))}
        </select>
        <p className="mt-1 text-[11px] text-slate-400">
          Ctrl/Cmd + clic para selección múltiple
        </p>
      </div>
    </div>
  );
};

export default TecnicoRecommendSelect;

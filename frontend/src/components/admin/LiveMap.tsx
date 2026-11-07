import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { MapPin, RefreshCw, User, Clock, Navigation, Phone, Briefcase } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../../config/api';
import type { Task, User as AppUser } from '../../types';
import AdminPageHeader from '../common/AdminPageHeader';
import 'leaflet/dist/leaflet.css';

import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

// @ts-expect-error override interno de Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

const TECH_COLORS = ['#1a73e8', '#e8710a', '#1e8e3e', '#a142f4', '#d93025', '#00897b'];

const initials = (name: string) => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
};

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const createTechIcon = (nombre: string, color: string) => {
  const label = escapeHtml(nombre.length > 18 ? `${nombre.slice(0, 16)}…` : nombre);
  const ini = escapeHtml(initials(nombre));
  return new L.DivIcon({
    className: 'live-map-tech-marker',
    html: `
      <div style="display:flex;flex-direction:column;align-items:center;gap:2px;">
        <div style="
          background:${color};
          color:#fff;
          min-width:40px;height:40px;
          border-radius:9999px;
          border:3px solid #fff;
          box-shadow:0 2px 10px rgba(0,0,0,.35);
          display:flex;align-items:center;justify-content:center;
          font-size:12px;font-weight:700;letter-spacing:.02em;
          font-family:system-ui,sans-serif;
        ">${ini}</div>
        <div style="
          background:rgba(17,24,39,.92);
          color:#fff;
          font-size:11px;font-weight:600;
          padding:2px 8px;
          border-radius:9999px;
          white-space:nowrap;
          max-width:140px;
          overflow:hidden;text-overflow:ellipsis;
          box-shadow:0 1px 4px rgba(0,0,0,.25);
          font-family:system-ui,sans-serif;
        ">${label}</div>
      </div>
    `,
    iconSize: [140, 58],
    iconAnchor: [70, 44],
    popupAnchor: [0, -44],
  });
};

/** Ajusta el zoom solo la primera vez (o al forzar). Respeta pan/zoom del usuario. */
const FitBounds: React.FC<{
  positions: [number, number][];
  markersKey: string;
  forceFitToken: number;
}> = ({ positions, markersKey, forceFitToken }) => {
  const map = useMap();
  const userInteractedRef = React.useRef(false);
  const lastAutoKeyRef = React.useRef<string>('');
  const lastForceRef = React.useRef(0);

  useEffect(() => {
    const onInteract = () => {
      userInteractedRef.current = true;
    };
    map.on('zoomstart', onInteract);
    map.on('dragstart', onInteract);
    return () => {
      map.off('zoomstart', onInteract);
      map.off('dragstart', onInteract);
    };
  }, [map]);

  useEffect(() => {
    if (positions.length === 0) return;

    const forced = forceFitToken !== lastForceRef.current;
    if (forced) {
      lastForceRef.current = forceFitToken;
      userInteractedRef.current = false;
    }

    if (userInteractedRef.current && !forced) return;

    const shouldFit =
      forced || lastAutoKeyRef.current === '' || lastAutoKeyRef.current !== markersKey;
    if (!shouldFit) return;

    lastAutoKeyRef.current = markersKey;

    if (positions.length === 1) {
      map.setView(positions[0], 14);
      return;
    }
    map.fitBounds(L.latLngBounds(positions), { padding: [48, 48], maxZoom: 14 });
  }, [map, positions, markersKey, forceFitToken]);

  return null;
};

const POLL_MS = 20000;

type LivePin = {
  key: string;
  task: Task;
  tecnicoNombre: string;
  tecnicoTelefono?: string;
  color: string;
  lat: number;
  lng: number;
};

const techNameFrom = (t: AppUser | string) =>
  typeof t === 'object' && t ? t.nombre : String(t);

const techPhoneFrom = (t: AppUser | string) =>
  typeof t === 'object' && t ? t.telefono : undefined;

const LiveMap: React.FC = () => {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [forceFitToken, setForceFitToken] = useState(0);
  const [selectedPinKey, setSelectedPinKey] = useState<string | null>(null);

  const loadMap = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await api.get<{ success: boolean; data: Task[] }>('/tareas/mapa-vivo');
      setTasks(res.data.data || []);
      setError(null);
      setLastUpdate(new Date());
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al cargar el mapa');
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMap();
    const id = window.setInterval(() => loadMap(true), POLL_MS);
    return () => window.clearInterval(id);
  }, [loadMap]);

  const pins: LivePin[] = useMemo(() => {
    const result: LivePin[] = [];
    let colorIdx = 0;
    const colorByTech = new Map<string, string>();

    for (const task of tasks) {
      if (task.ubicacionMapa?.lat == null || task.ubicacionMapa?.lng == null) continue;

      const tecnicos = Array.isArray(task.tecnicos) ? task.tecnicos : [];
      const list = tecnicos.length > 0 ? tecnicos : ['Sin técnico'];

      for (const t of list) {
        const nombre = techNameFrom(t) || 'Sin técnico';
        const techId = typeof t === 'object' && t?._id ? t._id : nombre;
        if (!colorByTech.has(techId)) {
          colorByTech.set(techId, TECH_COLORS[colorIdx % TECH_COLORS.length]);
          colorIdx += 1;
        }
        result.push({
          key: `${task._id}-${techId}`,
          task,
          tecnicoNombre: nombre,
          tecnicoTelefono: techPhoneFrom(t),
          color: colorByTech.get(techId)!,
          lat: task.ubicacionMapa.lat,
          lng: task.ubicacionMapa.lng,
        });
      }
    }

    return result;
  }, [tasks]);

  const positions = useMemo(
    () => pins.map((p) => [p.lat, p.lng] as [number, number]),
    [pins]
  );

  const markersKey = useMemo(
    () => pins.map((p) => p.key).sort().join('|'),
    [pins]
  );

  const iconCache = useMemo(() => {
    const map = new Map<string, L.DivIcon>();
    for (const pin of pins) {
      const cacheKey = `${pin.tecnicoNombre}|${pin.color}`;
      if (!map.has(cacheKey)) {
        map.set(cacheKey, createTechIcon(pin.tecnicoNombre, pin.color));
      }
    }
    return map;
  }, [pins]);

  const defaultCenter: [number, number] = [-34.6037, -58.3816];

  const fuenteLabel = (fuente?: string) => {
    switch (fuente) {
      case 'gps':
        return 'GPS en tiempo real';
      case 'tecnico':
        return 'Domicilio del técnico';
      case 'direccion':
        return 'Ubicación del trabajo';
      default:
        return 'Ubicación';
    }
  };

  return (
    <div className="space-y-4 h-full flex flex-col animate-fadeIn" style={{ minHeight: '85vh' }}>
      <AdminPageHeader
        title="Mapa en vivo"
        description="Técnicos con tarea en progreso."
        eyebrow="Operaciones"
        icon={<User className="h-5 w-5" />}
        actions={
          <div className="flex items-center gap-2 flex-wrap justify-end">
            <button
              type="button"
              onClick={() => setForceFitToken((n) => n + 1)}
              className="inline-flex items-center px-4 py-2.5 text-sm font-medium rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
            >
              <MapPin className="h-4 w-4 mr-2" />
              Centrar
            </button>
            <button
              type="button"
              onClick={() => loadMap()}
              className="inline-flex items-center px-4 py-2.5 text-sm font-medium rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Actualizar
            </button>
          </div>
        }
      />

      <div className="flex flex-wrap items-center gap-3 px-1">
        <span className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-700 dark:text-blue-300">
          <Navigation className="h-4 w-4" />
          {`${pins.length} técnico${pins.length === 1 ? '' : 's'} en campo`}
        </span>
        {lastUpdate && (
          <span className="text-xs text-gray-500 dark:text-gray-400">
            Actualizado {lastUpdate.toLocaleTimeString('es-AR')}
          </span>
        )}
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800 px-4 py-3 text-sm text-red-700 dark:text-red-300">
          {error}
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-4 flex-1 min-h-[560px]">
        <div className="flex-1 min-h-[420px] rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 shadow-sm relative z-0">
          <MapContainer
            center={defaultCenter}
            zoom={11}
            className="h-full w-full"
            scrollWheelZoom
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <FitBounds
              positions={positions}
              markersKey={markersKey}
              forceFitToken={forceFitToken}
            />
            {pins.map((pin) => {
              const iconKey = `${pin.tecnicoNombre}|${pin.color}`;
              const icon = iconCache.get(iconKey) || createTechIcon(pin.tecnicoNombre, pin.color);

              return (
                <Marker
                  key={pin.key}
                  position={[pin.lat, pin.lng]}
                  icon={icon}
                  eventHandlers={{
                    click: () => setSelectedPinKey(pin.key),
                  }}
                >
                  <Popup>
                    <div className="min-w-[220px] max-w-[280px] space-y-2.5 text-sm">
                      <div className="flex items-center gap-2.5">
                        <div
                          className="h-10 w-10 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                          style={{ background: pin.color }}
                        >
                          {initials(pin.tecnicoNombre)}
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-gray-900 text-base leading-tight truncate">
                            {pin.tecnicoNombre}
                          </p>
                          <p className="text-[11px] text-emerald-700 font-medium">
                            En campo · activo
                          </p>
                        </div>
                      </div>

                      <div className="rounded-lg bg-slate-50 border border-slate-200 p-2.5 space-y-1.5">
                        <p className="text-[10px] uppercase tracking-wide text-slate-500 font-semibold">
                          Ubicación
                        </p>
                        <p className="text-sm text-gray-800 font-medium leading-snug">
                          {pin.task.direccion || 'Sin dirección cargada'}
                        </p>
                        <p className="text-[11px] text-slate-500">
                          {fuenteLabel(pin.task.ubicacionMapa?.fuente)}
                        </p>
                      </div>

                      {pin.tecnicoTelefono && (
                        <p className="flex items-center gap-1.5 text-xs text-gray-600">
                          <Phone className="h-3.5 w-3.5" />
                          {pin.tecnicoTelefono}
                        </p>
                      )}

                      <div className="pt-1 border-t border-slate-100 space-y-1">
                        <p className="text-[10px] uppercase tracking-wide text-slate-400 font-semibold">
                          Tarea actual
                        </p>
                        <p className="text-xs text-gray-700">
                          {pin.task.numero ? `#${pin.task.numero} · ` : ''}
                          {pin.task.titulo}
                        </p>
                        {pin.task.cliente && (
                          <p className="text-xs text-gray-500">Cliente: {pin.task.cliente}</p>
                        )}
                      </div>

                      <button
                        type="button"
                        className="w-full mt-1 text-center text-blue-600 hover:underline text-xs font-medium"
                        onClick={() => navigate(`/tasks/${pin.task._id}`)}
                      >
                        Ver detalle de la tarea
                      </button>
                    </div>
                  </Popup>
                </Marker>
              );
            })}
          </MapContainer>

          {!loading && pins.length === 0 && (
            <div className="absolute inset-x-0 bottom-4 flex justify-center pointer-events-none z-[1000]">
              <div className="pointer-events-auto rounded-full bg-white/95 dark:bg-gray-800/95 shadow-lg border border-gray-200 dark:border-gray-700 px-4 py-2 text-sm text-gray-700 dark:text-gray-200">
                No hay técnicos en campo ahora
              </div>
            </div>
          )}
        </div>

        <aside className="w-full lg:w-80 shrink-0 bg-white dark:bg-gray-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 overflow-y-auto max-h-[560px] lg:max-h-none space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">
              Técnicos en campo
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
              Nombre y ubicación primero; la tarea es secundaria.
            </p>
            {loading && pins.length === 0 ? (
              <p className="text-sm text-gray-500">Cargando…</p>
            ) : pins.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Cuando un técnico tenga una tarea <strong>en progreso</strong>, aparecerá acá.
              </p>
            ) : (
              <ul className="space-y-3">
                {pins.map((pin) => {
                  const selected = selectedPinKey === pin.key;
                  return (
                    <li
                      key={pin.key}
                      className={`rounded-xl border p-3 transition-colors cursor-pointer ${
                        selected
                          ? 'border-blue-400 bg-blue-50/80 dark:bg-blue-900/20 dark:border-blue-500'
                          : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/40'
                      }`}
                      onClick={() => {
                        setSelectedPinKey(pin.key);
                        setForceFitToken((n) => n + 1);
                      }}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className="h-11 w-11 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 shadow"
                          style={{ background: pin.color }}
                        >
                          {initials(pin.tecnicoNombre)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-bold text-gray-900 dark:text-white truncate">
                            {pin.tecnicoNombre}
                          </p>
                          <p className="mt-0.5 inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 dark:text-emerald-400">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            En campo
                          </p>
                        </div>
                      </div>

                      <div className="mt-2.5 rounded-lg bg-slate-50 dark:bg-gray-900/40 px-2.5 py-2">
                        <p className="flex items-start gap-1.5 text-xs text-gray-800 dark:text-gray-200 font-medium">
                          <MapPin className="h-3.5 w-3.5 mt-0.5 text-red-500 shrink-0" />
                          <span className="line-clamp-2">
                            {pin.task.direccion || 'Sin dirección'}
                          </span>
                        </p>
                        <p className="mt-1 ml-5 text-[10px] text-gray-500">
                          {fuenteLabel(pin.task.ubicacionMapa?.fuente)}
                        </p>
                      </div>

                      {pin.tecnicoTelefono && (
                        <p className="mt-2 flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-300">
                          <Phone className="h-3.5 w-3.5" />
                          {pin.tecnicoTelefono}
                        </p>
                      )}

                      <div className="mt-2 pt-2 border-t border-gray-100 dark:border-gray-700 space-y-1">
                        <p className="flex items-center gap-1.5 text-[11px] text-gray-500">
                          <Briefcase className="h-3 w-3" />
                          <span className="truncate">
                            {pin.task.numero ? `#${pin.task.numero} · ` : ''}
                            {pin.task.titulo}
                          </span>
                        </p>
                        {pin.task.franja_horaria && (
                          <p className="flex items-center gap-1.5 text-[11px] text-gray-400">
                            <Clock className="h-3 w-3" />
                            {pin.task.franja_horaria}
                          </p>
                        )}
                        <button
                          type="button"
                          className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/tasks/${pin.task._id}`);
                          }}
                        >
                          Ver tarea
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
};

export default LiveMap;

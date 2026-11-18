import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import {
  MapPin,
  RefreshCw,
  Clock,
  User,
  Calendar,
  Route,
  Navigation,
  ExternalLink,
} from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { format } from 'date-fns';
import api from '../../config/api';
import { useAppDispatch, useAppSelector } from '../../store';
import { fetchUsers } from '../../store/slices/usersSlice';
import type { Task, User as AppUser } from '../../types';
import AdminPageHeader from '../common/AdminPageHeader';
import { compareTasksBySchedule, parseFranjaHoraria } from '../../utils/franjaHoraria';
import { isAdminRole } from '../../utils/roles';
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

const FALLBACK_COLORS = ['#1a73e8', '#e8710a', '#1e8e3e', '#a142f4', '#d93025', '#00897b', '#5f6368'];
const UNASSIGNED_COLOR = '#9aa0a6';

const FitBounds: React.FC<{
  positions: [number, number][];
  markersKey: string;
  forceFitToken: number;
}> = ({ positions, markersKey, forceFitToken }) => {
  const map = useMap();
  const userInteractedRef = React.useRef(false);
  const lastAutoKeyRef = React.useRef('');
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

const createOrderIcon = (order: number, color: string, selected: boolean) =>
  new L.DivIcon({
    className: 'day-map-order-marker',
    html: `
      <div style="
        background:${color};
        color:#fff;
        width:${selected ? 36 : 30}px;height:${selected ? 36 : 30}px;
        border-radius:9999px;
        border:${selected ? '3px' : '2px'} solid #fff;
        box-shadow:0 2px 10px rgba(0,0,0,.35);
        display:flex;align-items:center;justify-content:center;
        font-size:${selected ? 14 : 12}px;font-weight:800;
        font-family:system-ui,sans-serif;
        transform:translateY(${selected ? '-2px' : '0'});
      ">${order}</div>
    `,
    iconSize: [selected ? 36 : 30, selected ? 36 : 30],
    iconAnchor: [selected ? 18 : 15, selected ? 18 : 15],
    popupAnchor: [0, -16],
  });

type DayMapResponse = {
  fecha: string;
  tareas: Task[];
  meta: { total: number; conCoords: number; sinCoords: number; geocoded: number };
};

type DayPin = {
  key: string;
  task: Task;
  order: number;
  color: string;
  lat: number;
  lng: number;
  techLabel: string;
};

const techColorOf = (task: Task, colorByTech: Map<string, string>) => {
  const tecnicos = Array.isArray(task.tecnicos) ? task.tecnicos : [];
  if (tecnicos.length === 0) return UNASSIGNED_COLOR;
  const first = tecnicos[0];
  if (typeof first === 'object' && first) {
    if (first.color && /^#?[0-9a-fA-F]{6}$/.test(String(first.color).replace('#', ''))) {
      const c = String(first.color);
      return c.startsWith('#') ? c : `#${c}`;
    }
    const id = first._id || first.nombre || 'x';
    return colorByTech.get(String(id)) || UNASSIGNED_COLOR;
  }
  return colorByTech.get(String(first)) || UNASSIGNED_COLOR;
};

const techNames = (task: Task) => {
  const tecnicos = Array.isArray(task.tecnicos) ? task.tecnicos : [];
  if (tecnicos.length === 0) return 'Sin técnico';
  return tecnicos
    .map((t) => (typeof t === 'object' && t ? t.nombre || '' : String(t)))
    .filter(Boolean)
    .join(' · ');
};

const estadoBadge = (estado: string) => {
  switch (estado) {
    case 'completada':
      return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300';
    case 'en progreso':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300';
    case 'cancelada':
      return 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300';
    default:
      return 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300';
  }
};

const DayMap: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const dispatch = useAppDispatch();
  const { users } = useAppSelector((s) => s.users);
  const { user } = useAppSelector((s) => s.auth);

  const initialFecha = searchParams.get('fecha') || format(new Date(), 'yyyy-MM-dd');
  const initialTecnico = searchParams.get('tecnico') || '';

  const [fecha, setFecha] = useState(
    /^\d{4}-\d{2}-\d{2}$/.test(initialFecha) ? initialFecha : format(new Date(), 'yyyy-MM-dd')
  );
  const [tecnicoId, setTecnicoId] = useState(initialTecnico);
  const [payload, setPayload] = useState<DayMapResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [forceFitToken, setForceFitToken] = useState(0);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  useEffect(() => {
    if (isAdminRole(user)) dispatch(fetchUsers());
  }, [dispatch, user]);

  useEffect(() => {
    const qFecha = searchParams.get('fecha');
    const qTec = searchParams.get('tecnico');
    if (qFecha && /^\d{4}-\d{2}-\d{2}$/.test(qFecha)) setFecha(qFecha);
    if (qTec != null) setTecnicoId(qTec);
  }, [searchParams]);

  const tecnicos = useMemo(
    () =>
      (Array.isArray(users) ? users : []).filter(
        (u) => (u.rol === 'usuario' || u.rol === 'tecnico') && u.aprobado !== false
      ),
    [users]
  );

  const load = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true);
      try {
        const res = await api.get<{ success: boolean; data: DayMapResponse }>('/tareas/mapa-dia', {
          params: {
            fecha,
            ...(tecnicoId ? { tecnico: tecnicoId } : {}),
          },
        });
        setPayload(res.data.data);
        setError(null);
      } catch (err: any) {
        setError(err.response?.data?.message || 'Error al cargar el mapa del día');
        setPayload(null);
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [fecha, tecnicoId]
  );

  useEffect(() => {
    load();
  }, [load]);

  const orderedTasks = useMemo(() => {
    const list = Array.isArray(payload?.tareas) ? [...payload!.tareas] : [];
    return list.sort(compareTasksBySchedule);
  }, [payload]);

  const colorByTech = useMemo(() => {
    const map = new Map<string, string>();
    let idx = 0;
    for (const t of tecnicos) {
      const raw = t.color;
      if (raw && /^#?[0-9a-fA-F]{6}$/.test(String(raw).replace('#', ''))) {
        map.set(t._id, String(raw).startsWith('#') ? String(raw) : `#${raw}`);
      } else {
        map.set(t._id, FALLBACK_COLORS[idx % FALLBACK_COLORS.length]);
        idx += 1;
      }
    }
    return map;
  }, [tecnicos]);

  const pins: DayPin[] = useMemo(() => {
    const result: DayPin[] = [];
    orderedTasks.forEach((task, index) => {
      if (task.ubicacionMapa?.lat == null || task.ubicacionMapa?.lng == null) return;
      result.push({
        key: task._id,
        task,
        order: index + 1,
        color: techColorOf(task, colorByTech),
        lat: task.ubicacionMapa.lat,
        lng: task.ubicacionMapa.lng,
        techLabel: techNames(task),
      });
    });
    return result;
  }, [orderedTasks, colorByTech]);

  const positions = useMemo(
    () => pins.map((p) => [p.lat, p.lng] as [number, number]),
    [pins]
  );

  const markersKey = useMemo(() => pins.map((p) => p.key).join('|'), [pins]);

  const routeLine = useMemo(() => {
    if (!tecnicoId || pins.length < 2) return null;
    return pins.map((p) => [p.lat, p.lng] as [number, number]);
  }, [pins, tecnicoId]);

  const selectedPin = pins.find((p) => p.key === selectedTaskId) || null;
  const defaultCenter: [number, number] = [-34.6037, -58.3816];

  const focusTask = (taskId: string) => {
    setSelectedTaskId(taskId);
    const pin = pins.find((p) => p.key === taskId);
    if (pin) setForceFitToken((n) => n + 1);
  };

  return (
    <div className="space-y-4 h-full flex flex-col animate-fadeIn" style={{ minHeight: '85vh' }}>
      <AdminPageHeader
        title="Mapa del día"
        description="Recorrido planificado: tareas del día en el mapa y lista ordenada por franja."
        eyebrow="Operaciones"
        icon={<Route className="h-5 w-5" />}
        actions={
          <div className="flex items-center gap-2 flex-wrap justify-end">
            <button
              type="button"
              onClick={() => setForceFitToken((n) => n + 1)}
              className="inline-flex items-center px-4 py-2.5 text-sm font-medium rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50"
            >
              <MapPin className="h-4 w-4 mr-2" />
              Centrar
            </button>
            <button
              type="button"
              onClick={() => load()}
              className="inline-flex items-center px-4 py-2.5 text-sm font-medium rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Actualizar
            </button>
          </div>
        }
      />

      <div className="flex flex-wrap items-end gap-3 bg-white dark:bg-gray-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4">
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">Día</label>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              className="pl-9 pr-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-gray-700 text-sm"
            />
          </div>
        </div>
        <div className="min-w-[220px]">
          <label className="block text-xs font-medium text-slate-500 mb-1">Técnico</label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <select
              value={tecnicoId}
              onChange={(e) => setTecnicoId(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-gray-700 text-sm"
            >
              <option value="">Todos los técnicos</option>
              {tecnicos.map((t: AppUser) => (
                <option key={t._id} value={t._id}>
                  {t.nombre}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 text-xs text-slate-500 pb-2">
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-slate-100 dark:bg-slate-700">
            <Navigation className="h-3.5 w-3.5" />
            {payload?.meta.total ?? 0} tareas
          </span>
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-slate-100 dark:bg-slate-700">
            <MapPin className="h-3.5 w-3.5" />
            {payload?.meta.conCoords ?? 0} en mapa
          </span>
          {(payload?.meta.sinCoords || 0) > 0 && (
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
              {payload?.meta.sinCoords} sin ubicación
            </span>
          )}
          {tecnicoId && routeLine && (
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-blue-50 text-blue-800 dark:bg-blue-950/40 dark:text-blue-200">
              <Route className="h-3.5 w-3.5" />
              Recorrido por franja
            </span>
          )}
        </div>
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
              positions={
                selectedPin ? [[selectedPin.lat, selectedPin.lng]] : positions
              }
              markersKey={selectedPin ? selectedPin.key : markersKey}
              forceFitToken={forceFitToken}
            />
            {routeLine && (
              <Polyline
                positions={routeLine}
                pathOptions={{
                  color: pins[0]?.color || '#1a73e8',
                  weight: 4,
                  opacity: 0.75,
                  dashArray: '8 10',
                }}
              />
            )}
            {pins.map((pin) => {
              const selected = selectedTaskId === pin.key;
              return (
                <Marker
                  key={pin.key}
                  position={[pin.lat, pin.lng]}
                  icon={createOrderIcon(pin.order, pin.color, selected)}
                  eventHandlers={{
                    click: () => setSelectedTaskId(pin.key),
                  }}
                >
                  <Popup>
                    <div className="min-w-[200px] space-y-1.5 text-sm">
                      <p className="font-bold text-gray-900">
                        #{pin.order} · {pin.task.numero}
                      </p>
                      <p className="text-gray-800">{pin.task.titulo}</p>
                      {pin.task.franja_horaria && (
                        <p className="text-xs text-gray-600 flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {pin.task.franja_horaria}
                        </p>
                      )}
                      <p className="text-xs text-gray-500">{pin.techLabel}</p>
                      <p className="text-xs text-gray-600">{pin.task.direccion}</p>
                      <button
                        type="button"
                        className="text-xs text-blue-600 hover:underline"
                        onClick={() => navigate(`/tasks/${pin.task._id}`)}
                      >
                        Ver tarea
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
                No hay tareas con ubicación para este filtro
              </div>
            </div>
          )}
        </div>

        <aside className="w-full lg:w-[360px] shrink-0 bg-white dark:bg-gray-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 overflow-y-auto max-h-[560px] lg:max-h-none">
          <div className="mb-3">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
              Orden del día
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Todas las del día (con o sin ubicación). Usá “Abrir detalle” para editar o
              borrar. Clic en la tarjeta solo la selecciona / centra en el mapa.
            </p>
          </div>

          {loading && orderedTasks.length === 0 ? (
            <p className="text-sm text-gray-500">Cargando…</p>
          ) : orderedTasks.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              No hay tareas para {fecha}
              {tecnicoId ? ' con ese técnico' : ''}.
            </p>
          ) : (
            <ol className="space-y-2">
              {orderedTasks.map((task, index) => {
                const order = index + 1;
                const hasCoords =
                  task.ubicacionMapa?.lat != null && task.ubicacionMapa?.lng != null;
                const selected = selectedTaskId === task._id;
                const color = techColorOf(task, colorByTech);
                const franja = parseFranjaHoraria(task.franja_horaria);
                return (
                  <li key={task._id}>
                    <div
                      className={`rounded-xl border p-3 transition-colors ${
                        selected
                          ? 'border-blue-400 bg-blue-50/80 dark:bg-blue-900/20 dark:border-blue-500'
                          : 'border-gray-200 dark:border-gray-700'
                      } ${!hasCoords ? 'border-dashed border-amber-300/80 dark:border-amber-700/60' : ''}`}
                    >
                      <button
                        type="button"
                        onClick={() =>
                          hasCoords ? focusTask(task._id) : setSelectedTaskId(task._id)
                        }
                        className="w-full text-left"
                      >
                        <div className="flex items-start gap-3">
                          <div
                            className="h-8 w-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                            style={{ background: hasCoords ? color : UNASSIGNED_COLOR }}
                          >
                            {order}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                                #{task.numero}
                              </span>
                              <span
                                className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${estadoBadge(
                                  task.estado
                                )}`}
                              >
                                {task.estado}
                              </span>
                              {!hasCoords && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-200">
                                  Solo lista · sin mapa
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-gray-700 dark:text-gray-200 truncate mt-0.5">
                              {task.titulo}
                            </p>
                            <p className="mt-1 flex items-center gap-1 text-[11px] text-gray-500">
                              <Clock className="h-3 w-3" />
                              {franja
                                ? `${franja.startTime} – ${franja.endTime}`
                                : task.franja_horaria || 'Sin franja'}
                            </p>
                            <p className="mt-0.5 flex items-start gap-1 text-[11px] text-gray-500">
                              <MapPin className="h-3 w-3 mt-0.5 shrink-0" />
                              <span className="line-clamp-2">
                                {task.direccion || 'Sin dirección'}
                              </span>
                            </p>
                            <p className="mt-0.5 text-[11px] text-gray-400 truncate">
                              {techNames(task)}
                            </p>
                          </div>
                        </div>
                      </button>
                      <div className="mt-2 flex items-center gap-2 pl-11">
                        <button
                          type="button"
                          onClick={() => navigate(`/tasks/${task._id}`)}
                          className="inline-flex items-center gap-1 text-[11px] font-medium text-blue-600 dark:text-blue-400 hover:underline"
                        >
                          <ExternalLink className="h-3 w-3" />
                          Abrir detalle
                        </button>
                        {hasCoords && (
                          <button
                            type="button"
                            onClick={() => focusTask(task._id)}
                            className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                          >
                            <MapPin className="h-3 w-3" />
                            Ver en mapa
                          </button>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </aside>
      </div>
    </div>
  );
};

export default DayMap;

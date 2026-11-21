import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  X,
  MapPin,
  Clock,
  User,
  Phone,
  ExternalLink,
  Calendar,
  FileText,
  Play,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Loader2,
  Briefcase,
} from 'lucide-react';
import type { Task, User as AppUser } from '../../types';
import {
  formatDireccionToMapsEmbedUrl,
  formatTaskToMapsUrl,
} from '../../utils/mapsUtils';
import { parseFranjaHoraria } from '../../utils/franjaHoraria';
import { useAppDispatch } from '../../store';
import { updateTask } from '../../store/slices/tasksSlice';
import { toast } from 'react-toastify';
import { showError, showSuccess } from '../../utils/toastUtils';
import { proveedorNombreOf } from '../../utils/whatsappTasks';

type TaskEstado = Task['estado'];

interface TaskEventPopoverProps {
  task: Task;
  onClose: () => void;
  onUpdated?: (task: Task) => void;
}

const estadoBadgeClass = (estado: string) => {
  switch (estado) {
    case 'completada':
      return 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300';
    case 'en progreso':
      return 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300';
    case 'cancelada':
      return 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300';
    default:
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300';
  }
};

const formatFecha = (fecha?: string) => {
  if (!fecha) return 'Sin fecha';
  if (/^\d{4}-\d{2}-\d{2}/.test(fecha)) {
    const [y, m, d] = fecha.slice(0, 10).split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString('es-AR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  }
  const parsed = new Date(fecha);
  if (isNaN(parsed.getTime())) return fecha;
  return parsed.toLocaleDateString('es-AR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
};

const tecnicoNombre = (t: AppUser | string) => {
  if (typeof t === 'string') return t;
  return t?.nombre || 'Sin nombre';
};

const TaskEventPopover: React.FC<TaskEventPopoverProps> = ({ task, onClose, onUpdated }) => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const [current, setCurrent] = useState(task);
  const [savingEstado, setSavingEstado] = useState<TaskEstado | null>(null);

  useEffect(() => {
    setCurrent(task);
  }, [task]);

  const mapsUrl = formatTaskToMapsUrl(current);
  const embedUrl = current.direccion
    ? formatDireccionToMapsEmbedUrl(current.direccion)
    : mapsUrl
      ? `${mapsUrl}&output=embed`
      : '';

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const tecnicos = Array.isArray(current.tecnicos) ? current.tecnicos : [];
  const proveedorNombre = proveedorNombreOf(current.proveedor);

  const changeEstado = async (nuevoEstado: TaskEstado) => {
    if (nuevoEstado === current.estado || savingEstado) return;
    setSavingEstado(nuevoEstado);
    try {
      const updated = await dispatch(
        updateTask({
          id: current._id,
          data: {
            numero: current.numero,
            titulo: current.titulo,
            cliente: current.cliente || '',
            direccion: current.direccion || '',
            direccionExtra: current.direccionExtra || '',
            entreCalles: current.entreCalles || '',
            descripcion: current.descripcion || '',
            numeroTitular: current.numeroTitular || '',
            fechaEjecucion: current.fechaEjecucion || '',
            franja_horaria: current.franja_horaria || '',
            estado: nuevoEstado,
            tecnicos: tecnicos.map((t) => (typeof t === 'string' ? t : t._id)),
            vip: Boolean(current.vip),
          },
        })
      ).unwrap();

      setCurrent(updated);
      onUpdated?.(updated);
      showSuccess(
        nuevoEstado === 'en progreso'
          ? 'Tarea iniciada · visible en mapa de técnicos'
          : `Estado: ${nuevoEstado}`
      );
    } catch (error: any) {
      showError(error?.message || 'No se pudo cambiar el estado');
    } finally {
      setSavingEstado(null);
    }
  };

  const busy = Boolean(savingEstado);

  const confirmCancelar = () => {
    if (busy) return;
    const CustomToast = ({ closeToast }: { closeToast?: () => void }) => (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden w-full">
        <div className="p-6">
          <div className="flex items-start">
            <div className="flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400">
              <XCircle className="h-6 w-6" />
            </div>
            <div className="ml-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                Cancelar tarea
              </h3>
              <div className="mt-2">
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  ¿Confirmás cancelar{' '}
                  {current.numero ? `#${current.numero}` : 'esta tarea'}
                  {current.titulo ? ` · ${current.titulo}` : ''}?
                </p>
              </div>
            </div>
          </div>
          <div className="mt-6 flex justify-end space-x-3">
            <button
              type="button"
              onClick={closeToast}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm hover:bg-gray-50 dark:hover:bg-gray-600"
            >
              Volver
            </button>
            <button
              type="button"
              onClick={() => {
                closeToast?.();
                void changeEstado('cancelada');
              }}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md shadow-sm"
            >
              Sí, cancelar
            </button>
          </div>
        </div>
      </div>
    );

    toast(<CustomToast />, {
      position: 'top-center',
      autoClose: false,
      closeButton: false,
      closeOnClick: false,
      draggable: false,
      className: '!bg-transparent !shadow-none !p-0 !m-0 !w-auto',
      bodyClassName: '!p-0 !m-0',
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto p-3 sm:p-6 bg-black/40 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="task-event-title"
    >
      <div
        className="relative w-full max-w-lg lg:max-w-2xl xl:max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white dark:bg-gray-800 shadow-2xl border border-gray-200 dark:border-gray-700"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-start justify-between gap-3 px-5 py-4 border-b border-gray-200 dark:border-gray-700 bg-white/95 dark:bg-gray-800/95 backdrop-blur">
          <div className="min-w-0">
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
              {current.numero ? `#${current.numero}` : 'Tarea'}
              {current.vip ? (
                <span className="ml-2 inline-flex px-1.5 py-0.5 rounded bg-amber-400 text-[10px] font-extrabold text-black tracking-wide">
                  VIP
                </span>
              ) : null}
            </p>
            <h3
              id="task-event-title"
              className="text-lg font-semibold text-gray-900 dark:text-white leading-snug"
            >
              {current.titulo}
            </h3>
            <span
              className={`inline-flex mt-2 px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${estadoBadgeClass(current.estado)}`}
            >
              {current.estado}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 p-2 rounded-full text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-800 dark:hover:text-white transition-colors"
            aria-label="Cerrar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">
          {/* Cambio rápido de estado */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900/40 p-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-2">
              Estado rápido
            </p>
            <div className="flex flex-wrap gap-2">
              {current.estado === 'pendiente' && (
                <>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => changeEstado('en progreso')}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold text-white bg-amber-500 hover:bg-amber-600 disabled:opacity-60"
                  >
                    {savingEstado === 'en progreso' ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Play className="h-4 w-4" />
                    )}
                    Iniciar
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={confirmCancelar}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border border-red-300 dark:border-red-700 text-red-700 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/30 disabled:opacity-60"
                  >
                    {savingEstado === 'cancelada' ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <XCircle className="h-4 w-4" />
                    )}
                    Cancelar
                  </button>
                </>
              )}

              {current.estado === 'en progreso' && (
                <>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => changeEstado('completada')}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold text-white bg-green-600 hover:bg-green-700 disabled:opacity-60"
                  >
                    {savingEstado === 'completada' ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4" />
                    )}
                    Finalizar
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={confirmCancelar}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border border-red-300 dark:border-red-700 text-red-700 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/30 disabled:opacity-60"
                  >
                    {savingEstado === 'cancelada' ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <XCircle className="h-4 w-4" />
                    )}
                    Cancelar
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => changeEstado('pendiente')}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-800 disabled:opacity-60"
                  >
                    {savingEstado === 'pendiente' ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <RotateCcw className="h-4 w-4" />
                    )}
                    Volver a pendiente
                  </button>
                </>
              )}

              {(current.estado === 'completada' || current.estado === 'cancelada') && (
                <>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => changeEstado('pendiente')}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-800 disabled:opacity-60"
                  >
                    {savingEstado === 'pendiente' ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <RotateCcw className="h-4 w-4" />
                    )}
                    Reabrir (pendiente)
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => changeEstado('en progreso')}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold text-white bg-amber-500 hover:bg-amber-600 disabled:opacity-60"
                  >
                    {savingEstado === 'en progreso' ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Play className="h-4 w-4" />
                    )}
                    Poner en progreso
                  </button>
                </>
              )}
            </div>
            {current.estado === 'en progreso' && (
              <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">
                Al iniciar, la tarea aparece en el mapa en vivo de técnicos.
              </p>
            )}
          </div>

          <div className="grid gap-3 text-sm">
            <div className="flex items-start gap-2.5 text-gray-700 dark:text-gray-200">
              <Calendar className="h-4 w-4 mt-0.5 text-blue-500 shrink-0" />
              <span className="capitalize">{formatFecha(current.fechaEjecucion)}</span>
            </div>
            {current.franja_horaria && (
              <div className="flex items-start gap-2.5 text-gray-700 dark:text-gray-200">
                <Clock className="h-4 w-4 mt-0.5 text-blue-500 shrink-0" />
                <span>
                  {(() => {
                    const f = parseFranjaHoraria(current.franja_horaria);
                    return f
                      ? `${f.startTime} – ${f.endTime}${f.crossesMidnight ? ' (+1 día)' : ''}`
                      : current.franja_horaria;
                  })()}
                </span>
              </div>
            )}
            {current.cliente && (
              <div className="flex items-start gap-2.5 text-gray-700 dark:text-gray-200">
                <User className="h-4 w-4 mt-0.5 text-blue-500 shrink-0" />
                <span>{current.cliente}</span>
              </div>
            )}
            {proveedorNombre && (
              <div className="flex items-start gap-2.5 text-gray-700 dark:text-gray-200">
                <Briefcase className="h-4 w-4 mt-0.5 text-blue-500 shrink-0" />
                <span>{proveedorNombre}</span>
              </div>
            )}
            {current.numeroTitular && (
              <div className="flex items-start gap-2.5 text-gray-700 dark:text-gray-200">
                <Phone className="h-4 w-4 mt-0.5 text-blue-500 shrink-0" />
                <span>{current.numeroTitular}</span>
              </div>
            )}
            {tecnicos.length > 0 && (
              <div className="flex items-start gap-2.5 text-gray-700 dark:text-gray-200">
                <User className="h-4 w-4 mt-0.5 text-blue-500 shrink-0" />
                <span>{tecnicos.map(tecnicoNombre).join(', ')}</span>
              </div>
            )}
            {current.descripcion && (
              <div className="flex items-start gap-2.5 text-gray-700 dark:text-gray-200">
                <FileText className="h-4 w-4 mt-0.5 text-blue-500 shrink-0" />
                <span className="whitespace-pre-wrap">{current.descripcion}</span>
              </div>
            )}
          </div>

          <div className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="px-3 py-2 bg-gray-50 dark:bg-gray-900/40 border-b border-gray-200 dark:border-gray-700 space-y-0.5">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-red-500 shrink-0" />
                <p className="text-sm text-gray-800 dark:text-gray-200 truncate">
                  {current.direccion || 'Sin dirección cargada'}
                </p>
              </div>
              {current.direccionExtra && (
                <p className="pl-6 text-xs text-gray-600 dark:text-gray-300">{current.direccionExtra}</p>
              )}
              {current.entreCalles && (
                <p className="pl-6 text-xs text-gray-500 dark:text-gray-400">
                  Entre calles: {current.entreCalles}
                </p>
              )}
            </div>
            {embedUrl ? (
              <iframe
                title={`Mapa de ${current.direccion}`}
                src={embedUrl}
                className="w-full h-52 border-0 bg-gray-100 dark:bg-gray-900"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                allowFullScreen
              />
            ) : (
              <div className="h-28 flex items-center justify-center text-sm text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/30">
                No hay dirección para mostrar en el mapa
              </div>
            )}
          </div>
        </div>

        <div className="sticky bottom-0 flex flex-col sm:flex-row gap-2 px-5 py-4 border-t border-gray-200 dark:border-gray-700 bg-white/95 dark:bg-gray-800/95 backdrop-blur">
          {mapsUrl && (
            <a
              href={mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex flex-1 items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 transition-colors"
            >
              <ExternalLink className="h-4 w-4" />
              Abrir en Google Maps
            </a>
          )}
          <button
            type="button"
            onClick={() => {
              onClose();
              navigate(`/tasks/${current._id}`);
            }}
            className="inline-flex flex-1 items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg border border-gray-300 dark:border-gray-600 text-gray-800 dark:text-gray-100 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
          >
            Ver tarea completa
          </button>
        </div>
      </div>
    </div>
  );
};

export default TaskEventPopover;

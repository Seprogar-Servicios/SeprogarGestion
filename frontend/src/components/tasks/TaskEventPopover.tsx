import React, { useEffect } from 'react';
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
} from 'lucide-react';
import type { Task, User as AppUser } from '../../types';
import {
  formatDireccionToMapsUrl,
  formatDireccionToMapsEmbedUrl,
} from '../../utils/mapsUtils';
import { parseFranjaHoraria } from '../../utils/franjaHoraria';

interface TaskEventPopoverProps {
  task: Task;
  onClose: () => void;
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

const TaskEventPopover: React.FC<TaskEventPopoverProps> = ({ task, onClose }) => {
  const navigate = useNavigate();
  const mapsUrl = task.direccion ? formatDireccionToMapsUrl(task.direccion) : '';
  const embedUrl = task.direccion ? formatDireccionToMapsEmbedUrl(task.direccion) : '';

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const tecnicos = Array.isArray(task.tecnicos) ? task.tecnicos : [];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="task-event-title"
    >
      <div
        className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl bg-white dark:bg-gray-800 shadow-2xl border border-gray-200 dark:border-gray-700"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-start justify-between gap-3 px-5 py-4 border-b border-gray-200 dark:border-gray-700 bg-white/95 dark:bg-gray-800/95 backdrop-blur">
          <div className="min-w-0">
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
              {task.numero ? `#${task.numero}` : 'Tarea'}
            </p>
            <h3
              id="task-event-title"
              className="text-lg font-semibold text-gray-900 dark:text-white leading-snug"
            >
              {task.titulo}
            </h3>
            <span
              className={`inline-flex mt-2 px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${estadoBadgeClass(task.estado)}`}
            >
              {task.estado}
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
          <div className="grid gap-3 text-sm">
            <div className="flex items-start gap-2.5 text-gray-700 dark:text-gray-200">
              <Calendar className="h-4 w-4 mt-0.5 text-blue-500 shrink-0" />
              <span className="capitalize">{formatFecha(task.fechaEjecucion)}</span>
            </div>
            {task.franja_horaria && (
              <div className="flex items-start gap-2.5 text-gray-700 dark:text-gray-200">
                <Clock className="h-4 w-4 mt-0.5 text-blue-500 shrink-0" />
                <span>
                  {(() => {
                    const f = parseFranjaHoraria(task.franja_horaria);
                    return f
                      ? `${f.startTime} – ${f.endTime}${f.crossesMidnight ? ' (+1 día)' : ''}`
                      : task.franja_horaria;
                  })()}
                </span>
              </div>
            )}
            {task.cliente && (
              <div className="flex items-start gap-2.5 text-gray-700 dark:text-gray-200">
                <User className="h-4 w-4 mt-0.5 text-blue-500 shrink-0" />
                <span>{task.cliente}</span>
              </div>
            )}
            {task.numeroTitular && (
              <div className="flex items-start gap-2.5 text-gray-700 dark:text-gray-200">
                <Phone className="h-4 w-4 mt-0.5 text-blue-500 shrink-0" />
                <span>{task.numeroTitular}</span>
              </div>
            )}
            {tecnicos.length > 0 && (
              <div className="flex items-start gap-2.5 text-gray-700 dark:text-gray-200">
                <User className="h-4 w-4 mt-0.5 text-blue-500 shrink-0" />
                <span>{tecnicos.map(tecnicoNombre).join(', ')}</span>
              </div>
            )}
            {task.descripcion && (
              <div className="flex items-start gap-2.5 text-gray-700 dark:text-gray-200">
                <FileText className="h-4 w-4 mt-0.5 text-blue-500 shrink-0" />
                <span className="whitespace-pre-wrap">{task.descripcion}</span>
              </div>
            )}
          </div>

          <div className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 dark:bg-gray-900/40 border-b border-gray-200 dark:border-gray-700">
              <MapPin className="h-4 w-4 text-red-500" />
              <p className="text-sm text-gray-800 dark:text-gray-200 truncate">
                {task.direccion || 'Sin dirección cargada'}
              </p>
            </div>
            {embedUrl ? (
              <iframe
                title={`Mapa de ${task.direccion}`}
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
              navigate(`/tasks/${task._id}`);
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

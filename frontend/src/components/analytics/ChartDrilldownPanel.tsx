import React from 'react';
import { X, ExternalLink, ClipboardList } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { Task } from '../../types';

export interface ChartDrilldown {
  title: string;
  subtitle?: string;
  tasks: Task[];
}

interface Props {
  drilldown: ChartDrilldown | null;
  onClose: () => void;
}

const estadoClass = (estado: string) => {
  switch (estado) {
    case 'completada':
      return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300';
    case 'en progreso':
      return 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300';
    case 'cancelada':
      return 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200';
    default:
      return 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300';
  }
};

const ChartDrilldownPanel: React.FC<Props> = ({ drilldown, onClose }) => {
  const navigate = useNavigate();

  if (!drilldown) return null;

  const { title, subtitle, tasks } = drilldown;

  return (
    <div className="rounded-xl border border-blue-200 dark:border-blue-800/60 bg-white dark:bg-gray-800 shadow-lg overflow-hidden animate-fadeIn">
      <div className="flex items-start justify-between gap-3 px-4 py-3 border-b border-slate-200 dark:border-slate-700 bg-blue-50/70 dark:bg-blue-950/30">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <ClipboardList className="h-4 w-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white truncate">
              {title}
            </h3>
            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-blue-600 text-white tabular-nums">
              {tasks.length}
            </span>
          </div>
          {subtitle && (
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{subtitle}</p>
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1.5 rounded-lg text-slate-500 hover:bg-white/80 dark:hover:bg-slate-700"
          aria-label="Cerrar detalle"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="max-h-48 overflow-y-auto">
        {tasks.length === 0 ? (
          <p className="text-sm text-slate-500 text-center py-8">Sin tareas en este segmento</p>
        ) : (
          <ul className="divide-y divide-slate-100 dark:divide-slate-700/80">
            {tasks.slice(0, 40).map((task) => (
              <li
                key={task._id}
                className="px-4 py-2.5 flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-700/40"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                    {task.numero ? `#${task.numero} · ` : ''}
                    {task.titulo}
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                    {[task.cliente, task.fechaEjecucion].filter(Boolean).join(' · ') || 'Sin cliente/fecha'}
                  </p>
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded-full flex-shrink-0 ${estadoClass(task.estado)}`}>
                  {task.estado}
                </span>
                <button
                  type="button"
                  onClick={() => navigate(`/tasks/${task._id}`)}
                  className="p-1.5 rounded-md text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 flex-shrink-0"
                  title="Ver tarea"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {tasks.length > 40 && (
        <div className="px-4 py-2 text-[11px] text-slate-500 border-t border-slate-100 dark:border-slate-700">
          Mostrando 40 de {tasks.length}. Usá filtros para acotar.
        </div>
      )}
    </div>
  );
};

export default ChartDrilldownPanel;

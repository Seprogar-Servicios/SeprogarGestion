import React from 'react';
import { X, ClipboardList } from 'lucide-react';
import type { TareaConsorcio } from '../../types';
import { formatMoney } from '../../utils/analyticsHelpers';

export interface ConsorcioDrilldown {
  title: string;
  subtitle?: string;
  tasks: TareaConsorcio[];
}

interface Props {
  drilldown: ConsorcioDrilldown | null;
  onClose: () => void;
}

const estadoClass = (estado: string) => {
  switch (estado) {
    case 'PAGADO':
      return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300';
    case 'FACTURADO':
      return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300';
    case 'PENDIENTE_PAGO':
      return 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300';
    case 'completada':
    case 'en_progreso':
      return 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300';
    case 'cancelada':
      return 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200';
    default:
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300';
  }
};

const ConsorcioDrilldownPanel: React.FC<Props> = ({ drilldown, onClose }) => {
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
                    {[
                      task.cliente,
                      task.fechaEjecucion,
                      formatMoney(task.precio || 0),
                      task.administradorConsorcio?.nombre,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </p>
                </div>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full flex-shrink-0 ${estadoClass(task.estado)}`}
                >
                  {task.estado}
                </span>
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

export default ConsorcioDrilldownPanel;

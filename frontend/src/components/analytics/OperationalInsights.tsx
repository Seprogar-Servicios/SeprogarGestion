import React from 'react';
import type { Task, User } from '../../types';
import type { OperationalSummary } from '../../utils/analyticsHelpers';
import type { ChartDrilldown } from './ChartDrilldownPanel';

interface Props {
  summary: OperationalSummary;
  tasks?: Task[];
  users?: User[];
  onSegmentClick?: (drilldown: ChartDrilldown) => void;
}

const RankList: React.FC<{
  title: string;
  subtitle?: string;
  items: { label: string; count: number }[];
  empty?: string;
  onItemClick?: (label: string) => void;
}> = ({ title, subtitle, items, empty = 'Sin datos', onItemClick }) => {
  const max = Math.max(...items.map((i) => i.count), 1);
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-gray-800 p-4 h-full">
      <h3 className="text-sm font-semibold text-slate-900 dark:text-white">{title}</h3>
      {subtitle && (
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-3 mt-0.5">{subtitle}</p>
      )}
      {!subtitle && <div className="mb-3" />}
      {items.length === 0 ? (
        <p className="text-sm text-slate-500 py-6 text-center">{empty}</p>
      ) : (
        <div className="space-y-2.5">
          {items.map((item) => (
            <button
              key={item.label}
              type="button"
              onClick={() => onItemClick?.(item.label)}
              disabled={!onItemClick}
              className={`w-full text-left ${onItemClick ? 'cursor-pointer hover:opacity-90' : ''}`}
            >
              <div className="flex justify-between text-xs text-slate-600 dark:text-slate-300 mb-1 gap-2">
                <span className="truncate">{item.label}</span>
                <span className="tabular-nums flex-shrink-0 font-medium">{item.count}</span>
              </div>
              <div className="h-1.5 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
                <div
                  className="h-full rounded-full bg-orange-500/80"
                  style={{ width: `${Math.max(6, (item.count / max) * 100)}%` }}
                />
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

const OperationalInsights: React.FC<Props> = ({
  summary,
  tasks = [],
  users = [],
  onSegmentClick,
}) => {
  const openList = (title: string, list: Task[], subtitle?: string) => {
    onSegmentClick?.({ title, subtitle, tasks: list });
  };

  const byOrigen = (label: string) =>
    tasks.filter((t) => {
      const origen =
        t.origen === 'whatsapp' ? 'WhatsApp' : t.origen ? String(t.origen) : 'Sistema';
      return origen === label;
    });

  const byCliente = (label: string) =>
    tasks.filter((t) => ((t.cliente || '').trim() || 'Sin cliente') === label);

  const byFranja = (label: string) =>
    tasks.filter((t) => ((t.franja_horaria || '').trim() || 'Sin franja') === label);

  const byEspecialidad = (label: string) =>
    tasks.filter((task) => {
      const tecnicos = Array.isArray(task.tecnicos) ? task.tecnicos : [];
      if (tecnicos.length === 0) return label === 'Sin asignar';
      return tecnicos.some((tec) => {
        if (typeof tec === 'string') {
          const u = users.find((x) => x._id === tec);
          return (u?.especialidad || 'Sin especialidad') === label;
        }
        return ((tec as User)?.especialidad || 'Sin especialidad') === label;
      });
    });

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          {
            label: 'Canceladas',
            value: summary.canceladas,
            hint: `${summary.cancelRate}% del total`,
            list: tasks.filter((t) => t.estado === 'cancelada'),
          },
          {
            label: 'Sin técnico',
            value: summary.sinTecnico,
            hint: 'Backlog sin asignar',
            list: tasks.filter((t) => !t.tecnicos || t.tecnicos.length === 0),
          },
          {
            label: 'Sin fecha',
            value: summary.sinFecha,
            hint: 'Sin fecha de ejecución',
            list: tasks.filter((t) => !t.fechaEjecucion),
          },
          {
            label: 'Tasa completado',
            value: `${summary.completionRate}%`,
            hint: `${summary.completadas} hechas`,
            list: tasks.filter((t) => t.estado === 'completada'),
          },
        ].map((card) => (
          <button
            key={card.label}
            type="button"
            onClick={() => openList(card.label, card.list)}
            className="text-left rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-gray-800 px-4 py-3 hover:border-orange-300 dark:hover:border-orange-700 transition-colors cursor-pointer"
          >
            <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
              {card.label}
            </p>
            <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1 tabular-nums">
              {card.value}
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{card.hint}</p>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <RankList
          title="Origen de tareas"
          subtitle="Clic para detalle"
          items={summary.byOrigen}
          onItemClick={(label) => openList(`Origen: ${label}`, byOrigen(label))}
        />
        <RankList
          title="Top clientes"
          subtitle="Clic para detalle"
          items={summary.topClientes}
          onItemClick={(label) => openList(`Cliente: ${label}`, byCliente(label))}
        />
        <RankList
          title="Por especialidad"
          subtitle="Clic para detalle"
          items={summary.byEspecialidad}
          onItemClick={(label) => openList(`Especialidad: ${label}`, byEspecialidad(label))}
        />
        <RankList
          title="Franjas horarias"
          subtitle="Clic para detalle"
          items={summary.byFranja}
          onItemClick={(label) => openList(`Franja: ${label}`, byFranja(label))}
        />
      </div>
    </div>
  );
};

export default OperationalInsights;

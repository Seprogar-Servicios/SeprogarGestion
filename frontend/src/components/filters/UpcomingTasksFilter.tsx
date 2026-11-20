import React from 'react';
import { Clock, Calendar, List, Filter, AlertCircle, Zap } from 'lucide-react';
import type { TaskFilters } from '../../types';

type FilterOption = {
  value: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  default?: boolean;
};

interface UpcomingTasksFilterProps {
  filters: TaskFilters;
  onFiltersChange: (filters: TaskFilters) => void;
}

const UpcomingTasksFilter: React.FC<UpcomingTasksFilterProps> = ({
  filters,
  onFiltersChange,
}) => {
  const filterOptions: FilterOption[] = [
    {
      value: 'opsWindow',
      label: 'Operación (semana ±1)',
      icon: Zap,
      default: true,
    },
    { value: '', label: 'Todas las tareas', icon: List },
    { value: 'today', label: 'Creadas hoy', icon: Calendar },
    { value: 'past', label: 'Tareas antiguas', icon: Clock },
    { value: 'current', label: 'Tareas actuales', icon: Calendar },
    { value: 'next24h', label: 'Próximas 24h', icon: Clock },
    { value: 'next48h', label: 'Próximas 48h', icon: Clock },
    { value: 'nextWeek', label: 'Próxima semana', icon: Calendar },
    { value: 'nextMonth', label: 'Próximo mes', icon: Calendar },
  ];

  const handleUpcomingFilterChange = (upcomingFilter: string) => {
    if (filters.upcomingFilter === upcomingFilter) {
      return;
    }

    if (!upcomingFilter) {
      const { fechaDesde, fechaHasta, upcomingFilter: _, ...restFilters } = filters;
      onFiltersChange({
        ...restFilters,
        fechaDesde: undefined,
        fechaHasta: undefined,
        upcomingFilter: undefined,
      });
      return;
    }

    const { fechaDesde, fechaHasta, ...restFilters } = filters;
    onFiltersChange({
      ...restFilters,
      fechaDesde: undefined,
      fechaHasta: undefined,
      upcomingFilter: upcomingFilter as TaskFilters['upcomingFilter'],
    });
  };

  const getActiveFilterLabel = () => {
    if (!filters.upcomingFilter) return 'Todas las tareas';
    const activeFilter = filterOptions.find((opt) => opt.value === filters.upcomingFilter);
    return activeFilter?.label || '';
  };

  const isAllActive = !filters.upcomingFilter;

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4">
      <div className="flex items-center gap-2 mb-3">
        <Filter className="h-4 w-4 text-blue-600 dark:text-blue-400" />
        <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
          Filtrar tareas
        </h3>
      </div>

      <div className="flex flex-wrap gap-2">
        {filterOptions.map((option) => {
          const isActive = option.value
            ? filters.upcomingFilter === option.value
            : isAllActive;
          const Icon = option.icon;

          return (
            <button
              key={option.value || 'all'}
              type="button"
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors cursor-pointer ${
                isActive
                  ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/25'
                  : 'bg-slate-50 text-slate-700 hover:bg-slate-100 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600 border border-slate-200 dark:border-slate-600'
              }`}
              onClick={() => handleUpcomingFilterChange(option.value)}
            >
              <Icon
                className={`h-3.5 w-3.5 ${isActive ? 'text-white' : 'text-slate-500 dark:text-slate-300'}`}
              />
              <span>{option.label}</span>
            </button>
          );
        })}
      </div>

      <div className="mt-3 p-2.5 rounded-lg bg-orange-50 dark:bg-orange-900/20 border border-orange-100 dark:border-orange-800/40">
        <p className="text-sm text-orange-800 dark:text-orange-300 flex items-center">
          <AlertCircle className="h-4 w-4 mr-2 flex-shrink-0" />
          <span>
            <strong>Filtro activo:</strong> {getActiveFilterLabel()}
            {filters.upcomingFilter === 'opsWindow' ? (
              <> · Histórico: buscá por número o elegí «Todas».</>
            ) : null}
          </span>
        </p>
      </div>
    </div>
  );
};

export default UpcomingTasksFilter;

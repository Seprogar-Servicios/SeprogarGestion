import React from 'react';
import { Clock, Calendar, List, Filter, AlertCircle } from 'lucide-react';
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
    { value: '', label: 'Todas las tareas', icon: List, default: true },
    { value: 'today', label: 'Creadas hoy', icon: Calendar },
    { value: 'past', label: 'Tareas antiguas', icon: Clock },
    { value: 'current', label: 'Tareas actuales', icon: Calendar },
    { value: 'next24h', label: 'Próximas 24h', icon: Clock },
    { value: 'next48h', label: 'Próximas 48h', icon: Clock },
    { value: 'nextWeek', label: 'Próxima semana', icon: Calendar },
    { value: 'nextMonth', label: 'Próximo mes', icon: Calendar },
  ];

  const handleUpcomingFilterChange = (upcomingFilter: 'past' | 'next24h' | 'next48h' | 'nextWeek' | 'nextMonth' | 'custom' | '') => {
    // If clicking the same filter or 'Todas las tareas' is already selected, clear all filters
    if (filters.upcomingFilter === upcomingFilter || (!upcomingFilter && !filters.upcomingFilter)) {
      // Create a completely fresh filters object with no date-related fields
      const { fechaDesde, fechaHasta, upcomingFilter: _, ...restFilters } = filters;
      onFiltersChange({
        ...restFilters,
        fechaDesde: undefined,
        fechaHasta: undefined,
        upcomingFilter: undefined,
      });
      return;
    }
    
    // For 'Todas las tareas', clear all date filters
    if (!upcomingFilter) {
      const { fechaDesde, fechaHasta, ...restFilters } = filters;
      onFiltersChange({
        ...restFilters,
        fechaDesde: undefined,
        fechaHasta: undefined,
        upcomingFilter: undefined,
      });
      return;
    }
    
    // For other filters, just set the filter - the date range will be handled by getUpcomingDateRange
    const { fechaDesde, fechaHasta, ...restFilters } = filters;
    onFiltersChange({
      ...restFilters,
      fechaDesde: undefined, // Clear any previous date filters
      fechaHasta: undefined, // Clear any previous date filters
      upcomingFilter: upcomingFilter,
    });
  };

  const getActiveFilterLabel = () => {
    if (!filters.upcomingFilter) return '';
    const activeFilter = filterOptions.find(opt => opt.value === filters.upcomingFilter);
    return activeFilter?.label || '';
  };

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
            : !filters.upcomingFilter;
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
              onClick={() => handleUpcomingFilterChange(option.value as any)}
            >
              <Icon className={`h-3.5 w-3.5 ${isActive ? 'text-white' : 'text-slate-500 dark:text-slate-300'}`} />
              <span>{option.label}</span>
            </button>
          );
        })}
      </div>

      {filters.upcomingFilter && (
        <div className="mt-3 p-2.5 rounded-lg bg-orange-50 dark:bg-orange-900/20 border border-orange-100 dark:border-orange-800/40">
          <p className="text-sm text-orange-800 dark:text-orange-300 flex items-center">
            <AlertCircle className="h-4 w-4 mr-2 flex-shrink-0" />
            <span>
              <strong>Filtro activo:</strong> {getActiveFilterLabel()}
            </span>
          </p>
        </div>
      )}
    </div>
  );
};

export default UpcomingTasksFilter;

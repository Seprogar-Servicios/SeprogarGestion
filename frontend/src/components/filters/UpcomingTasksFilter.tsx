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
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border-t-4 border-blue-500 p-4 mb-6">
      <div className="flex items-center gap-2 mb-4">
        <div className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded-full">
          <Filter className="h-5 w-5 text-blue-600 dark:text-blue-400" />
        </div>
        <h3 className="text-lg font-medium bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          Filtrar Tareas
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
              className={`group relative flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-all duration-200 ${
                isActive
                  ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-md hover:shadow-lg hover:from-blue-700 hover:to-purple-700'
                  : 'bg-white text-gray-700 hover:bg-gray-50 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600 border border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
              }`}
              onClick={() => handleUpcomingFilterChange(option.value as any)}
            >
              <div className={`p-1.5 rounded-full transition-colors ${
                isActive
                  ? 'bg-white/20'
                  : 'bg-gray-100 group-hover:bg-gray-200 dark:bg-gray-600 dark:group-hover:bg-gray-500'
              }`}>
                <Icon className={`h-4 w-4 ${
                  isActive ? 'text-white' : 'text-gray-600 dark:text-gray-300'
                }`} />
              </div>
              <span>{option.label}</span>
              {isActive && (
                <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 flex items-center justify-center">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                </span>
              )}
            </button>
          );
        })}
      </div>
      
      {filters.upcomingFilter && (
        <div className="mt-4 p-3 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg border border-blue-100 dark:border-blue-800/30">
          <p className="text-sm text-blue-700 dark:text-blue-300 flex items-center">
            <AlertCircle className="h-4 w-4 mr-2 flex-shrink-0" />
            <span><strong>Filtro activo:</strong> {getActiveFilterLabel()}</span>
          </p>
        </div>
      )}
    </div>
  );
};

export default UpcomingTasksFilter;

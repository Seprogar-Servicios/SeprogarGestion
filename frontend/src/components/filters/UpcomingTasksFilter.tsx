import React from 'react';
import { Clock, Calendar, Filter } from 'lucide-react';
import type { TaskFilters } from '../../types';

interface UpcomingTasksFilterProps {
  filters: TaskFilters;
  onFiltersChange: (filters: TaskFilters) => void;
}

const UpcomingTasksFilter: React.FC<UpcomingTasksFilterProps> = ({
  filters,
  onFiltersChange,
}) => {
  const upcomingOptions = [
    { value: '', label: 'Todas las tareas' },
    { value: 'next24h', label: 'Próximas 24 horas', icon: Clock },
    { value: 'next48h', label: 'Próximas 48 horas', icon: Clock },
    { value: 'nextWeek', label: 'Próxima semana', icon: Calendar },
    { value: 'nextMonth', label: 'Próximo mes', icon: Calendar },
  ];

  const handleUpcomingFilterChange = (upcomingFilter: string) => {
    const newFilters = { ...filters };
    
    if (upcomingFilter) {
      newFilters.upcomingFilter = upcomingFilter as TaskFilters['upcomingFilter'];
      // Clear custom date filters when using predefined ranges
      delete newFilters.fechaDesde;
      delete newFilters.fechaHasta;
    } else {
      delete newFilters.upcomingFilter;
    }
    
    onFiltersChange(newFilters);
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 mb-6">
      <div className="flex items-center gap-2 mb-4">
        <Filter className="h-5 w-5 text-gray-500 dark:text-gray-400" />
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">
          Filtrar Tareas Próximas
        </h3>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {upcomingOptions.map((option) => {
          const Icon = option.icon;
          const isSelected = filters.upcomingFilter === option.value || (!filters.upcomingFilter && !option.value);
          
          return (
            <button
              key={option.value}
              onClick={() => handleUpcomingFilterChange(option.value)}
              className={`flex items-center gap-2 px-4 py-3 rounded-lg border transition-all duration-200 ${
                isSelected
                  ? 'bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-900/20 dark:border-blue-700 dark:text-blue-300'
                  : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-600'
              }`}
            >
              {Icon && <Icon className="h-4 w-4" />}
              <span className="text-sm font-medium">{option.label}</span>
            </button>
          );
        })}
      </div>
      
      {filters.upcomingFilter && (
        <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <p className="text-sm text-blue-700 dark:text-blue-300">
            <strong>Filtro activo:</strong> {upcomingOptions.find(opt => opt.value === filters.upcomingFilter)?.label}
          </p>
        </div>
      )}
    </div>
  );
};

export default UpcomingTasksFilter;

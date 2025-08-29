import React from 'react';
import { Clock, Calendar, Filter, AlertCircle } from 'lucide-react';
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
    { value: '', label: 'Todas las tareas', icon: AlertCircle },
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
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border-t-4 border-blue-500 p-4 mb-6 animate-fadeIn">
      <div className="flex items-center gap-2 mb-4">
        <div className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded-full">
          <Filter className="h-5 w-5 text-blue-600 dark:text-blue-400" />
        </div>
        <h3 className="text-lg font-medium bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
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
              className={`flex items-center gap-2 px-4 py-3 rounded-lg border transition-all duration-200 shadow-sm hover:shadow ${
                isSelected
                  ? 'bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200 text-blue-700 dark:from-blue-900/30 dark:to-purple-900/30 dark:border-blue-700 dark:text-blue-300 transform scale-105'
                  : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-600 hover:transform hover:scale-105'
              }`}
            >
              <div className={`p-1.5 rounded-full ${isSelected ? 'bg-blue-100 dark:bg-blue-800/50' : 'bg-gray-100 dark:bg-gray-600'}`}>
                {Icon && <Icon className={`h-4 w-4 ${isSelected ? 'text-blue-600 dark:text-blue-400' : 'text-gray-600 dark:text-gray-300'}`} />}
              </div>
              <span className="text-sm font-medium">{option.label}</span>
            </button>
          );
        })}
      </div>
      
      {filters.upcomingFilter && (
        <div className="mt-4 p-3 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg border border-blue-100 dark:border-blue-800/30 shadow-inner">
          <p className="text-sm text-blue-700 dark:text-blue-300 flex items-center">
            <AlertCircle className="h-4 w-4 mr-2" />
            <strong>Filtro activo:</strong> <span className="ml-1 font-medium">{upcomingOptions.find(opt => opt.value === filters.upcomingFilter)?.label}</span>
          </p>
        </div>
      )}
    </div>
  );
};

export default UpcomingTasksFilter;

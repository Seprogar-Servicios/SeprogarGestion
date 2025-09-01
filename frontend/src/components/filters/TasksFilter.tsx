import React, { useState, useEffect } from 'react';
import { useAppSelector } from '../../store';
import type { TaskFilters, User } from '../../types';
import { format, startOfToday } from 'date-fns';

interface TasksFilterProps {
  filters: TaskFilters;
  onFiltersChange: (filters: TaskFilters) => void;
}

const TasksFilter: React.FC<TasksFilterProps> = ({ filters, onFiltersChange }) => {
  const { users } = useAppSelector((state) => state.users);
  const [tecnico, setTecnico] = useState<string>(filters.tecnico || '');
  const [estado, setEstado] = useState<string>(filters.estado || '');
  const [fechaDesde, setFechaDesde] = useState<string>('');
  const [showOnlyFutureTasks, setShowOnlyFutureTasks] = useState<boolean>(false);

  // Filtrar usuarios que son técnicos (rol 'usuario')
  const tecnicos = users?.filter((user: User) => user.rol === 'usuario' && user.aprobado) || [];

  // Set initial filters on mount
  useEffect(() => {
    // Don't set any date filter by default to show all tasks
    if (Object.keys(filters).length === 0) {
      onFiltersChange({});
    }
  }, []);

  const handleApplyFilters = () => {
    const newFilters: TaskFilters = {};
    
    // Apply tecnico filter if selected
    if (tecnico) {
      newFilters.tecnico = tecnico;
    }
    
    // Apply estado filter if selected
    if (estado) {
      newFilters.estado = estado;
    }
    
    // Handle date filters
    if (showOnlyFutureTasks) {
      const today = format(startOfToday(), 'yyyy-MM-dd');
      newFilters.fechaDesde = today;
      // Clear any conflicting filters
      delete newFilters.fechaHasta;
      delete newFilters.upcomingFilter;
    } else if (fechaDesde) {
      newFilters.fechaDesde = fechaDesde;
    }
    
    if (estado) {
      newFilters.estado = estado;
    } else {
      delete newFilters.estado;
    }
    
    onFiltersChange(newFilters);
  };

  const handleClearFilters = () => {
    // Reset all local states
    setTecnico('');
    setEstado('');
    setFechaDesde('');
    setShowOnlyFutureTasks(true);
    
    // Reset to default filter (today's tasks)
    const today = format(startOfToday(), 'yyyy-MM-dd');
    const newFilters: TaskFilters = {
      fechaDesde: today
    };
    
    // Clear all other filters
    Object.keys(filters).forEach(key => {
      if (key !== 'fechaDesde') {
        delete (newFilters as any)[key];
      }
    });
    
    onFiltersChange(newFilters);
  };

  const { user } = useAppSelector((state) => state.auth);
  const isAdmin = user && user.rol === 'admin';

  return (
    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow mb-6">
      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Filtros</h3>
      
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {isAdmin && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Técnico asignado
              </label>
              <select
                value={tecnico}
                onChange={(e) => {
                  setTecnico(e.target.value);
                  // Aplicar filtros automáticamente al cambiar el técnico
                  const newFilters: TaskFilters = { ...filters };
                  if (e.target.value) {
                    newFilters.tecnico = e.target.value;
                  } else {
                    delete newFilters.tecnico;
                  }
                  
                  if (showOnlyFutureTasks) {
                    // Usar la fecha actual sin hora para asegurar que se incluyan todas las tareas de hoy
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    newFilters.fechaDesde = format(today, 'yyyy-MM-dd');
                  } else if (fechaDesde) {
                    newFilters.fechaDesde = fechaDesde;
                  } else {
                    delete newFilters.fechaDesde;
                  }
                  
                  onFiltersChange(newFilters);
                }}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="">Todos los técnicos</option>
                {tecnicos.map((tecnico) => (
                  <option key={tecnico._id} value={tecnico._id}>
                    {tecnico.nombre}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Filtro por Estado */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Estado
            </label>
            <select
              value={estado}
              onChange={(e) => setEstado(e.target.value)}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="">Todos los estados</option>
              <option value="pendiente">Pendiente</option>
              <option value="en progreso">En progreso</option>
              <option value="completada">Completada</option>
              <option value="cancelada">Cancelada</option>
            </select>
          </div>
        </div>

        <div className="flex items-center">
          <input
            type="checkbox"
            id="showOnlyFutureTasks"
            checked={showOnlyFutureTasks}
            onChange={async (e) => {
              const isChecked = e.target.checked;
              setShowOnlyFutureTasks(isChecked);
              
              // Create a new filters object
              const newFilters: TaskFilters = { ...filters };
              
              // Update date filter based on checkbox state
              if (isChecked) {
                const today = format(startOfToday(), 'yyyy-MM-dd');
                newFilters.fechaDesde = today;
              } else {
                delete newFilters.fechaDesde;
              }
              
              // Clear any conflicting date filters
              delete newFilters.fechaHasta;
              delete newFilters.upcomingFilter;
              
              // Apply the changes
              onFiltersChange(newFilters);
            }}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <label htmlFor="showOnlyFutureTasks" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
            Mostrar solo tareas desde hoy en adelante
          </label>
        </div>

        {!showOnlyFutureTasks && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Fecha desde
            </label>
            <input
              type="date"
              value={fechaDesde}
              onChange={(e) => setFechaDesde(e.target.value)}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
        )}

        <div className="flex space-x-2 pt-2">
          <button
            onClick={handleApplyFilters}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md text-sm font-medium cursor-pointer"
          >
            Aplicar filtros
          </button>
          <button
            onClick={handleClearFilters}
            className="flex-1 bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 text-gray-800 dark:text-white py-2 px-4 rounded-md text-sm font-medium cursor-pointer"
          >
            Limpiar filtros
          </button>
        </div>
      </div>
    </div>
  );
};

export default TasksFilter;

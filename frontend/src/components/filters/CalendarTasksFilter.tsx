import React, { useEffect, useState } from 'react';
import { Filter, User, CheckCircle } from 'lucide-react';
import type { TaskFilters } from '../../types';
import { useAppSelector, useAppDispatch } from '../../store';
import { fetchUsers } from '../../store/slices/usersSlice';

interface CalendarTasksFilterProps {
  filters: TaskFilters;
  onFiltersChange: (filters: TaskFilters) => void;
}

const CalendarTasksFilter: React.FC<CalendarTasksFilterProps> = ({
  filters,
  onFiltersChange,
}) => {
  const dispatch = useAppDispatch();
  const { users } = useAppSelector((state) => state.users);
  const { user } = useAppSelector((state) => state.auth);
  const [selectedTecnico, setSelectedTecnico] = useState<string>(filters.tecnico || '');
  const [selectedEstado, setSelectedEstado] = useState<string>(filters.estado || '');
  
  const isAdmin = user && user.rol === 'admin';
  
  // Cargar usuarios al montar el componente solo si es admin
  useEffect(() => {
    if (isAdmin) {
      dispatch(fetchUsers());
    }
  }, [dispatch, isAdmin]);

  // Filtrar solo técnicos (usuarios con rol 'usuario')
  const tecnicos = Array.isArray(users) 
    ? users.filter((user: any) => user.rol === 'usuario')
    : [];

  const estadoOptions = [
    { value: '', label: 'Todos los estados' },
    { value: 'pendiente', label: 'Pendiente' },
    { value: 'en progreso', label: 'En Progreso' },
    { value: 'completada', label: 'Completada' },
  ];

  // Actualizar filtros cuando cambian las selecciones
  useEffect(() => {
    const newFilters = { ...filters };
    
    // Solo aplicar filtro de técnico si hay técnicos disponibles y se seleccionó uno
    if (selectedTecnico && tecnicos.length > 0) {
      newFilters.tecnico = selectedTecnico;
    } else {
      delete newFilters.tecnico;
    }
    
    if (selectedEstado) {
      newFilters.estado = selectedEstado;
    } else {
      delete newFilters.estado;
    }
    
    onFiltersChange(newFilters);
  }, [selectedTecnico, selectedEstado, tecnicos.length]);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 mb-4">
      <div className="flex items-center gap-2 mb-4">
        <Filter className="h-5 w-5 text-gray-500 dark:text-gray-400" />
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">
          Filtrar Tareas
        </h3>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Filtro por Técnico - Solo visible para administradores */}
        {isAdmin && (
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <User className="h-4 w-4" />
              Técnico
            </label>
            <select
              value={selectedTecnico}
              onChange={(e) => setSelectedTecnico(e.target.value)}
              className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 py-2 px-3 text-sm text-gray-900 dark:text-white shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">Todos los técnicos</option>
              {tecnicos.map((tecnico: any) => (
                <option key={tecnico._id} value={tecnico._id}>
                  {tecnico.nombre}
                </option>
              ))}
            </select>
          </div>
        )}
        
        {/* Filtro por Estado */}
        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            <CheckCircle className="h-4 w-4" />
            Estado
          </label>
          <select
            value={selectedEstado}
            onChange={(e) => setSelectedEstado(e.target.value)}
            className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 py-2 px-3 text-sm text-gray-900 dark:text-white shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            {estadoOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>
      
      {/* Indicadores de filtros activos */}
      {(selectedTecnico || selectedEstado) && (
        <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <p className="text-sm text-blue-700 dark:text-blue-300">
            <strong>Filtros activos:</strong>
            {selectedTecnico && tecnicos.find((t: any) => t._id === selectedTecnico) && 
              ` Técnico: ${tecnicos.find((t: any) => t._id === selectedTecnico)?.nombre}`}
            {selectedEstado && 
              ` Estado: ${estadoOptions.find(opt => opt.value === selectedEstado)?.label}`}
          </p>
        </div>
      )}
    </div>
  );
};

export default CalendarTasksFilter;

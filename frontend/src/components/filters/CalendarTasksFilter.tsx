import React, { useEffect, useState } from 'react';
import { Filter, User, CheckCircle, Calendar, X, Search, Sliders } from 'lucide-react';
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
  const [isExpanded, setIsExpanded] = useState<boolean>(true);
  
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
    { value: '', label: 'Todos los estados', icon: <Sliders className="h-4 w-4" /> },
    { value: 'pendiente', label: 'Pendiente', icon: <Calendar className="h-4 w-4 text-gray-500" /> },
    { value: 'en progreso', label: 'En Progreso', icon: <Search className="h-4 w-4 text-yellow-500" /> },
    { value: 'completada', label: 'Completada', icon: <CheckCircle className="h-4 w-4 text-green-500" /> },
  ];

  // Actualizar filtros cuando cambian las selecciones
  useEffect(() => {
    const newFilters = { ...filters };
    
    // Solo aplicar filtro de técnico si hay técnicos disponibles y se seleccionó uno
    if (selectedTecnico && selectedTecnico !== '') {
      // Verificar si hay técnicos disponibles
      if (tecnicos.length > 0) {
        newFilters.tecnico = selectedTecnico;
      } else {
        // Si no hay técnicos disponibles, no aplicar filtro
        delete newFilters.tecnico;
        // Resetear la selección de técnico
        setSelectedTecnico('');
      }
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

  const resetFilters = () => {
    setSelectedTecnico('');
    setSelectedEstado('');
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border-t-4 border-blue-500 dark:border-purple-500 p-4 mb-4 animate-fadeIn transition-all duration-300">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded-full">
            <Filter className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          </div>
          <h3 className="text-lg font-medium bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Filtrar Tareas
          </h3>
        </div>
        
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setIsExpanded(!isExpanded)}
            className="px-3 py-1 text-sm bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-md flex items-center gap-1 transition-colors duration-200 cursor-pointer"
          >
            <Sliders className="h-4 w-4" />
            {isExpanded ? 'Ocultar' : 'Mostrar'} filtros
          </button>
          
          {(selectedTecnico || selectedEstado) && (
            <button 
              onClick={resetFilters}
              className="p-1 hover:bg-red-100 dark:hover:bg-red-900/20 rounded-full transition-colors duration-200"
              title="Limpiar filtros"
            >
              <X className="h-4 w-4 text-red-500" />
            </button>
          )}
        </div>
      </div>
      
      <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 overflow-hidden transition-all duration-300 ${isExpanded ? 'max-h-96 opacity-100 mb-4' : 'max-h-0 opacity-0'}`}>
        {/* Filtro por Técnico - Solo visible para administradores */}
        {isAdmin && (
          <div className="animate-fadeIn" style={{ animationDelay: '100ms' }}>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <User className="h-4 w-4 text-blue-500" />
              Técnico
            </label>
            <select
              value={selectedTecnico}
              onChange={(e) => setSelectedTecnico(e.target.value)}
              className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 py-2 px-3 text-sm text-gray-900 dark:text-white shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 hover:border-blue-400 dark:hover:border-blue-500 transition-colors duration-200 cursor-pointer"
            >
              <option value="">{tecnicos.length > 0 ? 'Todos los técnicos' : 'No hay técnicos'}</option>
              {tecnicos.map((tecnico: any) => (
                <option key={tecnico._id} value={tecnico._id}>
                  {tecnico.nombre}
                </option>
              ))}
            </select>
          </div>
        )}
        
        {/* Filtro por Estado */}
        <div className="animate-fadeIn" style={{ animationDelay: '200ms' }}>
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            <Search className="h-4 w-4 text-blue-500" />
            Estado
          </label>
          <div className="relative">
            <select
              value={selectedEstado}
              onChange={(e) => setSelectedEstado(e.target.value)}
              className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 py-2 pl-3 pr-10 text-sm text-gray-900 dark:text-white shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 hover:border-blue-400 dark:hover:border-blue-500 transition-colors duration-200 appearance-none cursor-pointer"
            >
              {estadoOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
              <Calendar className="h-4 w-4 text-gray-400" />
            </div>
          </div>
        </div>
      </div>
      
      {/* Indicadores de filtros activos */}
      {(selectedTecnico || selectedEstado) && (
        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-800 animate-fadeIn shadow-inner">
          <p className="text-sm text-blue-700 dark:text-blue-300 flex items-center gap-2">
            <Filter className="h-4 w-4" />
            <strong>Filtros activos:</strong>
            {selectedTecnico && tecnicos.find((t: any) => t._id === selectedTecnico) && (
              <span className="inline-flex items-center px-2 py-1 rounded-full bg-blue-100 dark:bg-blue-800 text-blue-800 dark:text-blue-200 text-xs font-medium">
                <User className="h-3 w-3 mr-1" />
                {tecnicos.find((t: any) => t._id === selectedTecnico)?.nombre}
              </span>
            )}
            {selectedEstado && (
              <span className="inline-flex items-center px-2 py-1 rounded-full bg-blue-100 dark:bg-blue-800 text-blue-800 dark:text-blue-200 text-xs font-medium">
                {estadoOptions.find(opt => opt.value === selectedEstado)?.icon}
                <span className="ml-1">{estadoOptions.find(opt => opt.value === selectedEstado)?.label}</span>
              </span>
            )}
          </p>
        </div>
      )}
    </div>
  );
};

export default CalendarTasksFilter;

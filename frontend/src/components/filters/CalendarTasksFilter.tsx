import React, { useEffect, useState } from 'react';
import { Filter, User, CheckCircle, Calendar, X, Search, ChevronDown } from 'lucide-react';
import type { TaskFilters } from '../../types';
import { useAppSelector, useAppDispatch } from '../../store';
import { fetchUsers } from '../../store/slices/usersSlice';
import { isAdminRole } from '../../utils/roles';

interface CalendarTasksFilterProps {
  filters: TaskFilters;
  onFiltersChange: (filters: TaskFilters) => void;
  /** Contenido extra a la derecha de la barra (leyenda, loading, etc.) */
  trailing?: React.ReactNode;
}

const CalendarTasksFilter: React.FC<CalendarTasksFilterProps> = ({
  filters,
  onFiltersChange,
  trailing,
}) => {
  const dispatch = useAppDispatch();
  const { users } = useAppSelector((state) => state.users);
  const { user } = useAppSelector((state) => state.auth);
  const [selectedTecnico, setSelectedTecnico] = useState<string>(filters.tecnico || '');
  const [selectedEstado, setSelectedEstado] = useState<string>(filters.estado || '');
  const [isExpanded, setIsExpanded] = useState(false);

  const isAdmin = isAdminRole(user);

  useEffect(() => {
    if (isAdmin) {
      dispatch(fetchUsers());
    }
  }, [dispatch, isAdmin]);

  const tecnicos = Array.isArray(users)
    ? users.filter((u: any) => u.rol === 'usuario')
    : [];

  const estadoOptions = [
    { value: '', label: 'Todos los estados' },
    { value: 'pendiente', label: 'Pendiente' },
    { value: 'en progreso', label: 'En progreso' },
    { value: 'completada', label: 'Completada' },
    { value: 'cancelada', label: 'Cancelada' },
  ];

  useEffect(() => {
    const newFilters = { ...filters };

    if (selectedTecnico && selectedTecnico !== '' && tecnicos.length > 0) {
      newFilters.tecnico = selectedTecnico;
    } else {
      delete newFilters.tecnico;
      if (selectedTecnico && tecnicos.length === 0) setSelectedTecnico('');
    }

    if (selectedEstado) {
      newFilters.estado = selectedEstado;
    } else {
      delete newFilters.estado;
    }

    onFiltersChange(newFilters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTecnico, selectedEstado, tecnicos.length]);

  const resetFilters = () => {
    setSelectedTecnico('');
    setSelectedEstado('');
  };

  const activeCount = [selectedTecnico, selectedEstado].filter(Boolean).length;

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-hidden">
      <div className="flex flex-wrap items-center gap-2 px-2.5 py-1.5 min-h-[2.25rem]">
        <button
          type="button"
          onClick={() => setIsExpanded((v) => !v)}
          className="inline-flex items-center gap-1.5 px-2 py-1 text-xs font-medium rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
        >
          <Filter className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
          Filtros
          {activeCount > 0 && (
            <span className="inline-flex items-center justify-center h-4 min-w-[1rem] px-1 rounded-full bg-orange-500 text-white text-[10px] font-semibold">
              {activeCount}
            </span>
          )}
          <ChevronDown
            className={`h-3.5 w-3.5 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          />
        </button>

        {!isExpanded && activeCount > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap">
            {selectedTecnico && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-700 text-[11px] text-slate-700 dark:text-slate-200">
                <User className="h-3 w-3" />
                {tecnicos.find((t: any) => t._id === selectedTecnico)?.nombre || 'Técnico'}
              </span>
            )}
            {selectedEstado && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-700 text-[11px] text-slate-700 dark:text-slate-200">
                <CheckCircle className="h-3 w-3" />
                {estadoOptions.find((o) => o.value === selectedEstado)?.label}
              </span>
            )}
            <button
              type="button"
              onClick={resetFilters}
              className="p-0.5 rounded hover:bg-red-50 dark:hover:bg-red-900/20"
              title="Limpiar filtros"
            >
              <X className="h-3.5 w-3.5 text-red-500" />
            </button>
          </div>
        )}

        {trailing && <div className="ml-auto flex items-center gap-2">{trailing}</div>}
      </div>

      {isExpanded && (
        <div className="flex flex-wrap items-end gap-2 px-2.5 pb-2 pt-0 border-t border-slate-100 dark:border-slate-700/80">
          {isAdmin && (
            <div className="min-w-[10rem] flex-1">
              <label className="flex items-center gap-1 text-[10px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-0.5">
                <User className="h-3 w-3" />
                Técnico
              </label>
              <select
                value={selectedTecnico}
                onChange={(e) => setSelectedTecnico(e.target.value)}
                className="w-full rounded-md border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 py-1 px-2 text-xs text-slate-900 dark:text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="">{tecnicos.length > 0 ? 'Todos' : 'Sin técnicos'}</option>
                {tecnicos.map((tecnico: any) => (
                  <option key={tecnico._id} value={tecnico._id}>
                    {tecnico.nombre}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="min-w-[10rem] flex-1">
            <label className="flex items-center gap-1 text-[10px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-0.5">
              <Search className="h-3 w-3" />
              Estado
            </label>
            <div className="relative">
              <select
                value={selectedEstado}
                onChange={(e) => setSelectedEstado(e.target.value)}
                className="w-full rounded-md border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 py-1 pl-2 pr-7 text-xs text-slate-900 dark:text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 appearance-none"
              >
                {estadoOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <Calendar className="absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-400 pointer-events-none" />
            </div>
          </div>

          {activeCount > 0 && (
            <button
              type="button"
              onClick={resetFilters}
              className="inline-flex items-center gap-1 px-2 py-1 text-xs text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md"
            >
              <X className="h-3.5 w-3.5" />
              Limpiar
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default CalendarTasksFilter;

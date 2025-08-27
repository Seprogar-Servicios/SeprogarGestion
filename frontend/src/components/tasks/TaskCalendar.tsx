import React, { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../../store';
import { fetchCalendarTasks } from '../../store/slices/tasksSlice';
import CalendarTasksFilter from '../filters/CalendarTasksFilter';
import type { TaskFilters } from '../../types';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths } from 'date-fns';
import { es } from 'date-fns/locale';

const TaskCalendar: React.FC = () => {
  const dispatch = useAppDispatch();
  const { tasks, loading } = useAppSelector((state) => state.tasks);
  const { user } = useAppSelector((state) => state.auth);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [filters, setFilters] = useState<TaskFilters>({});

  useEffect(() => {
    const startDate = startOfMonth(currentDate);
    const endDate = endOfMonth(currentDate);
    
    // Extender el rango de fechas para incluir un día antes y después del mes
    // para asegurar que se muestren todas las tareas
    const extendedStartDate = new Date(startDate);
    extendedStartDate.setDate(extendedStartDate.getDate() - 1);
    
    const extendedEndDate = new Date(endDate);
    extendedEndDate.setDate(extendedEndDate.getDate() + 1);
    
    const calendarFilters = {
      ...filters,
      fechaDesde: extendedStartDate.toISOString(),
      fechaHasta: extendedEndDate.toISOString()
    };
    
    // Si el usuario no es admin, filtrar solo sus tareas
    if (user && user.rol !== 'admin') {
      calendarFilters.usuario = user._id;
    }
    
    dispatch(fetchCalendarTasks(calendarFilters));
  }, [dispatch, currentDate, filters, user]);
  
  // El efecto de depuración ha sido eliminado
  

  const handleFiltersChange = (newFilters: TaskFilters) => {
    setFilters(newFilters);
  };

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarDays = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const getTasksForDate = (date: Date) => {
    if (!tasks || !Array.isArray(tasks)) {
      return [];
    }
    
    const tasksForDate = tasks.filter(task => {
      if (!task) {
        return false;
      }
      
      // Aplicar filtro por técnico si está seleccionado y no está vacío
      if (filters.tecnico && filters.tecnico !== '') {
        // Si la tarea no tiene técnicos asignados, no mostrarla cuando hay filtro de técnico
        if (!task.tecnicos || !Array.isArray(task.tecnicos) || task.tecnicos.length === 0) {
          return false;
        }
        
        // Verificar si el técnico seleccionado está asignado a esta tarea
        const tecnicoFound = task.tecnicos.some((tecnico: any) => {
          // Manejar tanto objetos completos como IDs de técnicos
          if (typeof tecnico === 'object' && tecnico !== null) {
            return tecnico._id === filters.tecnico;
          } else {
            return tecnico === filters.tecnico;
          }
        });
        
        if (!tecnicoFound) return false;
      }
      
      // Aplicar filtro por estado si está seleccionado
      if (filters.estado && task.estado !== filters.estado) {
        return false;
      }
      
      // Si no hay fecha de ejecución, no mostrar en el calendario
      if (!task.fechaEjecucion) {
        return false;
      }
      
      // Verificar si es una tarea del worker (sin logs de depuración)
      
      try {
        // Convertir la fecha de la tarea a objeto Date
        // Asegurarnos de que la fecha se interprete correctamente para Argentina (UTC-3)
        let taskDate: Date;
        
        if (typeof task.fechaEjecucion === 'string') {
          // Detectar formato de fecha
          if (task.fechaEjecucion.includes('T')) {
            // Si la fecha incluye componente de tiempo (formato ISO)
            taskDate = new Date(task.fechaEjecucion);
            
            // Verificar si la fecha es válida
            if (isNaN(taskDate.getTime())) {
              return false;
            }
          } else if (task.fechaEjecucion.includes('-')) {
            // Si la fecha es formato YYYY-MM-DD sin componente de tiempo (formato del worker)
            const parts = task.fechaEjecucion.split('-');
            
            if (parts.length === 3) {
              const year = parseInt(parts[0], 10);
              const month = parseInt(parts[1], 10) - 1; // Meses en JS son 0-11
              const day = parseInt(parts[2], 10);
              
              // Crear la fecha a las 12:00 del día para evitar problemas de zona horaria
              taskDate = new Date(year, month, day, 12, 0, 0);
              
              // Verificar si la fecha es válida
              if (isNaN(taskDate.getTime())) {
                return false;
              }
            } else {
              return false;
            }
          } else if (task.fechaEjecucion.includes('/')) {
            // Si la fecha es formato DD/MM/YYYY (formato común en mensajes de WhatsApp)
            const parts = task.fechaEjecucion.split('/');
            
            if (parts.length === 3) {
              // Intentar interpretar como DD/MM/YYYY
              const day = parseInt(parts[0], 10);
              const month = parseInt(parts[1], 10) - 1; // Meses en JS son 0-11
              const year = parseInt(parts[2], 10);
              
              // Ajustar año si viene en formato corto (22 -> 2022)
              const fullYear = year < 100 ? 2000 + year : year;
              
              // Crear la fecha a las 12:00 del día para evitar problemas de zona horaria
              taskDate = new Date(fullYear, month, day, 12, 0, 0);
              
              // Verificar si la fecha es válida
              if (isNaN(taskDate.getTime())) {
                return false;
              }
            } else {
              return false;
            }
          } else {
            return false; // Formato de fecha no reconocido
          }
        } else if (Object.prototype.toString.call(task.fechaEjecucion) === '[object Date]') {
          // Si ya es un objeto Date
          taskDate = new Date(task.fechaEjecucion as Date);
          
          // Verificar si la fecha es válida
          if (isNaN(taskDate.getTime())) {
            return false;
          }
        } else {
          // Si no es ni string ni Date, no podemos procesarlo
          return false;
        }
        
        // Verificar que la fecha es válida
        if (isNaN(taskDate.getTime())) {
          return false;
        }
        
        // Comparar si es el mismo día usando date-fns que maneja correctamente las zonas horarias
        return isSameDay(taskDate, date);
      } catch (error) {
        return false;
      }
    });
    
    return tasksForDate;
  };

  const getStatusColor = (estado: string) => {
    switch (estado) {
      case 'completada':
        return 'bg-green-500';
      case 'en progreso':
        return 'bg-yellow-500';
      default:
        return 'bg-gray-500';
    }
  };

  const selectedDateTasks = selectedDate ? getTasksForDate(selectedDate) : [];

  return (
    <div className="space-y-6 h-full flex flex-col" style={{ minHeight: '85vh' }}>
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Calendario de Tareas</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Vista de calendario con todas las tareas programadas
          </p>
        </div>
      </div>

      {/* Calendar Tasks Filter */}
      <CalendarTasksFilter
        filters={filters}
        onFiltersChange={handleFiltersChange}
      />

      <div className="flex flex-col lg:flex-row gap-4 h-full min-h-[600px] w-full">
        {/* Calendar */}
        <div className="flex-1 lg:flex-[3] min-w-0">
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg h-full flex flex-col">
            {/* Calendar Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <button
                onClick={() => setCurrentDate(subMonths(currentDate, 1))}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
              >
                <ChevronLeft className="h-5 w-5 text-gray-600 dark:text-gray-400" />
              </button>
              
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white capitalize">
                {format(currentDate, 'MMMM yyyy', { locale: es })}
              </h2>
              
              <button
                onClick={() => setCurrentDate(addMonths(currentDate, 1))}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
              >
                <ChevronRight className="h-5 w-5 text-gray-600 dark:text-gray-400" />
              </button>
            </div>

            {/* Calendar Grid */}
            <div className="p-4 flex-grow overflow-auto">
              {/* Days of week header */}
              <div className="grid grid-cols-7 gap-1 mb-4 min-w-[600px]">
                {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map((day) => (
                  <div key={day} className="p-2 text-center text-sm font-medium text-gray-500 dark:text-gray-400">
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar days */}
              <div className="grid grid-cols-7 gap-1 auto-rows-fr min-w-[600px]" style={{ minHeight: '400px' }}>
                {calendarDays.map((day) => {
                  const dayTasks = getTasksForDate(day);
                  const isSelected = selectedDate && isSameDay(day, selectedDate);
                  const isCurrentMonth = isSameMonth(day, currentDate);
                  const isToday = isSameDay(day, new Date());

                  return (
                    <div
                      key={day.toISOString()}
                      onClick={() => setSelectedDate(day)}
                      className={`
                        h-full min-h-[80px] p-1 sm:p-2 border border-gray-200 dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors overflow-hidden
                        ${isSelected ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-500' : ''}
                        ${!isCurrentMonth ? 'text-gray-400 dark:text-gray-600' : ''}
                        ${isToday ? 'bg-blue-100 dark:bg-blue-900/30' : ''}
                      `}
                    >
                      <div className={`text-sm font-medium mb-1 ${isToday ? 'text-blue-600 dark:text-blue-400' : 'text-gray-900 dark:text-white'}`}>
                        {format(day, 'd')}
                      </div>
                      
                      <div className="space-y-1 overflow-y-auto max-h-[60px]">
                        {dayTasks.length > 0 ? (
                          dayTasks.slice(0, 2).map((task) => (
                            <div
                              key={task._id}
                              className={`text-xs p-1 rounded truncate ${getStatusColor(task.estado)} text-white`}
                              title={`${task.titulo} - ${task.estado}`}
                            >
                              {task.titulo}
                            </div>
                          ))
                        ) : null}
                        {dayTasks.length > 2 && (
                          <div className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                            +{dayTasks.length - 2} más
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="flex-1 lg:flex-[1] min-w-0 lg:min-w-[300px]">
          <div className="space-y-4 h-full">
            {/* Task Details Sidebar */}
            <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-4 flex-1 overflow-y-auto">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                {selectedDate ? format(selectedDate, 'EEEE, d MMMM yyyy', { locale: es }) : 'Selecciona un día'}
              </h3>

              {selectedDate && (
                <div className="space-y-4">
                  <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    Tareas ({selectedDateTasks.length})
                  </h4>

                  {selectedDateTasks.length === 0 ? (
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      No hay tareas programadas para este día.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {selectedDateTasks.map((task) => (
                        <div
                          key={task._id}
                          className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600"
                        >
                          <div className="flex items-center justify-between">
                            <h5 className="font-medium text-gray-900 dark:text-white">
                              {task.titulo}
                            </h5>
                            <span
                              className={`text-xs px-2 py-1 rounded-full ${getStatusColor(
                                task.estado
                              )} text-white`}
                            >
                              {task.estado}
                            </span>
                          </div>
                          
                          {task.numero && (
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                              <span className="font-medium">Número:</span> {task.numero}
                            </p>
                          )}
                          
                          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                            <span className="font-medium">Cliente:</span> {task.cliente || 'No especificado'}
                          </p>
                          
                          {task.tecnicos && task.tecnicos.length > 0 && (
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                              <span className="font-medium">Técnicos:</span> {
                                Array.isArray(task.tecnicos) 
                                  ? task.tecnicos.map((t: any) => t.nombre || t).join(', ')
                                  : 'No asignados'
                              }
                            </p>
                          )}
                          
                          {task.descripcion && (
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 line-clamp-2">
                              {task.descripcion}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Legend */}
            <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
              <div className="px-4 py-4">
                <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white mb-3">
                  Leyenda
                </h3>
                <div className="space-y-2">
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-green-500 rounded mr-2"></div>
                    <span className="text-sm text-gray-600 dark:text-gray-400">Completada</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-yellow-500 rounded mr-2"></div>
                    <span className="text-sm text-gray-600 dark:text-gray-400">En Progreso</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-gray-500 rounded mr-2"></div>
                    <span className="text-sm text-gray-600 dark:text-gray-400">Pendiente</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {loading && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">Cargando tareas...</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default TaskCalendar;

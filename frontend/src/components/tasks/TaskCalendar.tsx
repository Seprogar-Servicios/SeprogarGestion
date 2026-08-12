import React, { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../../store';
import { fetchCalendarTasks } from '../../store/slices/tasksSlice';
import CalendarTasksFilter from '../filters/CalendarTasksFilter';
import type { TaskFilters } from '../../types';
import { ChevronLeft, ChevronRight, Calendar, Clock, MapPin, User, CheckCircle, AlertCircle, Loader, XCircle, Calendar as CalendarIcon } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths } from 'date-fns';
import { es } from 'date-fns/locale';
import { useTheme } from '../../hooks/useTheme';
import AdminPageHeader from '../common/AdminPageHeader';

const TaskCalendar: React.FC = () => {
  const dispatch = useAppDispatch();
  const { tasks, loading } = useAppSelector((state) => state.tasks);
  const { user } = useAppSelector((state) => state.auth);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [filters, setFilters] = useState<TaskFilters>({});
  const { isDarkMode } = useTheme();

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
  
  // Get the first day of the week (0 = Sunday, 1 = Monday, etc.)
  const firstDayOfWeek = 0; // 0 for Sunday, 1 for Monday, etc.
  
  // Calculate the start date to include the beginning of the week
  let startDate = new Date(monthStart);
  while (startDate.getDay() !== firstDayOfWeek) {
    startDate.setDate(startDate.getDate() - 1);
  }
  
  // Calculate the end date to include the end of the week
  let endDate = new Date(monthEnd);
  while (endDate.getDay() !== (firstDayOfWeek + 6) % 7) {
    endDate.setDate(endDate.getDate() + 1);
  }
  
  // Generate all days for the calendar view
  const calendarDays = eachDayOfInterval({ start: startDate, end: endDate });

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
        return isDarkMode ? 'bg-gradient-to-r from-green-500 to-emerald-600' : 'bg-gradient-to-r from-green-400 to-green-500';
      case 'cancelada':
        return isDarkMode ? 'bg-gradient-to-r from-red-500 to-red-600' : 'bg-gradient-to-r from-red-400 to-red-500';
      case 'en progreso':
        return isDarkMode ? 'bg-gradient-to-r from-amber-500 to-yellow-600' : 'bg-gradient-to-r from-amber-400 to-yellow-500';
      default:
        return isDarkMode ? 'bg-gradient-to-r from-gray-500 to-gray-600' : 'bg-gradient-to-r from-gray-400 to-gray-500';
    }
  };
  
  

  const selectedDateTasks = selectedDate ? getTasksForDate(selectedDate) : [];

  return (
    <div className="space-y-6 h-full flex flex-col animate-fadeIn" style={{ minHeight: '85vh' }}>
      <AdminPageHeader
        title="Calendario de Tareas"
        description="Vista de calendario con todas las tareas programadas"
        eyebrow="Administración"
        icon={<Calendar className="h-5 w-5" />}
        actions={
          <button
            onClick={() => {
              const today = new Date();
              setCurrentDate(today);
              setSelectedDate(today);
            }}
            className="inline-flex items-center px-4 py-2.5 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-lg shadow-sm text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors cursor-pointer"
          >
            <CalendarIcon className="h-4 w-4 mr-2" />
            Ir a Hoy
          </button>
        }
      />

      {/* Calendar Tasks Filter */}
      <CalendarTasksFilter
        filters={filters}
        onFiltersChange={handleFiltersChange}
      />

      <div className="flex flex-col lg:flex-row gap-4 h-full min-h-[600px] w-full">
        {/* Calendar */}
        <div className="flex-1 lg:flex-[3] min-w-0 animate-fadeIn" style={{ animationDelay: '100ms' }}>
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-slate-200 dark:border-slate-700 h-full flex flex-col">
            {/* Calendar Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <button
                onClick={() => setCurrentDate(subMonths(currentDate, 1))}
                className="p-2 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-md transition-colors duration-200"
              >
                <ChevronLeft className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </button>
              
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white capitalize flex items-center">
                <Calendar className="h-5 w-5 mr-2 text-blue-500" />
                {format(currentDate, 'MMMM yyyy', { locale: es })}
              </h2>
              
              <button
                onClick={() => setCurrentDate(addMonths(currentDate, 1))}
                className="p-2 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-md transition-colors duration-200"
              >
                <ChevronRight className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </button>
            </div>

            {/* Calendar Grid */}
            <div className="p-4 flex-grow overflow-auto">
              {/* Days of week header */}
              <div className="grid grid-cols-7 gap-1 mb-4 min-w-[600px]">
                {[0, 1, 2, 3, 4, 5, 6].map((dayIndex) => {
                  // Get the day of week using date-fns with Spanish locale
                  const dayDate = new Date(2023, 0, dayIndex + 1); // Any date where we can get the day of week
                  const dayName = format(dayDate, 'EEE', { locale: es });
                  return (
                    <div 
                      key={dayIndex} 
                      className="p-2 text-center text-sm font-medium rounded-md text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/10"
                    >
                      {dayName}
                    </div>
                  );
                })}
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
                        h-full min-h-[80px] p-1 sm:p-2 border border-gray-200 dark:border-gray-700 cursor-pointer 
                        hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all duration-200 overflow-hidden rounded-lg
                        ${isSelected ? 'ring-2 ring-blue-500 dark:ring-blue-400 shadow-md' : ''}
                        ${!isCurrentMonth ? 'opacity-40' : ''}
                        ${isToday ? 'bg-blue-100 dark:bg-blue-900/30 border-blue-500 dark:border-blue-400' : ''}
                      `}
                    >
                      <div className={`
                        text-sm font-medium mb-1 flex justify-center items-center w-6 h-6 rounded-full mx-auto
                        ${isToday ? 'bg-blue-500 text-white' : 'text-gray-900 dark:text-white'}
                      `}>
                        {format(day, 'd')}
                      </div>
                      
                      <div className="space-y-1 overflow-y-auto max-h-[60px] mt-1">
                        {dayTasks.length > 0 ? (
                          dayTasks.slice(0, 2).map((task) => (
                            <div
                              key={task._id}
                              className={`
                                text-xs p-1 px-2 rounded-md truncate ${getStatusColor(task.estado)} text-white
                                shadow-sm hover:shadow-md transition-shadow duration-200 flex items-center gap-1
                              `}
                              title={`${task.titulo} - ${task.estado}`}
                            >
                              {task.estado === 'completada' && <CheckCircle className="h-3 w-3 text-white" />}
                              {task.estado === 'en progreso' && <Loader className="h-3 w-3 text-white animate-spin" />}
                              {task.estado === 'cancelada' && <XCircle className="h-3 w-3 text-white" />}
                              {task.estado !== 'completada' && task.estado !== 'en progreso' && task.estado !== 'cancelada' && <AlertCircle className="h-3 w-3 text-white" />}
                              <span className="truncate">{task.titulo}</span>
                            </div>
                          ))
                        ) : null}
                        {dayTasks.length > 2 && (
                          <div className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium p-1 rounded-md text-center animate-pulse">
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
        <div className="flex-1 lg:flex-[1] min-w-0 lg:min-w-[300px] animate-fadeIn" style={{ animationDelay: '200ms' }}>
          <div className="space-y-4 h-full">
            {/* Task Details Sidebar */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 flex-1 overflow-y-auto">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4 flex items-center">
                <CalendarIcon className="h-5 w-5 mr-2 text-orange-500" />
                {selectedDate ? (
                  <span className="capitalize">{format(selectedDate, 'EEEE, d MMMM yyyy', { locale: es })}</span>
                ) : (
                  'Selecciona un día'
                )}
              </h3>

              {selectedDate && (
                <div className="space-y-4">
                  <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    Tareas ({selectedDateTasks.length})
                  </h4>

                  {selectedDateTasks.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                      <CalendarIcon className="h-12 w-12 text-gray-300 dark:text-gray-600 mb-2" />
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        No hay tareas programadas para este día.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {selectedDateTasks.map((task) => (
                        <div
                          key={task._id}
                          className={`p-4 bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 border-l-4 border-${task.estado === 'completada' ? 'green' : task.estado === 'en progreso' ? 'yellow' : task.estado === 'cancelada' ? 'red' : 'gray'}-500 mb-3 animate-fadeIn`}
                          style={{ animationDelay: `${(selectedDateTasks.indexOf(task) * 100)}ms` }}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <h5 className="font-medium text-gray-900 dark:text-white flex items-center">
                              {task.titulo}
                            </h5>
                            <div className="flex items-center gap-1">
                              <span
                                className={`text-xs px-2 py-1 rounded-full ${getStatusColor(
                                  task.estado
                                )} text-white flex items-center gap-1`}
                              >
                                {task.estado === 'completada' && <CheckCircle className="h-4 w-4 text-white" />}
                                {task.estado === 'en progreso' && <Loader className="h-4 w-4 text-white animate-spin" />}
                                {task.estado === 'cancelada' && <XCircle className="h-4 w-4 text-white" />}
                                {task.estado !== 'completada' && task.estado !== 'en progreso' && task.estado !== 'cancelada' && <AlertCircle className="h-4 w-4 text-white" />}
                                <span>{task.estado}</span>
                              </span>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3">
                            {task.numero && (
                              <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center">
                                <span className="font-medium mr-1">Número:</span> {task.numero}
                              </p>
                            )}
                            
                            <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center">
                              <MapPin className="h-3 w-3 mr-1 text-orange-500" />
                              <span className="font-medium mr-1">Cliente:</span> {task.cliente || 'No especificado'}
                            </p>
                            
                            {task.tecnicos && task.tecnicos.length > 0 && (
                              <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center">
                                <User className="h-3 w-3 mr-1 text-blue-500" />
                                <span className="font-medium mr-1">Técnicos:</span> {
                                  Array.isArray(task.tecnicos) 
                                    ? task.tecnicos.map((t: any) => t.nombre || t).join(', ')
                                    : 'No asignados'
                                }
                              </p>
                            )}
                            
                            {task.fechaEjecucion && (
                              <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center">
                                <Clock className="h-3 w-3 mr-1 text-amber-500" />
                                <span className="font-medium mr-1">Fecha:</span> {
                                  typeof task.fechaEjecucion === 'string' 
                                    ? task.fechaEjecucion 
                                    : format(new Date(task.fechaEjecucion), 'dd/MM/yyyy')
                                }
                              </p>
                            )}
                          </div>
                          
                          {task.descripcion && (
                            <div className="mt-3 pt-2 border-t border-gray-100 dark:border-gray-700">
                              <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
                                {task.descripcion}
                              </p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Legend */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-slate-200 dark:border-slate-700 animate-fadeIn" style={{ animationDelay: '300ms' }}>
              <div className="px-4 py-4">
                <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white mb-3 flex items-center">
                  <AlertCircle className="h-5 w-5 mr-2 text-gray-500" />
                  Leyenda
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center p-2 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                    <div className={`w-4 h-4 rounded mr-2 flex items-center justify-center ${isDarkMode ? 'bg-gradient-to-r from-green-500 to-emerald-600' : 'bg-gradient-to-r from-green-400 to-green-500'}`}>
                      <CheckCircle className="h-3 w-3 text-white" />
                    </div>
                    <span className="text-sm text-gray-600 dark:text-gray-400">Completada</span>
                  </div>
                  <div className="flex items-center p-2 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                    <div className={`w-4 h-4 rounded mr-2 flex items-center justify-center ${isDarkMode ? 'bg-gradient-to-r from-amber-500 to-yellow-600' : 'bg-gradient-to-r from-amber-400 to-yellow-500'}`}>
                      <Loader className="h-3 w-3 text-white animate-spin" />
                    </div>
                    <span className="text-sm text-gray-600 dark:text-gray-400">En Progreso</span>
                  </div>
                  <div className="flex items-center p-2 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                    <div className={`w-4 h-4 rounded mr-2 flex items-center justify-center ${isDarkMode ? 'bg-gradient-to-r from-gray-500 to-gray-600' : 'bg-gradient-to-r from-gray-400 to-gray-500'}`}>
                      <AlertCircle className="h-3 w-3 text-white" />
                    </div>
                    <span className="text-sm text-gray-600 dark:text-gray-400">Pendiente</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {loading && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-xl border border-blue-100 dark:border-blue-900 animate-fadeIn">
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-10 w-10 border-4 border-blue-200 border-t-blue-600 mx-auto"></div>
            </div>
            <p className="mt-3 text-sm text-gray-600 dark:text-gray-400 flex items-center justify-center">
              <Loader className="h-4 w-4 mr-2 text-blue-500 animate-spin" />
              Cargando tareas...
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default TaskCalendar;

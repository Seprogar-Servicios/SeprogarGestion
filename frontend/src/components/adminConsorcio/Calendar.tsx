import React, { useEffect, useState } from 'react';
import { useAppSelector } from '../../store';
import { 
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  RefreshCw
} from 'lucide-react';
import { preventEnterSubmit } from '../../utils/formGuards';
import AdminPageHeader from '../common/AdminPageHeader';

interface Tarea {
  _id: string;
  titulo: string;
  cliente: string;
  fechaEjecucion: string;
  franja_horaria: string;
  estado: string;
  precio: number;
  direccion: string;
}

const AdminConsorcioCalendar: React.FC = () => {
  const { user } = useAppSelector((state) => state.auth);
  
  // Estados
  const [tareas, setTareas] = useState<Tarea[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Estados para formulario
  const [formData, setFormData] = useState({
    titulo: '',
    descripcion: '',
    precio: '',
    cliente: '',
    direccion: '',
    fechaEjecucion: '',
    franja_horaria: ''
  });

  // Definición de estados
  const estadoLabels: Record<string, string> = {
    'pendiente_confirmacion': 'Pendiente',
    'confirmada': 'Confirmada',
    'en_progreso': 'En Progreso',
    'finalizada': 'Finalizada',
    'cancelada': 'Cancelada',
    'pendiente_pago': 'Por Pagar',
    'facturada': 'Facturada',
    'pagada': 'Pagada'
  };

  const estadoColors: Record<string, string> = {
    'pendiente_confirmacion': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
    'confirmada': 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
    'en_progreso': 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
    'finalizada': 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
    'cancelada': 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
    'pendiente_pago': 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
    'facturada': 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300',
    'pagada': 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300'
  };

  useEffect(() => {
    fetchTareas();
  }, [currentDate]);

  const fetchTareas = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('accessToken');
      
      // Obtener primer y último día del mes actual
      const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const lastDay = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
      
      const params = new URLSearchParams({
        startDate: firstDay.toISOString().split('T')[0],
        endDate: lastDay.toISOString().split('T')[0]
      });

      const response = await fetch(`/api/tareas-consorcio?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        setTareas([]);
        return;
      }

      const data = await response.json();
      setTareas(data.tareas || []);
    } catch (error) {
      console.error('Error:', error);
      setTareas([]);
    } finally {
      setLoading(false);
    }
  };

  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const generateCalendarDays = () => {
    const daysInMonth = getDaysInMonth(currentDate);
    const firstDay = getFirstDayOfMonth(currentDate);
    const days = [];

    // Días vacíos al principio
    for (let i = 0; i < firstDay; i++) {
      days.push(null);
    }

    // Días del mes
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i);
    }

    return days;
  };

  const getTasksForDay = (day: number) => {
    if (!day) return [];
    
    const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    
    return tareas.filter(tarea => {
      if (!tarea.fechaEjecucion) return false;
      return tarea.fechaEjecucion === dateStr;
    });
  };

  const handlePreviousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
  };

  const handleDateClick = (day: number) => {
    const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    setSelectedDate(date);
    setFormData({
      ...formData,
      fechaEjecucion: date.toISOString().split('T')[0]
    });
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch('/api/tareas-consorcio', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          ...formData,
          precio: parseFloat(formData.precio) || 0,
          administradorConsorcio: user?._id
        })
      });

      if (!response.ok) {
        throw new Error('Error al crear la tarea');
      }

      const newTask = await response.json();
      setTareas([...tareas, newTask]);
      
      setShowCreateModal(false);
      resetForm();
      
    } catch (error) {
      console.error('Error:', error);
      alert('Error al crear la tarea de consorcio');
    }
  };

  const resetForm = () => {
    setFormData({
      titulo: '',
      descripcion: '',
      precio: '',
      cliente: '',
      direccion: '',
      fechaEjecucion: '',
      franja_horaria: ''
    });
    setSelectedDate(null);
  };

  const monthNames = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  const weekDays = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Calendario de tareas"
        description="Visualizá y gestioná las tareas por fecha"
        eyebrow="Consorcio"
        icon={<CalendarIcon className="h-5 w-5" />}
        actions={
          <>
            <button
              onClick={() => fetchTareas()}
              className="inline-flex items-center px-4 py-2.5 text-sm font-medium rounded-lg text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Actualizar
            </button>
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center px-4 py-2.5 text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              Nueva tarea
            </button>
          </>
        }
      />

      {/* Calendar Navigation */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={handlePreviousMonth}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <ChevronLeft className="h-5 w-5 text-gray-600 dark:text-gray-400" />
          </button>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
          </h2>
          <button
            onClick={handleNextMonth}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <ChevronRight className="h-5 w-5 text-gray-600 dark:text-gray-400" />
          </button>
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-1">
          {/* Week days */}
          {weekDays.map(day => (
            <div key={day} className="text-center text-sm font-medium text-gray-600 dark:text-gray-400 py-2">
              {day}
            </div>
          ))}

          {/* Calendar days */}
          {generateCalendarDays().map((day, index) => {
            const dayTasks = day ? getTasksForDay(day) : [];
            const isSelected = selectedDate && (
              selectedDate.getDate() === day &&
              selectedDate.getMonth() === currentDate.getMonth() &&
              selectedDate.getFullYear() === currentDate.getFullYear()
            );
            const isToday = new Date().toDateString() === new Date(currentDate.getFullYear(), currentDate.getMonth(), day || 0).toDateString();

            return (
              <div
                key={index}
                onClick={() => day && handleDateClick(day)}
                className={`
                  min-h-[80px] border border-gray-200 dark:border-gray-700 rounded-lg p-2 cursor-pointer
                  transition-colors relative
                  ${!day ? 'bg-gray-50 dark:bg-gray-800 cursor-default' : 'hover:bg-gray-50 dark:hover:bg-gray-700'}
                  ${isSelected ? 'ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-900/20' : ''}
                  ${isToday ? 'bg-yellow-50 dark:bg-yellow-900/20' : ''}
                `}
              >
                {day && (
                  <>
                    <div className={`text-sm font-medium ${isToday ? 'text-yellow-600 dark:text-yellow-400' : 'text-gray-900 dark:text-white'}`}>
                      {day}
                    </div>
                    <div className="mt-1 space-y-1">
                      {dayTasks.slice(0, 3).map((task, taskIndex) => (
                        <div
                          key={taskIndex}
                          className={`text-xs p-1 rounded truncate ${estadoColors[task.estado]}`}
                          title={`${task.titulo} - ${task.cliente}`}
                        >
                          {task.titulo.length > 10 ? task.titulo.substring(0, 10) + '...' : task.titulo}
                        </div>
                      ))}
                      {dayTasks.length > 3 && (
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          +{dayTasks.length - 3} más
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Tasks for Selected Day */}
      {selectedDate && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Tareas para {selectedDate.toLocaleDateString('es-AR')}
          </h3>
          {(() => {
            const dayTasks = getTasksForDay(selectedDate.getDate());
            return dayTasks.length === 0 ? (
              <div className="text-center py-8">
                <CalendarIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 dark:text-gray-300">
                  No hay tareas programadas para este día
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {dayTasks.map((task) => (
                  <div key={task._id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900 dark:text-white">
                        {task.titulo}
                      </h4>
                      <p className="text-sm text-gray-600 dark:text-gray-300">
                        {task.cliente} • {task.direccion}
                      </p>
                      <div className="flex items-center gap-4 mt-1">
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {task.franja_horaria}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          ${task.precio}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${estadoColors[task.estado]}`}>
                        {estadoLabels[task.estado]}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            );
          })()}
        </div>
      )}

      {/* Modal de Creación */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Crear Nueva Tarea de Consorcio
              </h2>
              {selectedDate && (
                <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                  Para el día: {selectedDate.toLocaleDateString('es-AR')}
                </p>
              )}
            </div>
            <form onSubmit={handleCreateTask} onKeyDown={preventEnterSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Título
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.titulo}
                    onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Cliente
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.cliente}
                    onChange={(e) => setFormData({ ...formData, cliente: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Precio
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formData.precio}
                    onChange={(e) => setFormData({ ...formData, precio: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Franja Horaria
                  </label>
                  <select
                    required
                    value={formData.franja_horaria}
                    onChange={(e) => setFormData({ ...formData, franja_horaria: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  >
                    <option value="">Seleccionar franja</option>
                    <option value="09-12">09:00 - 12:00</option>
                    <option value="12-15">12:00 - 15:00</option>
                    <option value="15-18">15:00 - 18:00</option>
                    <option value="18-21">18:00 - 21:00</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Descripción
                </label>
                <textarea
                  required
                  rows={3}
                  value={formData.descripcion}
                  onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Dirección
                </label>
                <input
                  type="text"
                  required
                  value={formData.direccion}
                  onChange={(e) => setFormData({ ...formData, direccion: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    resetForm();
                  }}
                  className="px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                >
                  Crear Tarea
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminConsorcioCalendar;

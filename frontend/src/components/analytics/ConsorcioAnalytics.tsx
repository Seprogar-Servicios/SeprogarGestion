import React, { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../../store';
import { fetchUsers } from '../../store/slices/usersSlice';
import { 
  Clock, 
  CheckCircle, 
  Filter,
  X,
  RefreshCw,
  ClipboardList,
  DollarSign,
  Building,
  CreditCard,
  Image
} from 'lucide-react';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import type { TareaConsorcio } from '../../types';

const ConsorcioAnalytics: React.FC = () => {
  const dispatch = useAppDispatch();
  const { users } = useAppSelector((state) => state.users);
  const { user } = useAppSelector((state) => state.auth);
  const [isLoading, setIsLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  
  // Estados para datos
  const [tareas, setTareas] = useState<TareaConsorcio[]>([]);
  const [filteredTasks, setFilteredTasks] = useState<TareaConsorcio[]>([]);
  
  // Filtros
  const [dateRange, setDateRange] = useState<{start: string, end: string}>({ 
    start: format(startOfMonth(subMonths(new Date(), 3)), 'yyyy-MM-dd'), 
    end: format(endOfMonth(new Date()), 'yyyy-MM-dd') 
  });
  const [statusFilter, setStatusFilter] = useState<string[]>(['presupuesto', 'confirmado', 'pendiente', 'en_progreso', 'completada', 'PENDIENTE_PAGO', 'FACTURADO', 'PAGADO']);
  const [adminConsorcioFilter, setAdminConsorcioFilter] = useState<string[]>([]);

  // Cargar datos
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        if (user?.rol === 'admin') {
          await dispatch(fetchUsers());
        }
        
        // Cargar tareas de consorcio
        const token = localStorage.getItem('token');
        const response = await fetch('/api/tareas-consorcio', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (!response.ok) {
          // Si no hay tareas o hay error, simplemente mostrar array vacío
          setTareas([]);
          return;
        }

        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          // La respuesta no es JSON, probablemente HTML de error
          setTareas([]);
          return;
        }
        
        const data = await response.json();
        setTareas(data.data || []);
      } catch (error) {
        console.error('Error al cargar los datos:', error);
        // En caso de error, mostrar tareas vacías
        setTareas([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [dispatch, user?.rol]);

  // Filtrar tareas
  useEffect(() => {
    let filtered = tareas;

    // Filtrar por rango de fechas
    if (dateRange.start && dateRange.end) {
      filtered = filtered.filter(task => {
        const taskDate = new Date(task.fechaEjecucion);
        const startDate = new Date(dateRange.start);
        const endDate = new Date(dateRange.end);
        return taskDate >= startDate && taskDate <= endDate;
      });
    }

    // Filtrar por estado
    if (statusFilter.length > 0) {
      filtered = filtered.filter(task => statusFilter.includes(task.estado));
    }

    // Filtrar por administrador de consorcio
    if (adminConsorcioFilter.length > 0) {
      filtered = filtered.filter(task => 
        task.administradorConsorcio && adminConsorcioFilter.includes(task.administradorConsorcio._id)
      );
    }

    setFilteredTasks(filtered);
  }, [tareas, dateRange, statusFilter, adminConsorcioFilter]);

  // Calcular estadísticas
  const stats = {
    total: filteredTasks.length,
    presupuesto: filteredTasks.filter(t => t.estado === 'presupuesto').length,
    confirmado: filteredTasks.filter(t => t.estado === 'confirmado').length,
    pendiente: filteredTasks.filter(t => t.estado === 'pendiente').length,
    enProgreso: filteredTasks.filter(t => t.estado === 'en_progreso').length,
    completada: filteredTasks.filter(t => t.estado === 'completada').length,
    pendientePago: filteredTasks.filter(t => t.estado === 'PENDIENTE_PAGO').length,
    facturado: filteredTasks.filter(t => t.estado === 'FACTURADO').length,
    pagado: filteredTasks.filter(t => t.estado === 'PAGADO').length,
    totalRevenue: filteredTasks
      .filter(t => t.estado === 'PAGADO')
      .reduce((sum, t) => sum + t.precio, 0),
    pendingRevenue: filteredTasks
      .filter(t => ['confirmado', 'pendiente', 'en_progreso', 'completada', 'PENDIENTE_PAGO', 'FACTURADO'].includes(t.estado))
      .reduce((sum, t) => sum + t.precio, 0),
    withComprobante: filteredTasks.filter(t => t.comprobantePago).length,
    withPhotos: filteredTasks.filter(t => t.fotos && t.fotos.length > 0).length
  };

  // Obtener administradores de consorcio
  const adminConsorcios = users.filter(u => u.rol === 'adminConsorcio');

  // Renderizar gráficos simples
  const renderStatusChart = () => {
    const statusData = [
      { name: 'Presupuesto', value: stats.presupuesto, color: 'bg-gray-500' },
      { name: 'Confirmado', value: stats.confirmado, color: 'bg-blue-500' },
      { name: 'Pendiente', value: stats.pendiente, color: 'bg-yellow-500' },
      { name: 'En Progreso', value: stats.enProgreso, color: 'bg-orange-500' },
      { name: 'Completada', value: stats.completada, color: 'bg-green-500' },
      { name: 'Pendiente Pago', value: stats.pendientePago, color: 'bg-purple-500' },
      { name: 'Facturado', value: stats.facturado, color: 'bg-indigo-500' },
      { name: 'Pagado', value: stats.pagado, color: 'bg-emerald-500' }
    ];

    return (
      <div className="space-y-2">
        {statusData.map((item) => (
          <div key={item.name} className="flex items-center">
            <div className="w-32 text-sm">{item.name}</div>
            <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-6 ml-2">
              <div 
                className={`${item.color} h-6 rounded-full transition-all duration-500`}
                style={{ width: `${stats.total > 0 ? (item.value / stats.total) * 100 : 0}%` }}
              />
            </div>
            <div className="w-12 text-sm text-right ml-2">{item.value}</div>
          </div>
        ))}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
        <span className="ml-2 text-gray-600 dark:text-gray-300">Cargando análisis...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <Building className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Análisis de Tareas de Consorcio
              </h1>
              <p className="text-gray-600 dark:text-gray-300">
                Estadísticas detalladas de las tareas de consorcio
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Filter className="h-4 w-4" />
            Filtros
          </button>
        </div>
      </div>

      {/* Filtros */}
      {showFilters && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">Filtros</h3>
            <button onClick={() => setShowFilters(false)}>
              <X className="h-5 w-5" />
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Rango de Fechas</label>
              <div className="space-y-2">
                <input
                  type="date"
                  value={dateRange.start}
                  onChange={(e) => setDateRange({...dateRange, start: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                />
                <input
                  type="date"
                  value={dateRange.end}
                  onChange={(e) => setDateRange({...dateRange, end: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Estados</label>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {['presupuesto', 'confirmado', 'pendiente', 'en_progreso', 'completada', 'PENDIENTE_PAGO', 'FACTURADO', 'PAGADO'].map(estado => (
                  <label key={estado} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={statusFilter.includes(estado)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setStatusFilter([...statusFilter, estado]);
                        } else {
                          setStatusFilter(statusFilter.filter(s => s !== estado));
                        }
                      }}
                      className="mr-2"
                    />
                    <span className="text-sm">{estado}</span>
                  </label>
                ))}
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Administradores de Consorcio</label>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {adminConsorcios.map(admin => (
                  <label key={admin._id} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={adminConsorcioFilter.includes(admin._id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setAdminConsorcioFilter([...adminConsorcioFilter, admin._id]);
                        } else {
                          setAdminConsorcioFilter(adminConsorcioFilter.filter(a => a !== admin._id));
                        }
                      }}
                      className="mr-2"
                    />
                    <span className="text-sm">{admin.nombre}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tarjetas de Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Tareas</p>
              <p className="text-2xl font-bold text-gray-800 dark:text-white">{stats.total}</p>
            </div>
            <ClipboardList className="h-8 w-8 text-blue-600" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Ingresos Totales</p>
              <p className="text-2xl font-bold text-gray-800 dark:text-white">
                ${stats.totalRevenue.toLocaleString()}
              </p>
            </div>
            <DollarSign className="h-8 w-8 text-green-600" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Ingresos Pendientes</p>
              <p className="text-2xl font-bold text-gray-800 dark:text-white">
                ${stats.pendingRevenue.toLocaleString()}
              </p>
            </div>
            <Clock className="h-8 w-8 text-orange-600" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Tareas Pagadas</p>
              <p className="text-2xl font-bold text-gray-800 dark:text-white">{stats.pagado}</p>
            </div>
            <CheckCircle className="h-8 w-8 text-emerald-600" />
          </div>
        </div>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold mb-4">Distribución por Estado</h3>
          {renderStatusChart()}
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold mb-4">Estadísticas de Archivos</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Image className="h-5 w-5 text-blue-600" />
                <span className="text-sm">Con Fotos</span>
              </div>
              <span className="font-semibold">{stats.withPhotos}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-green-600" />
                <span className="text-sm">Con Comprobante</span>
              </div>
              <span className="font-semibold">{stats.withComprobante}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabla de Tareas Recientes */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold mb-4">Tareas Recientes</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b dark:border-gray-700">
                <th className="text-left py-2">Número</th>
                <th className="text-left py-2">Título</th>
                <th className="text-left py-2">Cliente</th>
                <th className="text-left py-2">Estado</th>
                <th className="text-left py-2">Precio</th>
                <th className="text-left py-2">Administrador</th>
              </tr>
            </thead>
            <tbody>
              {filteredTasks.slice(0, 10).map(task => (
                <tr key={task._id} className="border-b dark:border-gray-700">
                  <td className="py-2">{task.numero}</td>
                  <td className="py-2">{task.titulo}</td>
                  <td className="py-2">{task.cliente}</td>
                  <td className="py-2">
                    <span className={`px-2 py-1 rounded text-xs ${
                      task.estado === 'PAGADO' ? 'bg-emerald-100 text-emerald-800' :
                      task.estado === 'FACTURADO' ? 'bg-indigo-100 text-indigo-800' :
                      task.estado === 'PENDIENTE_PAGO' ? 'bg-purple-100 text-purple-800' :
                      task.estado === 'completada' ? 'bg-green-100 text-green-800' :
                      task.estado === 'en_progreso' ? 'bg-orange-100 text-orange-800' :
                      task.estado === 'pendiente' ? 'bg-yellow-100 text-yellow-800' :
                      task.estado === 'confirmado' ? 'bg-blue-100 text-blue-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {task.estado}
                    </span>
                  </td>
                  <td className="py-2">${task.precio}</td>
                  <td className="py-2">{task.administradorConsorcio?.nombre || 'Sin asignar'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ConsorcioAnalytics;

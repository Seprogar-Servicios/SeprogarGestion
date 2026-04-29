import React, { useState, useEffect } from 'react';
import { 
  DollarSign, 
  Calendar,
  PieChart,
  BarChart3,
  CreditCard,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  TrendingUp
} from 'lucide-react';

interface FinancialStats {
  totalPagado: number;
  totalPendientePago: number;
  totalFacturado: number;
  totalPresupuesto: number;
  promedioPorTarea: number;
  tareasPagadas: number;
  tareasPendientesPago: number;
  tareasFacturadas: number;
  tareasPresupuesto: number;
}

const AdminConsorcioAnalytics: React.FC = () => {
  const [tareas, setTareas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<FinancialStats>({
    totalPagado: 0,
    totalPendientePago: 0,
    totalFacturado: 0,
    totalPresupuesto: 0,
    promedioPorTarea: 0,
    tareasPagadas: 0,
    tareasPendientesPago: 0,
    tareasFacturadas: 0,
    tareasPresupuesto: 0
  });

  useEffect(() => {
    fetchTareas();
  }, []);

  const fetchTareas = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('accessToken');
      
      const response = await fetch('/api/tareas-consorcio', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        const tareasData = data.tareas || [];
        setTareas(tareasData);
        calculateFinancialStats(tareasData);
      } else {
        if (response.status === 401) {
          localStorage.removeItem('accessToken');
          window.location.href = '/login';
          return;
        }
      }
    } catch (error) {
      console.error('Error al cargar tareas:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateFinancialStats = (tareasData: any[]) => {
    const pagadas = tareasData.filter(t => t.estado === 'pagada');
    const pendientesPago = tareasData.filter(t => t.estado === 'pendiente_pago');
    const facturadas = tareasData.filter(t => t.estado === 'facturada');
    const presupuesto = tareasData.filter(t => t.estado === 'presupuesto');

    const totalPagado = pagadas.reduce((sum, tarea) => sum + (tarea.precio || 0), 0);
    const totalPendientePago = pendientesPago.reduce((sum, tarea) => sum + (tarea.precio || 0), 0);
    const totalFacturado = facturadas.reduce((sum, tarea) => sum + (tarea.precio || 0), 0);
    const totalPresupuesto = presupuesto.reduce((sum, tarea) => sum + (tarea.precio || 0), 0);

    const totalTareasConPrecio = tareasData.filter(t => t.precio && t.precio > 0);
    const promedioPorTarea = totalTareasConPrecio.length > 0 
      ? totalTareasConPrecio.reduce((sum, tarea) => sum + tarea.precio, 0) / totalTareasConPrecio.length 
      : 0;

    setStats({
      totalPagado,
      totalPendientePago,
      totalFacturado,
      totalPresupuesto,
      promedioPorTarea,
      tareasPagadas: pagadas.length,
      tareasPendientesPago: pendientesPago.length,
      tareasFacturadas: facturadas.length,
      tareasPresupuesto: presupuesto.length
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const financialCards = [
    {
      title: 'Total Pagado',
      value: formatCurrency(stats.totalPagado),
      icon: DollarSign,
      color: 'bg-green-500',
      change: `${stats.tareasPagadas} tareas`,
      changeType: 'positive' as 'positive' | 'negative' | 'neutral',
      description: 'Monto total de tareas pagadas'
    },
    {
      title: 'Pendiente de Pago',
      value: formatCurrency(stats.totalPendientePago),
      icon: CreditCard,
      color: 'bg-yellow-500',
      change: `${stats.tareasPendientesPago} tareas`,
      changeType: 'neutral' as 'positive' | 'negative' | 'neutral',
      description: 'Monto por cobrar'
    },
    {
      title: 'Facturado',
      value: formatCurrency(stats.totalFacturado),
      icon: Wallet,
      color: 'bg-blue-500',
      change: `${stats.tareasFacturadas} tareas`,
      changeType: 'neutral' as 'positive' | 'negative' | 'neutral',
      description: 'Monto total facturado'
    },
    {
      title: 'En Presupuesto',
      value: formatCurrency(stats.totalPresupuesto),
      icon: PieChart,
      color: 'bg-purple-500',
      change: `${stats.tareasPresupuesto} tareas`,
      changeType: 'neutral' as 'positive' | 'negative' | 'neutral',
      description: 'Monto en etapa de presupuesto'
    },
    {
      title: 'Promedio por Tarea',
      value: formatCurrency(stats.promedioPorTarea),
      icon: BarChart3,
      color: 'bg-indigo-500',
      change: 'Valor promedio',
      changeType: 'neutral' as 'positive' | 'negative' | 'neutral',
      description: 'Precio promedio por tarea'
    }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
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
              <TrendingUp className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Análisis Financiero
              </h1>
              <p className="text-gray-600 dark:text-gray-300">
                Resumen financiero de las tareas del consorcio
              </p>
            </div>
          </div>
          <button
            onClick={fetchTareas}
            className="inline-flex items-center px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
          >
            <Calendar className="h-4 w-4 mr-2" />
            Actualizar
          </button>
        </div>
      </div>

      {/* Financial Stats Grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {financialCards.map((card, index) => {
          const Icon = card.icon;
          return (
            <div
              key={index}
              className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg"
            >
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className={`${card.color} rounded-md p-3`}>
                      <Icon className="h-6 w-6 text-white" />
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                        {card.title}
                      </dt>
                      <dd className="text-lg font-semibold text-gray-900 dark:text-white">
                        {card.value}
                      </dd>
                    </dl>
                  </div>
                </div>
                <div className="mt-4">
                  <div className="flex items-center text-sm">
                    {card.changeType === 'positive' ? (
                      <ArrowUpRight className="h-4 w-4 text-green-500 mr-1" />
                    ) : card.changeType === 'negative' ? (
                      <ArrowDownRight className="h-4 w-4 text-red-500 mr-1" />
                    ) : null}
                    <span className={`text-gray-600 dark:text-gray-400 mr-2`}>
                      {card.change}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {card.description}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Summary Section */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white mb-4">
            Resumen General
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                Flujo de Caja
              </h4>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-300">Ingresos (Pagado):</span>
                  <span className="text-sm font-medium text-green-600">
                    {formatCurrency(stats.totalPagado)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-300">Por Cobrar:</span>
                  <span className="text-sm font-medium text-yellow-600">
                    {formatCurrency(stats.totalPendientePago)}
                  </span>
                </div>
                <div className="flex justify-between border-t pt-2">
                  <span className="text-sm font-medium text-gray-900 dark:text-white">Total:</span>
                  <span className="text-sm font-bold text-gray-900 dark:text-white">
                    {formatCurrency(stats.totalPagado + stats.totalPendientePago)}
                  </span>
                </div>
              </div>
            </div>
            <div>
              <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                Estado de Tareas
              </h4>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-300">Total de Tareas:</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {tareas.length}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-300">Completadas (Pagadas):</span>
                  <span className="text-sm font-medium text-green-600">
                    {stats.tareasPagadas}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-300">En Proceso:</span>
                  <span className="text-sm font-medium text-blue-600">
                    {stats.tareasPendientesPago + stats.tareasFacturadas + stats.tareasPresupuesto}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminConsorcioAnalytics;

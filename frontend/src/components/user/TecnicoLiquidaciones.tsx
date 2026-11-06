import React, { useEffect, useState } from 'react';
import { useAppSelector, useAppDispatch } from '../../store';
import { DollarSign, Filter, Download } from 'lucide-react';
import { fetchLiquidacionesByTecnico } from '../../store/slices/tareaLiquidacionSlice';
import api from '../../config/api';
import AdminPageHeader from '../common/AdminPageHeader';

type Props = { embedded?: boolean };

const TecnicoLiquidaciones: React.FC<Props> = ({ embedded = false }) => {
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);
  const { liquidaciones = [] } = useAppSelector((state) => state.tareaLiquidacion);
  
  const [filterMes, setFilterMes] = useState('');

  useEffect(() => {
    if (user?._id) {
      dispatch(fetchLiquidacionesByTecnico(user._id));
    }
    
    // Establecer el mes actual por defecto
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    setFilterMes(currentMonth);
  }, [dispatch, user?._id]);

  // Filtrar liquidaciones por técnico actual y mes
  const filteredLiquidaciones = liquidaciones.filter(liquidacion => {
    // Verificar si el técnico está asignado a la tarea
    const tecnicos = liquidacion.tarea?.tecnicos || [];
    const matchesTecnico = tecnicos.some((tecnico: any) => 
      tecnico._id === user?._id || tecnico.nombre === user?.nombre
    );
    
    const matchesMes = !filterMes || 
      (liquidacion.tarea?.fechaEjecucion && liquidacion.tarea.fechaEjecucion.startsWith(filterMes));
    
    return matchesTecnico && matchesMes;
  });

  // Calcular totales
  const totals = filteredLiquidaciones.reduce((acc, l) => ({
    pagoTecnico: acc.pagoTecnico + (l.pagoTecnico || 0),
    pago15Dias: acc.pago15Dias + (l.pago15Dias || 0),
  }), {
    pagoTecnico: 0,
    pago15Dias: 0,
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS'
    }).format(value);
  };

  const handleExportExcel = async () => {
    if (!user?._id) return;
    
    try {
      const response = await api.get(`/liquidaciones/tecnico/${user._id}/export`, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `liquidaciones_${new Date().toISOString().split('T')[0]}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error al exportar liquidaciones:', error);
      alert('Error al exportar liquidaciones');
    }
  };

  const exportBtn = (
    <button
      onClick={handleExportExcel}
      className="inline-flex items-center px-4 py-2.5 text-sm font-medium rounded-lg text-white bg-orange-500 hover:bg-orange-600"
    >
      <Download className="h-4 w-4 mr-2" />
      Exportar PDF
    </button>
  );

  return (
    <div className="space-y-6">
      {!embedded ? (
        <AdminPageHeader
          title="Mis Liquidaciones"
          description="Pagos por tarea"
          eyebrow="Técnico"
          icon={<DollarSign className="h-5 w-5" />}
          actions={exportBtn}
        />
      ) : (
        <div className="flex justify-end">{exportBtn}</div>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
        <div className="flex items-end gap-4 max-w-md">
          <div className="flex-1">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Filtrar por Mes
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Filter className="h-4 w-4 text-gray-400" />
              </div>
              <input
                type="month"
                value={filterMes}
                onChange={(e) => setFilterMes(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900 sticky top-0 z-10">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Número
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Cliente
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Fecha
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Pago Técnico
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Pago 15 Días
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {filteredLiquidaciones.length > 0 ? (
                filteredLiquidaciones.map((liquidacion) => (
                  <tr key={liquidacion._id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {liquidacion.tarea?.numero}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {liquidacion.tarea?.cliente}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {liquidacion.tarea?.fechaEjecucion}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-gray-900 dark:text-white font-medium text-green-600 dark:text-green-400">
                      {formatCurrency(liquidacion.pagoTecnico || 0)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-gray-900 dark:text-white font-medium text-blue-600 dark:text-blue-400">
                      {formatCurrency(liquidacion.pago15Dias || 0)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                    No hay liquidaciones para el período seleccionado
                  </td>
                </tr>
              )}
            </tbody>
            {filterMes && filteredLiquidaciones.length > 0 && (
              <tfoot className="bg-slate-50 dark:bg-slate-900/60 border-t border-slate-200 dark:border-slate-700">
                <tr>
                  <td colSpan={3} className="px-6 py-4 text-left text-sm font-semibold text-slate-900 dark:text-white uppercase tracking-wider">
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      Total mensual — {filterMes}
                    </div>
                  </td>
                  <td className="px-4 py-4 text-right text-sm font-bold text-emerald-600 dark:text-emerald-400">
                    {formatCurrency(totals.pagoTecnico)}
                  </td>
                  <td className="px-4 py-4 text-right text-sm font-bold text-blue-600 dark:text-blue-400">
                    {formatCurrency(totals.pago15Dias)}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
};

export default TecnicoLiquidaciones;

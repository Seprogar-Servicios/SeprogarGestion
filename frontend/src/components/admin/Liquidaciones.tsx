import React, { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../../store';
import { fetchLiquidaciones, updateLiquidacion } from '../../store/slices/tareaLiquidacionSlice';
import { fetchUsers } from '../../store/slices/usersSlice';
import { Download, DollarSign, Filter } from 'lucide-react';
import type { TareaLiquidacion } from '../../types';
import api from '../../config/api';

const Liquidaciones: React.FC = () => {
  const dispatch = useAppDispatch();
  const { liquidaciones = [], loading } = useAppSelector((state) => state.tareaLiquidacion);
  const { users = [] } = useAppSelector((state) => state.users);
  
  const [filterTecnico, setFilterTecnico] = useState('');
  const [filterMes, setFilterMes] = useState('');
  const [showCalculoMensual, setShowCalculoMensual] = useState(false);
  const [editingCell, setEditingCell] = useState<{ id: string; field: string } | null>(null);
  const [editValue, setEditValue] = useState('');

  const handleResetFilters = () => {
    setFilterMes('');
    setShowCalculoMensual(false);
    if (tecnicos.length > 0) {
      setFilterTecnico(tecnicos[0]);
    }
  };

  useEffect(() => {
    dispatch(fetchLiquidaciones());
    dispatch(fetchUsers());
  }, [dispatch]);

  // Obtener técnicos únicos de la base de datos
  const tecnicos = users
    .filter(user => user.rol === 'usuario')
    .map(user => user.nombre)
    .filter(Boolean);

  // Inicializar filterTecnico con el primer técnico si está vacío
  useEffect(() => {
    if (!filterTecnico && tecnicos.length > 0) {
      setFilterTecnico(tecnicos[0]);
    }
  }, [tecnicos, filterTecnico]);

  // Filtrar liquidaciones
  const filteredLiquidaciones = liquidaciones.filter(liquidacion => {
    const matchesTecnico = !filterTecnico || 
      liquidacion.tarea?.tecnicos?.[0]?.nombre === filterTecnico;
    
    const matchesMes = !filterMes || 
      (liquidacion.tarea?.fechaEjecucion && liquidacion.tarea.fechaEjecucion.startsWith(filterMes));
    
    return matchesTecnico && matchesMes;
  });

  // Agrupar por técnico
  const groupedByTecnico = filteredLiquidaciones.reduce((acc, liquidacion) => {
    const tecnico = liquidacion.tarea?.tecnicos?.[0]?.nombre || 'Sin técnico';
    if (!acc[tecnico]) {
      acc[tecnico] = [];
    }
    acc[tecnico].push(liquidacion);
    return acc;
  }, {} as Record<string, TareaLiquidacion[]>);

  // Calcular totales
  const totals = filteredLiquidaciones.reduce((acc, l) => ({
    manoObra: acc.manoObra + (l.manoObra || 0),
    materiales: acc.materiales + (l.materiales || 0),
    cobertura: acc.cobertura + (l.cobertura || 0),
    excedente: acc.excedente + (l.excedente || 0),
    materialReal: acc.materialReal + (l.materialReal || 0),
    boletasMateriales: acc.boletasMateriales + (l.boletasMateriales || 0),
    totalPresupuesto: acc.totalPresupuesto + (l.totalPresupuesto || 0),
    gananciaMaterial: acc.gananciaMaterial + (l.gananciaMaterial || 0),
    gananciaTotal: acc.gananciaTotal + (l.gananciaTotal || 0),
    repartida: acc.repartida + (l.repartida || 0),
    pagoTecnico: acc.pagoTecnico + (l.pagoTecnico || 0),
    futurgas: acc.futurgas + (l.futurgas || 0),
    pago15Dias: acc.pago15Dias + (l.pago15Dias || 0),
  }), {
    manoObra: 0,
    materiales: 0,
    cobertura: 0,
    excedente: 0,
    materialReal: 0,
    boletasMateriales: 0,
    totalPresupuesto: 0,
    gananciaMaterial: 0,
    gananciaTotal: 0,
    repartida: 0,
    pagoTecnico: 0,
    futurgas: 0,
    pago15Dias: 0,
  });

  const handleCellEdit = (liquidacion: TareaLiquidacion, field: string) => {
    setEditingCell({ id: liquidacion._id, field });
    setEditValue(String(liquidacion[field as keyof TareaLiquidacion] || 0));
  };

  const handleCellSave = async (liquidacion: TareaLiquidacion) => {
    if (!editingCell) return;

    const numericValue = parseFloat(editValue);
    if (isNaN(numericValue)) return;

    try {
      await dispatch(updateLiquidacion({
        id: liquidacion._id,
        data: { [editingCell.field]: numericValue }
      })).unwrap();
      setEditingCell(null);
    } catch (error) {
      console.error('Error updating liquidacion:', error);
    }
  };

  const handleExportExcel = async () => {
    try {
      const response = await api.get('/liquidaciones/export', {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `liquidaciones_admin_${new Date().toISOString().split('T')[0]}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error al exportar liquidaciones:', error);
      alert('Error al exportar liquidaciones');
    }
  };

  const handleExportCalculoMensual = async () => {
    try {
      const response = await api.get('/liquidaciones/export/calculo-mensual', {
        params: {
          tecnico: filterTecnico,
          mes: filterMes
        },
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `calculo-mensual-${filterMes}-${filterTecnico || 'todos'}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error al exportar cálculo mensual:', error);
      alert('Error al exportar cálculo mensual');
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS'
    }).format(value);
  };

  const getCellColor = (_value: number, _field: string) => {
    return '';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border-t-4 border-green-500 p-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center">
            <div className="bg-green-100 dark:bg-green-900/30 p-2 rounded-lg mr-4">
              <DollarSign className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent">
                Liquidaciones Financieras
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Gestión de liquidaciones por técnico
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={handleExportExcel}
              className="inline-flex items-center px-4 py-2.5 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-lg shadow-sm text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors duration-200 cursor-pointer"
              title="Exportar a Excel"
            >
              <Download className="h-4 w-4 mr-2" />
              Exportar
            </button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border-t-4 border-green-500 p-6">
        <div className="flex flex-col md:flex-row gap-4 items-end">
          <div className="flex-1 w-full">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Técnico
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Filter className="h-4 w-4 text-gray-400" />
              </div>
              <select
                value={filterTecnico}
                onChange={(e) => setFilterTecnico(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200"
              >
                {tecnicos.map(tecnico => (
                  <option key={tecnico} value={tecnico}>{tecnico}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex-1 w-full">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Filtrar por Mes
            </label>
            <input
              type="month"
              value={filterMes}
              onChange={(e) => setFilterMes(e.target.value)}
              className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200"
            />
          </div>
          <button
            onClick={handleResetFilters}
            className="inline-flex items-center px-4 py-2.5 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-lg shadow-sm text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors duration-200 cursor-pointer"
          >
            <Filter className="h-4 w-4 mr-2" />
            Resetear Filtros
          </button>
          {filterTecnico && filterMes && (
            <button
              onClick={() => setShowCalculoMensual(!showCalculoMensual)}
              className="inline-flex items-center px-4 py-2.5 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-lg shadow-sm text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors duration-200 cursor-pointer"
            >
              <DollarSign className="h-4 w-4 mr-2" />
              {showCalculoMensual ? 'Ocultar Cálculo' : 'Cálculo Liquidación Mensual'}
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
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
                  Técnico
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Fecha Ejecución
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Mano Obra
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Materiales
                  <span className="ml-1 px-1.5 py-0.5 bg-blue-200 dark:bg-blue-800 text-blue-800 dark:text-blue-200 text-xs rounded">Calc</span>
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Cobertura
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Excedente
                  <span className="ml-1 px-1.5 py-0.5 bg-green-200 dark:bg-green-800 text-green-800 dark:text-green-200 text-xs rounded">Calc</span>
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Material Real
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Total Presupuesto
                  <span className="ml-1 px-1.5 py-0.5 bg-purple-200 dark:bg-purple-800 text-purple-800 dark:text-purple-200 text-xs rounded">Calc</span>
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Ganancia Material
                  <span className="ml-1 px-1.5 py-0.5 bg-pink-200 dark:bg-pink-800 text-pink-800 dark:text-pink-200 text-xs rounded">Calc</span>
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Repartida
                  <span className="ml-1 px-1.5 py-0.5 bg-teal-200 dark:bg-teal-800 text-teal-800 dark:text-teal-200 text-xs rounded">Calc</span>
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Pago Técnico
                  <span className="ml-1 px-1.5 py-0.5 bg-yellow-200 dark:bg-yellow-800 text-yellow-800 dark:text-yellow-200 text-xs rounded">Calc</span>
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Seprogar
                  <span className="ml-1 px-1.5 py-0.5 bg-red-200 dark:bg-red-800 text-red-800 dark:text-red-200 text-xs rounded">Calc</span>
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Pago 15 Días
                  <span className="ml-1 px-1.5 py-0.5 bg-gray-200 dark:bg-gray-800 text-gray-800 dark:text-gray-200 text-xs rounded">Calc</span>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {Object.entries(groupedByTecnico).map(([tecnico, liquidaciones]) => (
                <React.Fragment key={tecnico}>
                  {/* Técnico Header */}
                  <tr className="bg-gray-100 dark:bg-gray-900">
                    <td colSpan={15} className="px-4 py-2 text-sm font-semibold text-gray-900 dark:text-white">
                      {tecnico} ({liquidaciones.length} tareas)
                    </td>
                  </tr>
                  {liquidaciones.map((liquidacion) => (
                    <tr key={liquidacion._id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {liquidacion.tarea?.numero}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {liquidacion.tarea?.cliente}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {liquidacion.tarea?.tecnicos?.[0]?.nombre}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {liquidacion.tarea?.fechaEjecucion}
                      </td>
                      {['manoObra', 'materiales', 'cobertura', 'excedente', 'materialReal'].map((field) => (
                        <td
                          key={field}
                          className={`px-4 py-3 whitespace-nowrap text-sm text-right text-gray-900 dark:text-white cursor-pointer hover:bg-blue-50  ${getCellColor(liquidacion[field as keyof TareaLiquidacion] as number, field)}`}
                          onClick={() => handleCellEdit(liquidacion, field)}
                        >
                          {editingCell?.id === liquidacion._id && editingCell?.field === field ? (
                            <input
                              type="number"
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              onBlur={() => handleCellSave(liquidacion)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleCellSave(liquidacion);
                                if (e.key === 'Escape') setEditingCell(null);
                              }}
                              autoFocus
                              className="w-20 text-right bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-500 rounded px-1"
                            />
                          ) : (
                            formatCurrency(liquidacion[field as keyof TareaLiquidacion] as number)
                          )}
                        </td>
                      ))}
                      <td className={`px-4 py-3 whitespace-nowrap text-sm text-right text-gray-900 dark:text-white ${getCellColor(liquidacion.totalPresupuesto || 0, 'totalPresupuesto')}`}>
                        {formatCurrency(liquidacion.totalPresupuesto || 0)}
                      </td>
                      <td className={`px-4 py-3 whitespace-nowrap text-sm text-right text-gray-900 dark:text-white ${getCellColor(liquidacion.gananciaMaterial || 0, 'gananciaMaterial')}`}>
                        {formatCurrency(liquidacion.gananciaMaterial || 0)}
                      </td>
                      <td className={`px-4 py-3 whitespace-nowrap text-sm text-right text-gray-900 dark:text-white ${getCellColor(liquidacion.repartida || 0, 'repartida')}`}>
                        {formatCurrency(liquidacion.repartida || 0)}
                      </td>
                      <td className={`px-4 py-3 whitespace-nowrap text-sm text-right text-gray-900 dark:text-white ${getCellColor(liquidacion.pagoTecnico || 0, 'pagoTecnico')}`}>
                        {formatCurrency(liquidacion.pagoTecnico || 0)}
                      </td>
                      <td className={`px-4 py-3 whitespace-nowrap text-sm text-right text-gray-900 dark:text-white ${getCellColor(liquidacion.futurgas || 0, 'futurgas')}`}>
                        {formatCurrency(liquidacion.futurgas || 0)}
                      </td>
                      <td className={`px-4 py-3 whitespace-nowrap text-sm text-right text-gray-900 dark:text-white ${getCellColor(liquidacion.pago15Dias || 0, 'pago15Dias')}`}>
                        {formatCurrency(liquidacion.pago15Dias || 0)}
                      </td>
                    </tr>
                  ))}
                </React.Fragment>
              ))}
            </tbody>
            <tfoot className="bg-gray-100 dark:bg-gray-900 font-semibold">
              {showCalculoMensual && (
                <tr className="bg-gradient-to-r from-green-500 to-emerald-600 dark:from-green-600 dark:to-emerald-700 border-t-4 border-green-700 dark:border-green-800 shadow-lg">
                  <td colSpan={4} className="px-6 py-4 text-left text-sm font-extrabold text-white uppercase tracking-wider">
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-5 w-5" />
                      CÁLCULO MENSUAL - {filterTecnico} - {filterMes}
                    </div>
                  </td>
                  <td className="px-4 py-4 text-right text-sm font-bold text-white">
                    {formatCurrency(totals.manoObra)}
                  </td>
                  <td className="px-4 py-4 text-right text-sm font-bold text-white">
                    {formatCurrency(totals.materiales)}
                  </td>
                  <td className="px-4 py-4 text-right text-sm font-bold text-white">
                    {formatCurrency(totals.cobertura)}
                  </td>
                  <td className="px-4 py-4 text-right text-sm font-bold text-white">
                    {formatCurrency(totals.excedente)}
                  </td>
                  <td className="px-4 py-4 text-right text-sm font-bold text-white">
                    {formatCurrency(totals.materialReal)}
                  </td>
                  <td className="px-4 py-4 text-right text-sm font-bold text-white">
                    {formatCurrency(totals.totalPresupuesto)}
                  </td>
                  <td className="px-4 py-4 text-right text-sm font-bold text-white">
                    {formatCurrency(totals.gananciaMaterial)}
                  </td>
                  <td className="px-4 py-4 text-right text-sm font-bold text-white">
                    {formatCurrency(totals.repartida)}
                  </td>
                  <td className="px-4 py-4 text-right text-sm font-bold text-white">
                    {formatCurrency(totals.pagoTecnico)}
                  </td>
                  <td className="px-4 py-4 text-right text-sm font-bold text-white">
                    {formatCurrency(totals.futurgas)}
                  </td>
                  <td className="px-4 py-4 text-right text-sm font-bold text-white flex items-center justify-end gap-2">
                    {formatCurrency(totals.pago15Dias)}
                    <button
                      onClick={handleExportCalculoMensual}
                      className="ml-2 p-2 bg-white hover:bg-gray-100 text-green-600 rounded-full shadow-md transition-all hover:scale-110"
                      title="Exportar cálculo mensual"
                    >
                      <Download className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              )}
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Liquidaciones;

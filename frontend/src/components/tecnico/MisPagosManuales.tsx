import React, { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../../store';
import { fetchMisPagosManuales } from '../../store/slices/pagoManualSlice';
import { DollarSign, Search, AlertCircle, Calendar, Tag, ListTodo } from 'lucide-react';
import AdminPageHeader from '../common/AdminPageHeader';

type Props = { embedded?: boolean };

const MisPagosManuales: React.FC<Props> = ({ embedded = false }) => {
  const dispatch = useAppDispatch();
  const { pagos, loading, error } = useAppSelector((state) => state.pagoManual);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    dispatch(fetchMisPagosManuales());
  }, [dispatch]);

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(amount || 0);

  const filteredPagos = (pagos || []).filter((pago) => {
    const term = searchTerm.toLowerCase();
    if (!term) return true;
    return (
      pago.motivo?.nombre?.toLowerCase().includes(term) ||
      String(pago.monto).includes(term) ||
      (pago.observaciones || '').toLowerCase().includes(term)
    );
  });

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 p-4 rounded-lg">
        <div className="flex">
          <AlertCircle className="h-5 w-5 text-red-500" />
          <p className="ml-3 text-sm text-red-700 dark:text-red-200">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {!embedded && (
        <AdminPageHeader
          title="Pagos o adicionales"
          description="Consultá los pagos manuales que te cargó el administrador. El comprobante formal se firma en Mis Recibos."
          eyebrow="Técnico"
          icon={<DollarSign className="h-5 w-5" />}
        />
      )}

      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por motivo o monto..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
        </div>
      </div>

      {filteredPagos.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-8 text-center">
          <DollarSign className="mx-auto h-12 w-12 text-slate-400" />
          <h3 className="mt-2 text-lg font-medium text-slate-900 dark:text-white">No hay pagos disponibles</h3>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Cuando el administrador cargue un pago manual, aparecerá aquí.
          </p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredPagos.map((pago) => (
            <div
              key={pago._id}
              className="bg-white dark:bg-gray-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6"
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {formatCurrency(pago.monto)}
                  </p>
                  <div className="flex items-center gap-1 mt-1 text-sm text-gray-500 dark:text-gray-400">
                    <Calendar className="h-4 w-4" />
                    {new Date(pago.fechaEmision).toLocaleDateString('es-AR')}
                  </div>
                </div>
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                  <Tag className="h-3 w-3" />
                  {pago.motivo?.nombre || 'Sin motivo'}
                </span>
              </div>

              {pago.observaciones && (
                <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">{pago.observaciones}</p>
              )}

              <div className="pt-3 border-t border-gray-100 dark:border-gray-700">
                <div className="flex items-center gap-1 text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
                  <ListTodo className="h-3.5 w-3.5" />
                  Tareas asociadas
                </div>
                {(pago.tareas || []).length === 0 ? (
                  <p className="text-sm text-gray-400 italic">Sin tareas asociadas</p>
                ) : (
                  <ul className="space-y-1">
                    {pago.tareas.map((tarea) => (
                      <li key={tarea._id} className="text-sm text-gray-700 dark:text-gray-300">
                        {tarea.numero} — {tarea.titulo}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MisPagosManuales;

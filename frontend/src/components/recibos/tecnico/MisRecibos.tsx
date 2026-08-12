import React, { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../../../store';
import { fetchMisRecibos } from '../../../store/slices/recibosSlice';
import FirmaModal from './FirmaModal';
import type { Recibo } from '../../../types';
import { Download, FileText, Search, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import AdminPageHeader from '../../common/AdminPageHeader';

const MisRecibos: React.FC = () => {
  const dispatch = useAppDispatch();
  const { recibos, loading, error } = useAppSelector((state) => state.recibos);
  const [selectedRecibo, setSelectedRecibo] = useState<Recibo | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    dispatch(fetchMisRecibos());
  }, [dispatch]);

  const filteredRecibos = recibos.filter(recibo => {
    const searchLower = searchTerm.toLowerCase();
    return (
      recibo.mes.toString().includes(searchLower) ||
      recibo.anio.toString().includes(searchLower) ||
      recibo.estadoFirma.toLowerCase().includes(searchLower) ||
      (recibo.motivo?.nombre || '').toLowerCase().includes(searchLower)
    );
  });

  const getMonthName = (month: number) => {
    return format(new Date(2000, month - 1, 1), 'MMMM', { locale: es });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 p-4 rounded-lg">
        <div className="flex">
          <div className="flex-shrink-0">
            <AlertCircle className="h-5 w-5 text-red-500" />
          </div>
          <div className="ml-3">
            <p className="text-sm text-red-700 dark:text-red-200">
              Error al cargar los recibos. Por favor, intente nuevamente.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Mis Recibos de Sueldo"
        description="Visualizá y gestioná tus recibos de sueldo"
        eyebrow="Técnico"
        icon={<FileText className="h-5 w-5" />}
      />

      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
        <div className="relative max-w-md">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Buscar por motivo, mes, año o estado..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {filteredRecibos.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-8 text-center">
          <FileText className="mx-auto h-12 w-12 text-slate-400" />
          <h3 className="mt-2 text-lg font-medium text-slate-900 dark:text-white">
            No hay recibos disponibles
          </h3>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {searchTerm ? 'No se encontraron recibos que coincidan con la búsqueda' : 'Tus recibos aparecerán aquí cuando estén disponibles'}
          </p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredRecibos.map((recibo) => (
            <div 
              key={recibo._id} 
              className="bg-white dark:bg-gray-800 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-500 transition-colors"
            >
              <div className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className={`p-3 rounded-lg ${recibo.estadoFirma === 'firmado' ? 'bg-green-100 dark:bg-green-900/30' : 'bg-yellow-100 dark:bg-yellow-900/30'}`}>
                      <FileText className={`h-6 w-6 ${recibo.estadoFirma === 'firmado' ? 'text-green-600 dark:text-green-400' : 'text-yellow-600 dark:text-yellow-400'}`} />
                    </div>
                    <div className="ml-4">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {getMonthName(recibo.mes).charAt(0).toUpperCase() + getMonthName(recibo.mes).slice(1)} {recibo.anio}
                      </h3>
                      <p className="text-sm font-medium text-blue-600 dark:text-blue-400 mt-0.5">
                        {recibo.motivo?.nombre || 'Sin motivo'}
                      </p>
                      <div className="flex items-center mt-1">
                        {recibo.estadoFirma === 'firmado' ? (
                          <>
                            <CheckCircle className="h-4 w-4 text-green-500 mr-1.5" />
                            <span className="text-sm text-green-600 dark:text-green-400">Firmado</span>
                          </>
                        ) : (
                          <>
                            <Clock className="h-4 w-4 text-yellow-500 mr-1.5" />
                            <span className="text-sm text-yellow-600 dark:text-yellow-400">Pendiente de firma</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="mt-6 flex justify-between items-center">
                  <a
                    href={`http://localhost:4000/${recibo.url}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Descargar
                  </a>
                  
                  {recibo.estadoFirma === 'no firmado' && (
                    <button
                      onClick={() => setSelectedRecibo(recibo)}
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-all duration-200"
                    >
                      Firmar Recibo
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Firma Modal */}
      {selectedRecibo && (
        <FirmaModal 
          recibo={selectedRecibo} 
          onClose={() => setSelectedRecibo(null)} 
        />
      )}
    </div>
  );
};

export default MisRecibos;

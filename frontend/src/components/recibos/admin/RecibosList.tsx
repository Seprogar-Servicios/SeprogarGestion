import React, { useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useAppDispatch } from '../../../store';
import type { RootState } from '../../../store';
import { fetchRecibos, deleteRecibo } from '../../../store/slices/recibosSlice';
import { toast } from 'react-toastify';

interface RecibosListProps {
  selectedTecnico: string;
  selectedPeriodo: string;
}

interface Tecnico {
  _id: string;
  nombre: string;
  // Add other tecnicos properties as needed
}

interface Recibo {
  _id: string;
  mes?: number;
  anio?: number;
  estadoFirma?: string;
  url?: string;
  tecnico?: Tecnico;
  motivo?: { _id: string; nombre: string };
}

const RecibosList: React.FC<RecibosListProps> = ({ selectedTecnico, selectedPeriodo }) => {
  const dispatch = useAppDispatch();
  const { recibos, loading: isLoading, error } = useSelector((state: RootState) => state.recibos);

  const typedRecibos: Recibo[] = recibos || [];
  
  // Filter recibos based on selected filters
  const filteredRecibos = typedRecibos.filter((recibo: Recibo) => {
    if (!recibo) return false;

    // Match technician if selected
    const tecnicoMatch = !selectedTecnico || recibo.tecnico?._id === selectedTecnico;
    
    // Match month if selected (compare month numbers as strings)
    const monthMatch = !selectedPeriodo || recibo.mes?.toString() === selectedPeriodo;

    return tecnicoMatch && monthMatch;
  });

  useEffect(() => {
    dispatch(fetchRecibos());
  }, [dispatch]);

  const handleDelete = async (id: string) => {
    if (window.confirm('¿Estás seguro de que deseas eliminar este recibo?')) {
      try {
        await dispatch(deleteRecibo(id)).unwrap();
        toast.success('Recibo eliminado exitosamente');
      } catch (err) {
        toast.error('Error al eliminar el recibo');
      }
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="animate-pulse bg-gray-100 dark:bg-gray-700 rounded-lg p-6">
            <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-1/4 mb-3"></div>
            <div className="h-3 bg-gray-200 dark:bg-gray-600 rounded w-1/3"></div>
          </div>
        ))}
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 p-4 rounded-lg">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-red-500" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <p className="text-sm text-red-700 dark:text-red-200">
              Error al cargar los recibos. Por favor, inténtalo de nuevo más tarde.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Empty state
  if (filteredRecibos.filter(Boolean).length === 0) {
    return (
      <div className="text-center py-12 px-4 sm:px-6 lg:px-8">
        <svg
          className="mx-auto h-12 w-12 text-gray-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1}
            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
          />
        </svg>
        <h3 className="mt-2 text-lg font-medium text-gray-900 dark:text-white">No hay recibos</h3>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          No se encontraron recibos que coincidan con los filtros seleccionados.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 rounded-lg">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-300 dark:divide-gray-600">
          <thead className="bg-gray-50 dark:bg-gray-800/50">
            <tr>
              <th 
                scope="col" 
                className="py-3.5 pl-6 pr-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-200"
              >
                Técnico
              </th>
              <th 
                scope="col" 
                className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-gray-200"
              >
                Motivo
              </th>
              <th 
                scope="col" 
                className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-gray-200"
              >
                Período
              </th>
              <th 
                scope="col" 
                className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-gray-200"
              >
                Estado
              </th>
              <th 
                scope="col" 
                className="relative py-3.5 pl-3 pr-6 sm:pr-6 text-right text-sm font-semibold text-gray-900 dark:text-gray-200"
              >
                <span className="sr-only">Acciones</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-800">
            {filteredRecibos.filter(Boolean).map((recibo) => (
              <tr 
                key={recibo._id} 
                className="transition-colors duration-150 hover:bg-gray-50 dark:hover:bg-gray-700/50"
              >
                <td className="whitespace-nowrap py-4 pl-6 pr-3 text-sm font-medium text-gray-900 dark:text-white">
                  <div className="flex items-center">
                    <div className="h-10 w-10 flex-shrink-0 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                      <span className="text-blue-600 dark:text-blue-400 font-medium">
                        {recibo?.tecnico?.nombre?.charAt(0) || '?'}
                      </span>
                    </div>
                    <div className="ml-4">
                      <div className="font-medium text-gray-900 dark:text-white">
                        {recibo?.tecnico?.nombre || 'Técnico no disponible'}
                      </div>
                      <div className="text-gray-500 dark:text-gray-400 text-xs">
                        ID: {recibo?._id?.substring(0, 8)}...
                      </div>
                    </div>
                  </div>
                </td>
                <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 dark:text-gray-300">
                  <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                    {recibo?.motivo?.nombre || 'Sin motivo'}
                  </span>
                </td>
                <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 dark:text-gray-300">
                  <div className="font-medium">
                    {new Date(2000, (recibo?.mes || 1) - 1, 1).toLocaleString('es-AR', { month: 'long' })}
                  </div>
                  <div className="text-gray-400 dark:text-gray-500">
                    {recibo?.anio}
                  </div>
                </td>
                <td className="whitespace-nowrap px-3 py-4">
                  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    recibo?.estadoFirma === 'firmado' 
                      ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' 
                      : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
                  }`}>
                    {recibo?.estadoFirma === 'firmado' ? (
                      <>
                        <svg className="-ml-0.5 mr-1.5 h-2 w-2 text-green-500" fill="currentColor" viewBox="0 0 8 8">
                          <circle cx={4} cy={4} r={3} />
                        </svg>
                        Firmado
                      </>
                    ) : (
                      <>
                        <svg className="-ml-0.5 mr-1.5 h-2 w-2 text-yellow-500" fill="currentColor" viewBox="0 0 8 8">
                          <circle cx={4} cy={4} r={3} />
                        </svg>
                        Pendiente
                      </>
                    )}
                  </span>
                </td>
                <td className="relative whitespace-nowrap py-4 pl-3 pr-6 text-right text-sm font-medium sm:pr-6 space-x-2">
                  {recibo?.url && (
                    <a
                      href={`http://localhost:4000/${recibo.url}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-full shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200"
                    >
                      <svg className="-ml-0.5 mr-1.5 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Ver PDF
                    </a>
                  )}
                  <button
                    onClick={() => recibo?._id && handleDelete(recibo._id)}
                    className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-full shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors duration-200"
                  >
                    <svg className="-ml-0.5 mr-1.5 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Eliminar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default RecibosList;

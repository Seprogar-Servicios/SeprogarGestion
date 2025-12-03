import React, { useState, useEffect } from 'react';
import { FileText, Plus, X, User, Calendar } from 'lucide-react';
import { useSelector } from 'react-redux';
import ReciboForm from './ReciboForm';
import RecibosList from './RecibosList';
import { useAppDispatch } from '../../../store';
import { fetchRecibos } from '../../../store/slices/recibosSlice';
import { fetchUsers } from '../../../store/slices/usersSlice';
import type { RootState } from '../../../store';

const RecibosAdmin: React.FC = () => {
  const [selectedTecnico, setSelectedTecnico] = useState('');
  const [selectedPeriodo, setSelectedPeriodo] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const dispatch = useAppDispatch();

  const { users } = useSelector((state: RootState) => state.users);

  useEffect(() => {
    dispatch(fetchUsers());
  }, [dispatch]);

  const tecnicos = users.filter(user => user.rol === 'usuario');

  // Array de nombres de meses en español
  const monthNames = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  // Crear opciones de meses del 1 al 12 con sus nombres
  const meses = Array.from({ length: 12 }, (_, i) => ({
    value: (i + 1).toString(),
    label: monthNames[i]
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border-t-4 border-blue-500 p-6 mb-6 animate-fadeIn">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center">
            <div className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded-lg mr-4">
              <FileText className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Gestión de Recibos de Sueldo
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 flex items-center">
                Administra los recibos de sueldo de los técnicos
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center px-4 py-2.5 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200 cursor-pointer"
          >
            <Plus className="h-4 w-4 mr-2" />
            Nuevo Recibo
          </button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border-t-4 border-blue-500 p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="tecnico-filter" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Filtrar por Técnico</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <User className="h-4 w-4 text-gray-400" />
              </div>
              <select
                id="tecnico-filter"
                value={selectedTecnico}
                onChange={(e) => setSelectedTecnico(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
              >
                <option value="">Todos los técnicos</option>
                {tecnicos.map(tecnico => (
                  <option key={tecnico._id} value={tecnico._id}>{tecnico.nombre}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label htmlFor="periodo-filter" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Filtrar por Mes</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Calendar className="h-4 w-4 text-gray-400" />
              </div>
              <select
                id="periodo-filter"
                value={selectedPeriodo}
                onChange={(e) => setSelectedPeriodo(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
              >
                <option value="">Todos los meses</option>
                {meses.map(mes => (
                  <option key={mes.value} value={mes.value}>
                    {mes.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden border border-gray-200 dark:border-gray-700">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-medium text-gray-900 dark:text-white">
              Listado de Recibos
            </h2>
          </div>
          <div className="p-6">
            <RecibosList selectedTecnico={selectedTecnico} selectedPeriodo={selectedPeriodo} />
          </div>
        </div>
      </div>

      {/* Create/Edit Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 transition-opacity duration-300 animate-fadeIn">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[95vh] flex flex-col transform transition-all duration-300 animate-scaleIn">
            {/* Modal Header */}
            <div className="flex-shrink-0 px-6 py-4 bg-gradient-to-r from-blue-600 to-purple-600 rounded-t-2xl flex justify-between items-center">
              <div className="flex items-center">
                <FileText className="h-6 w-6 text-white mr-3" />
                <h2 className="text-xl font-semibold text-white">
                  Cargar Nuevo Recibo
                </h2>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-white/70 hover:text-white transition-colors duration-200"
              >
                <X className="h-6 w-6" />
                <span className="sr-only">Cerrar</span>
              </button>
            </div>
            
            {/* Modal Body */}
            <div className="p-6 sm:p-8 flex-grow overflow-y-auto">
              <ReciboForm 
                onSuccess={() => {
                  setShowCreateModal(false);
                  dispatch(fetchRecibos());
                }} 
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RecibosAdmin;
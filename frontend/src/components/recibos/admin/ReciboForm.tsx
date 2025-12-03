import React, { useState, useEffect, useCallback } from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '../../../store';
import { fetchUsers } from '../../../store/slices/usersSlice';
import { createRecibo } from '../../../store/slices/recibosSlice';
import { useAppDispatch } from '../../../store';
import { toast } from 'react-toastify';
import { Upload, User, Calendar, FileText, X, Loader2 } from 'lucide-react';

interface ReciboFormProps {
  onSuccess: () => void;
}

const ReciboForm: React.FC<ReciboFormProps> = ({ onSuccess }) => {
  const [tecnico, setTecnico] = useState('');
  const [mes, setMes] = useState(new Date().getMonth() + 1);
  const [anio, setAnio] = useState(new Date().getFullYear());
  const [pdf, setPdf] = useState<File | null>(null);

  const dispatch = useAppDispatch();
  const { users } = useSelector((state: RootState) => state.users);
  const { loading: isLoading } = useSelector((state: RootState) => state.recibos);

  useEffect(() => {
    dispatch(fetchUsers());
  }, [dispatch]);

  const tecnicos = users?.filter((user: any) => user.rol === 'usuario') || [];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      if (e.target.files[0].size > 10 * 1024 * 1024) { // 10MB
        toast.error('El archivo es demasiado grande. El tamaño máximo permitido es 10MB.');
        return;
      }
      setPdf(e.target.files[0]);
    }
  };

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type !== 'application/pdf') {
        toast.error('Por favor, sube un archivo PDF');
        return;
      }
      if (file.size > 10 * 1024 * 1024) { // 10MB
        toast.error('El archivo es demasiado grande. El tamaño máximo permitido es 10MB.');
        return;
      }
      setPdf(file);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tecnico || !pdf) {
      toast.error('Por favor, complete todos los campos y seleccione un archivo.');
      return;
    }

    const formData = new FormData();
    formData.append('tecnico', tecnico);
    formData.append('mes', mes.toString());
    formData.append('anio', anio.toString());
    formData.append('pdf', pdf);

    try {
      await dispatch(createRecibo(formData)).unwrap();
      toast.success('Recibo cargado exitosamente');
      onSuccess();
    } catch (err: any) { 
      console.error('Error al cargar el recibo:', err);
      toast.error(err?.response?.data?.message || 'Error al cargar el recibo');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-6">
        <div>
          <label htmlFor="tecnico" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Técnico
          </label>
          <div className="relative rounded-md shadow-sm">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <User className="h-5 w-5 text-gray-400" />
            </div>
            <select
              id="tecnico"
              value={tecnico}
              onChange={(e) => setTecnico(e.target.value)}
              className="block w-full pl-10 pr-3 py-2 text-base border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm dark:bg-gray-700 dark:text-white"
              required
            >
              <option value="">Seleccionar técnico</option>
              {tecnicos.map((t: any) => (
                <option key={t._id} value={t._id}>
                  {t.nombre} {t.apellido}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label htmlFor="mes" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Mes
            </label>
            <div className="relative rounded-md shadow-sm">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Calendar className="h-5 w-5 text-gray-400" />
              </div>
              <select
                id="mes"
                value={mes}
                onChange={(e) => setMes(parseInt(e.target.value))}
                className="block w-full pl-10 pr-3 py-2 text-base border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm dark:bg-gray-700 dark:text-white"
                required
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                  <option key={m} value={m}>
                    {new Date(2000, m - 1).toLocaleString('es-AR', { month: 'long' })}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="anio" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Año
            </label>
            <div className="relative rounded-md shadow-sm">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Calendar className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="number"
                id="anio"
                value={anio}
                onChange={(e) => setAnio(parseInt(e.target.value))}
                className="block w-full pl-10 pr-3 py-2 text-base border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm dark:bg-gray-700 dark:text-white"
                required
              />
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Archivo PDF
          </label>
          <div
            className={`mt-1 flex justify-center px-6 pt-8 pb-8 border-2 border-dashed rounded-lg transition-colors ${
              pdf
                ? 'border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-900/20'
                : 'border-gray-300 dark:border-gray-600 hover:border-blue-500 dark:hover:border-blue-400 bg-gray-50 dark:bg-gray-700/50'
            }`}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
          >
            <div className="space-y-3 text-center">
              {pdf ? (
                <div className="flex flex-col items-center space-y-2">
                  <FileText className="h-12 w-12 text-green-500 dark:text-green-400" />
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{pdf.name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {(pdf.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                  <button
                    type="button"
                    onClick={() => setPdf(null)}
                    className="mt-2 inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 dark:bg-red-700 dark:hover:bg-red-800 transition-colors duration-150"
                  >
                    <X className="h-3 w-3 mr-1.5" /> Cambiar archivo
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex justify-center">
                    <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-full">
                      <Upload className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                    </div>
                  </div>
                  <div className="flex justify-center text-sm text-gray-600 dark:text-gray-300">
                    <label
                      htmlFor="file-upload"
                      className="relative cursor-pointer rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none dark:text-blue-400 dark:hover:text-blue-300"
                    >
                      <span>Subir archivo</span>
                      <input
                        id="file-upload"
                        name="file-upload"
                        type="file"
                        className="sr-only"
                        accept="application/pdf"
                        onChange={handleFileChange}
                      />
                    </label>
                    <p className="pl-1">o arrastrar aquí</p>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    PDF de recibo de sueldo (máx. 10MB)
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Form Actions */}
        <div className="pt-5 border-t border-gray-200 dark:border-gray-700">
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onSuccess}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-150"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150"
            >
              {isLoading ? (
                <>
                  <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4" />
                  Cargando...
                </>
              ) : (
                'Cargar Recibo'
              )}
            </button>
          </div>
        </div>
      </div>
    </form>
  );
};

export default ReciboForm;

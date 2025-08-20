import React, { useState } from 'react';
import { useAppSelector } from '../../store';
import { Download, FileText, CheckCircle, AlertCircle, Info } from 'lucide-react';
import { toast } from 'react-toastify';
import api from '../../config/api';

interface ImportStats {
  especialidades: number;
  usuarios: number;
  tareas: number;
  especialidadesExistentes: number;
  usuariosExistentes: number;
  tareasExistentes: number;
  especialidadesNuevas: number;
  usuariosNuevos: number;
  tareasNuevas: number;
}

const DataImportExport: React.FC = () => {
  const { user } = useAppSelector((state) => state.auth);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [validationReport, setValidationReport] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'import' | 'export'>('import');
  const [importStats, setImportStats] = useState<ImportStats | null>(null);

  // Verificar si el usuario es administrador
  if (user?.rol !== 'admin') {
    return (
      <div className="p-4 bg-white rounded-lg shadow">
        <div className="text-red-600 flex items-center">
          <AlertCircle className="w-5 h-5 mr-2" />
          No tienes permisos para acceder a esta sección.
        </div>
      </div>
    );
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
      setValidationReport(null);
    }
  };

  const validateFile = async () => {
    if (!selectedFile) return;
    
    setIsLoading(true);
    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      const response = await api.post('/data/import/validate', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      setValidationReport(response.data);
      
      // Manejar el caso de datos duplicados
      if (response.data.data.allDataIsDuplicate) {
        toast.warning('El archivo contiene solo datos duplicados que ya existen en el sistema.');
      } else if (!response.data.data.isValid) {
        toast.error('El archivo tiene errores. Por favor, revísalos antes de continuar.');
      } else {
        toast.success('El archivo es válido. Puedes proceder con la importación.');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error al validar el archivo');
      console.error('Validation error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const importData = async () => {
    if (!selectedFile) {
      toast.error('Por favor selecciona un archivo');
      return;
    }
    
    if (!validationReport?.data?.isValid) {
      toast.error('El archivo no es válido para importación');
      return;
    }
    
    if (validationReport?.data?.allDataIsDuplicate) {
      toast.warning('No hay datos nuevos para importar. Todos los datos ya existen en el sistema.');
      return;
    }
    
    setIsLoading(true);
    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      const response = await api.post('/data/import', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      // Guardar estadísticas de importación
      if (response.data?.success && response.data?.stats) {
        setImportStats(response.data.stats);
        toast.success('Datos importados correctamente');
      } else {
        toast.success('Datos importados correctamente');
        setImportStats(null);
      }
      
      // Limpiar el estado del archivo después de una importación exitosa
      setSelectedFile(null);
      setValidationReport(null);
    } catch (error: any) {
      console.error('Error detallado de importación:', {
        mensaje: error.message,
        respuesta: error.response?.data,
        estado: error.response?.status
      });
      toast.error(error.response?.data?.message || 'Error al importar los datos');
      setImportStats(null);
    } finally {
      setIsLoading(false);
    }
  };

  const exportData = async (format: 'excel' | 'csv') => {
    setIsLoading(true);
    try {
      if (format === 'excel') {
        const response = await api.get('/data/export', {
          responseType: 'blob',
        });
        
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `backup_${new Date().toISOString().split('T')[0]}.xlsx`);
        document.body.appendChild(link);
        link.click();
        link.remove();
      } else {
        // Exportar a CSV por tipo
        const types = ['especialidades', 'usuarios', 'tareas'];
        for (const type of types) {
          const response = await api.get(`/data/export/${type}`, {
            responseType: 'blob',
          });
          
          const url = window.URL.createObjectURL(new Blob([response.data]));
          const link = document.createElement('a');
          link.href = url;
          link.setAttribute('download', `${type}_${new Date().toISOString().split('T')[0]}.csv`);
          document.body.appendChild(link);
          link.click();
          link.remove();
        }
      }
      
      toast.success('Datos exportados correctamente');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error al exportar los datos');
      console.error('Export error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const downloadTemplate = async () => {
    try {
      
      // Asegurarse de que el token esté presente
      const token = localStorage.getItem('accessToken');
      if (!token) {
        toast.error('No estás autenticado. Por favor, inicia sesión.');
        return;
      }
      
      // Hacer la petición con el token en los headers
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:4000/api'}/data/export/template`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        },
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Error al descargar la plantilla');
      }
      
      // Obtener el blob de la respuesta
      const blob = await response.blob();
      
      // Verificar que el blob no esté vacío
      if (blob.size === 0) {
        throw new Error('El archivo recibido está vacío');
      }
      
      // Crear un enlace temporal para la descarga
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'plantilla_importacion.xlsx');
      
      // Descargar el archivo
      document.body.appendChild(link);
      link.click();
      
      // Limpieza
      setTimeout(() => {
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      }, 100);
      
      toast.success('Plantilla descargada correctamente');
    } catch (error: any) {
      console.error('Error al descargar la plantilla:', error);
      const errorMessage = error.message || 'Error al descargar la plantilla';
      toast.error(errorMessage);
    }
  };

  return (
    <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow">
      <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">Importar / Exportar Datos</h2>
      
      <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('import')}
            className={`${activeTab === 'import' 
              ? 'border-[#0056a2] text-[#0056a2] dark:border-[#1e90ff] dark:text-[#1e90ff]' 
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:border-gray-500'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors duration-200`}
          >
            Importar Datos
          </button>
          <button
            onClick={() => setActiveTab('export')}
            className={`${activeTab === 'export' 
              ? 'border-[#0056a2] text-[#0056a2] dark:border-[#1e90ff] dark:text-[#1e90ff]' 
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:border-gray-500'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors duration-200`}
          >
            Exportar Datos
          </button>
        </nav>
      </div>

      {activeTab === 'import' ? (
        <div className="space-y-6">
          <div className="bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-400 dark:border-blue-600 p-4 rounded-r-md">
            <div className="flex">
              <div className="flex-shrink-0">
                <FileText className="h-5 w-5 text-blue-400" />
              </div>
              <div className="ml-3">
                <p className="text-sm text-blue-700 dark:text-blue-200">
                  Para importar datos, descarga la plantilla, completa la información y súbela aquí. 
                  Los datos se importarán en el siguiente orden: Especialidades → Usuarios → Tareas.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-6">
            <button
              onClick={downloadTemplate}
              disabled={isLoading}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-[#0056a2] dark:bg-[#1e90ff] hover:bg-[#003b6f] dark:hover:bg-[#4aa8ff] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-colors duration-200"
            >
              <Download className="-ml-1 mr-2 h-5 w-5" />
              Descargar Plantilla
            </button>
          </div>

          <div className="mt-6 space-y-4">
            <div className="flex flex-col space-y-2">
              <label className="text-sm font-medium">Seleccionar archivo Excel</label>
              <div className="flex items-center">
                <input
                  type="file"
                  accept=".xlsx, .xls"
                  onChange={handleFileChange}
                  className="block w-full text-sm text-gray-500
                    file:mr-4 file:py-2 file:px-4
                    file:rounded-md file:border-0
                    file:text-sm file:font-semibold
                    file:bg-[#0056a2] file:text-white
                    hover:file:bg-[#003b6f]
                    dark:file:bg-[#1e90ff] dark:hover:file:bg-[#4aa8ff]"
                  disabled={isLoading}
                />
              </div>
            </div>
            
            {selectedFile && (
              <div className="flex flex-col space-y-2">
                <div className="flex items-center text-sm">
                  <FileText className="w-4 h-4 mr-1" />
                  {selectedFile.name} ({Math.round(selectedFile.size / 1024)} KB)
                </div>
                
                <div className="flex space-x-2">
                  <button
                    onClick={validateFile}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                    disabled={isLoading}
                  >
                    Validar archivo
                  </button>
                  
                  <div className="relative group">
                    <button
                      onClick={importData}
                      disabled={!validationReport?.data?.isValid || validationReport?.data?.allDataIsDuplicate || isLoading}
                      className={`px-4 py-2 text-sm font-medium text-white rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                        !validationReport?.data?.isValid || validationReport?.data?.allDataIsDuplicate || isLoading
                          ? 'bg-gray-400 cursor-not-allowed'
                          : 'bg-green-600 hover:bg-green-700 focus:ring-green-500'
                      }`}
                    >
                      {isLoading ? 'Importando...' : 'Importar Datos'}
                    </button>
                    {validationReport?.data?.allDataIsDuplicate && (
                      <div className="absolute z-10 invisible group-hover:visible w-64 p-2 -mt-2 text-sm text-gray-600 bg-white border border-gray-200 rounded-md shadow-lg">
                        No hay datos nuevos para importar. Todos los datos ya existen en el sistema.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {validationReport && (
              <div className={`mt-4 p-4 rounded-md ${validationReport.data.isValid ? 'bg-green-50 dark:bg-green-900/30' : 'bg-yellow-50 dark:bg-yellow-900/20'}`}>
                <div className="flex">
                  <div className="flex-shrink-0">
                    {validationReport.data.isValid ? (
                      <CheckCircle className="h-5 w-5 text-green-400" />
                    ) : (
                      <AlertCircle className="h-5 w-5 text-yellow-400" />
                    )}
                  </div>
                  <div className="ml-3">
                    <h3 className={`text-sm font-medium ${validationReport.data.isValid ? 'text-green-800 dark:text-green-200' : 'text-yellow-800 dark:text-yellow-200'}`}>
                      {validationReport.data.allDataIsDuplicate 
                        ? 'Todos los datos ya existen en el sistema' 
                        : validationReport.data.isValid ? 'Archivo válido' : 'Advertencias'}
                    </h3>
                    <div className="mt-2 text-sm">
                      <ul className="list-disc pl-5 space-y-1">
                        {validationReport.data.messages && validationReport.data.messages.length > 0 ? (
                          validationReport.data.messages.map((msg: string, idx: number) => (
                            <li key={idx} className={validationReport.data.isValid ? 'text-green-700 dark:text-green-300' : 'text-yellow-700 dark:text-yellow-300'}>{msg}</li>
                          ))
                        ) : (
                          <li className="text-gray-500 dark:text-gray-400">No hay mensajes de validación</li>
                        )}
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {importStats && (
              <div className="mt-4 p-4 bg-[#f0f7ff] dark:bg-[#0a1f33] rounded-md border border-[#0056a2] dark:border-[#1e90ff]">
                <h3 className="text-md font-semibold flex items-center mb-2 text-[#0056a2] dark:text-[#1e90ff]">
                  <Info className="w-5 h-5 mr-2" />
                  Resumen de importación
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-[#f8fafc] dark:bg-[#1a2234] p-3 rounded shadow-sm border border-[#e2e8f0] dark:border-[#334155]">
                    <h4 className="font-medium text-[#0056a2] dark:text-[#1e90ff] mb-1">Especialidades</h4>
                    <ul className="text-sm space-y-1 text-gray-700 dark:text-gray-300">
                      <li>Procesadas: {importStats.especialidades}</li>
                      <li>Existentes: {importStats.especialidadesExistentes}</li>
                      <li className="text-[#0056a2] dark:text-[#1e90ff] font-medium">Nuevas: {importStats.especialidadesNuevas}</li>
                    </ul>
                  </div>
                  <div className="bg-[#f8fafc] dark:bg-[#1a2234] p-3 rounded shadow-sm border border-[#e2e8f0] dark:border-[#334155]">
                    <h4 className="font-medium text-[#0056a2] dark:text-[#1e90ff] mb-1">Usuarios</h4>
                    <ul className="text-sm space-y-1 text-gray-700 dark:text-gray-300">
                      <li>Procesados: {importStats.usuarios}</li>
                      <li>Existentes: {importStats.usuariosExistentes}</li>
                      <li className="text-[#0056a2] dark:text-[#1e90ff] font-medium">Nuevos: {importStats.usuariosNuevos}</li>
                    </ul>
                  </div>
                  <div className="bg-[#f8fafc] dark:bg-[#1a2234] p-3 rounded shadow-sm border border-[#e2e8f0] dark:border-[#334155]">
                    <h4 className="font-medium text-[#0056a2] dark:text-[#1e90ff] mb-1">Tareas</h4>
                    <ul className="text-sm space-y-1 text-gray-700 dark:text-gray-300">
                      <li>Procesadas: {importStats.tareas}</li>
                      <li>Existentes: {importStats.tareasExistentes}</li>
                      <li className="text-[#0056a2] dark:text-[#1e90ff] font-medium">Nuevas: {importStats.tareasNuevas}</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-400 dark:border-blue-600 p-4 rounded-r-md">
            <div className="flex">
              <div className="flex-shrink-0">
                <FileText className="h-5 w-5 text-blue-400" />
              </div>
              <div className="ml-3">
                <p className="text-sm text-blue-700 dark:text-blue-200">
                  Exporta los datos del sistema en diferentes formatos. Puedes exportar todos los datos 
                  en un archivo Excel o exportar por separado en formato CSV.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="relative rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-6 py-5 shadow-sm flex items-center space-x-3 hover:border-[#0056a2] dark:hover:border-[#1e90ff] focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500 transition-colors duration-200">
              <div className="flex-shrink-0 bg-[#0056a2] dark:bg-[#1e90ff] rounded-md p-3">
                <FileText className="h-6 w-6 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <button
                  onClick={() => exportData('excel')}
                  disabled={isLoading}
                  className="text-left focus:outline-none w-full"
                >
                  <span className="absolute inset-0" aria-hidden="true" />
                  <p className="text-sm font-medium text-gray-900 dark:text-white">Exportar a Excel</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 truncate">Todos los datos en un solo archivo .xlsx</p>
                </button>
              </div>
            </div>

            <div className="relative rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-6 py-5 shadow-sm flex items-center space-x-3 hover:border-[#0056a2] dark:hover:border-[#1e90ff] focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500 transition-colors duration-200">
              <div className="flex-shrink-0 bg-green-600 dark:bg-green-500 rounded-md p-3">
                <FileText className="h-6 w-6 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <button
                  onClick={() => exportData('csv')}
                  disabled={isLoading}
                  className="text-left focus:outline-none w-full"
                >
                  <span className="absolute inset-0" aria-hidden="true" />
                  <p className="text-sm font-medium text-gray-900 dark:text-white">Exportar a CSV</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 truncate">Archivos separados por tipo de datos</p>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DataImportExport;

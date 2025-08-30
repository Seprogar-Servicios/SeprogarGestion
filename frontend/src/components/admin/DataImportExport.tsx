import React, { useState } from 'react';
import { useAppSelector } from '../../store';
import { Download, FileText, CheckCircle, AlertCircle, Info, Upload, X, Loader2 } from 'lucide-react';
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
    <div className="space-y-6 h-full flex flex-col animate-fadeIn" style={{ minHeight: '85vh' }}>
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border-t-4 border-blue-500 p-6 mb-6 animate-fadeIn">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center">
            <div className="bg-blue-100 dark:bg-blue-900/30 p-3 rounded-full mr-4">
              <Download className="h-8 w-8 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Gestión de Datos
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 flex items-center">
                Importa y exporta datos del sistema de manera segura
              </p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Tab Navigation */}
      <div className="mb-8">
        <nav className="flex space-x-1 p-1 bg-gray-100 dark:bg-gray-700 rounded-lg">
          <button
            onClick={() => setActiveTab('import')}
            className={`${activeTab === 'import' 
              ? 'bg-white text-blue-600 shadow-sm dark:bg-gray-800 dark:text-blue-400' 
              : 'text-gray-600 hover:bg-gray-200 dark:text-gray-300 dark:hover:bg-gray-600'
            } px-6 py-3 text-sm font-medium rounded-md transition-all duration-200 flex items-center`}
          >
            <FileText className="w-4 h-4 mr-2" />
            Importar Datos
          </button>
          <button
            onClick={() => setActiveTab('export')}
            className={`${activeTab === 'export' 
              ? 'bg-white text-blue-600 shadow-sm dark:bg-gray-800 dark:text-blue-400' 
              : 'text-gray-600 hover:bg-gray-200 dark:text-gray-300 dark:hover:bg-gray-600'
            } px-6 py-3 text-sm font-medium rounded-md transition-all duration-200 flex items-center`}
          >
            <Download className="w-4 h-4 mr-2" />
            Exportar Datos
          </button>
        </nav>
      </div>

      {activeTab === 'import' ? (
        <div className="space-y-6">
          {/* Import Instructions Card */}
          <div className="bg-gradient-to-r from-blue-50 to-blue-50/80 dark:from-blue-900/20 dark:to-blue-900/10 border border-blue-100 dark:border-blue-800 rounded-xl p-5 mb-6 shadow-sm">
            <div className="flex">
              <div className="flex-shrink-0">
                <div className="p-2.5 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                  <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
              <div className="ml-4">
                <h3 className="text-sm font-medium text-blue-800 dark:text-blue-200">
                  Instrucciones de importación
                </h3>
                <p className="mt-1 text-sm text-blue-700 dark:text-blue-300">
                  Para importar datos, descarga la plantilla, completa la información y súbela aquí. 
                  Los datos se importarán en el siguiente orden: Especialidades → Usuarios → Tareas.
                </p>
              </div>
            </div>
          </div>

          {/* Template Download Card */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6 hover:shadow-md transition-all duration-300 hover:border-blue-300 dark:hover:border-blue-600">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-start space-x-3">
                <div className="bg-blue-50 dark:bg-blue-900/30 p-2 rounded-lg">
                  <FileText className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">Plantilla de importación</h3>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    Descarga la plantilla para completar con los datos a importar
                  </p>
                </div>
              </div>
              <button
                onClick={downloadTemplate}
                disabled={isLoading}
                className="inline-flex items-center justify-center px-5 py-2.5 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-all duration-200 transform hover:scale-105 cursor-pointer"
              >
                <Download className="-ml-1 mr-2 h-5 w-5" />
                Descargar Plantilla
              </button>
            </div>
          </div>

          {/* File Upload Card */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-all duration-300 hover:border-blue-300 dark:hover:border-blue-600">
            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <div className="bg-green-50 dark:bg-green-900/30 p-2 rounded-lg">
                  <Upload className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">Importar archivo</h3>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    Selecciona el archivo Excel con los datos a importar
                  </p>
                </div>
              </div>
              
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Archivo Excel (.xlsx, .xls)
                </label>
                <div className="mt-1 flex items-center">
                  <label className="w-full">
                    <div className="flex justify-center px-6 pt-5 pb-6 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg transition-all duration-200 hover:border-blue-500 hover:bg-blue-50/50 dark:hover:bg-blue-900/10 cursor-pointer">
                      <div className="space-y-1 text-center">
                        <div className="flex text-sm text-gray-600 dark:text-gray-400 justify-center">
                          <svg
                            className="mx-auto h-12 w-12 text-gray-400"
                            stroke="currentColor"
                            fill="none"
                            viewBox="0 0 48 48"
                            aria-hidden="true"
                          >
                            <path
                              d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                              strokeWidth={2}
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        </div>
                        <div className="flex text-sm text-gray-600 dark:text-gray-400">
                          <span className="relative cursor-pointer rounded-md font-medium text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500">
                            Sube un archivo
                          </span>
                          <p className="pl-1">o arrástralo aquí</p>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          XLSX, XLS hasta 10MB
                        </p>
                      </div>
                      <input
                        id="file-upload"
                        name="file-upload"
                        type="file"
                        className="sr-only"
                        accept=".xlsx, .xls"
                        onChange={handleFileChange}
                        disabled={isLoading}
                      />
                    </div>
                  </label>
                </div>
              </div>
            </div>
            
            {selectedFile && (
              <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-700/30 rounded-lg border border-gray-200 dark:border-gray-600">
                <div className="flex items-start">
                  <div className="flex-shrink-0 p-2 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
                    <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="ml-3 flex-1">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {selectedFile.name}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {Math.round(selectedFile.size / 1024)} KB
                    </p>
                    
                    <div className="mt-4 flex flex-wrap gap-3">
                      <button
                        onClick={validateFile}
                        disabled={isLoading}
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-all duration-200 transform hover:scale-105"
                      >
                        <CheckCircle className="-ml-1 mr-2 h-4 w-4" />
                        Validar archivo
                      </button>
                      
                      <div className="relative group">
                        <button
                          onClick={importData}
                          disabled={!validationReport?.data?.isValid || validationReport?.data?.allDataIsDuplicate || isLoading}
                          className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                            !validationReport?.data?.isValid || validationReport?.data?.allDataIsDuplicate || isLoading
                              ? 'bg-gray-400 cursor-not-allowed'
                              : 'bg-gradient-to-r from-green-600 to-green-500 hover:from-green-700 hover:to-green-600 focus:ring-green-500 transform hover:scale-105'
                          }`}
                        >
                          {isLoading ? (
                            <>
                              <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4" />
                              Importando...
                            </>
                          ) : (
                            <>
                              <Upload className="-ml-1 mr-2 h-4 w-4" />
                              Importar Datos
                            </>
                          )}
                        </button>
                        {validationReport?.data?.allDataIsDuplicate && (
                          <div className="absolute z-10 invisible group-hover:visible w-64 p-3 mt-2 text-sm text-gray-600 bg-white dark:bg-gray-800 dark:text-gray-300 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg">
                            <div className="flex items-center">
                              <Info className="h-4 w-4 mr-2 text-blue-500" />
                              No hay datos nuevos para importar. Todos los datos ya existen en el sistema.
                            </div>
                          </div>
                        )}
                      </div>
                      
                      <button
                        onClick={() => setSelectedFile(null)}
                        disabled={isLoading}
                        className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-lg shadow-sm text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-all duration-200"
                      >
                        <X className="-ml-1 mr-2 h-4 w-4" />
                        Cancelar
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {validationReport && (
              <div className={`mt-6 p-5 rounded-lg border shadow-sm transition-all duration-300 animate-fadeIn ${validationReport.data.isValid ? 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800' : 'bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800'}`}>
                <div className="flex items-start">
                  <div className={`flex-shrink-0 p-2 rounded-full ${validationReport.data.isValid ? 'bg-green-100 dark:bg-green-800/40' : 'bg-yellow-100 dark:bg-yellow-800/40'}`}>
                    {validationReport.data.isValid ? (
                      <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                    ) : (
                      <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                    )}
                  </div>
                  <div className="ml-4 flex-1">
                    <h3 className={`text-base font-medium ${validationReport.data.isValid ? 'text-green-800 dark:text-green-300' : 'text-yellow-800 dark:text-yellow-300'}`}>
                      {validationReport.data.isValid
                        ? 'Archivo válido para importar'
                        : 'El archivo tiene errores que deben corregirse'}
                    </h3>
                    <div className="mt-2 text-sm text-gray-700 dark:text-gray-300">
                      <ul className="list-disc pl-5 space-y-2">
                        {validationReport.data.messages.map((message: string, index: number) => (
                          <li key={index} className="transition-all duration-200 hover:translate-x-1">{message}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            )}
            {importStats && (
              <div className="mt-6 p-5 bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/20 rounded-lg border border-blue-200 dark:border-blue-800/50 shadow-sm transition-all duration-300 animate-fadeIn">
                <h3 className="text-lg font-semibold flex items-center mb-3 text-blue-700 dark:text-blue-300">
                  <div className="p-1.5 bg-blue-100 dark:bg-blue-800/40 rounded-full mr-3">
                    <CheckCircle className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  Importación completada con éxito
                </h3>
                <div className="text-sm text-gray-700 dark:text-gray-300 ml-2">
                  <p className="font-medium mb-2">Se importaron:</p>
                  <ul className="space-y-3 mt-2">
                    <li className="flex items-center transition-all duration-200 hover:translate-x-1">
                      <div className="h-1.5 w-1.5 rounded-full bg-blue-500 mr-2"></div>
                      <span className="font-medium">Especialidades:</span>
                      <span className="ml-2">{importStats.especialidades}</span>
                      <span className="text-gray-500 dark:text-gray-400 ml-2">(ya existentes: {importStats.especialidadesExistentes})</span>
                    </li>
                    <li className="flex items-center transition-all duration-200 hover:translate-x-1">
                      <div className="h-1.5 w-1.5 rounded-full bg-blue-500 mr-2"></div>
                      <span className="font-medium">Usuarios:</span>
                      <span className="ml-2">{importStats.usuarios}</span>
                      <span className="text-gray-500 dark:text-gray-400 ml-2">(ya existentes: {importStats.usuariosExistentes})</span>
                    </li>
                    <li className="flex items-center transition-all duration-200 hover:translate-x-1">
                      <div className="h-1.5 w-1.5 rounded-full bg-blue-500 mr-2"></div>
                      <span className="font-medium">Tareas:</span>
                      <span className="ml-2">{importStats.tareas}</span>
                      <span className="text-gray-500 dark:text-gray-400 ml-2">(ya existentes: {importStats.tareasExistentes})</span>
                    </li>
                  </ul>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Export Instructions Card */}
          <div className="bg-gradient-to-r from-blue-50 to-blue-50/80 dark:from-blue-900/20 dark:to-blue-900/10 border border-blue-100 dark:border-blue-800 rounded-xl p-5 mb-6 shadow-sm">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <div className="p-2.5 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                  <Download className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
              <div className="ml-4">
                <h3 className="text-sm font-medium text-blue-800 dark:text-blue-200">
                  Instrucciones de exportación
                </h3>
                <p className="mt-1 text-sm text-blue-700 dark:text-blue-300">
                  Exporta los datos del sistema en diferentes formatos. Puedes exportar todos los datos 
                  en un archivo Excel o exportar por separado en formato CSV.
                </p>
              </div>
            </div>
          </div>

          {/* Export Options */}
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            {/* Excel Export Card */}
            <div className="group bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden transition-all duration-300 hover:shadow-md hover:border-blue-300 dark:hover:border-blue-600 transform hover:-translate-y-1">
              <div className="p-6">
                <div className="flex items-center space-x-4">
                  <div className="bg-gradient-to-br from-blue-500 to-blue-600 dark:from-blue-600 dark:to-blue-700 rounded-lg p-3 shadow-inner transition-all duration-300 group-hover:scale-110">
                    <FileText className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-200">Excel (.xlsx)</h3>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                      Todos los datos en un solo archivo
                    </p>
                  </div>
                </div>
                
                <div className="mt-5">
                  <button
                    onClick={() => exportData('excel')}
                    disabled={isLoading}
                    className="w-full inline-flex justify-center items-center px-4 py-2.5 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-all duration-200 transform group-hover:scale-[1.02] cursor-pointer"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4" />
                        Exportando...
                      </>
                    ) : (
                      <>
                        <Download className="-ml-1 mr-2 h-5 w-5" />
                        Exportar a Excel
                      </>
                    )}
                  </button>
                </div>
                
                <div className="mt-4 text-xs text-gray-500 dark:text-gray-400 flex items-center">
                  <Info className="h-3.5 w-3.5 mr-1 text-blue-500" />
                  Incluye todas las especialidades, usuarios y tareas
                </div>
              </div>
            </div>

            {/* CSV Export Card */}
            <div className="group bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden transition-all duration-300 hover:shadow-md hover:border-green-300 dark:hover:border-green-600 transform hover:-translate-y-1">
              <div className="p-6">
                <div className="flex items-center space-x-4">
                  <div className="bg-gradient-to-br from-green-500 to-green-600 dark:from-green-600 dark:to-green-700 rounded-lg p-3 shadow-inner transition-all duration-300 group-hover:scale-110">
                    <FileText className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors duration-200">CSV (.csv)</h3>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                      Archivos separados por tipo de datos
                    </p>
                  </div>
                </div>
                
                <div className="mt-5">
                  <button
                    onClick={() => exportData('csv')}
                    disabled={isLoading}
                    className="w-full inline-flex justify-center items-center px-4 py-2.5 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-gradient-to-r from-green-600 to-green-500 hover:from-green-700 hover:to-green-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 transition-all duration-200 transform group-hover:scale-[1.02] cursor-pointer"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4" />
                        Exportando...
                      </>
                    ) : (
                      <>
                        <Download className="-ml-1 mr-2 h-5 w-5" />
                        Exportar a CSV
                      </>
                    )}
                  </button>
                </div>
                
                <div className="mt-4 text-xs text-gray-500 dark:text-gray-400 flex items-center">
                  <Info className="h-3.5 w-3.5 mr-1 text-green-500" />
                  Se generarán 3 archivos: especialidades, usuarios y tareas
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DataImportExport;

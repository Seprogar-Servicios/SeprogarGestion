import React, { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../../store';
import { fetchMaterials, createMaterial, updateMaterial, deleteMaterial } from '../../store/slices/materialsSlice';
import { fetchCategoriasMateriales, createCategoriaMaterial } from '../../store/slices/categoriaMaterialSlice';
import {
  Package,
  Plus,
  Search,
  Edit,
  Trash2,
  DollarSign,
  Hash,
  X,
  FolderOpen,
  Download,
  Upload,
} from 'lucide-react';
import type { Material } from '../../types';
import ExcelJS from 'exceljs';

const MaterialManagement: React.FC = () => {
  const dispatch = useAppDispatch();
  const { materials = [], loading } = useAppSelector((state) => state.materials);
  const { categorias } = useAppSelector((state) => state.categoriaMaterial);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null);

  const [formData, setFormData] = useState({
    nombre: '',
    descripcion: '',
    cantidad: '',
    unidad: '',
    precio: 0,
    categoria: '',
    codigo: ''
  });

  useEffect(() => {
    dispatch(fetchMaterials());
    dispatch(fetchCategoriasMateriales());
  }, [dispatch]);

  const handleCreateMaterial = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const materialData = {
        ...formData,
        categoria: formData.categoria || undefined
      };
      await dispatch(createMaterial(materialData)).unwrap();
      setShowCreateModal(false);
      resetForm();
    } catch (error) {
      console.error('Error creating material:', error);
    }
  };

  const handleUpdateMaterial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMaterial) return;

    try {
      const materialData = {
        ...formData,
        categoria: formData.categoria || undefined
      };
      await dispatch(updateMaterial({ id: editingMaterial._id, data: materialData })).unwrap();
      setEditingMaterial(null);
      setShowCreateModal(false);
      resetForm();

      const { toast } = await import('react-toastify');
      toast.success('Material actualizado correctamente', {
        position: "top-right",
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });
    } catch (error) {
      console.error('Error updating material:', error);
    }
  };

  const handleExportMaterials = () => {
    const headers = ['Nombre', 'Descripción', 'Cantidad', 'Unidad', 'Precio', 'Código', 'Categoría'];
    const rows = materials.map(material => [
      material.nombre,
      material.descripcion || '',
      material.cantidad,
      material.unidad,
      material.precio || 0,
      material.codigo || '',
      typeof material.categoria === 'string' ? '' : material.categoria?.nombre || ''
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'materiales.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadTemplate = async () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Plantilla');
    
    const headers = ['Nombre', 'Descripción', 'Cantidad', 'Unidad', 'Precio', 'Código', 'Categoría'];
    
    // Agregar encabezados
    const headerRow = worksheet.addRow(headers);
    
    // Configurar ancho de columnas
    worksheet.getColumn(1).width = 20; // Nombre
    worksheet.getColumn(2).width = 30; // Descripción
    worksheet.getColumn(3).width = 10; // Cantidad
    worksheet.getColumn(4).width = 10; // Unidad
    worksheet.getColumn(5).width = 10; // Precio
    worksheet.getColumn(6).width = 15; // Código
    worksheet.getColumn(7).width = 20; // Categoría
    
    // Aplicar estilos a la fila de encabezados
    headerRow.eachCell((cell) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFFF9500' }
      };
      cell.font = {
        bold: true,
        color: { argb: 'FFFFFFFF' }
      };
      cell.alignment = {
        horizontal: 'center'
      };
    });
    
    // Generar buffer y descargar
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'plantilla_materiales.xlsx');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImportMaterials = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const data = event.target?.result;
        let rows: any[] = [];

        // Detectar si es Excel o CSV
        if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
          const workbook = new ExcelJS.Workbook();
          await workbook.xlsx.load(data as ArrayBuffer);
          const worksheet = workbook.worksheets[0];
          rows = [];
          worksheet.eachRow((row) => {
            const values = row.values as any[];
            rows.push(values.slice(1)); // ExcelJS incluye índice de fila como primer elemento
          });
        } else {
          // CSV
          const text = data as string;
          rows = text.split('\n').map(line => line.split(',').map(v => v.trim().replace(/"/g, '')));
        }

        let successCount = 0;
        let updateCount = 0;
        let errorCount = 0;
        let categoriaCreadaCount = 0;

        // Procesar cada fila (saltando el encabezado)
        for (let i = 1; i < rows.length; i++) {
          const row = rows[i];
          if (!row || row.length === 0 || (row.length === 1 && row[0] === '')) continue;

          const materialData: Partial<Material> = {
            nombre: row[0] || '',
            descripcion: row[1] || '',
            cantidad: String(row[2] || ''),
            unidad: row[3] || '',
            precio: parseFloat(row[4]) || 0,
            codigo: row[5] || '',
          };

          // Validar campos obligatorios
          if (!materialData.nombre || !materialData.cantidad || !materialData.unidad) {
            errorCount++;
            continue;
          }

          // Buscar o crear categoría
          if (row[6]) {
            let categoria = categorias.find(cat => cat.nombre.toLowerCase() === row[6].toLowerCase());
            if (!categoria) {
              // Crear categoría automáticamente
              try {
                const nuevaCategoria = await dispatch(createCategoriaMaterial({
                  nombre: row[6],
                  descripcion: `Categoría creada automáticamente al importar materiales`
                })).unwrap();
                categoria = nuevaCategoria;
                categoriaCreadaCount++;
                // Actualizar la lista de categorías
                await dispatch(fetchCategoriasMateriales());
              } catch (error) {
                console.error('Error creating categoria:', error);
              }
            }
            if (categoria) {
              materialData.categoria = categoria._id;
            }
          }

          // Verificar si el material ya existe (por código o nombre)
          const existingMaterial = materials.find(m => 
            (m.codigo && m.codigo === materialData.codigo) || 
            m.nombre.toLowerCase() === materialData.nombre?.toLowerCase()
          );

          try {
            if (existingMaterial) {
              // Actualizar material existente
              await dispatch(updateMaterial({ 
                id: existingMaterial._id, 
                data: materialData 
              })).unwrap();
              updateCount++;
            } else {
              // Crear nuevo material
              await dispatch(createMaterial(materialData)).unwrap();
              successCount++;
            }
          } catch (error) {
            errorCount++;
          }
        }

        const { toast } = await import('react-toastify');
        toast.success(
          `Importación completada:\n` +
          `• ${successCount} materiales creados\n` +
          `• ${updateCount} materiales actualizados\n` +
          `• ${categoriaCreadaCount} categorías creadas\n` +
          `• ${errorCount} errores`,
          {
            position: "top-right",
            autoClose: 5000,
          }
        );

        await dispatch(fetchMaterials());
      } catch (error) {
        console.error('Error processing file:', error);
        const { toast } = await import('react-toastify');
        toast.error('Error al procesar el archivo. Por favor, verifica el formato.', {
          position: "top-right",
          autoClose: 5000,
        });
      }
    };

    if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
      reader.readAsArrayBuffer(file);
    } else {
      reader.readAsText(file);
    }
  };

  const handleDeleteMaterial = async (materialId: string) => {
    const CustomToast = ({ closeToast }: { closeToast?: () => void }) => (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden w-full">
        <div className="p-6">
          <div className="flex items-start">
            <div className="flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400">
              <Trash2 className="h-6 w-6" />
            </div>
            <div className="ml-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                Eliminar material
              </h3>
              <div className="mt-2">
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  ¿Estás seguro de que deseas eliminar este material? Esta
                  acción no se puede deshacer.
                </p>
              </div>
            </div>
          </div>
          <div className="mt-6 flex justify-end space-x-3">
            <button
              type="button"
              onClick={closeToast}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-150"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={async () => {
                closeToast?.();
                try {
                  await dispatch(deleteMaterial(materialId)).unwrap();
                  await dispatch(fetchMaterials());
                } catch (error) {
                  console.error('Error deleting material:', error);
                }
              }}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors duration-150"
            >
              Eliminar
            </button>
          </div>
        </div>
      </div>
    );

    const { toast } = await import('react-toastify');
    toast(<CustomToast />, {
      position: "top-center",
      autoClose: false,
      closeButton: false,
      closeOnClick: false,
      draggable: false,
      className: '!bg-transparent !p-0 !shadow-none',
      bodyClassName: '!p-0',
    });
  };

  const resetForm = () => {
    setFormData({
      nombre: '',
      descripcion: '',
      cantidad: '',
      unidad: '',
      precio: 0,
      categoria: '',
      codigo: ''
    });
  };

  const openEditModal = (material: Material) => {
    setEditingMaterial(material);
    setFormData({
      nombre: material.nombre,
      descripcion: material.descripcion || '',
      cantidad: material.cantidad || '',
      unidad: material.unidad,
      precio: material.precio || 0,
      categoria: typeof material.categoria === 'string' ? material.categoria : material.categoria?._id || '',
      codigo: material.codigo || ''
    });
    setShowCreateModal(true);
  };

  const filteredMaterials = materials.filter(material =>
    material.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    material.descripcion?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    material.unidad.toLowerCase().includes(searchTerm.toLowerCase()) ||
    material.codigo?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border-t-4 border-blue-500 p-6 mb-6 animate-fadeIn">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center">
            <div className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded-lg mr-4">
              <Package className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Gestión de Materiales</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 flex items-center">
                Administra el inventario de materiales del sistema
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={handleDownloadTemplate}
              className="inline-flex items-center px-4 py-2.5 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-lg shadow-sm text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200 cursor-pointer"
              title="Descargar plantilla"
            >
              <Download className="h-4 w-4 mr-2" />
              Plantilla
            </button>
            <button
              onClick={handleExportMaterials}
              className="inline-flex items-center px-4 py-2.5 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-lg shadow-sm text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200 cursor-pointer"
              title="Exportar materiales"
            >
              <Download className="h-4 w-4 mr-2" />
              Exportar
            </button>
            <label className="inline-flex items-center px-4 py-2.5 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-lg shadow-sm text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200 cursor-pointer"
              title="Importar materiales"
            >
              <Upload className="h-4 w-4 mr-2" />
              Importar
              <input
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={handleImportMaterials}
                className="hidden"
              />
            </label>
            <button
              onClick={() => {
                setEditingMaterial(null);
                resetForm();
                setShowCreateModal(true);
              }}
              className="inline-flex items-center px-4 py-2.5 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200 cursor-pointer"
            >
              <Plus className="h-4 w-4 mr-2" />
              Nuevo Material
            </button>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border-t-4 border-blue-500 p-6 mb-6">
        <div className="flex flex-col md:flex-row gap-4 items-end">
          <div className="flex-1 w-full">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Buscar materiales
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Buscar por nombre, descripción o unidad..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Materials Grid */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {loading ? (
          [...Array(6)].map((_, i) => (
            <div key={i} className="bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden border border-gray-200 dark:border-gray-700">
              <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700 bg-blue-50 dark:bg-blue-900/20">
                <div className="animate-pulse h-6 w-3/4 bg-gray-200 dark:bg-gray-600 rounded"></div>
              </div>
              <div className="p-5">
                <div className="animate-pulse h-4 w-full bg-gray-200 dark:bg-gray-700 rounded mb-3"></div>
                <div className="animate-pulse h-3 w-2/3 bg-gray-200 dark:bg-gray-700 rounded"></div>
              </div>
            </div>
          ))
        ) : filteredMaterials.length > 0 ? (
          filteredMaterials.map((material) => (
            <div key={material._id} className="bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden border border-gray-200 dark:border-gray-700 hover:shadow-lg hover:scale-[1.02] transition-all duration-300 transform">
              <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700 bg-blue-50 dark:bg-blue-900/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    {material.codigo && (
                      <span className="text-sm text-gray-600 dark:text-gray-300 font-mono bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                        {material.codigo}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => openEditModal(material)}
                      className="p-1.5 text-gray-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-md hover:text-blue-600 dark:hover:text-blue-400 transition-colors duration-200 cursor-pointer"
                      title="Editar material"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteMaterial(material._id)}
                      className="p-1.5 text-gray-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md hover:text-red-600 dark:hover:text-red-400 transition-colors duration-200 cursor-pointer"
                      title="Eliminar material"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
              <div className="p-5">
                <div className="flex items-center mb-4">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg mr-3">
                    <Package className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
                    {material.nombre}
                  </span>
                </div>

                {material.descripcion ? (
                  <p className="text-gray-600 dark:text-gray-300 text-sm mb-4">
                    {material.descripcion}
                  </p>
                ) : (
                  <p className="text-gray-400 dark:text-gray-500 text-sm italic mb-4">
                    Sin descripción
                  </p>
                )}
                
                <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400 mb-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <Hash className="h-4 w-4 mr-2" />
                      Cantidad:
                    </div>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {material.cantidad} {material.unidad}
                    </span>
                  </div>

                  {material.precio && material.precio > 0 && (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <DollarSign className="h-4 w-4 mr-2" />
                        Precio:
                      </div>
                      <span className="font-medium text-gray-900 dark:text-white">
                        ${material.precio.toFixed(2)}
                      </span>
                    </div>
                  )}
                </div>
                
                <div className="pt-3 mt-4 border-t border-gray-100 dark:border-gray-700">
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    <span className="font-medium">Actualizado:</span>{' '}
                    {new Date(material.updatedAt).toLocaleDateString('es-AR', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                </div>
              </div>
            </div>
          ))
        ) : null}
      </div>

      {filteredMaterials.length === 0 && !loading && (
        <div className="col-span-full">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden border border-gray-200 dark:border-gray-700 p-8 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-blue-50 dark:bg-blue-900/20">
              <Package className="h-8 w-8 text-blue-600 dark:text-blue-400" />
            </div>
            <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">
              {searchTerm ? 'No se encontraron materiales' : 'No hay materiales registrados'}
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {searchTerm 
                ? 'No hay materiales que coincidan con tu búsqueda. Intenta con otros términos.'
                : 'Comienza creando tu primer material para administrar el inventario.'}
            </p>
            <div className="mt-6">
              <button
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900 transition-all duration-200 cursor-pointer"
              >
                <Plus className="-ml-1 mr-2 h-5 w-5" />
                {searchTerm ? 'Limpiar búsqueda' : 'Nuevo material'}
              </button>
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="ml-3 inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600 dark:focus:ring-offset-gray-900 transition-colors"
                >
                  Limpiar búsqueda
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Create/Edit Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6 bg-gradient-to-r from-blue-500 to-purple-600 p-4 -mx-6 -mt-6 rounded-t-xl">
                <div className="flex items-center space-x-3">
                  <div className="p-2 rounded-full bg-white/20 backdrop-blur-sm">
                    {editingMaterial ? (
                      <Edit className="h-5 w-5 text-white" />
                    ) : (
                      <Plus className="h-5 w-5 text-white" />
                    )}
                  </div>
                  <h3 className="text-xl font-bold text-white">
                    {editingMaterial ? 'Editar Material' : 'Nuevo Material'}
                  </h3>
                </div>
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    setEditingMaterial(null);
                    resetForm();
                  }}
                  className="text-white hover:text-gray-200 focus:outline-none"
                  aria-label="Cerrar"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              
              <form onSubmit={editingMaterial ? handleUpdateMaterial : handleCreateMaterial} className="space-y-4">
                <div className="relative">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Nombre *
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <input
                      type="text"
                      required
                      placeholder="ej: Cemento, Arena, Ladrillos"
                      value={formData.nombre}
                      onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                      className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-colors"
                    />
                  </div>
                </div>

                <div className="relative">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Código (opcional)
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Hash className="h-4 w-4 text-gray-400" />
                    </div>
                    <input
                      type="text"
                      placeholder="ej: #CEM-001"
                      value={formData.codigo}
                      onChange={(e) => setFormData({ ...formData, codigo: e.target.value })}
                      className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-colors"
                    />
                  </div>
                </div>

                <div className="relative">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Descripción
                  </label>
                  <div className="relative">
                    <div className="absolute top-3 left-0 pl-3 flex items-start pointer-events-none">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
                      </svg>
                    </div>
                    <textarea
                      value={formData.descripcion}
                      onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                      rows={4}
                      placeholder="Describe el material y sus características..."
                      className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-colors"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="relative">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Cantidad *
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Hash className="h-4 w-4 text-gray-400" />
                      </div>
                      <input
                        type="text"
                        required
                        placeholder="ej: 100, 50 kg, 2 cajas"
                        value={formData.cantidad}
                        onChange={(e) => setFormData({ ...formData, cantidad: e.target.value })}
                        className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-colors"
                      />
                    </div>
                  </div>

                  <div className="relative">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Unidad *
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                        </svg>
                      </div>
                      <input
                        type="text"
                        required
                        placeholder="kg, m, unidades"
                        value={formData.unidad}
                        onChange={(e) => setFormData({ ...formData, unidad: e.target.value })}
                        className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-colors"
                      />
                    </div>
                  </div>
                </div>

                <div className="relative">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Categoría (opcional)
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <FolderOpen className="h-4 w-4 text-gray-400" />
                    </div>
                    <select
                      value={formData.categoria}
                      onChange={(e) => setFormData({ ...formData, categoria: e.target.value })}
                      className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-colors"
                    >
                      <option value="">Sin categoría</option>
                      {categorias.map((cat) => (
                        <option key={cat._id} value={cat._id}>
                          {cat.nombre}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="relative">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Precio (opcional)
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <DollarSign className="h-4 w-4 text-gray-400" />
                    </div>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder=""
                      value={formData.precio === 0 ? '' : formData.precio}
                      onChange={(e) => setFormData({ ...formData, precio: parseFloat(e.target.value) || 0 })}
                      className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-colors"
                    />
                  </div>
                </div>

                <div className="flex justify-end space-x-3 pt-5">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateModal(false);
                      setEditingMaterial(null);
                      resetForm();
                    }}
                    className="px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 flex items-center cursor-pointer"
                  >
                    {editingMaterial ? (
                      <>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Actualizar
                      </>
                    ) : (
                      <>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                        Crear Material
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MaterialManagement;

import React, { useEffect, useState } from 'react';
import api from '../../config/api';
import { showSuccess, showError } from '../../utils/toastUtils';
import { preventEnterSubmit } from '../../utils/formGuards';
import { Package, Plus, Upload, Download, CheckCircle, XCircle, Clock, Eye, X, Trash } from 'lucide-react';
import type { MaterialTarea, Material } from '../../types';
import { isAdminRole } from '../../utils/roles';

interface TaskMaterialsProps {
  taskId: string;
  userRole: string;
  userId: string;
  taskTechnicians: any[];
}

const TaskMaterials: React.FC<TaskMaterialsProps> = ({ taskId, userRole, userId, taskTechnicians }) => {
  const isAdmin = isAdminRole(userRole);
  const [materiales, setMateriales] = useState<MaterialTarea[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showTecnicoModal, setShowTecnicoModal] = useState(false);
  const [showMultiplesModal, setShowMultiplesModal] = useState(false);
  const [showComprobanteModal, setShowComprobanteModal] = useState(false);
  const [comprobanteUrl, setComprobanteUrl] = useState('');
  const [comprobanteType, setComprobanteType] = useState<'image' | 'pdf' | 'other'>('other');
  const [materialesList, setMaterialesList] = useState<Material[]>([]);
  const [categoriasList, setCategoriasList] = useState<any[]>([]);
  const [selectedMaterial, setSelectedMaterial] = useState('');
  const [cantidad, setCantidad] = useState(1);
  const [observaciones, setObservaciones] = useState('');
  const [selectedMateriales, setSelectedMateriales] = useState<{ [key: string]: { checked: boolean; cantidad: number } }>({});
  
  // Filtros para el modal de múltiples materiales
  const [filterNombre, setFilterNombre] = useState('');
  const [filterCodigo, setFilterCodigo] = useState('');
  const [filterCategoria, setFilterCategoria] = useState('');

  // Filtrar materiales según los filtros aplicados
  const filteredMaterialesList = materialesList.filter(material => {
    const matchNombre = !filterNombre || material.nombre.toLowerCase().includes(filterNombre.toLowerCase());
    const matchCodigo = !filterCodigo || (material.codigo && material.codigo.toLowerCase().includes(filterCodigo.toLowerCase()));
    
    let matchCategoria = !filterCategoria;
    if (filterCategoria) {
      if (typeof material.categoria === 'object' && material.categoria?.nombre) {
        matchCategoria = material.categoria.nombre.toLowerCase() === filterCategoria.toLowerCase();
      } else if (typeof material.categoria === 'string') {
        // Si categoria es un string (ObjectId), buscar el nombre en la lista de categorías
        const categoriaEncontrada = categoriasList.find(cat => cat._id === material.categoria);
        matchCategoria = categoriaEncontrada?.nombre?.toLowerCase() === filterCategoria.toLowerCase();
      }
    }
    
    return matchNombre && matchCodigo && matchCategoria;
  });

  // Obtener categorías únicas para el filtro (desde la lista de categorías)
  const categoriasUnicas = categoriasList.map(cat => cat.nombre);

  // Form for technician
  const [tecnicoForm, setTecnicoForm] = useState({
    nombre: '',
    descripcion: '',
    cantidad: 1,
    unidad: 'un',
    precio: 0,
    observaciones: '',
    comprobante: null as File | null
  });

  useEffect(() => {
    fetchMateriales();
    if (isAdmin || userRole === 'usuario') {
      fetchMaterialesList();
      fetchCategorias();
    }
  }, [taskId]);

  const fetchCategorias = async () => {
    try {
      const response = await api.get('/categorias-materiales');
      setCategoriasList(response.data.data);
    } catch (error) {
      console.error('Error fetching categorias:', error);
    }
  };

  const fetchMateriales = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/tarea-materiales/tarea/${taskId}`);
      setMateriales(response.data.data);
    } catch (error) {
      console.error('Error fetching materiales:', error);
      showError('Error al cargar materiales');
    } finally {
      setLoading(false);
    }
  };

  const fetchMaterialesList = async () => {
    try {
      const response = await api.get('/materiales');
      setMaterialesList(response.data.data);
    } catch (error) {
      console.error('Error fetching materiales list:', error);
    }
  };

  const handleAddMaterialAdmin = async (e: React.FormEvent) => {
    e.preventDefault();

    // Verificar si el material ya existe en la tarea
    const materialExistente = materiales.find(m => m.material?._id === selectedMaterial);
    if (materialExistente) {
      showError('Este material ya está agregado a la tarea. No se puede agregar más cantidad del mismo material.');
      return;
    }

    // Verificar stock disponible del material
    const materialSeleccionado = materialesList.find(m => m._id === selectedMaterial);
    const stockDisponible = parseInt(materialSeleccionado?.cantidad || '0');
    if (materialSeleccionado && cantidad > stockDisponible) {
      showError(`Stock insuficiente. El material tiene ${stockDisponible} ${materialSeleccionado.unidad} disponibles y estás intentando agregar ${cantidad}.`);
      return;
    }

    try {
      await api.post(`/tarea-materiales/tarea/${taskId}/admin`, {
        materialId: selectedMaterial,
        cantidad,
        observaciones
      });
      showSuccess('Material agregado exitosamente');
      setShowAddModal(false);
      setSelectedMaterial('');
      setCantidad(1);
      setObservaciones('');
      fetchMateriales();
    } catch (error) {
      console.error('Error adding material:', error);
      showError('Error al agregar material');
    }
  };

  const handleAddMultiplesMateriales = async () => {
    const materialesToAdd = Object.entries(selectedMateriales)
      .filter(([_, data]) => data.checked && data.cantidad > 0)
      .map(([materialId, data]) => ({
        materialId,
        cantidad: data.cantidad,
        observaciones: ''
      }));

    if (materialesToAdd.length === 0) {
      showError('Debes seleccionar al menos un material');
      return;
    }

    // Validar stock para cada material
    const errores: string[] = [];
    for (const item of materialesToAdd) {
      const material = materialesList.find(m => m._id === item.materialId);
      if (!material) {
        errores.push(`Material no encontrado: ${item.materialId}`);
        continue;
      }

      const stockDisponible = parseInt(material.cantidad || '0');
      if (item.cantidad > stockDisponible) {
        errores.push(`Stock insuficiente para ${material.nombre}: ${stockDisponible} disponibles, ${item.cantidad} solicitados`);
      }

      // Verificar si ya existe en la tarea
      const yaExiste = materiales.find(m => m.material?._id === item.materialId);
      if (yaExiste) {
        errores.push(`El material ${material.nombre} ya está en la tarea`);
      }
    }

    if (errores.length > 0) {
      showError(errores.join('. '));
      return;
    }

    try {
      const endpoint = isAdmin 
        ? `/tarea-materiales/tarea/${taskId}/admin/multiples`
        : `/tarea-materiales/tarea/${taskId}/tecnico/multiples`;
      
      const response = await api.post(endpoint, {
        materiales: materialesToAdd
      });

      showSuccess(response.data.message);
      if (response.data.errores) {
        response.data.errores.forEach((err: string) => showError(err));
      }

      setShowMultiplesModal(false);
      setSelectedMateriales({});
      fetchMateriales();
    } catch (error) {
      console.error('Error adding multiple materials:', error);
      showError('Error al agregar múltiples materiales');
    }
  };

  const handleToggleMaterial = (materialId: string) => {
    setSelectedMateriales(prev => ({
      ...prev,
      [materialId]: {
        checked: !prev[materialId]?.checked,
        cantidad: prev[materialId]?.cantidad || 1
      }
    }));
  };

  const handleCantidadChange = (materialId: string, cantidad: number) => {
    setSelectedMateriales(prev => ({
      ...prev,
      [materialId]: {
        ...prev[materialId],
        cantidad: cantidad,
        checked: prev[materialId]?.checked || cantidad > 0
      }
    }));
  };

  const handleAddMaterialTecnico = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tecnicoForm.comprobante) {
      showError('Debe subir un comprobante');
      return;
    }

    const formData = new FormData();
    formData.append('nombre', tecnicoForm.nombre);
    formData.append('descripcion', tecnicoForm.descripcion);
    formData.append('cantidad', tecnicoForm.cantidad.toString());
    formData.append('unidad', tecnicoForm.unidad);
    formData.append('precio', tecnicoForm.precio.toString());
    formData.append('observaciones', tecnicoForm.observaciones);
    formData.append('comprobante', tecnicoForm.comprobante);

    try {
      await api.post(`/tarea-materiales/tarea/${taskId}/tecnico`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      showSuccess('Material agregado exitosamente, pendiente de validación');
      setShowTecnicoModal(false);
      setTecnicoForm({
        nombre: '',
        descripcion: '',
        cantidad: 1,
        unidad: 'un',
        precio: 0,
        observaciones: '',
        comprobante: null
      });
      fetchMateriales();
    } catch (error) {
      console.error('Error adding material técnico:', error);
      showError('Error al agregar material');
    }
  };

  const handleAddMaterialTecnicoDesdeLista = async (e: React.FormEvent) => {
    e.preventDefault();

    // Verificar si el material ya existe en la tarea
    const materialExistente = materiales.find(m => m.material?._id === selectedMaterial);
    if (materialExistente) {
      showError('Este material ya está agregado a la tarea. No se puede agregar más cantidad del mismo material.');
      return;
    }

    // Verificar stock disponible del material
    const materialSeleccionado = materialesList.find(m => m._id === selectedMaterial);
    const stockDisponible = parseInt(materialSeleccionado?.cantidad || '0');
    if (materialSeleccionado && cantidad > stockDisponible) {
      showError(`Stock insuficiente. El material tiene ${stockDisponible} ${materialSeleccionado.unidad} disponibles y estás intentando agregar ${cantidad}.`);
      return;
    }

    try {
      await api.post(`/tarea-materiales/tarea/${taskId}/tecnico/lista`, {
        materialId: selectedMaterial,
        cantidad,
        observaciones
      });
      showSuccess('Material agregado exitosamente desde el stock');
      setShowAddModal(false);
      setSelectedMaterial('');
      setCantidad(1);
      setObservaciones('');
      fetchMateriales();
    } catch (error) {
      console.error('Error adding material técnico desde lista:', error);
      showError('Error al agregar material');
    }
  };

  const handleValidarComprobante = async (materialId: string, estado: 'aprobado' | 'rechazado') => {
    try {
      await api.put(`/tarea-materiales/tarea/${taskId}/${materialId}/validar`, {
        estadoValidacion: estado
      });
      showSuccess(`Comprobante ${estado} exitosamente`);
      fetchMateriales();
    } catch (error) {
      console.error('Error validando comprobante:', error);
      showError('Error al validar comprobante');
    }
  };

  const handleDescargarComprobante = async (materialId: string, tecnicoNombre?: string) => {
    try {
      const response = await api.get(`/tarea-materiales/tarea/${taskId}/${materialId}/descargar`, {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;

      // Generar nombre del archivo: Comprobante-Material + nombre técnico + fecha
      const fecha = new Date().toISOString().split('T')[0];
      const tecnico = tecnicoNombre || 'tecnico';
      const nombreArchivo = `Comprobante-Material-${tecnico}-${fecha}`;

      link.setAttribute('download', nombreArchivo);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Error descargando comprobante:', error);
      showError('Error al descargar comprobante');
    }
  };

  const handleVerComprobante = async (materialId: string, fileName?: string, mimeType?: string) => {
    try {
      const response = await api.get(`/tarea-materiales/tarea/${taskId}/${materialId}/descargar`, {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));

      // Detectar tipo de archivo
      const type = mimeType || response.data.type || '';
      if (type.startsWith('image/')) {
        setComprobanteType('image');
        setComprobanteUrl(url);
        setShowComprobanteModal(true);
      } else if (type === 'application/pdf') {
        setComprobanteType('pdf');
        setComprobanteUrl(url);
        setShowComprobanteModal(true);
      } else {
        // Para otros archivos, abrir en nueva pestaña
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', fileName || 'comprobante');
        document.body.appendChild(link);
        link.click();
        link.remove();
      }
    } catch (error) {
      console.error('Error al ver comprobante:', error);
      showError('Error al ver comprobante');
    }
  };

  const handleEliminarMaterial = async (materialId: string, materialNombre: string) => {
    const confirmado = window.confirm(
      `¿Estás seguro de que deseas eliminar el material "${materialNombre}"?\n\n` +
      `Si el material fue tomado del stock, la cantidad será devuelta automáticamente.`
    );
    
    if (!confirmado) {
      return;
    }

    try {
      await api.delete(`/tarea-materiales/tarea/${taskId}/${materialId}`);
      showSuccess('Material eliminado exitosamente');
      fetchMateriales();
    } catch (error) {
      console.error('Error eliminando material:', error);
      showError('Error al eliminar material');
    }
  };

  const isTecnicoAsignado = taskTechnicians.some((t: any) => t._id === userId);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
          <Package className="h-5 w-5 mr-2 text-blue-600 dark:text-blue-400" />
          Materiales de la Tarea
        </h3>
        <div className="flex gap-2">
          {isAdmin && (
            <>
              <button
                onClick={() => setShowAddModal(true)}
                className="inline-flex items-center px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm"
              >
                <Plus className="h-4 w-4 mr-2" />
                Agregar Material
              </button>
              <button
                onClick={() => setShowMultiplesModal(true)}
                className="inline-flex items-center px-3 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 transition-colors text-sm"
              >
                <Plus className="h-4 w-4 mr-2" />
                Agregar Múltiples
              </button>
            </>
          )}
          {userRole === 'usuario' && isTecnicoAsignado && (
            <>
              <button
                onClick={() => setShowAddModal(true)}
                className="inline-flex items-center px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm"
              >
                <Plus className="h-4 w-4 mr-2" />
                Agregar del Stock
              </button>
              <button
                onClick={() => setShowMultiplesModal(true)}
                className="inline-flex items-center px-3 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 transition-colors text-sm"
              >
                <Plus className="h-4 w-4 mr-2" />
                Agregar Múltiples
              </button>
              <button
                onClick={() => setShowTecnicoModal(true)}
                className="inline-flex items-center px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors text-sm"
              >
                <Upload className="h-4 w-4 mr-2" />
                Agregar Manual
              </button>
            </>
          )}
        </div>
      </div>

      {/* Materiales List */}
      {materiales.length === 0 ? (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <Package className="h-12 w-12 mx-auto mb-2 text-gray-300 dark:text-gray-600" />
          <p>No hay materiales agregados a esta tarea</p>
        </div>
      ) : (
        <div className="space-y-3">
          {materiales.map((material) => (
            <div
              key={material._id}
              className={`bg-white dark:bg-gray-800 rounded-lg shadow border ${
                material.agregadoPor === 'admin'
                  ? 'border-blue-200 dark:border-blue-800'
                  : 'border-green-200 dark:border-green-800'
              } p-4`}
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      material.agregadoPor === 'admin'
                        ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300'
                        : 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                    }`}>
                      {material.agregadoPor === 'admin' ? 'Admin' : 'Técnico'}
                    </span>
                    {material.origen && (
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        material.origen === 'stock'
                          ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300'
                          : 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300'
                      }`}>
                        {material.origen === 'stock' ? 'Stock' : 'Excedente'}
                      </span>
                    )}
                    {material.agregadoPor === 'tecnico' && (
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        material.estadoValidacion === 'aprobado'
                          ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                          : material.estadoValidacion === 'rechazado'
                          ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300'
                          : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300'
                      }`}>
                        {material.estadoValidacion === 'aprobado' && <CheckCircle className="h-3 w-3 inline mr-1" />}
                        {material.estadoValidacion === 'rechazado' && <XCircle className="h-3 w-3 inline mr-1" />}
                        {material.estadoValidacion === 'pendiente' && <Clock className="h-3 w-3 inline mr-1" />}
                        {material.estadoValidacion}
                      </span>
                    )}
                  </div>
                  <h4 className="font-medium text-gray-900 dark:text-white">{material.nombre}</h4>
                  {material.descripcion && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{material.descripcion}</p>
                  )}
                  <div className="flex items-center gap-4 mt-2 text-sm text-gray-600 dark:text-gray-400">
                    <span>Cantidad: {material.cantidad} {material.unidad}</span>
                    <span>Precio: ${material.precio}</span>
                    <span className="font-medium">Total: ${material.cantidad * material.precio}</span>
                  </div>
                  {material.observaciones && (
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 italic">{material.observaciones}</p>
                  )}
                  {material.tecnico && (
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      Agregado por: {material.tecnico.nombre}
                    </p>
                  )}
                </div>
                <div className="flex gap-2 ml-4">
                  {material.comprobante && isAdmin && (
                    <>
                      <button
                        onClick={() => handleVerComprobante(material._id, material.comprobante?.originalName, material.comprobante?.mimetype)}
                        className="p-2 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                        title="Ver comprobante"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDescargarComprobante(material._id, material.tecnico?.nombre)}
                        className="p-2 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                        title="Descargar comprobante"
                      >
                        <Download className="h-4 w-4" />
                      </button>
                      {material.estadoValidacion === 'pendiente' && (
                        <>
                          <button
                            onClick={() => handleValidarComprobante(material._id, 'aprobado')}
                            className="p-2 text-green-600 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/30 rounded transition-colors"
                            title="Aprobar"
                          >
                            <CheckCircle className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleValidarComprobante(material._id, 'rechazado')}
                            className="p-2 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 rounded transition-colors"
                            title="Rechazar"
                          >
                            <XCircle className="h-4 w-4" />
                          </button>
                        </>
                      )}
                    </>
                  )}
                  {(isAdmin || (userRole === 'usuario' && material.tecnico?._id === userId)) && (
                    <button
                      onClick={() => handleEliminarMaterial(material._id, material.nombre)}
                      className="p-2 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 rounded transition-colors"
                      title="Eliminar"
                    >
                      <Trash className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Admin/Técnico Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-gray-900/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                {isAdmin ? 'Agregar Material (Admin)' : 'Agregar Material del Stock (Técnico)'}
              </h3>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              <form onSubmit={isAdmin ? handleAddMaterialAdmin : handleAddMaterialTecnicoDesdeLista} onKeyDown={preventEnterSubmit}>
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Material
                    </label>
                    <select
                      value={selectedMaterial}
                      onChange={(e) => setSelectedMaterial(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-4 py-3 text-base"
                      required
                    >
                      <option value="">Seleccionar material</option>
                      {materialesList.map((m) => (
                        <option key={m._id} value={m._id}>
                          {m.nombre} - ${m.precio} - {m.descripcion}
                        </option>
                      ))}
                    </select>
                  </div>

                  {selectedMaterial && (
                    <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                      <p className="text-sm text-blue-800 dark:text-blue-300">
                        <strong>Material seleccionado:</strong> {materialesList.find(m => m._id === selectedMaterial)?.nombre}
                      </p>
                      <p className="text-sm text-blue-800 dark:text-blue-300">
                        <strong>Precio unitario:</strong> ${materialesList.find(m => m._id === selectedMaterial)?.precio}
                      </p>
                      <p className="text-sm text-blue-800 dark:text-blue-300">
                        <strong>Stock disponible:</strong> {materialesList.find(m => m._id === selectedMaterial)?.cantidad} {materialesList.find(m => m._id === selectedMaterial)?.unidad}
                      </p>
                      {materialesList.find(m => m._id === selectedMaterial)?.descripcion && (
                        <p className="text-sm text-blue-800 dark:text-blue-300 mt-1">
                          <strong>Descripción:</strong> {materialesList.find(m => m._id === selectedMaterial)?.descripcion}
                        </p>
                      )}
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Cantidad
                    </label>
                    <input
                      type="number"
                      value={cantidad}
                      onChange={(e) => setCantidad(parseInt(e.target.value))}
                      min="1"
                      className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-4 py-3 text-base"
                      required
                    />
                    {selectedMaterial && (
                      <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                        Total: ${cantidad * (materialesList.find(m => m._id === selectedMaterial)?.precio || 0)}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Observaciones
                    </label>
                    <textarea
                      value={observaciones}
                      onChange={(e) => setObservaciones(e.target.value)}
                      rows={3}
                      className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-4 py-3 text-base"
                      placeholder="Agrega observaciones sobre este material..."
                    />
                  </div>
                </div>
              </form>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="px-6 py-3 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 text-base font-medium"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-base font-medium"
              >
                Agregar Material
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Técnico Add Modal */}
      {showTecnicoModal && (
        <div className="fixed inset-0 bg-gray-900/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Agregar Material Manual (Técnico)
            </h3>
            <form onSubmit={handleAddMaterialTecnico} onKeyDown={preventEnterSubmit}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Nombre del Material *
                  </label>
                  <input
                    type="text"
                    value={tecnicoForm.nombre}
                    onChange={(e) => setTecnicoForm({...tecnicoForm, nombre: e.target.value})}
                    className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Descripción
                  </label>
                  <textarea
                    value={tecnicoForm.descripcion}
                    onChange={(e) => setTecnicoForm({...tecnicoForm, descripcion: e.target.value})}
                    rows={2}
                    className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Cantidad *
                    </label>
                    <input
                      type="number"
                      value={tecnicoForm.cantidad}
                      onChange={(e) => setTecnicoForm({...tecnicoForm, cantidad: parseInt(e.target.value)})}
                      min="1"
                      className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Unidad
                    </label>
                    <input
                      type="text"
                      value={tecnicoForm.unidad}
                      onChange={(e) => setTecnicoForm({...tecnicoForm, unidad: e.target.value})}
                      className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Precio *
                  </label>
                  <input
                    type="number"
                    value={tecnicoForm.precio}
                    onChange={(e) => setTecnicoForm({...tecnicoForm, precio: parseFloat(e.target.value)})}
                    min="0"
                    step="0.01"
                    className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Comprobante *
                  </label>
                  <input
                    type="file"
                    onChange={(e) => setTecnicoForm({...tecnicoForm, comprobante: e.target.files?.[0] || null})}
                    accept=".jpg,.jpeg,.png,.pdf"
                    className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Observaciones
                  </label>
                  <textarea
                    value={tecnicoForm.observaciones}
                    onChange={(e) => setTecnicoForm({...tecnicoForm, observaciones: e.target.value})}
                    rows={2}
                    className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowTecnicoModal(false)}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                >
                  Agregar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Multiple Materials Modal */}
      {showMultiplesModal && (
        <div className="fixed inset-0 bg-gray-900/70 backdrop-blur-sm z-[99999] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-5xl w-full max-h-[85vh] overflow-hidden flex flex-col relative mt-95">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                {isAdmin ? 'Agregar Múltiples Materiales (Admin)' : 'Agregar Múltiples Materiales (Técnico)'}
              </h3>
            </div>
            <div className="flex-1 overflow-y-auto p-6 scroll-smooth">
              <div className="space-y-4">
                {/* Filtros - Sticky */}
                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 space-y-3 sticky top-0 z-10 shadow-sm">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Filtrar por nombre
                      </label>
                      <input
                        type="text"
                        value={filterNombre}
                        onChange={(e) => setFilterNombre(e.target.value)}
                        placeholder="Nombre del material..."
                        className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Filtrar por código
                      </label>
                      <input
                        type="text"
                        value={filterCodigo}
                        onChange={(e) => setFilterCodigo(e.target.value)}
                        placeholder="Código..."
                        className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Filtrar por categoría
                      </label>
                      <select
                        value={filterCategoria}
                        onChange={(e) => setFilterCategoria(e.target.value)}
                        className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2 text-sm"
                      >
                        <option value="">Todas las categorías</option>
                        {categoriasUnicas.map(cat => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  {(filterNombre || filterCodigo || filterCategoria) && (
                    <button
                      onClick={() => {
                        setFilterNombre('');
                        setFilterCodigo('');
                        setFilterCategoria('');
                      }}
                      className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      Limpiar filtros
                    </button>
                  )}
                </div>

                {filteredMaterialesList.length === 0 ? (
                  <p className="text-gray-500 dark:text-gray-400 text-center py-8">
                    {materialesList.length === 0 
                      ? 'No hay materiales disponibles en la base de datos'
                      : 'No se encontraron materiales con los filtros aplicados'}
                  </p>
                ) : (
                  <div className="space-y-2">
                    {filteredMaterialesList.map((material) => {
                      const stockDisponible = parseInt(material.cantidad || '0');
                      const isSelected = selectedMateriales[material._id]?.checked || false;
                      const cantidad = selectedMateriales[material._id]?.cantidad || 1;

                      return (
                        <div
                          key={material._id}
                          className={`flex items-center gap-4 p-4 rounded-lg border ${
                            isSelected
                              ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20'
                              : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                          } transition-colors`}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleMaterial(material._id)}
                            className="h-5 w-5 text-orange-600 rounded border-gray-300 focus:ring-orange-500"
                          />
                          <div className="flex-1">
                            <p className="font-medium text-gray-900 dark:text-white">{material.nombre}</p>
                            {material.descripcion && (
                              <p className="text-sm text-gray-600 dark:text-gray-400">{material.descripcion}</p>
                            )}
                            <div className="flex items-center gap-4 mt-1 text-sm text-gray-500 dark:text-gray-400">
                              {material.codigo && <span>Código: {material.codigo}</span>}
                              <span>Precio: ${material.precio}</span>
                              <span>Stock: {stockDisponible} {material.unidad}</span>
                              {typeof material.categoria === 'object' && material.categoria?.nombre && (
                                <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded text-xs">
                                  {material.categoria.nombre}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <label className="text-sm text-gray-700 dark:text-gray-300">Cantidad:</label>
                            <input
                              type="number"
                              min="1"
                              max={stockDisponible}
                              value={isSelected ? cantidad : ''}
                              onChange={(e) => handleCantidadChange(material._id, parseInt(e.target.value) || 1)}
                              disabled={!isSelected}
                              className="w-20 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2 text-sm"
                            />
                            <span className="text-sm text-gray-500 dark:text-gray-400">{material.unidad}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {Object.values(selectedMateriales).filter(m => m.checked).length} materiales seleccionados
              </p>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowMultiplesModal(false);
                    setSelectedMateriales({});
                    setFilterNombre('');
                    setFilterCodigo('');
                    setFilterCategoria('');
                  }}
                  className="px-6 py-3 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 text-base font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleAddMultiplesMateriales}
                  className="px-6 py-3 bg-orange-600 text-white rounded-md hover:bg-orange-700 text-base font-medium"
                >
                  Agregar Materiales
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal para ver comprobante */}
      {showComprobanteModal && (
        <div className="fixed inset-0 bg-gray-900/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {comprobanteType === 'image' ? 'Ver Comprobante' : 'Ver PDF'}
              </h3>
              <button
                onClick={() => {
                  setShowComprobanteModal(false);
                  setComprobanteUrl('');
                  setComprobanteType('other');
                }}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            <div className="p-6 overflow-auto max-h-[calc(90vh-80px)]">
              {comprobanteType === 'image' ? (
                <img
                  src={comprobanteUrl}
                  alt="Comprobante"
                  className="max-w-full h-auto mx-auto"
                />
              ) : comprobanteType === 'pdf' ? (
                <iframe
                  src={comprobanteUrl}
                  className="w-full h-[70vh]"
                  title="Comprobante PDF"
                />
              ) : null}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TaskMaterials;

import React, { useEffect, useState } from 'react';
import api from '../../config/api';
import { showSuccess, showError } from '../../utils/toastUtils';
import { DollarSign, Edit, Save, X } from 'lucide-react';
import type { TareaLiquidacion } from '../../types';

interface TaskLiquidacionProps {
  taskId: string;
  userRole: string;
}

const TaskLiquidacion: React.FC<TaskLiquidacionProps> = ({ taskId, userRole }) => {
  const [liquidacion, setLiquidacion] = useState<TareaLiquidacion | null>(null);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({
    manoObra: 0,
    cobertura: 0,
    materialReal: 0,
    boletasMateriales: 0,
    observacionesFinancieras: ''
  });

  useEffect(() => {
    fetchLiquidacion();
  }, [taskId]);

  const fetchLiquidacion = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/liquidaciones/tarea/${taskId}`);
      setLiquidacion(response.data.data);
      if (response.data.data) {
        setFormData({
          manoObra: response.data.data.manoObra || 0,
          cobertura: response.data.data.cobertura || 0,
          materialReal: response.data.data.materialReal || 0,
          boletasMateriales: response.data.data.boletasMateriales || 0,
          observacionesFinancieras: response.data.data.observacionesFinancieras || ''
        });
      }
    } catch (error) {
      console.error('Error fetching liquidación:', error);
      // Si no existe liquidación, crear una nueva
      if ((error as any).response?.status === 404) {
        createLiquidacion();
      }
    } finally {
      setLoading(false);
    }
  };

  const createLiquidacion = async () => {
    try {
      const response = await api.post('/liquidaciones', { tarea: taskId });
      setLiquidacion(response.data.data);
      setFormData({
        manoObra: response.data.data.manoObra || 0,
        cobertura: response.data.data.cobertura || 0,
        materialReal: response.data.data.materialReal || 0,
        boletasMateriales: response.data.data.boletasMateriales || 0,
        observacionesFinancieras: response.data.data.observacionesFinancieras || ''
      });
    } catch (error) {
      console.error('Error creating liquidación:', error);
      showError('Error al crear liquidación');
    }
  };

  const handleSave = async () => {
    try {
      await api.put(`/liquidaciones/${liquidacion?._id}`, formData);
      showSuccess('Liquidación actualizada exitosamente');
      setEditing(false);
      fetchLiquidacion();
    } catch (error) {
      console.error('Error updating liquidación:', error);
      showError('Error al actualizar liquidación');
    }
  };

  const handleCancel = () => {
    if (liquidacion) {
      setFormData({
        manoObra: liquidacion.manoObra || 0,
        cobertura: liquidacion.cobertura || 0,
        materialReal: liquidacion.materialReal || 0,
        boletasMateriales: liquidacion.boletasMateriales || 0,
        observacionesFinancieras: liquidacion.observacionesFinancieras || ''
      });
    }
    setEditing(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!liquidacion) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        <DollarSign className="h-12 w-12 mx-auto mb-2 text-gray-300 dark:text-gray-600" />
        <p>No hay liquidación para esta tarea</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
          <DollarSign className="h-5 w-5 mr-2 text-blue-600 dark:text-blue-400" />
          Liquidación de la Tarea
        </h3>
        {userRole === 'admin' && !editing && (
          <button
            onClick={() => setEditing(true)}
            className="inline-flex items-center px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm"
          >
            <Edit className="h-4 w-4 mr-2" />
            Editar
          </button>
        )}
        {editing && (
          <div className="flex gap-2">
            <button
              onClick={handleCancel}
              className="inline-flex items-center px-3 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors text-sm"
            >
              <X className="h-4 w-4 mr-2" />
              Cancelar
            </button>
            <button
              onClick={handleSave}
              className="inline-flex items-center px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors text-sm"
            >
              <Save className="h-4 w-4 mr-2" />
              Guardar
            </button>
          </div>
        )}
      </div>

      {/* Liquidación Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Campos Editables */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 p-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Mano de Obra
          </label>
          {editing ? (
            <input
              type="number"
              value={formData.manoObra}
              onChange={(e) => setFormData({ ...formData, manoObra: parseFloat(e.target.value) || 0 })}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2"
            />
          ) : (
            <p className="text-2xl font-bold text-gray-900 dark:text-white">${liquidacion.manoObra?.toLocaleString() || 0}</p>
          )}
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 p-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Cobertura
          </label>
          {editing ? (
            <input
              type="number"
              value={formData.cobertura}
              onChange={(e) => setFormData({ ...formData, cobertura: parseFloat(e.target.value) || 0 })}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2"
            />
          ) : (
            <p className="text-2xl font-bold text-gray-900 dark:text-white">${liquidacion.cobertura?.toLocaleString() || 0}</p>
          )}
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 p-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Material Real
          </label>
          {editing ? (
            <input
              type="number"
              value={formData.materialReal}
              onChange={(e) => setFormData({ ...formData, materialReal: parseFloat(e.target.value) || 0 })}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2"
            />
          ) : (
            <p className="text-2xl font-bold text-gray-900 dark:text-white">${liquidacion.materialReal?.toLocaleString() || 0}</p>
          )}
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 p-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Boletas Materiales
          </label>
          {editing ? (
            <input
              type="number"
              value={formData.boletasMateriales}
              onChange={(e) => setFormData({ ...formData, boletasMateriales: parseFloat(e.target.value) || 0 })}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2"
            />
          ) : (
            <p className="text-2xl font-bold text-gray-900 dark:text-white">${liquidacion.boletasMateriales?.toLocaleString() || 0}</p>
          )}
        </div>

        {/* Campos Calculados (Solo Lectura) */}
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg shadow border border-blue-200 dark:border-blue-800 p-4">
          <div className="flex justify-between items-center mb-2">
            <label className="block text-sm font-medium text-blue-800 dark:text-blue-300">
              Materiales
            </label>
            <span className="px-2 py-1 bg-blue-200 dark:bg-blue-800 text-blue-800 dark:text-blue-200 text-xs font-medium rounded">
              Calculado
            </span>
          </div>
          <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">${liquidacion.materiales?.toLocaleString() || 0}</p>
        </div>

        <div className="bg-green-50 dark:bg-green-900/20 rounded-lg shadow border border-green-200 dark:border-green-800 p-4">
          <div className="flex justify-between items-center mb-2">
            <label className="block text-sm font-medium text-green-800 dark:text-green-300">
              Excedente
            </label>
            <span className="px-2 py-1 bg-green-200 dark:bg-green-800 text-green-800 dark:text-green-200 text-xs font-medium rounded">
              Calculado
            </span>
          </div>
          <p className="text-2xl font-bold text-green-900 dark:text-green-100">${liquidacion.excedente?.toLocaleString() || 0}</p>
        </div>

        {/* Virtuals Calculados */}
        <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg shadow border border-purple-200 dark:border-purple-800 p-4">
          <div className="flex justify-between items-center mb-2">
            <label className="block text-sm font-medium text-purple-800 dark:text-purple-300">
              Total Presupuesto
            </label>
            <span className="px-2 py-1 bg-purple-200 dark:bg-purple-800 text-purple-800 dark:text-purple-200 text-xs font-medium rounded">
              Calculado
            </span>
          </div>
          <p className="text-2xl font-bold text-purple-900 dark:text-purple-100">${(liquidacion as any).totalPresupuesto?.toLocaleString() || 0}</p>
        </div>

        <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg shadow border border-orange-200 dark:border-orange-800 p-4">
          <div className="flex justify-between items-center mb-2">
            <label className="block text-sm font-medium text-orange-800 dark:text-orange-300">
              Dif Excedente
            </label>
            <span className="px-2 py-1 bg-orange-200 dark:bg-orange-800 text-orange-800 dark:text-orange-200 text-xs font-medium rounded">
              Calculado
            </span>
          </div>
          <p className="text-2xl font-bold text-orange-900 dark:text-orange-100">${(liquidacion as any).difExcedente?.toLocaleString() || 0}</p>
        </div>

        <div className="bg-pink-50 dark:bg-pink-900/20 rounded-lg shadow border border-pink-200 dark:border-pink-800 p-4">
          <div className="flex justify-between items-center mb-2">
            <label className="block text-sm font-medium text-pink-800 dark:text-pink-300">
              Ganancia Material
            </label>
            <span className="px-2 py-1 bg-pink-200 dark:bg-pink-800 text-pink-800 dark:text-pink-200 text-xs font-medium rounded">
              Calculado
            </span>
          </div>
          <p className="text-2xl font-bold text-pink-900 dark:text-pink-100">${(liquidacion as any).gananciaMaterial?.toLocaleString() || 0}</p>
        </div>

        <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-lg shadow border border-indigo-200 dark:border-indigo-800 p-4">
          <div className="flex justify-between items-center mb-2">
            <label className="block text-sm font-medium text-indigo-800 dark:text-indigo-300">
              Ganancia Total
            </label>
            <span className="px-2 py-1 bg-indigo-200 dark:bg-indigo-800 text-indigo-800 dark:text-indigo-200 text-xs font-medium rounded">
              Calculado
            </span>
          </div>
          <p className="text-2xl font-bold text-indigo-900 dark:text-indigo-100">${(liquidacion as any).gananciaTotal?.toLocaleString() || 0}</p>
        </div>

        <div className="bg-teal-50 dark:bg-teal-900/20 rounded-lg shadow border border-teal-200 dark:border-teal-800 p-4">
          <div className="flex justify-between items-center mb-2">
            <label className="block text-sm font-medium text-teal-800 dark:text-teal-300">
              Repartida
            </label>
            <span className="px-2 py-1 bg-teal-200 dark:bg-teal-800 text-teal-800 dark:text-teal-200 text-xs font-medium rounded">
              Calculado
            </span>
          </div>
          <p className="text-2xl font-bold text-teal-900 dark:text-teal-100">${(liquidacion as any).repartida?.toLocaleString() || 0}</p>
        </div>

        <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg shadow border border-yellow-200 dark:border-yellow-800 p-4">
          <div className="flex justify-between items-center mb-2">
            <label className="block text-sm font-medium text-yellow-800 dark:text-yellow-300">
              Pago Técnico
            </label>
            <span className="px-2 py-1 bg-yellow-200 dark:bg-yellow-800 text-yellow-800 dark:text-yellow-200 text-xs font-medium rounded">
              Calculado
            </span>
          </div>
          <p className="text-2xl font-bold text-yellow-900 dark:text-yellow-100">${(liquidacion as any).pagoTecnico?.toLocaleString() || 0}</p>
        </div>

        <div className="bg-red-50 dark:bg-red-900/20 rounded-lg shadow border border-red-200 dark:border-red-800 p-4">
          <div className="flex justify-between items-center mb-2">
            <label className="block text-sm font-medium text-red-800 dark:text-red-300">
              Seprogar
            </label>
            <span className="px-2 py-1 bg-red-200 dark:bg-red-800 text-red-800 dark:text-red-200 text-xs font-medium rounded">
              Calculado
            </span>
          </div>
          <p className="text-2xl font-bold text-red-900 dark:text-red-100">${(liquidacion as any).futurgas?.toLocaleString() || 0}</p>
        </div>

        <div className="bg-gray-50 dark:bg-gray-900/20 rounded-lg shadow border border-gray-200 dark:border-gray-800 p-4">
          <div className="flex justify-between items-center mb-2">
            <label className="block text-sm font-medium text-gray-800 dark:text-gray-300">
              Pago 15 Días
            </label>
            <span className="px-2 py-1 bg-gray-200 dark:bg-gray-800 text-gray-800 dark:text-gray-200 text-xs font-medium rounded">
              Calculado
            </span>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">${(liquidacion as any).pago15Dias?.toLocaleString() || 0}</p>
        </div>
      </div>

      {/* Observaciones */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 p-4">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Observaciones Financieras
        </label>
        {editing ? (
          <textarea
            value={formData.observacionesFinancieras}
            onChange={(e) => setFormData({ ...formData, observacionesFinancieras: e.target.value })}
            rows={3}
            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2"
          />
        ) : (
          <p className="text-gray-900 dark:text-white whitespace-pre-wrap">{liquidacion.observacionesFinancieras || 'Sin observaciones'}</p>
        )}
      </div>
    </div>
  );
};

export default TaskLiquidacion;

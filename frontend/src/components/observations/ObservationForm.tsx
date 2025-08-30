import React, { useState, useEffect } from 'react';
import { useAppDispatch } from '../../store';
import { createObservation, updateObservation } from '../../store/slices/observationsSlice';
import { X, Save } from 'lucide-react';

interface ObservationFormProps {
  taskId: string;
  observation?: {
    _id: string;
    titulo: string;
    descripcion: string;
  } | null;
  onClose: () => void;
  onSuccess?: () => void;
}

const ObservationForm: React.FC<ObservationFormProps> = ({
  taskId,
  observation,
  onClose,
  onSuccess,
}) => {
  const [formData, setFormData] = useState({
    titulo: '',
    descripcion: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const dispatch = useAppDispatch();

  useEffect(() => {
    if (observation) {
      setFormData({
        titulo: observation.titulo,
        descripcion: observation.descripcion,
      });
    } else {
      setFormData({
        titulo: '',
        descripcion: '',
      });
    }
  }, [observation]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (observation) {
        await dispatch(
          updateObservation({
            id: observation._id,
            ...formData,
          })
        ).unwrap();
      } else {
        await dispatch(
          createObservation({
            ...formData,
            tarea: taskId,
          })
        ).unwrap();
      }
      
      if (onSuccess) onSuccess();
      onClose();
    } catch (error) {
      console.error('Error al guardar la observación:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">
          {observation ? 'Editar Observación' : 'Nueva Observación'}
        </h3>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-500 dark:text-gray-500 dark:hover:text-gray-400"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="titulo"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
          >
            Título
          </label>
          <input
            type="text"
            id="titulo"
            name="titulo"
            value={formData.titulo}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
            required
          />
        </div>

        <div>
          <label
            htmlFor="descripcion"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
          >
            Descripción
          </label>
          <textarea
            id="descripcion"
            name="descripcion"
            rows={4}
            value={formData.descripcion}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
            required
          />
        </div>

        <div className="flex justify-end space-x-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-600 cursor-pointer"
            disabled={isSubmitting}
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            disabled={isSubmitting}
          >
            <Save className="h-4 w-4 mr-2" />
            {isSubmitting
              ? 'Guardando...'
              : observation
              ? 'Actualizar'
              : 'Crear'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ObservationForm;

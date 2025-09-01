import React, { useState, useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../../store';
import { fetchTaskObservations, deleteObservation } from '../../store/slices/observationsSlice';
import { Plus } from 'lucide-react';
import ObservationItem from './ObservationItem';
import ObservationForm from './ObservationForm';
import type { Observation } from '../../types';

interface ObservationsListProps {
  taskId: string;
  currentUserId: string;
}

const ObservationsList: React.FC<ObservationsListProps> = ({ taskId, currentUserId }) => {
  const dispatch = useAppDispatch();
  // Memoized selectors
  const observations = useAppSelector((state) => state.observations.observations);
  const loading = useAppSelector((state) => state.observations.loading);
  const error = useAppSelector((state) => state.observations.error);
  
  const [showForm, setShowForm] = useState(false);
  const [editingObservation, setEditingObservation] = useState<Observation | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (taskId) {
      dispatch(fetchTaskObservations(taskId));
    }
  }, [dispatch, taskId]);

  const handleAddClick = () => {
    setEditingObservation(null);
    setShowForm(true);
  };

  const handleEditClick = (observation: Observation) => {
    setEditingObservation(observation);
    setShowForm(true);
  };

  const handleDeleteClick = async (id: string) => {
    if (window.confirm('¿Estás seguro de que deseas eliminar esta observación?')) {
      setDeletingId(id);
      try {
        await dispatch(deleteObservation(id)).unwrap();
      } catch (error) {
        console.error('Error al eliminar la observación:', error);
      } finally {
        setDeletingId(null);
      }
    }
  };

  const handleFormSuccess = () => {
    setShowForm(false);
  };

  if (loading && !observations.length) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 p-4 mb-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg
              className="h-5 w-5 text-red-500"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <div className="ml-3">
            <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-medium text-gray-900 dark:text-white">
          Observaciones ({observations.length})
        </h2>
        <button
          onClick={handleAddClick}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200 cursor-pointer"
        >
          <Plus className="h-4 w-4 mr-2" />
          Nueva Observación
        </button>
      </div>

      {showForm && (
        <div className="mb-6">
          <ObservationForm
            taskId={taskId}
            observation={editingObservation || undefined}
            onClose={() => setShowForm(false)}
            onSuccess={handleFormSuccess}
          />
        </div>
      )}

      {observations.length === 0 ? (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <p>No hay observaciones para esta tarea.</p>
          <button
            onClick={handleAddClick}
            className="mt-2 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 text-sm font-medium"
          >
            Agregar la primera observación
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {observations.map((observation) => (
            <ObservationItem
              key={observation._id}
              observation={observation}
              currentUserId={currentUserId}
              onEdit={() => handleEditClick(observation)}
              onDelete={() => handleDeleteClick(observation._id)}
              isDeleting={deletingId === observation._id}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default ObservationsList;

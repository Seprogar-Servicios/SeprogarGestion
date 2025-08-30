import React from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Edit2, Trash2, User } from 'lucide-react';
import type { Observation } from '../../types';

interface ObservationItemProps {
  observation: Observation;
  currentUserId: string;
  onEdit: () => void;
  onDelete: () => void;
  isDeleting?: boolean;
}

const ObservationItem: React.FC<ObservationItemProps> = ({
  observation,
  currentUserId,
  onEdit,
  onDelete,
  isDeleting = false,
}) => {
  const isCreator = observation.creadoPor._id === currentUserId;
  const formattedDate = format(new Date(observation.fechaCreacion), "dd 'de' MMMM yyyy 'a las' HH:mm", {
    locale: es,
  });

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 mb-4 border-l-4 border-blue-500">
      <div className="flex justify-between items-start mb-2">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">
          {observation.titulo}
        </h3>
        {isCreator && (
          <div className="flex space-x-2">
            <button
              onClick={onEdit}
              className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 cursor-pointer"
              aria-label="Editar observación"
            >
              <Edit2 className="h-4 w-4" />
            </button>
            <button
              onClick={onDelete}
              className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 cursor-pointer"
              disabled={isDeleting}
              aria-label="Eliminar observación"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
      
      <p className="text-gray-700 dark:text-gray-300 mb-3 whitespace-pre-wrap">
        {observation.descripcion}
      </p>
      
      <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 border-t border-gray-100 dark:border-gray-700 pt-2">
        <div className="flex items-center">
          <User className="h-3 w-3 mr-1" />
          <span>{observation.creadoPor.nombre}</span>
        </div>
        <span>{formattedDate}</span>
      </div>
      
      {observation.modificadoPor && (
        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 text-right">
          Editado por: {observation.modificadoPor.nombre}
        </div>
      )}
    </div>
  );
};

export default ObservationItem;

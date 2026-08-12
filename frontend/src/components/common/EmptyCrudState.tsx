import React from 'react';
import { BookOpen, Plus } from 'lucide-react';
import { startSepiTutorial, type SepiTutorialId } from '../../utils/sepiEvents';

interface EmptyCrudStateProps {
  title: string;
  description: string;
  tutorialId: SepiTutorialId;
  icon?: React.ReactNode;
  onCreateClick?: () => void;
  createLabel?: string;
  /** Si true, es empty real (sin registros). Si hay búsqueda sin resultados, no ofrecer tutorial. */
  showTutorial?: boolean;
}

const EmptyCrudState: React.FC<EmptyCrudStateProps> = ({
  title,
  description,
  tutorialId,
  icon,
  onCreateClick,
  createLabel = 'Crear el primero',
  showTutorial = true,
}) => {
  return (
    <div className="col-span-full bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 p-8 text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400">
        {icon}
      </div>
      <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">{title}</h3>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 max-w-md mx-auto">{description}</p>

      <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
        {onCreateClick && (
          <button
            type="button"
            onClick={onCreateClick}
            className="inline-flex items-center px-4 py-2.5 text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            {createLabel}
          </button>
        )}
        {showTutorial && (
          <button
            type="button"
            onClick={() => startSepiTutorial(tutorialId)}
            className="inline-flex items-center px-4 py-2.5 text-sm font-medium rounded-lg text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900/50"
          >
            <BookOpen className="h-4 w-4 mr-2" />
            ¿Tutorial con Sepi?
          </button>
        )}
      </div>
    </div>
  );
};

export default EmptyCrudState;

import React from 'react';
import { X, Copy } from 'lucide-react';
import type { Task } from '../../types';
import { showSuccess, showError } from '../../utils/toastUtils';

interface TaskTextExportModalProps {
  tasks: Task[];
  onClose: () => void;
}

const TaskTextExportModal: React.FC<TaskTextExportModalProps> = ({ tasks, onClose }) => {
  const formatTaskText = (task: Task) => {
    return `📋 *${task.titulo || 'Tarea sin título'}*
👤 Cliente: ${task.cliente || 'No especificado'}
📞 Teléfono: ${task.numeroTitular || 'No especificado'}
📍 Dirección: ${task.direccion || 'No especificada'}${task.direccion ? `` : ''}
📅 Fecha: ${task.fechaEjecucion ? new Date(task.fechaEjecucion).toLocaleDateString() : 'No especificada'}
🕒 Horario: ${task.franja_horaria || 'No especificado'}
📝 Descripción: ${task.descripcion || 'Sin descripción'}\n`;
  };

  const formattedText = tasks.map(task => formatTaskText(task)).join('\n---\n');

  const handleCopyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(formattedText);
      showSuccess('¡Texto copiado al portapapeles!');
    } catch (error) {
      showError('Error al copiar el texto');
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-900/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="relative w-full max-w-2xl bg-white dark:bg-gray-800 rounded-2xl shadow-2xl overflow-hidden">
        <div className="px-6 py-5 bg-gradient-to-r from-blue-600 to-blue-800">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-semibold text-white">Exportar tareas como texto</h3>
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white transition-colors"
            >
              <X size={24} />
            </button>
          </div>
        </div>
        
        <div className="p-6 max-h-[60vh] overflow-y-auto">
          <div className="bg-gray-50 dark:bg-gray-700/30 rounded-lg p-4">
            <pre className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap font-sans">
              {formattedText}
            </pre>
          </div>
        </div>
        
        <div className="px-6 py-4 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-700 flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Cerrar
          </button>
          <button
            onClick={handleCopyToClipboard}
            className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg hover:from-blue-700 hover:to-blue-800 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 flex items-center"
          >
            <Copy size={16} className="mr-2" />
            Copiar texto
          </button>
        </div>
      </div>
    </div>
  );
};

export default TaskTextExportModal;

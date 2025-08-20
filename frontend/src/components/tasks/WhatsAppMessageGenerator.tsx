import React, { useState, useEffect } from 'react';
import { useAppSelector } from '../../store';
import type { Task, User } from '../../types';
import { CheckSquare, Square, Send } from 'lucide-react';

interface WhatsAppMessageGeneratorProps {
  tasks: Task[];
}

interface GroupedTasks {
  [tecnicoId: string]: {
    tecnico: User;
    tasks: Task[];
  };
}

const WhatsAppMessageGenerator: React.FC<WhatsAppMessageGeneratorProps> = ({ tasks }) => {
  const [selectedTasks, setSelectedTasks] = useState<string[]>([]);
  const [groupedTasks, setGroupedTasks] = useState<GroupedTasks>({});
  const { user } = useAppSelector((state) => state.auth);

  // Agrupar tareas por técnico
  useEffect(() => {
    const grouped: GroupedTasks = {};
    
    tasks.forEach(task => {
      if (task.tecnicos && task.tecnicos.length > 0) {
        task.tecnicos.forEach(tecnico => {
          if (!grouped[tecnico._id]) {
            grouped[tecnico._id] = {
              tecnico,
              tasks: []
            };
          }
          grouped[tecnico._id].tasks.push(task);
        });
      }
    });
    
    setGroupedTasks(grouped);
  }, [tasks]);

  // Manejar selección/deselección de todas las tareas
  const handleSelectAll = (tecnicoId: string) => {
    const tecnicoTasks = groupedTasks[tecnicoId]?.tasks || [];
    const tecnicoTaskIds = tecnicoTasks.map(task => task._id);
    
    // Verificar si todas las tareas del técnico ya están seleccionadas
    const allSelected = tecnicoTaskIds.every(id => selectedTasks.includes(id));
    
    if (allSelected) {
      // Deseleccionar todas las tareas del técnico
      setSelectedTasks(selectedTasks.filter(id => !tecnicoTaskIds.includes(id)));
    } else {
      // Seleccionar todas las tareas del técnico
      const newSelectedTasks = [...selectedTasks];
      tecnicoTaskIds.forEach(id => {
        if (!newSelectedTasks.includes(id)) {
          newSelectedTasks.push(id);
        }
      });
      setSelectedTasks(newSelectedTasks);
    }
  };

  // Manejar selección/deselección de una tarea individual
  const handleSelectTask = (taskId: string) => {
    if (selectedTasks.includes(taskId)) {
      setSelectedTasks(selectedTasks.filter(id => id !== taskId));
    } else {
      setSelectedTasks([...selectedTasks, taskId]);
    }
  };

  // Generar mensaje de WhatsApp para el técnico seleccionado
  const generateWhatsAppMessage = (tecnicoId: string) => {
    const tecnico = groupedTasks[tecnicoId]?.tecnico;
    if (!tecnico || !tecnico.telefono) {
      alert('El técnico no tiene un número de teléfono registrado');
      return;
    }
    
    const selectedTasksForTecnico = groupedTasks[tecnicoId]?.tasks.filter(task => 
      selectedTasks.includes(task._id)
    ) || [];
    
    if (selectedTasksForTecnico.length === 0) {
      alert('No hay tareas seleccionadas para este técnico');
      return;
    }
    
    // Construir el mensaje
    let message = `Hola, aquí tienes el resumen de tus tareas asignadas:\n\n`;
    
    selectedTasksForTecnico.forEach((task, index) => {
      message += `${index + 1}. *${task.titulo}* (${task.numero})\n`;
      if (task.descripcion) message += `   ${task.descripcion}\n`;
      if (task.cliente) message += `   Cliente: ${task.cliente}\n`;
      if (task.direccion) message += `   Dirección: ${task.direccion}\n`;
      if (task.fechaEjecucion) message += `   Fecha: ${new Date(task.fechaEjecucion).toLocaleDateString()}\n`;
      message += '\n';
    });
    
    message += 'Puedes usar este mensaje como recordatorio de tus tareas pendientes.';
    
    // Codificar el mensaje para URL
    const encodedMessage = encodeURIComponent(message);
    
    // Abrir WhatsApp con el mensaje predefinido
    const whatsappUrl = `https://wa.me/${tecnico.telefono?.replace(/\D/g, '')}?text=${encodedMessage}`;
    window.open(whatsappUrl, '_blank');
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 mb-6">
      <div className="mb-4">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white flex items-center justify-between">
          <div className="flex items-center">
            <Send className="h-5 w-5 mr-2" />
            {user?.rol === 'admin' ? 'Enviar tareas por WhatsApp' : 'Mis Tareas Pendientes'}
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            {selectedTasks.length} {user?.rol === 'admin' ? 'seleccionadas' : 'tareas seleccionadas'}
          </div>
        </h3>
        {user?.rol !== 'admin' && (
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Envía un recordatorio de tus tareas a tu WhatsApp
          </p>
        )}
      </div>
      
      <div className="space-y-4 overflow-y-auto">
        {Object.keys(groupedTasks).length > 0 ? (
          Object.entries(groupedTasks).map(([tecnicoId, { tecnico, tasks }]) => (
            <div key={tecnicoId} className="border border-gray-200 dark:border-gray-700 rounded-lg p-3">
              <div className="flex justify-between items-center mb-3">
                <div className="flex items-center">
                  <button 
                    onClick={() => handleSelectAll(tecnicoId)}
                    className="text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 mr-2"
                  >
                    {tasks.every(task => selectedTasks.includes(task._id)) ? (
                      <CheckSquare className="h-5 w-5" />
                    ) : (
                      <Square className="h-5 w-5" />
                    )}
                  </button>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {tecnico.nombre} {tecnico.telefono ? `(Mis tareas)` : '(Sin teléfono)'}
                  </span>
                </div>
                <button
                  onClick={() => generateWhatsAppMessage(tecnicoId)}
                  disabled={!tecnico.telefono || !tasks.some(task => selectedTasks.includes(task._id))}
                  className={`inline-flex items-center px-3 py-1 text-sm rounded-md ${
                    !tecnico.telefono || !tasks.some(task => selectedTasks.includes(task._id))
                      ? 'bg-gray-200 text-gray-500 cursor-not-allowed dark:bg-gray-700 dark:text-gray-400'
                      : 'bg-green-500 text-white hover:bg-green-600'
                  }`}
                >
                  <Send className="h-4 w-4 mr-1" />
                  WhatsApp
                </button>
              </div>
              
              <div className="space-y-1 pl-7 max-h-[200px] overflow-y-auto">
                {tasks.map(task => (
                  <div key={task._id} className="flex items-start hover:bg-gray-50 dark:hover:bg-gray-700 p-1 rounded-md">
                    <button
                      onClick={() => handleSelectTask(task._id)}
                      className="text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 mr-2 mt-0.5"
                    >
                      {selectedTasks.includes(task._id) ? (
                        <CheckSquare className="h-4 w-4" />
                      ) : (
                        <Square className="h-4 w-4" />
                      )}
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {task.titulo} <span className="text-xs text-gray-500">({task.numero})</span>
                      </div>
                      <div className="flex flex-wrap text-xs text-gray-500 dark:text-gray-400 gap-x-2">
                        {task.direccion && (
                          <span className="truncate max-w-[150px]">{task.direccion}</span>
                        )}
                        {task.fechaEjecucion && (
                          <span>{new Date(task.fechaEjecucion).toLocaleDateString()}</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        ) : (
          <p className="text-gray-500 dark:text-gray-400">
            No hay tareas asignadas a técnicos
          </p>
        )}
      </div>
    </div>
  );
};

export default WhatsAppMessageGenerator;

import { useState, useEffect, useRef, useCallback } from 'react';
import { useAppSelector } from '../store';
import api from '../config/api';
import {
  MessageCircle,
  X,
  Maximize2,
  Minimize2,
  Send,
  Bot,
  User,
} from 'lucide-react';
import { SEPI_OPEN } from '../utils/sepiEvents';
import { helpMessage, parseSepiMessage } from './chatbot/sepiNlu';
import { isAdminRole } from '../utils/roles';

interface Message {
  type: 'user' | 'bot';
  content: string;
  timestamp: Date;
}

type ConversationStep =
  | 'idle'
  | 'asking_numero_tarea'
  | 'asking_mano_obra'
  | 'asking_cobertura'
  | 'asking_material_real'
  | 'asking_boletas_materiales'
  | 'asking_observaciones'
  | 'confirming';

interface ConversationState {
  step: ConversationStep;
  numeroTarea: string;
  manoObra: string;
  cobertura: string;
  materialReal: string;
  boletasMateriales: string;
  observacionesFinancieras: string;
  currentValues: {
    manoObra?: number;
    cobertura?: number;
    materialReal?: number;
    boletasMateriales?: number;
    observacionesFinancieras?: string;
  };
}

const initialConversation: ConversationState = {
  step: 'idle',
  numeroTarea: '',
  manoObra: '',
  cobertura: '',
  materialReal: '',
  boletasMateriales: '',
  observacionesFinancieras: '',
  currentValues: {},
};

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const formatFechaEjecucion = (fecha?: string) => {
  if (!fecha) return 'No especificada';
  if (/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
    const [y, m, d] = fecha.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString('es-AR');
  }
  const parsed = new Date(fecha);
  return Number.isNaN(parsed.getTime()) ? fecha : parsed.toLocaleDateString('es-AR');
};

const ChatBot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [conversationState, setConversationState] = useState<ConversationState>(initialConversation);
  const conversationRef = useRef(conversationState);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { user } = useAppSelector((state) => state.auth);

  const isAdmin = isAdminRole(user);
  const isUsuario = user?.rol === 'usuario';
  const isAdminConsorcio = user?.rol === 'adminConsorcio';

  useEffect(() => {
    conversationRef.current = conversationState;
  }, [conversationState]);

  const pushBot = useCallback((content: string) => {
    setMessages((prev) => [
      ...prev,
      { type: 'bot', content, timestamp: new Date() },
    ]);
  }, []);

  const resetConversation = useCallback(() => {
    setConversationState(initialConversation);
  }, []);

  useEffect(() => {
    setMessages([
      {
        type: 'bot',
        content:
          '¡Hola! Soy Sepi, el asistente de Seprogar. Puedo consultar tareas, actualizar liquidaciones (admin) y, si una sección CRUD está vacía, guiarte con un tour flotante junto a los botones.',
        timestamp: new Date(),
      },
    ]);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  useEffect(() => {
    const onOpen = () => setIsOpen(true);
    window.addEventListener(SEPI_OPEN, onOpen);
    return () => window.removeEventListener(SEPI_OPEN, onOpen);
  }, []);

  const usuarioQuickQuestions = [
    '¿Qué tareas tengo hoy?',
    'Buscar tarea por número',
    '¿Cuántas tareas pendientes?',
    '¿Qué tareas hay para mañana?',
  ];

  const adminQuickQuestions = [
    'Actualizar liquidación',
    'Buscar tarea por número',
    '¿Cuántas tareas pendientes?',
    '¿Qué tareas hay para mañana?',
  ];

  const adminConsorcioQuickQuestions = [
    '¿Cuántas tareas pendientes?',
    '¿Qué tareas hay para mañana?',
    '¿Qué tareas hay para hoy?',
  ];

  const commonQuickQuestions = ['Contame un chiste', '¿Qué hora es?', '¿Qué fecha es hoy?'];

  const chistes = [
    '¿Por qué los programadores prefieren la oscuridad? Porque la luz les atrae bugs.',
    '¿Qué le dice un HTTP a un HTTPS? ¡Oye, te ves más segura!',
    '¿Por qué Git nunca pierde una discusión? Porque siempre tiene un commit de respaldo.',
  ];

  const chistesTecnicos = [
    '¿Por qué el albañil llevó una regla a la obra? Porque quería poner las cosas en línea.',
    '¿Qué hace un electricista cuando tiene frío? Se conecta con la corriente.',
    '¿Qué hace un pintor cuando se equivoca? Le da otra mano.',
  ];

  const chistesAdminsConsorcio = [
    '¿Por qué el administrador de consorcio nunca duerme tranquilo? Porque siempre aparece una pérdida a las 3 AM.',
    '¿Qué significa paz en un consorcio? Que nadie mandó mensajes al grupo de WhatsApp en todo el día.',
  ];

  const startLiquidacionFlow = async (numero: string) => {
    try {
      const responseLiquidacion = await api.get(`/liquidaciones/tarea/numero/${numero}`);
      const liquidacion = responseLiquidacion.data.data;
      if (!liquidacion) {
        return `No existe liquidación para la tarea ${numero}. Creala primero desde Liquidaciones.`;
      }

      setConversationState({
        ...initialConversation,
        step: 'asking_mano_obra',
        numeroTarea: numero,
        currentValues: {
          manoObra: liquidacion.manoObra,
          cobertura: liquidacion.cobertura,
          materialReal: liquidacion.materialReal,
          boletasMateriales: liquidacion.boletasMateriales,
          observacionesFinancieras: liquidacion.observacionesFinancieras,
        },
      });

      return `Liquidación encontrada para tarea #${numero}. Actualizamos los datos manuales.\n\nMano de obra (actual: ${liquidacion.manoObra || 0}):\nEscribí un número o dejá vacío y enviá para no cambiarlo.`;
    } catch {
      return `No pude obtener la liquidación de la tarea ${numero}. Verificá el número o creá la liquidación primero.`;
    }
  };

  const formatTaskDetail = (tarea: any) =>
    `Tarea #${tarea.numero}\n` +
    `Título: ${tarea.titulo}\n` +
    `Cliente: ${tarea.cliente}\n` +
    `Estado: ${tarea.estado}\n` +
    `Fecha: ${formatFechaEjecucion(tarea.fechaEjecucion)}\n` +
    `Dirección: ${tarea.direccion}\n\n` +
    `${tarea.descripcion || ''}`;

  const fetchTaskByNumber = async (numero: string) => {
    try {
      const responseTarea = await api.get(`/bot/tarea/${numero}`);
      if (!responseTarea.data.success) {
        return `Tarea #${numero} no encontrada.`;
      }
      const tarea = responseTarea.data.tarea;
      if (isUsuario && user?._id) {
        const pertenece = (tarea.tecnicos || []).some((t: any) => t._id === user._id);
        if (!pertenece) return `La tarea #${numero} no está asignada a vos.`;
      }
      return formatTaskDetail(tarea);
    } catch {
      return 'Error al buscar la tarea.';
    }
  };

  const fetchTasksByFilter = async (
    filter: 'today' | 'tomorrow' | 'pending'
  ): Promise<string> => {
    try {
      const params: Record<string, string> = {};
      const endpoint = isAdminConsorcio ? '/tareas-consorcio' : '/tareas';
      if (isUsuario && user?._id) params.usuario = user._id;

      if (filter === 'today') {
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(today.getDate() + 1);
        params.fechaDesde = today.toISOString().split('T')[0];
        params.fechaHasta = tomorrow.toISOString().split('T')[0];
      } else if (filter === 'tomorrow') {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const dayAfter = new Date(tomorrow);
        dayAfter.setDate(dayAfter.getDate() + 1);
        params.fechaDesde = tomorrow.toISOString().split('T')[0];
        params.fechaHasta = dayAfter.toISOString().split('T')[0];
      } else {
        params.estado = 'pendiente';
      }

      const responseTareas = await api.get(endpoint, { params });
      const tareas = responseTareas.data.data || responseTareas.data.tareas || [];
      if (tareas.length === 0) return 'No encontré tareas con esos criterios.';

      const list = tareas
        .slice(0, 10)
        .map((t: any) => `${t.numero} — ${t.cliente || t.titulo || 'Sin cliente'} (${t.estado})`)
        .join('\n');
      return `Encontré ${tareas.length} tarea${tareas.length !== 1 ? 's' : ''}:\n\n${list}${
        tareas.length > 10 ? '\n\n…y más' : ''
      }`;
    } catch {
      return 'Error al buscar tareas.';
    }
  };

  const simulateBotResponse = async (query: string) => {
    const state = conversationRef.current;
    const parsed = parseSepiMessage(query);
    const lowerQuery = parsed.normalized;
    let response = '';

    // Cancelar en cualquier paso del flujo
    if (parsed.intent === 'cancel' && state.step !== 'idle') {
      resetConversation();
      response = 'Conversación cancelada. ¿En qué más te ayudo?';
      await delay(350);
      pushBot(response);
      return;
    }

    // Flujos guiados (liquidación)
    if (state.step === 'asking_numero_tarea') {
      const numero = parsed.taskNumber || query.trim();
      if (!numero || !/\d/.test(numero)) {
        response = 'Ingresá un número de tarea válido. Ejemplo: 244818';
      } else {
        response = await startLiquidacionFlow(numero);
      }
    } else if (state.step === 'asking_mano_obra') {
      if (query.trim() === '') {
        setConversationState((prev) => ({ ...prev, step: 'asking_cobertura', manoObra: '' }));
        response = `Mano de obra sin cambios.\n\nCobertura (actual: ${state.currentValues.cobertura || 0}):`;
      } else {
        const valor = parseFloat(query);
        if (Number.isNaN(valor)) {
          response = 'Ingresá un número válido para mano de obra, o enviá vacío para no cambiarlo.';
        } else {
          setConversationState((prev) => ({
            ...prev,
            step: 'asking_cobertura',
            manoObra: String(valor),
          }));
          response = `Mano de obra: ${valor}\n\nCobertura (actual: ${state.currentValues.cobertura || 0}):`;
        }
      }
    } else if (state.step === 'asking_cobertura') {
      if (query.trim() === '') {
        setConversationState((prev) => ({ ...prev, step: 'asking_material_real', cobertura: '' }));
        response = `Cobertura sin cambios.\n\nMaterial real (actual: ${state.currentValues.materialReal || 0}):`;
      } else {
        const valor = parseFloat(query);
        if (Number.isNaN(valor)) {
          response = 'Ingresá un número válido para cobertura, o enviá vacío para no cambiarlo.';
        } else {
          setConversationState((prev) => ({
            ...prev,
            step: 'asking_material_real',
            cobertura: String(valor),
          }));
          response = `Cobertura: ${valor}\n\nMaterial real (actual: ${state.currentValues.materialReal || 0}):`;
        }
      }
    } else if (state.step === 'asking_material_real') {
      if (query.trim() === '') {
        setConversationState((prev) => ({
          ...prev,
          step: 'asking_boletas_materiales',
          materialReal: '',
        }));
        response = `Material real sin cambios.\n\nBoletas de materiales (actual: ${state.currentValues.boletasMateriales || 0}):`;
      } else {
        const valor = parseFloat(query);
        if (Number.isNaN(valor)) {
          response = 'Ingresá un número válido para material real, o enviá vacío para no cambiarlo.';
        } else {
          setConversationState((prev) => ({
            ...prev,
            step: 'asking_boletas_materiales',
            materialReal: String(valor),
          }));
          response = `Material real: ${valor}\n\nBoletas de materiales (actual: ${state.currentValues.boletasMateriales || 0}):`;
        }
      }
    } else if (state.step === 'asking_boletas_materiales') {
      if (query.trim() === '') {
        setConversationState((prev) => ({
          ...prev,
          step: 'asking_observaciones',
          boletasMateriales: '',
        }));
        response = `Boletas sin cambios.\n\nObservaciones financieras (actual: ${state.currentValues.observacionesFinancieras || 'Sin observaciones'}):`;
      } else {
        const valor = parseFloat(query);
        if (Number.isNaN(valor)) {
          response = 'Ingresá un número válido para boletas, o enviá vacío para no cambiarlo.';
        } else {
          setConversationState((prev) => ({
            ...prev,
            step: 'asking_observaciones',
            boletasMateriales: String(valor),
          }));
          response = `Boletas: ${valor}\n\nObservaciones financieras (actual: ${state.currentValues.observacionesFinancieras || 'Sin observaciones'}):`;
        }
      }
    } else if (state.step === 'asking_observaciones') {
      setConversationState({
        ...state,
        step: 'confirming',
        observacionesFinancieras: query.trim(),
      });
      response =
        `Resumen de cambios:\n` +
        (state.manoObra ? `• Mano de obra: ${state.manoObra}\n` : '') +
        (state.cobertura ? `• Cobertura: ${state.cobertura}\n` : '') +
        (state.materialReal ? `• Material real: ${state.materialReal}\n` : '') +
        (state.boletasMateriales ? `• Boletas: ${state.boletasMateriales}\n` : '') +
        (query.trim() ? `• Observaciones: ${query.trim()}\n` : '') +
        `\n¿Confirmás la actualización? (si / no)`;
    } else if (state.step === 'confirming') {
      if (['si', 'yes', 'ok', 'dale', 'confirmar', 'confirmá', 'confirma'].includes(lowerQuery)) {
        try {
          const actualizacion: Record<string, number | string> = {};
          if (state.manoObra) actualizacion.manoObra = parseFloat(state.manoObra);
          if (state.cobertura) actualizacion.cobertura = parseFloat(state.cobertura);
          if (state.materialReal) actualizacion.materialReal = parseFloat(state.materialReal);
          if (state.boletasMateriales) {
            actualizacion.boletasMateriales = parseFloat(state.boletasMateriales);
          }
          if (state.observacionesFinancieras) {
            actualizacion.observacionesFinancieras = state.observacionesFinancieras;
          }

          const responseUpdate = await api.put('/bot/liquidacion/actualizar', {
            numeroTarea: state.numeroTarea,
            ...actualizacion,
          });

          resetConversation();
          response = responseUpdate.data.success
            ? 'Liquidación actualizada correctamente. ¿En qué más te ayudo?'
            : `No se pudo actualizar: ${responseUpdate.data.message}`;
        } catch {
          resetConversation();
          response = 'Error al actualizar la liquidación. Intentá de nuevo.';
        }
      } else if (['no', 'nop', 'cancelar', 'cancela'].includes(lowerQuery)) {
        resetConversation();
        response = 'Actualización cancelada.';
      } else {
        response = 'Respondé "si" para confirmar o "no" para cancelar.';
      }
    } else {
      // Idle: motor de intents
      switch (parsed.intent) {
        case 'greeting':
          response =
            '¡Hola! Soy Sepi. Pedime tareas de hoy/mañana, una búsqueda por número o, si sos admin, actualizar una liquidación.';
          break;
        case 'help':
          response = helpMessage(!!isAdmin);
          break;
        case 'joke': {
          const pool = isUsuario
            ? chistesTecnicos
            : isAdminConsorcio
              ? chistesAdminsConsorcio
              : chistes;
          response = pool[Math.floor(Math.random() * pool.length)];
          break;
        }
        case 'time':
          response = `Son las ${new Date().toLocaleTimeString('es-AR', {
            hour: '2-digit',
            minute: '2-digit',
          })}`;
          break;
        case 'date':
          response = `Hoy es ${new Date().toLocaleDateString('es-AR', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}`;
          break;
        case 'tutorial':
          response =
            'Si una sección CRUD está vacía, tocá “¿Tutorial con Sepi?” y te señalo los botones paso a paso con un avatar flotante.';
          break;
        case 'update_liquidacion':
          if (!isAdmin) {
            response = 'Solo un administrador puede actualizar liquidaciones desde el chat.';
          } else if (parsed.taskNumber) {
            response = await startLiquidacionFlow(parsed.taskNumber);
          } else {
            setConversationState({ ...initialConversation, step: 'asking_numero_tarea' });
            response = 'Para actualizar la liquidación, pasame el número de tarea. Ejemplo: 244818';
          }
          break;
        case 'search_task':
          if (parsed.taskNumber) {
            response = await fetchTaskByNumber(parsed.taskNumber);
          } else {
            response =
              'Para buscar, escribí el número de tarea. Ejemplos: 244818 · "buscá la tarea 244818" · "#244818"';
          }
          break;
        case 'tasks_today':
          response = await fetchTasksByFilter('today');
          break;
        case 'tasks_tomorrow':
          response = await fetchTasksByFilter('tomorrow');
          break;
        case 'tasks_pending':
          response = await fetchTasksByFilter('pending');
          break;
        case 'cancel':
          response = 'No hay ninguna conversación activa para cancelar. ' + helpMessage(!!isAdmin);
          break;
        default:
          response =
            'No entendí esa consulta.\n\n' +
            helpMessage(!!isAdmin) +
            '\n\nTambién podés usar las sugerencias de abajo.';
          break;
      }
    }

    await delay(350 + Math.random() * 350);
    pushBot(response);
  };

  const handleSend = async (overrideValue?: string) => {
    const valueToSend = (overrideValue ?? inputValue).trim();
    if (!valueToSend && conversationRef.current.step === 'idle') return;
    // En algunos pasos vacío es válido (dejar sin cambios)
    const content = overrideValue !== undefined ? overrideValue : inputValue;
    if (content === undefined) return;

    const trimmedForDisplay = content.trim() || '(sin cambios)';
    setMessages((prev) => [
      ...prev,
      { type: 'user', content: trimmedForDisplay, timestamp: new Date() },
    ]);
    setInputValue('');
    setIsTyping(true);
    try {
      await simulateBotResponse(content.trim());
    } catch {
      pushBot('Error al procesar tu consulta. Intentá de nuevo.');
    } finally {
      setIsTyping(false);
    }
  };

  const formatTime = (date: Date) =>
    date.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });

  const suggested =
    isAdmin
      ? adminQuickQuestions
      : isUsuario
        ? usuarioQuickQuestions
        : isAdminConsorcio
          ? adminConsorcioQuickQuestions
          : [];

  return (
    <>
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-4 right-4 md:right-8 z-50 group flex items-center gap-2.5 pl-1.5 pr-4 py-1.5 rounded-full bg-gradient-to-r from-blue-600 to-blue-800 text-white shadow-lg shadow-blue-600/35 hover:shadow-xl hover:shadow-blue-600/45 hover:scale-[1.03] transition-all duration-200"
          title="Hablar con Sepi"
          aria-label="Abrir chat con Sepi"
        >
          <span className="relative flex-shrink-0">
            <span className="h-11 w-11 rounded-full bg-white text-blue-700 flex items-center justify-center border-2 border-white shadow-md">
              <Bot className="h-6 w-6" strokeWidth={2.25} />
            </span>
            <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-orange-500 border-2 border-white" />
          </span>
          <span className="flex flex-col items-start leading-tight pr-0.5">
            <span className="text-sm font-semibold tracking-tight">Sepi</span>
            <span className="text-[11px] text-blue-100 flex items-center gap-1">
              <MessageCircle className="h-3 w-3" />
              ¿En qué te ayudo?
            </span>
          </span>
        </button>
      )}

      {isOpen && (
        <div
          className={`fixed bottom-0 right-4 md:right-6 z-50 flex flex-col w-[92%] ${
            isExpanded ? 'md:w-[620px] md:h-[720px]' : 'md:w-[400px] md:h-[620px]'
          } h-[620px] bg-white dark:bg-gray-900 shadow-2xl rounded-t-2xl border border-blue-100 dark:border-gray-700 transition-all`}
        >
          <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white px-4 py-3 rounded-t-2xl flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="relative">
                <div className="h-9 w-9 rounded-full bg-white text-blue-700 flex items-center justify-center border-2 border-white/80 shadow">
                  <Bot className="h-5 w-5" strokeWidth={2.25} />
                </div>
                <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-orange-500 border-2 border-blue-800" />
              </div>
              <div>
                <div className="font-semibold leading-tight">Sepi</div>
                <div className="text-[11px] text-blue-100">Asistente Seprogar · en línea</div>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="hidden md:inline-flex p-1.5 rounded-lg hover:bg-white/10"
                title={isExpanded ? 'Reducir' : 'Expandir'}
              >
                {isExpanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg hover:bg-white/10"
                title="Cerrar"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50 dark:bg-gray-950">
            {messages.map((message, index) => (
              <div
                key={`${message.timestamp.getTime()}-${index}`}
                className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] px-3 py-2.5 rounded-2xl text-sm whitespace-pre-wrap ${
                    message.type === 'user'
                      ? 'bg-blue-600 text-white rounded-br-md'
                      : 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 border border-gray-200 dark:border-gray-700 rounded-bl-md'
                  }`}
                >
                  <div className="flex items-center gap-1.5 mb-1 opacity-70">
                    {message.type === 'bot' ? <Bot className="h-3.5 w-3.5" /> : <User className="h-3.5 w-3.5" />}
                    <span className="text-[11px]">{formatTime(message.timestamp)}</span>
                  </div>
                  {message.content}
                </div>
              </div>
            ))}
            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-3 py-2 rounded-2xl text-sm text-gray-500">
                  Sepi está escribiendo…
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="border-t border-gray-200 dark:border-gray-700 p-3 bg-white dark:bg-gray-900">
            <div className="mb-2">
              <div className="text-[11px] text-gray-500 mb-1.5">Sugerencias</div>
              <div className="flex flex-wrap gap-1.5">
                {suggested.map((question) => (
                  <button
                    key={question}
                    onClick={() => handleSend(question)}
                    className="px-2.5 py-1.5 rounded-lg text-[11px] font-medium bg-blue-600 text-white border border-blue-600 hover:bg-blue-700 hover:border-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500 shadow-sm transition-colors"
                  >
                    {question}
                  </button>
                ))}
                {commonQuickQuestions.map((question) => (
                  <button
                    key={question}
                    onClick={() => handleSend(question)}
                    className="px-2.5 py-1.5 rounded-lg text-[11px] font-medium bg-slate-100 text-slate-800 border border-slate-200 hover:bg-slate-800 hover:text-white hover:border-slate-800 dark:bg-gray-800 dark:text-slate-100 dark:border-gray-600 dark:hover:bg-gray-700 dark:hover:border-gray-500 transition-colors"
                  >
                    {question}
                  </button>
                ))}
              </div>
            </div>

            {conversationState.step !== 'idle' && (
              <button
                onClick={() => {
                  resetConversation();
                  pushBot('Conversación cancelada.');
                }}
                className="w-full mb-2 px-3 py-1.5 text-xs rounded-lg bg-red-50 text-red-700 border border-red-100 hover:bg-red-100"
              >
                Cancelar conversación
              </button>
            )}

            <div className="flex items-center gap-2">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder="Escribí tu consulta…"
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={() => handleSend()}
                disabled={isTyping}
                className="h-10 w-10 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white flex items-center justify-center"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ChatBot;

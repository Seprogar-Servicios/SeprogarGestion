import { useState, useEffect, useRef } from 'react';
import { useAppSelector } from '../store';
import api from '../config/api';

interface Message {
  type: 'user' | 'bot';
  content: string;
  timestamp: Date;
}

type ConversationStep = 'idle' | 'asking_numero_tarea' | 'asking_mano_obra' | 'asking_cobertura' | 'asking_material_real' | 'asking_boletas_materiales' | 'asking_observaciones' | 'confirming';

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

const ChatBot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [conversationState, setConversationState] = useState<ConversationState>({
    step: 'idle',
    numeroTarea: '',
    manoObra: '',
    cobertura: '',
    materialReal: '',
    boletasMateriales: '',
    observacionesFinancieras: '',
    currentValues: {}
  });
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { user } = useAppSelector((state) => state.auth);
  const isAdmin = user?.rol === 'admin';
  const isUsuario = user?.rol === 'usuario';
  const isAdminConsorcio = user?.rol === 'adminConsorcio';

  const quickQuestions = [
    "Contame un chiste",
    "¿Qué hora es?",
    "¿Qué fecha es hoy?"
  ];

  const usuarioQuickQuestions = [
    "¿Qué tareas tengo hoy?",
    "Buscar una de mis tareas por número",
    "¿Cuántas tareas pendientes?",
    "¿Qué tareas hay para mañana?"
  ];

  const adminQuickQuestions = [
    "Actualizar liquidación",
    "Buscar tarea por número",
    "¿Cuántas tareas pendientes?",
    "¿Qué tareas hay para mañana?"
  ];

  const adminConsorcioQuickQuestions = [
    "¿Cuántas tareas pendientes?",
    "¿Qué tareas hay para mañana?",
    "¿Qué tareas hay para hoy?"
  ];

  const chistes = [
  "¿Por qué los programadores prefieren la oscuridad? Porque la luz les atrae bugs 🐛",
  "¿Qué le dice un HTTP a un HTTPS? ¡Oye, te ves más segura! 🔒",
  "¿Por qué los buenos programadores nunca se mueren? Se limitan a pasar al siguiente nivel 🎮",
  "¿Cuál es el lenguaje de programación más divertido? JavaScript, porque siempre tiene un 'chiste' ready 😄",
  "¿Por qué los algoritmos son como los chistes? Si tienes que explicarlo, ya no es gracioso 🤔",

  "¿Por qué el CSS siempre llega tarde? Porque nunca encuentra el estilo correcto 🎨",
  "¿Qué hace un programador cuando tiene frío? Cierra Windows 🪟",
  "¿Por qué React terminó con Angular? Porque necesitaba más espacio para sus componentes ⚛️",
  "¿Cómo se despiden los programadores? console.log('Nos vemos 👋')",
  "¿Por qué Git nunca pierde una discusión? Porque siempre tiene un commit de respaldo 💾",
  "¿Qué le dijo la base de datos al desarrollador? 'No me dejes colgada sin conexión' 🗄️",
  "¿Por qué los bugs nunca descansan? Porque trabajan en producción 🚨"
];

const chistesTecnicos = [
  "¿Por qué el albañil llevó una regla a la obra? Porque quería poner las cosas en línea 📏",
  "¿Qué hace un electricista cuando tiene frío? Se conecta con la corriente ⚡",
  "¿Por qué el plomero nunca pierde? Porque siempre encuentra la fuga 🚰",
  "¿Cómo se llama el constructor más ordenado? Cementerio… porque todo lo deja bien enterrado 😂",
  "¿Por qué el arquitecto se peleó con el albañil? Porque no estaban en la misma planta 🏗️",
  "¿Qué le dijo el martillo al clavo? Agárrate que hoy trabajamos horas extras 🔨",
  "¿Por qué los obreros aman el café? Porque sin mezcla no arrancan ☕",
  "¿Qué hace un pintor cuando se equivoca? Le da otra mano 🎨",
  "¿Por qué la escalera era tan buena amiga? Porque siempre estaba para dar una mano 🪜",
  "¿Qué le dijo el cemento al agua? Juntos hacemos una mezcla perfecta 😎"
];


const chistesAdminsConsorcio = [
  "¿Por qué el administrador de consorcio nunca duerme tranquilo? Porque siempre aparece una pérdida a las 3 AM 🚨",
  "¿Qué le dijo el ascensor al encargado? 'Hoy estoy un poco bajoneado' 🛗",
  "¿Por qué en los edificios nunca faltan reuniones? Porque el drama viene incluido en las expensas 😂",
  "¿Qué hace un administrador cuando todo funciona perfecto? Sospechar 🤨",
  "¿Por qué el portero sabe más secretos que nadie? Porque vive en el lobby de la historia 🏢",
  "¿Qué le dijo un vecino al otro en la reunión de consorcio? 'Eso hay que verlo en administración' 📋",
  "¿Por qué el administrador lleva siempre el celular cargado? Porque las emergencias no respetan horarios 🔋",
  "¿Cuál es el deporte favorito de un administrador? Esquivar reclamos 🏃",
  "¿Por qué el tanque de agua es el verdadero jefe del edificio? Porque cuando falla, todos obedecen 💧",
  "¿Qué significa paz en un consorcio? Que nadie mandó mensajes al grupo de WhatsApp en todo el día 📱"
];

  useEffect(() => {
    setMessages([{
      type: 'bot',
      content: '🤖 ¡Hola! Soy Sepi, el asistente de Seprogro. ¿En qué puedo ayudarte hoy?',
      timestamp: new Date()
    }]);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const getCurrentDateTime = () => {
    const now = new Date();
    return {
      hora: now.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }),
      fecha: now.toLocaleDateString('es-AR', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      })
    };
  };

  const handleQuickQuestion = (question: string) => {
    // Pasar el valor directamente a handleSend para evitar problemas de timing
    handleSend(question);
  };

  const handleSend = async (overrideValue?: string) => {
    const valueToSend = overrideValue || inputValue.trim();
    if (!valueToSend) return;

    const userMessage: Message = {
      type: 'user',
      content: valueToSend,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    const input = overrideValue || inputValue.trim();
    setInputValue('');
    setIsTyping(true);

    try {
      await simulateBotResponse(input);
    } catch (error) {
      setMessages(prev => [...prev, {
        type: 'bot',
        content: '❌ Error al procesar tu consulta. Intenta de nuevo.',
        timestamp: new Date()
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleCancelConversation = () => {
    setConversationState({
      step: 'idle',
      numeroTarea: '',
      manoObra: '',
      cobertura: '',
      materialReal: '',
      boletasMateriales: '',
      observacionesFinancieras: '',
      currentValues: {}
    });
    setMessages(prev => [...prev, {
      type: 'bot',
      content: '❌ Conversación cancelada. ¿En qué más puedo ayudarte?',
      timestamp: new Date()
    }]);
  };

  const simulateBotResponse = async (query: string) => {
    const lowerQuery = query.toLowerCase();
    const step = conversationState.step;

    let response = '';

    // Manejo de conversación para actualizar liquidación
    if (lowerQuery.includes('actualizar liquidación') && isAdmin) {
      // Verificar si el usuario ya incluyó el número de tarea
      const numeroMatch = query.match(/actualizar liquidación\s+(\d+)/i);
      
      if (numeroMatch) {
        // Usuario incluyó el número de tarea, empezar proceso directamente
        try {
          const responseTarea = await api.get(`/bot/tarea/${numeroMatch[1]}`);
          if (!responseTarea.data.success) {
            response = `❌ Tarea ${numeroMatch[1]} no encontrada. Por favor, verifica el número e intenta de nuevo.`;
            setConversationState({
              step: 'idle',
              numeroTarea: '',
              manoObra: '',
              cobertura: '',
              materialReal: '',
              boletasMateriales: '',
              observacionesFinancieras: '',
              currentValues: {}
            });
          } else {
            // Obtener liquidación actual
            try {
              const responseLiquidacion = await api.get(`/liquidaciones/tarea/${responseTarea.data.tarea._id}`);
              if (!responseLiquidacion.data.data) {
                response = `❌ No existe liquidación para la tarea ${numeroMatch[1]}. Por favor, crea una liquidación primero.`;
                setConversationState({
                  step: 'idle',
                  numeroTarea: '',
                  manoObra: '',
                  cobertura: '',
                  materialReal: '',
                  boletasMateriales: '',
                  observacionesFinancieras: '',
                  currentValues: {}
                });
              } else {
                const liquidacion = responseLiquidacion.data.data;
                setConversationState({
                  step: 'asking_mano_obra',
                  numeroTarea: numeroMatch[1],
                  manoObra: '',
                  cobertura: '',
                  materialReal: '',
                  boletasMateriales: '',
                  observacionesFinancieras: '',
                  currentValues: {
                    manoObra: liquidacion.manoObra,
                    cobertura: liquidacion.cobertura,
                    materialReal: liquidacion.materialReal,
                    boletasMateriales: liquidacion.boletasMateriales,
                    observacionesFinancieras: liquidacion.observacionesFinancieras
                  }
                });
                response = `✅ Liquidación encontrada para tarea #${numeroMatch[1]}. Vamos a actualizar los datos no calculados.\n\n💰 Mano de Obra (actual: ${liquidacion.manoObra || 0}):`;
              }
            } catch (error) {
              response = `❌ Error al obtener liquidación. Por favor, intenta de nuevo.`;
              setConversationState({
                step: 'idle',
                numeroTarea: '',
                manoObra: '',
                cobertura: '',
                materialReal: '',
                boletasMateriales: '',
                observacionesFinancieras: '',
                currentValues: {}
              });
            }
          }
        } catch (error) {
          response = `❌ Error al buscar tarea. Por favor, verifica el número e intenta de nuevo.`;
          setConversationState({
            step: 'idle',
            numeroTarea: '',
            manoObra: '',
            cobertura: '',
            materialReal: '',
            boletasMateriales: '',
            observacionesFinancieras: '',
            currentValues: {}
          });
        }
      } else {
        // Usuario no incluyó el número de tarea, pedirlo
        setConversationState({
          step: 'asking_numero_tarea',
          numeroTarea: '',
          manoObra: '',
          cobertura: '',
          materialReal: '',
          boletasMateriales: '',
          observacionesFinancieras: '',
          currentValues: {}
        });
        response = '🔧 Para actualizar la liquidación, necesito el número de tarea. Ejemplo: 244818';
        await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 1000));
        setMessages(prev => [...prev, {
          type: 'bot',
          content: response,
          timestamp: new Date()
        }]);
        return;
      }
    } else if (step === 'asking_numero_tarea') {
      const numeroMatch = query.match(/^\s*(\d+)\s*$/);
      if (!numeroMatch) {
        response = '❌ Por favor, ingresa un número de tarea válido (solo dígitos). Ejemplo: 244818';
      } else {
        try {
          // Verificar que existe la tarea y liquidación
          const responseTarea = await api.get(`/bot/tarea/${numeroMatch[1]}`);
          if (!responseTarea.data.success) {
            response = `❌ Tarea ${numeroMatch[1]} no encontrada. Por favor, verifica el número e intenta de nuevo.`;
            setConversationState(prev => ({ ...prev, step: 'idle' }));
          } else {
            // Obtener liquidación actual por número de tarea
            try {
              const responseLiquidacion = await api.get(`/liquidaciones/tarea/numero/${numeroMatch[1]}`);
              if (!responseLiquidacion.data.data) {
                response = `❌ No existe liquidación para la tarea ${numeroMatch[1]}. Por favor, crea una liquidación primero.`;
                setConversationState(prev => ({ ...prev, step: 'idle' }));
              } else {
                const liquidacion = responseLiquidacion.data.data;
                setConversationState(prev => ({
                  ...prev,
                  step: 'asking_mano_obra',
                  numeroTarea: numeroMatch[1],
                  currentValues: {
                    manoObra: liquidacion.manoObra,
                    cobertura: liquidacion.cobertura,
                    materialReal: liquidacion.materialReal,
                    boletasMateriales: liquidacion.boletasMateriales,
                    observacionesFinancieras: liquidacion.observacionesFinancieras
                  }
                }));
                response = `✅ Liquidación encontrada para tarea #${numeroMatch[1]}. Vamos a actualizar los datos no calculados.\n\n💰 Mano de Obra (actual: ${liquidacion.manoObra || 0}):`;
              }
            } catch (error) {
              response = `❌ Error al obtener liquidación. Por favor, intenta de nuevo.`;
              setConversationState(prev => ({ ...prev, step: 'idle' }));
            }
          }
        } catch (error) {
          response = `❌ Error al buscar tarea. Por favor, verifica el número e intenta de nuevo.`;
          setConversationState(prev => ({ ...prev, step: 'idle' }));
        }
      }
    } else if (step === 'asking_mano_obra') {
      if (query.trim() === '') {
        setConversationState(prev => ({ ...prev, step: 'asking_cobertura', manoObra: '' }));
        response = `⏭️ Mano de Obra sin cambios.\n\n🛡️ Cobertura (actual: ${conversationState.currentValues.cobertura || 0}):`;
      } else {
        const valor = parseFloat(query);
        if (isNaN(valor)) {
          response = '❌ Por favor, ingresa un número válido para Mano de Obra o presiona Enter para dejarlo sin cambios.';
        } else {
          setConversationState(prev => ({ ...prev, step: 'asking_cobertura', manoObra: valor.toString() }));
          response = `✅ Mano de Obra actualizada a ${valor}\n\n🛡️ Cobertura (actual: ${conversationState.currentValues.cobertura || 0}):`;
        }
      }
    } else if (step === 'asking_cobertura') {
      if (query.trim() === '') {
        setConversationState(prev => ({ ...prev, step: 'asking_material_real', cobertura: '' }));
        response = `⏭️ Cobertura sin cambios.\n\n📦 Material Real (actual: ${conversationState.currentValues.materialReal || 0}):`;
      } else {
        const valor = parseFloat(query);
        if (isNaN(valor)) {
          response = '❌ Por favor, ingresa un número válido para Cobertura o presiona Enter para dejarlo sin cambios.';
        } else {
          setConversationState(prev => ({ ...prev, step: 'asking_material_real', cobertura: valor.toString() }));
          response = `✅ Cobertura actualizada a ${valor}\n\n📦 Material Real (actual: ${conversationState.currentValues.materialReal || 0}):`;
        }
      }
    } else if (step === 'asking_material_real') {
      if (query.trim() === '') {
        setConversationState(prev => ({ ...prev, step: 'asking_boletas_materiales', materialReal: '' }));
        response = `⏭️ Material Real sin cambios.\n\n🧾 Boletas de Materiales (actual: ${conversationState.currentValues.boletasMateriales || 0}):`;
      } else {
        const valor = parseFloat(query);
        if (isNaN(valor)) {
          response = '❌ Por favor, ingresa un número válido para Material Real o presiona Enter para dejarlo sin cambios.';
        } else {
          setConversationState(prev => ({ ...prev, step: 'asking_boletas_materiales', materialReal: valor.toString() }));
          response = `✅ Material Real actualizado a ${valor}\n\n🧾 Boletas de Materiales (actual: ${conversationState.currentValues.boletasMateriales || 0}):`;
        }
      }
    } else if (step === 'asking_boletas_materiales') {
      if (query.trim() === '') {
        setConversationState(prev => ({ ...prev, step: 'asking_observaciones', boletasMateriales: '' }));
        response = `⏭️ Boletas de Materiales sin cambios.\n\n📝 Observaciones Financieras (actual: ${conversationState.currentValues.observacionesFinancieras || 'Sin observaciones'}):`;
      } else {
        const valor = parseFloat(query);
        if (isNaN(valor)) {
          response = '❌ Por favor, ingresa un número válido para Boletas de Materiales o presiona Enter para dejarlo sin cambios.';
        } else {
          setConversationState(prev => ({ ...prev, step: 'asking_observaciones', boletasMateriales: valor.toString() }));
          response = `✅ Boletas de Materiales actualizada a ${valor}\n\n📝 Observaciones Financieras (actual: ${conversationState.currentValues.observacionesFinancieras || 'Sin observaciones'}):`;
        }
      }
    } else if (step === 'asking_observaciones') {
      setConversationState(prev => ({ ...prev, step: 'confirming', observacionesFinancieras: query.trim() }));
      response = `✅ Observaciones Financieras actualizada.\n\n📋 Resumen de cambios:\n` +
        (conversationState.manoObra ? `💰 Mano de Obra: ${conversationState.manoObra}\n` : '') +
        (conversationState.cobertura ? `🛡️ Cobertura: ${conversationState.cobertura}\n` : '') +
        (conversationState.materialReal ? `📦 Material Real: ${conversationState.materialReal}\n` : '') +
        (conversationState.boletasMateriales ? `🧾 Boletas de Materiales: ${conversationState.boletasMateriales}\n` : '') +
        (query.trim() ? `📝 Observaciones: ${query.trim()}\n` : '') +
        `\n¿Confirmas la actualización? (si/no)`;
    } else if (step === 'confirming') {
      if (lowerQuery === 'si' || lowerQuery === 'sí' || lowerQuery === 'yes') {
        try {
          const actualizacion: any = {};
          if (conversationState.manoObra) actualizacion.manoObra = parseFloat(conversationState.manoObra);
          if (conversationState.cobertura) actualizacion.cobertura = parseFloat(conversationState.cobertura);
          if (conversationState.materialReal) actualizacion.materialReal = parseFloat(conversationState.materialReal);
          if (conversationState.boletasMateriales) actualizacion.boletasMateriales = parseFloat(conversationState.boletasMateriales);
          if (conversationState.observacionesFinancieras) actualizacion.observacionesFinancieras = conversationState.observacionesFinancieras;

          const responseUpdate = await api.put('/bot/liquidacion/actualizar', {
            numeroTarea: conversationState.numeroTarea,
            ...actualizacion
          });

          if (responseUpdate.data.success) {
            response = '✅ Liquidación actualizada exitosamente. ¿En qué más puedo ayudarte?';
            setConversationState({
              step: 'idle',
              numeroTarea: '',
              manoObra: '',
              cobertura: '',
              materialReal: '',
              boletasMateriales: '',
              observacionesFinancieras: '',
              currentValues: {}
            });
          } else {
            response = `❌ Error al actualizar liquidación: ${responseUpdate.data.message}`;
            setConversationState(prev => ({ ...prev, step: 'idle' }));
          }
        } catch (error) {
          response = '❌ Error al actualizar liquidación. Por favor, intenta de nuevo.';
          setConversationState(prev => ({ ...prev, step: 'idle' }));
        }
      } else if (lowerQuery === 'no') {
        response = '❌ Actualización cancelada. ¿En qué más puedo ayudarte?';
        setConversationState({
          step: 'idle',
          numeroTarea: '',
          manoObra: '',
          cobertura: '',
          materialReal: '',
          boletasMateriales: '',
          observacionesFinancieras: '',
          currentValues: {}
        });
      } else {
        response = '❌ Por favor, responde "si" para confirmar o "no" para cancelar.';
      }
    } else if (lowerQuery.includes('cancelar') && step !== 'idle') {
      handleCancelConversation();
      return;
    }
    // Respuestas normales del bot
    else if (lowerQuery.includes('hola') || lowerQuery.includes('buen día') || lowerQuery.includes('buenas tardes') || lowerQuery.includes('buenas noches') ||
        lowerQuery.includes('hola sepi') || lowerQuery.includes('buenos días') || lowerQuery.includes('hey') || lowerQuery.includes('que tal') ||
        lowerQuery.includes('sepi') || lowerQuery.includes('asistente')) {
      const saludos = [
        '¡Hola! Soy Sepi, ¿en qué puedo ayudarte hoy? 😊',
        '¡Buen día! ¿Qué necesitas consultar? 🌞',
        '¡Hola! Estoy aquí para ayudarte con las tareas 🤖',
        '¡Buenas! ¿Cómo puedo asistirte hoy? 👋'
      ];
      response = saludos[Math.floor(Math.random() * saludos.length)];
    } else if (lowerQuery.includes('cómo estás') || lowerQuery.includes('como estas')) {
      const estados = [
        '¡Estoy perfecto! Listo para ayudarte con las tareas 🤖✨',
        '¡Muy bien! Gracias por preguntar 😊 ¿Qué necesitas?',
        '¡Excelente! Siempre listo para asistirte 🤖',
        '¡Todo bien! ¿En qué puedo ayudarte hoy? 😊'
      ];
      response = estados[Math.floor(Math.random() * estados.length)];
    }
    // Detectar si es un número de tarea (cualquier cantidad de dígitos)
    const numeroMatch = query.match(/^\s*(\d+)\s*$/);
    if (numeroMatch && step === 'idle') {
      try {
        const responseTarea = await api.get(`/bot/tarea/${numeroMatch[1]}`);
        if (responseTarea.data.success) {
          const tarea = responseTarea.data.tarea;
          // Si es usuario, verificar que la tarea le pertenezca
          if (isUsuario && user?._id) {
            const perteneceATecnico = tarea.tecnicos?.some((t: any) => t._id === user._id);
            if (!perteneceATecnico) {
              response = `❌ La tarea #${numeroMatch[1]} no está asignada a ti. Está asignada a otro técnico.`;
            } else {
              response = `🔍 Tarea encontrada:\n📋 Número: ${tarea.numero}\n📝 Título: ${tarea.titulo}\n👤 Cliente: ${tarea.cliente || 'No especificado'}\n🔄 Estado: ${tarea.estado}\n� Fecha: ${tarea.fechaEjecucion ? new Date(tarea.fechaEjecucion).toLocaleDateString() : 'No especificada'}\n📍 Dirección: ${tarea.direccion || 'No especificada'}\n\n📄 Descripción:\n${tarea.descripcion || 'Sin descripción'}`;
            }
          } else {
            // Admin ve todas las tareas
            response = `🔍 Tarea encontrada:\n📋 Número: ${tarea.numero}\n📝 Título: ${tarea.titulo}\n👤 Cliente: ${tarea.cliente || 'No especificado'}\n🔄 Estado: ${tarea.estado}\n📅 Fecha: ${tarea.fechaEjecucion ? new Date(tarea.fechaEjecucion).toLocaleDateString() : 'No especificada'}\n📍 Dirección: ${tarea.direccion || 'No especificada'}\n\n📄 Descripción:\n${tarea.descripcion || 'Sin descripción'}`;
          }
        } else {
          response = `❌ Tarea #${numeroMatch[1]} no encontrada.`;
        }
      } catch (error) {
        response = `❌ Error al buscar tarea. Por favor, intenta de nuevo.`;
      }
    } else if (lowerQuery.includes('chiste') && step === 'idle') {
      let chisteAleatorio;
      if (isAdmin) {
        chisteAleatorio = chistes[Math.floor(Math.random() * chistes.length)];
      } else if (isUsuario) {
        chisteAleatorio = chistesTecnicos[Math.floor(Math.random() * chistesTecnicos.length)];
      } else if (isAdminConsorcio) {
        chisteAleatorio = chistesAdminsConsorcio[Math.floor(Math.random() * chistesAdminsConsorcio.length)];
      } else {
        chisteAleatorio = chistes[Math.floor(Math.random() * chistes.length)];
      }
      response = `😄 ${chisteAleatorio}`;
    } else if ((lowerQuery.includes('hora') || lowerQuery.includes('qué hora')) && step === 'idle') {
      const { hora } = getCurrentDateTime();
      response = `🕐 Son las ${hora}`;
    } else if ((lowerQuery.includes('fecha') || lowerQuery.includes('qué día')) && step === 'idle') {
      const { fecha } = getCurrentDateTime();
      response = `📅 Hoy es ${fecha}`;
    } else if ((lowerQuery.includes('tareas') || lowerQuery.includes('tarea')) && step === 'idle' && !lowerQuery.includes('actualizar liquidación')) {
      try {
        const params: any = {};
        
        // Determinar endpoint según el rol
        const endpoint = isAdminConsorcio ? '/tareas-consorcio' : '/tareas';
        
        // Si es usuario, filtrar por su ID
        if (isUsuario && user?._id) {
          params.usuario = user._id;
        }

        if (lowerQuery.includes('hoy')) {
          const today = new Date();
          const tomorrow = new Date(today);
          tomorrow.setDate(today.getDate() + 1);
          params.fechaDesde = today.toISOString().split('T')[0];
          params.fechaHasta = tomorrow.toISOString().split('T')[0];
        } else if (lowerQuery.includes('mañana')) {
          const tomorrow = new Date();
          const dayAfterTomorrow = new Date(tomorrow);
          tomorrow.setDate(tomorrow.getDate() + 1);
          dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 1);
          params.fechaDesde = tomorrow.toISOString().split('T')[0];
          params.fechaHasta = dayAfterTomorrow.toISOString().split('T')[0];
        } else if (lowerQuery.includes('pendiente')) {
          params.estado = 'pendiente';
        } else if (lowerQuery.includes('buscar') || lowerQuery.includes('número')) {
          response = isUsuario 
            ? '🔍 Para buscar una de tus tareas por número, escribime:\n\n"Buscar una de mis tareas por número #244818"\n\nO simplemente escribime el número: "244818"'
            : isAdminConsorcio
            ? '🔍 Para buscar una de tus tareas de consorcio por número, escribime:\n\n"Buscar tarea #244818"\n\nO simplemente escribime el número: "244818"'
            : '🔍 Para buscar una tarea por número, escribime:\n\n"Buscar tarea #244818"\n\nO simplemente escribime el número: "244818"';
          await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 1000));
          setMessages(prev => [...prev, {
            type: 'bot',
            content: response,
            timestamp: new Date()
          }]);
          return;
        } else {
          response = '🤖 Puedo ayudarte con:\n\n• Ver tareas de hoy/mañana\n• Buscar tareas por número\n• Contar tareas pendientes\n• Decirte la hora y fecha\n• Contarte chistes 😄\n\n¿Qué necesitas?';
          await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 1000));
          setMessages(prev => [...prev, {
            type: 'bot',
            content: response,
            timestamp: new Date()
          }]);
          return;
        }

        const responseTareas = await api.get(endpoint, { params });
        const tareas = responseTareas.data.data || responseTareas.data.tareas || [];
        
        if (tareas.length === 0) {
          response = '🔍 No encontré tareas con esos criterios.';
        } else {
          const tareasTexto = tareas.slice(0, 10).map((t: any) => 
            `${t.numero} - ${t.cliente || t.titulo || 'Sin cliente'} (${t.estado})`
          ).join('\n');
          response = `🔍 Encontré ${tareas.length} tarea${tareas.length !== 1 ? 's' : ''}:\n\n${tareasTexto}${tareas.length > 10 ? '\n\n... y más' : ''}`;
        }
      } catch (error) {
        response = '❌ Error al buscar tareas. Por favor, intenta de nuevo.';
      }
    } else if (step === 'idle') {
      response = '🤔 No entendí esa consulta. Prueba con una de las preguntas rápidas de arriba.';
    }

    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 1000));

    setMessages(prev => [...prev, {
      type: 'bot',
      content: response,
      timestamp: new Date()
    }]);
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('es-AR', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  return (
    <>
      {/* Botón flotante */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-4 right-6 md:right-8 bg-orange-500 text-white p-4 rounded-full shadow-lg hover:bg-orange-600 transition-all duration-300 z-50"
          style={{ width: '60px', height: '60px' }}
        >
          🤖
        </button>
      )}

      {/* Ventana de chat */}
      {isOpen && (
        <div className={`fixed bottom-0 right-4 md:right-6 w-[90%] ${isExpanded ? 'md:w-[600px] md:h-[700px]' : 'md:w-96 md:h-[600px]'} h-[600px] bg-white shadow-2xl rounded-t-2xl z-50 flex flex-col transition-all duration-300`}>
          {/* Header */}
          <div className="bg-orange-500 text-white p-4 rounded-t-2xl flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span style={{ fontSize: '20px' }}>🤖</span>
              <span className="font-semibold">Sepi</span>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="text-white hover:bg-orange-600 p-1 rounded text-xl hidden md:block"
                title={isExpanded ? "Reducir" : "Expandir"}
              >
                {isExpanded ? '−' : '+'}
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="text-white hover:bg-orange-600 p-1 rounded text-xl"
              >
                ×
              </button>
            </div>
          </div>

          {/* Mensajes */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'} mb-3`}
              >
                <div
                  className={`max-w-[80%] p-3 rounded-2xl ${
                    message.type === 'user'
                      ? 'bg-green-500 text-white ml-auto'
                      : 'bg-white border border-gray-200 text-gray-800'
                  }`}
                >
                  <div className="flex items-center space-x-2 mb-1">
                    <span style={{ fontSize: '16px' }}>
                      {message.type === 'bot' ? '🤖' : '👤'}
                    </span>
                    <span className="text-xs opacity-60">
                      {formatTime(message.timestamp)}
                    </span>
                  </div>
                  <div className="whitespace-pre-wrap text-sm">
                    {message.content}
                  </div>
                </div>
              </div>
            ))}
            {isTyping && (
              <div className="flex justify-start mb-3">
                <div className="bg-white border border-gray-200 text-gray-800 p-3 rounded-2xl max-w-[80%]">
                  <div className="flex items-center space-x-2">
                    <span style={{ fontSize: '16px' }}>🤖</span>
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    </div>
                    <span className="text-sm text-gray-500">Escribiendo...</span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Acciones rápidas */}
          <div className="border-t border-gray-200 p-3 bg-white">
            <div className="mb-3">
              <div className="text-xs text-gray-500 mb-2">Preguntas sugeridas:</div>
              <div className="flex flex-wrap gap-1">
                {isUsuario && usuarioQuickQuestions.map((question, index) => (
                  <button
                    key={`usuario-${index}`}
                    onClick={() => handleQuickQuestion(question)}
                    className="bg-green-50 hover:bg-green-100 text-green-700 px-2 py-1 rounded text-xs transition-colors border border-green-200"
                  >
                    {question}
                  </button>
                ))}
                {isAdminConsorcio && adminConsorcioQuickQuestions.map((question, index) => (
                  <button
                    key={`adminconsorcio-${index}`}
                    onClick={() => handleQuickQuestion(question)}
                    className="bg-blue-50 hover:bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs transition-colors border border-blue-200"
                  >
                    {question}
                  </button>
                ))}
                {isAdmin && adminQuickQuestions.map((question, index) => (
                  <button
                    key={`admin-${index}`}
                    onClick={() => handleQuickQuestion(question)}
                    className="bg-purple-50 hover:bg-purple-100 text-purple-700 px-2 py-1 rounded text-xs transition-colors border border-purple-200"
                  >
                    {question}
                  </button>
                ))}
                {quickQuestions.map((question, index) => (
                  <button
                    key={index}
                    onClick={() => handleQuickQuestion(question)}
                    className="bg-orange-50 hover:bg-orange-100 text-orange-700 px-2 py-1 rounded text-xs transition-colors"
                  >
                    {question}
                  </button>
                ))}
              </div>
            </div>

            {/* Botón cancelar conversación */}
            {conversationState.step !== 'idle' && (
              <div className="mb-3">
                <button
                  onClick={handleCancelConversation}
                  className="w-full bg-red-50 hover:bg-red-100 text-red-700 px-3 py-2 rounded text-sm transition-colors border border-red-200"
                >
                  ❌ Cancelar conversación
                </button>
              </div>
            )}

            {/* Input */}
            <div className="flex items-center space-x-2">
              <input
                ref={inputRef}
                id="chatbot-input"
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Escribe tu consulta..."
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 focus:border-2 text-sm transition-all duration-200 text-gray-900 placeholder-gray-500"
                style={{ color: '#111827' }}
              />
              <button
                onClick={() => handleSend()}
                disabled={!inputValue.trim() || isTyping}
                className="bg-orange-500 hover:bg-orange-600 disabled:bg-gray-300 text-white p-2 rounded-lg transition-colors"
              >
                Enviar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ChatBot;

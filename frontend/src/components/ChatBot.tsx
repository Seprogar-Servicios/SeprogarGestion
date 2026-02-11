import { useState, useEffect, useRef } from 'react';

interface Message {
  type: 'user' | 'bot';
  content: string;
  timestamp: Date;
}

const ChatBot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const quickQuestions = [
    "¿Qué tareas tengo hoy?",
    "¿Cuántas tareas pendientes?",
    "Buscar tarea por número",
    "¿Qué tareas hay para mañana?",
    "Contame un chiste",
    "¿Qué hora es?",
    "¿Qué fecha es hoy?"
  ];

  const chistes = [
    "¿Por qué los programadores prefieren la oscuridad? Porque la luz les atrae bugs 🐛",
    "¿Qué le dice un HTTP a un HTTPS? ¡Oye, te ves más segura! 🔒",
    "¿Por qué los buenos programadores nunca se mueren? Se limitan a pasar al siguiente nivel 🎮",
    "¿Cuál es el lenguaje de programación más divertido? JavaScript, porque siempre tiene un 'chiste' ready 😄",
    "¿Por qué los algoritmos son como los chistes? Si tienes que explicarlo, ya no es gracioso 🤔"
  ];

  useEffect(() => {
    setMessages([{
      type: 'bot',
      content: '🤖 ¡Hola! Soy Futi, el asistente de Futurgas. ¿En qué puedo ayudarte hoy?',
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
    setInputValue(question);
    // Forzar el re-renderizado y enfocar el input
    setTimeout(() => {
      const inputElement = document.getElementById('chatbot-input') as HTMLInputElement;
      if (inputElement) {
        inputElement.focus();
        inputElement.setSelectionRange(inputElement.value.length, inputElement.value.length);
      }
    }, 100);
    handleSend();
  };

  const handleSend = async () => {
    if (!inputValue.trim()) return;

    const userMessage: Message = {
      type: 'user',
      content: inputValue.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsTyping(true);

    try {
      await simulateBotResponse(inputValue.trim());
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

  const simulateBotResponse = async (query: string) => {
    const lowerQuery = query.toLowerCase();
    
    let response = '';

    if (lowerQuery.includes('chiste')) {
      const chisteAleatorio = chistes[Math.floor(Math.random() * chistes.length)];
      response = `😄 ${chisteAleatorio}`;
    } else if (lowerQuery.includes('hora') || lowerQuery.includes('qué hora')) {
      const { hora } = getCurrentDateTime();
      response = `🕐 Son las ${hora}`;
    } else if (lowerQuery.includes('fecha') || lowerQuery.includes('qué día')) {
      const { fecha } = getCurrentDateTime();
      response = `📅 Hoy es ${fecha}`;
    } else if (lowerQuery.includes('tareas') || lowerQuery.includes('tarea')) {
      if (lowerQuery.includes('hoy')) {
        response = '🔍 Buscando tareas de hoy...\n\n✅ Encontré 3 tareas para hoy:\n1. Tarea #244819 - Cliente: María González\n2. Tarea #244820 - Cliente: Juan Pérez\n3. Tarea #244821 - Cliente: Laura Martínez';
      } else if (lowerQuery.includes('mañana')) {
        response = '🔍 Buscando tareas de mañana...\n\n✅ Encontré 2 tareas para mañana:\n1. Tarea #244822 - Cliente: Carlos Rodríguez\n2. Tarea #244823 - Cliente: Ana López';
      } else if (lowerQuery.includes('pendiente')) {
        response = '📋 Tareas pendientes:\n\n✅ Total: 5 tareas pendientes\n🔄 En progreso: 2 tareas\n✅ Completadas hoy: 3 tareas';
      } else if (lowerQuery.includes('buscar') || lowerQuery.includes('número')) {
        response = '🔍 Para buscar una tarea por número, escribime:\n\n"Buscar tarea #244818"\n\nO simplemente escribime el número: "244818"';
      } else {
        response = '🤖 Puedo ayudarte con:\n\n• Ver tareas de hoy/mañana\n• Buscar tareas por número\n• Contar tareas pendientes\n• Decirte la hora y fecha\n• Contarte chistes 😄\n\n¿Qué necesitas?';
      }
    } else {
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
          className="fixed bottom-4 right-8 bg-[#00a4eb] text-white p-4 rounded-full shadow-lg hover:bg-[#0093d4] transition-all duration-300 z-50"
          style={{ width: '60px', height: '60px' }}
        >
          🤖
        </button>
      )}

      {/* Ventana de chat */}
      {isOpen && (
        <div className="fixed bottom-0 right-4 w-96 h-[600px] bg-white shadow-2xl rounded-t-2xl z-50 flex flex-col">
          {/* Header */}
          <div className="bg-[#00a4eb] text-white p-4 rounded-t-2xl flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span style={{ fontSize: '20px' }}>🤖</span>
              <span className="font-semibold">Futi</span>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-white hover:bg-[#0093d4] p-1 rounded text-xl"
            >
              ×
            </button>
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
                {quickQuestions.map((question, index) => (
                  <button
                    key={index}
                    onClick={() => handleQuickQuestion(question)}
                    className="bg-blue-50 hover:bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs transition-colors"
                  >
                    {question}
                  </button>
                ))}
              </div>
            </div>

            {/* Input */}
            <div className="flex items-center space-x-2">
              <input
                id="chatbot-input"
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Escribe tu consulta..."
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00a4eb] focus:border-transparent text-sm"
              />
              <button
                onClick={handleSend}
                disabled={!inputValue.trim() || isTyping}
                className="bg-[#00a4eb] hover:bg-[#0093d4] disabled:bg-gray-300 text-white p-2 rounded-lg transition-colors"
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

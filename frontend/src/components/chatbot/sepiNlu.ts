export type SepiIntent =
  | 'greeting'
  | 'cancel'
  | 'help'
  | 'joke'
  | 'time'
  | 'date'
  | 'tutorial'
  | 'update_liquidacion'
  | 'search_task'
  | 'tasks_today'
  | 'tasks_tomorrow'
  | 'tasks_pending'
  | 'unknown';

export interface SepiParseResult {
  intent: SepiIntent;
  /** Número de tarea detectado (si hay) */
  taskNumber?: string;
  /** Confianza relativa 0–1 (heurística) */
  confidence: number;
  normalized: string;
}

/** Quita tildes y normaliza espacios / puntuación suave */
export function normalizeText(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[¿?¡!.,;:()'"`]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function includesAny(text: string, phrases: string[]): boolean {
  return phrases.some((p) => text.includes(p));
}

function matchesAny(text: string, patterns: RegExp[]): boolean {
  return patterns.some((re) => re.test(text));
}

/** Extrae número de tarea: "244818", "#244818", "tarea 244818", etc. */
export function extractTaskNumber(raw: string, normalized: string): string | undefined {
  const hashMatch = raw.match(/#\s*(\d{3,})/);
  if (hashMatch) return hashMatch[1];

  const labeled = normalized.match(
    /(?:tarea|nro|numero|n |num)\s*[:=]?\s*(\d{3,})/
  );
  if (labeled) return labeled[1];

  const afterVerb = normalized.match(
    /(?:buscar|buscame|busca|ver|mostrame|mostrar|traer|dame|consultar|consulta)\s+(?:la\s+)?(?:tarea\s+)?(\d{3,})/
  );
  if (afterVerb) return afterVerb[1];

  const liquidacionNum = normalized.match(
    /(?:liquidacion|liq)\s+(?:de\s+)?(?:la\s+)?(?:tarea\s+)?(\d{3,})/
  );
  if (liquidacionNum) return liquidacionNum[1];

  // Mensaje que es solo (o casi solo) un número
  const onlyNumber = normalized.match(/^(\d{3,})$/);
  if (onlyNumber) return onlyNumber[1];

  // Último recurso: un número largo en la frase si no hay mucho más ruido
  const anyNumber = normalized.match(/\b(\d{4,})\b/);
  if (anyNumber && normalized.split(' ').length <= 6) return anyNumber[1];

  return undefined;
}

const GREETING = [
  'hola',
  'buenas',
  'buen dia',
  'buenos dias',
  'buenas tardes',
  'buenas noches',
  'hey',
  'holis',
  'que tal',
  'como va',
  'como estas',
  'sepi',
  'assistente',
  'asistente',
];

const CANCEL = ['cancelar', 'cancela', 'salir del flujo', 'abortar', 'cancelar conversacion'];

const JOKE = [
  'chiste',
  'chistes',
  'contame un chiste',
  'conta un chiste',
  'decime un chiste',
  'hace reir',
  'algo gracioso',
];

const TIME = ['hora', 'que hora', 'que hora es', 'hora actual'];

const DATE = [
  'fecha',
  'que dia',
  'que dia es',
  'que fecha',
  'hoy es',
  'dia de hoy',
];

const TUTORIAL = [
  'tutorial',
  'tour',
  'guia',
  'guiame',
  'como se usa',
  'como funciona',
  'ensename',
  'ayudame a crear',
];

const HELP = [
  'ayuda',
  'help',
  'que podes',
  'que puedes',
  'que sabes',
  'opciones',
  'comandos',
  'menu',
  'que haces',
  'en que me ayudas',
];

const LIQUIDACION = [
  'actualizar liquidacion',
  'update liquidacion',
  'editar liquidacion',
  'modificar liquidacion',
  'cargar liquidacion',
  'liquidacion',
  'liq ',
];

const TASKS_TODAY = [
  'hoy',
  'de hoy',
  'para hoy',
  'del dia',
  'este dia',
  'el dia de hoy',
];

const TASKS_TOMORROW = ['manana', 'de manana', 'para manana', 'del dia siguiente'];

const TASKS_PENDING = [
  'pendiente',
  'pendientes',
  'sin hacer',
  'por hacer',
  'abiertas',
  'en espera',
];

const TASK_TOPIC = [
  'tarea',
  'tareas',
  'trabajo',
  'trabajos',
  'agenda',
  'orden',
  'ordenes',
  'servicio',
  'servicios',
];

const SEARCH_HINT = [
  'buscar',
  'buscame',
  'busca',
  'encontrar',
  'encontrame',
  'ver tarea',
  'mostrar tarea',
  'consulta tarea',
  'por numero',
  'por nro',
];

/**
 * Interpreta el mensaje del usuario fuera de un flujo conversacional guiado.
 */
export function parseSepiMessage(raw: string): SepiParseResult {
  const normalized = normalizeText(raw);
  const taskNumber = extractTaskNumber(raw, normalized);

  if (!normalized) {
    return { intent: 'unknown', confidence: 0, normalized };
  }

  // Cancelar tiene prioridad alta si aparece
  if (includesAny(normalized, CANCEL.map(normalizeText))) {
    return { intent: 'cancel', confidence: 0.95, normalized, taskNumber };
  }

  // Número solo → buscar tarea
  if (taskNumber && /^\d{3,}$/.test(normalized)) {
    return { intent: 'search_task', taskNumber, confidence: 0.99, normalized };
  }

  // Liquidación (admin)
  if (
    includesAny(normalized, LIQUIDACION.map(normalizeText)) ||
    matchesAny(normalized, [/actualiz.*liq/, /liq.*tarea/, /editar.*liq/])
  ) {
    return {
      intent: 'update_liquidacion',
      taskNumber,
      confidence: taskNumber ? 0.95 : 0.85,
      normalized,
    };
  }

  // Buscar tarea con número embebido
  if (taskNumber && (includesAny(normalized, SEARCH_HINT) || includesAny(normalized, TASK_TOPIC))) {
    return { intent: 'search_task', taskNumber, confidence: 0.92, normalized };
  }

  // Solo pista de búsqueda sin número
  if (includesAny(normalized, SEARCH_HINT) && includesAny(normalized, TASK_TOPIC)) {
    return { intent: 'search_task', confidence: 0.7, normalized };
  }

  const talksAboutTasks = includesAny(normalized, TASK_TOPIC);
  const hasToday = includesAny(normalized, TASKS_TODAY);
  const hasTomorrow = includesAny(normalized, TASKS_TOMORROW);
  const hasPending = includesAny(normalized, TASKS_PENDING);

  // "hoy" / "mañana" / "pendientes" aunque no digan "tarea" explícito
  // (ej: "qué tengo mañana", "mostrame pendientes")
  const scheduleHint =
    talksAboutTasks ||
    includesAny(normalized, [
      'tengo',
      'hay',
      'mostrame',
      'mostrar',
      'listame',
      'lista',
      'dame',
      'traer',
      'cuantas',
      'cuantos',
      'agenda',
    ]);

  if (hasTomorrow && scheduleHint) {
    return { intent: 'tasks_tomorrow', confidence: 0.9, normalized, taskNumber };
  }
  if (hasToday && scheduleHint) {
    return { intent: 'tasks_today', confidence: 0.9, normalized, taskNumber };
  }
  if (hasPending && scheduleHint) {
    return { intent: 'tasks_pending', confidence: 0.9, normalized, taskNumber };
  }

  // "tareas" genérico sin filtro → help
  if (talksAboutTasks) {
    return { intent: 'help', confidence: 0.65, normalized, taskNumber };
  }

  if (includesAny(normalized, TUTORIAL)) {
    return { intent: 'tutorial', confidence: 0.85, normalized };
  }

  if (includesAny(normalized, JOKE)) {
    return { intent: 'joke', confidence: 0.9, normalized };
  }

  if (includesAny(normalized, TIME)) {
    return { intent: 'time', confidence: 0.9, normalized };
  }

  if (includesAny(normalized, DATE)) {
    return { intent: 'date', confidence: 0.9, normalized };
  }

  if (includesAny(normalized, HELP)) {
    return { intent: 'help', confidence: 0.85, normalized };
  }

  // Saludo corto
  if (
    includesAny(normalized, GREETING) &&
    normalized.split(' ').length <= 5
  ) {
    return { intent: 'greeting', confidence: 0.85, normalized };
  }

  // Número embebido sin otras pistas fuertes
  if (taskNumber) {
    return { intent: 'search_task', taskNumber, confidence: 0.75, normalized };
  }

  return { intent: 'unknown', confidence: 0.2, normalized, taskNumber };
}

export function helpMessage(isAdmin: boolean): string {
  return (
    'Puedo ayudarte con:\n' +
    '• Tareas de hoy / mañana\n' +
    '• Tareas pendientes\n' +
    '• Buscar por número (ej: 244818 o "buscá la tarea 244818")\n' +
    (isAdmin ? '• Actualizar liquidación (ej: "actualizar liquidación 244818")\n' : '') +
    '• Tutoriales cuando una sección CRUD está vacía\n' +
    '• Hora, fecha o un chiste'
  );
}

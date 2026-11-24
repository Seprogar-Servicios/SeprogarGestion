/**
 * Utilidades para trabajar con Google Maps
 */

// Lista de sufijos comunes de Buenos Aires que podemos eliminar para acortar la URL
const BA_SUFFIXES = [
  ', capital federal', ', caba', ', buenos aires', ', argentina',
  ', capital federal.', ', caba.', ', buenos aires.', ', argentina.',
  'capital federal', 'caba', 'buenos aires', 'argentina'
];

// Abreviaturas comunes en direcciones argentinas y sus expansiones
const ABREVIATURAS_DIRECCIONES: Record<string, string> = {
  'av\.': 'Avenida',
  'av': 'Avenida',
  'calle': 'Calle',
  'c\.': 'Calle',
  'pje\.': 'Pasaje',
  'pje': 'Pasaje',
  'ptes\.': 'Pasajes',
  'mcal\.': 'Mariscal',
  'mcal': 'Mariscal',
  'gral\.': 'General',
  'gral': 'General',
  'cnel\.': 'Coronel',
  'dr\.': 'Doctor',
  'san\.': 'San',
  'sta\.': 'Santa',
  'sra\.': 'Señora',
  'sr\.': 'Señor',
  'nro\.': 'N°',
  'nro': 'N°',
  'n\.°': 'N°',
  'n°': 'N°',
  'no\.': 'N°',
  'no': 'N°',
  'piso': 'Piso',
  'p\.': 'Piso',
  'depto\.': 'Departamento',
  'depto': 'Departamento',
  'dpto\.': 'Departamento',
  'dpto': 'Departamento',
  'torre': 'Torre',
  't\.': 'Torre',
  'edif\.': 'Edificio',
  'edif': 'Edificio',
  'local': 'Local',
  'l\.': 'Local',
  'oficina': 'Oficina',
  'of\.': 'Oficina',
  'apto\.': 'Apartamento',
  'apto': 'Apartamento',
  'apt\.': 'Apartamento',
  'apt': 'Apartamento',
  'entre\.': 'Entre',
  'entre': 'Entre',
  'y\.': 'y',
  'esq\.': 'Esquina',
  'esq': 'Esquina',
  'bis': 'Bis',
};

const LOCALITY_TYPOS: Array<{ re: RegExp; to: string }> = [
  { re: /\bonzalez\s*catan\b/gi, to: 'Gonzalez Catan' },
  { re: /\bgonzalez\s*catan\b/gi, to: 'Gonzalez Catan' },
  { re: /\bgonzález\s*catán\b/gi, to: 'Gonzalez Catan' },
  { re: /\bg\.?\s*catan\b/gi, to: 'Gonzalez Catan' },
  { re: /\bcapital\s*federal\b/gi, to: 'CABA' },
];

/**
 * Normaliza una dirección argentina para asegurar consistencia
 * @param direccion La dirección a normalizar
 * @returns Dirección normalizada
 */
export const normalizeAddress = (direccion: string): string => {
  if (!direccion || direccion.trim() === '') {
    return '';
  }

  let normalized = direccion.trim();

  // Paso 1: Normalizar espacios múltiples
  normalized = normalized.replace(/\s+/g, ' ').trim();

  // "Calle, 123 barrio" → "Calle 123, barrio"
  normalized = normalized.replace(/^([^,]+),\s*(\d{1,5})\s+(.+)$/i, '$1 $2, $3');

  // Paso 2: Expandir abreviaturas comunes (case-insensitive)
  Object.entries(ABREVIATURAS_DIRECCIONES).forEach(([abbr, expansion]) => {
    const regex = new RegExp(`\\b${abbr}\\b`, 'gi');
    normalized = normalized.replace(regex, expansion);
  });

  for (const { re, to } of LOCALITY_TYPOS) {
    normalized = normalized.replace(re, to);
  }

  // Paso 3: Normalizar formato de números (N°, No, etc.)
  normalized = normalized.replace(/\bN[º°]?\s*(\d+)/gi, 'N° $1');
  normalized = normalized.replace(/\bNo\s*(\d+)/gi, 'N° $1');

  // Paso 4: Asegurar formato correcto de calle y número
  // Si tiene formato "Calle 123" o "Avenida 456", mantener
  // Si tiene formato "123 Calle", intentar reordenar
  const numeroMatch = normalized.match(/^(\d+)\s+(.+)$/);
  if (numeroMatch) {
    const numero = numeroMatch[1];
    const resto = numeroMatch[2];
    // Solo reordenar si parece ser una dirección (contiene palabras típicas de direcciones)
    if (/^(calle|avenida|av|pje|pasaje|san|santa)/i.test(resto)) {
      normalized = `${resto} ${numero}`;
    }
  }

  // Paso 5: Normalizar separadores
  normalized = normalized.replace(/,\s*/g, ', '); // Asegurar espacio después de coma
  normalized = normalized.replace(/\s*,\s*/g, ', '); // Eliminar espacios extra antes de coma

  // Paso 6: Capitalizar primera letra de cada palabra (excepto preposiciones)
  const preposiciones = ['de', 'la', 'el', 'los', 'las', 'del', 'y', 'o', 'en', 'a', 'por', 'para'];
  normalized = normalized.toLowerCase().split(' ').map((word, index) => {
    if (preposiciones.includes(word) && index > 0) {
      return word;
    }
    return word.charAt(0).toUpperCase() + word.slice(1);
  }).join(' ');

  // Paso 7: Restaurar mayúsculas en abreviaturas expandidas
  normalized = normalized.replace(/\bavenida\b/gi, 'Avenida');
  normalized = normalized.replace(/\bpasaje\b/gi, 'Pasaje');
  normalized = normalized.replace(/\bsan\b/gi, 'San');
  normalized = normalized.replace(/\bsanta\b/gi, 'Santa');

  // Paso 8: Eliminar redundancia de ciudad si ya está presente
  const tieneBuenosAires = /buenos\s+aires|caba|capital\s+federal/i.test(normalized);
  if (tieneBuenosAires) {
    // Eliminar sufijos redundantes
    BA_SUFFIXES.forEach(suffix => {
      const regex = new RegExp(`,?\\s*${suffix.replace(/\./g, '\\.')}\\.?$`, 'gi');
      normalized = normalized.replace(regex, '');
    });
  }

  // Paso 9: Limpiar espacios finales y múltiples comas
  normalized = normalized.replace(/,+/g, ',').trim();
  normalized = normalized.replace(/\s+/g, ' ').trim();

  return normalized;
};

/**
 * Convierte una dirección en una URL de Google Maps
 * @param direccion La dirección a convertir
 * @returns URL de Google Maps con la dirección como destino
 */
export const formatDireccionToMapsUrl = (direccion: string): string => {
  if (!direccion || direccion.trim() === '') {
    return '';
  }
  
  // Usar la nueva función de normalización
  const normalizedAddress = normalizeAddress(direccion);
  
  // Verificar si ya incluye Buenos Aires para evitar redundancia
  const tieneBuenosAires = /buenos\s+aires|caba|capital\s+federal/i.test(normalizedAddress);
  
  // Usar el formato más corto posible de Google Maps
  const encodedDireccion = encodeURIComponent(normalizedAddress);
  
  // Solo Buenos Aires / AMBA
  if (tieneBuenosAires) {
    return `https://www.google.com/maps/search/?api=1&query=${encodedDireccion}`;
  }

  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    `${normalizedAddress}, Buenos Aires, Argentina`
  )}`;
};

/** Link de Maps por coordenadas exactas (zoom alto para el técnico). */
export const formatCoordsToMapsUrl = (lat: number, lng: number): string => {
  if (lat == null || lng == null || Number.isNaN(lat) || Number.isNaN(lng)) return '';
  const q = `${lat},${lng}`;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
};

type TaskLocationLike = {
  direccion?: string | null;
  ubicacionMapa?: {
    lat?: number | null;
    lng?: number | null;
    fuente?: 'gps' | 'direccion' | 'tecnico' | string | null;
  } | null;
  ubicacionDireccion?: {
    lat?: number | null;
    lng?: number | null;
  } | null;
};

/**
 * Solo link por coordenadas confirmadas (autocomplete).
 * No usa búsqueda por texto: eso puede mandar al técnico lejos.
 */
export const formatTaskToPreciseMapsUrl = (task: TaskLocationLike): string => {
  const dirLat = task.ubicacionDireccion?.lat;
  const dirLng = task.ubicacionDireccion?.lng;
  if (typeof dirLat === 'number' && typeof dirLng === 'number') {
    return formatCoordsToMapsUrl(dirLat, dirLng);
  }

  const lat = task.ubicacionMapa?.lat;
  const lng = task.ubicacionMapa?.lng;
  const fuente = task.ubicacionMapa?.fuente;
  if (
    typeof lat === 'number' &&
    typeof lng === 'number' &&
    fuente === 'direccion'
  ) {
    return formatCoordsToMapsUrl(lat, lng);
  }
  return '';
};

/**
 * Link para UI interna.
 * Prefiere coords confirmadas; si no hay, cae a texto (solo pantallas admin, no WhatsApp).
 */
export const formatTaskToMapsUrl = (task: TaskLocationLike): string => {
  const precise = formatTaskToPreciseMapsUrl(task);
  if (precise) return precise;
  return formatDireccionToMapsUrl(task.direccion || '');
};

/**
 * URL de Google Maps embebible en un iframe (sin API key).
 */
export const formatDireccionToMapsEmbedUrl = (direccion: string): string => {
  if (!direccion || direccion.trim() === '') {
    return '';
  }

  const normalized = normalizeAddress(direccion);
  if (!normalized) return '';
  const q = /caba|buenos\s+aires|capital/i.test(normalized)
    ? normalized
    : `${normalized}, Buenos Aires, Argentina`;
  return `https://www.google.com/maps?q=${encodeURIComponent(q)}&output=embed`;
};

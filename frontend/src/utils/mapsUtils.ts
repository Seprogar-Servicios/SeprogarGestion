/**
 * Utilidades para trabajar con Google Maps
 */

// Lista de sufijos comunes de Buenos Aires que podemos eliminar para acortar la URL
const BA_SUFFIXES = [
  ', capital federal', ', caba', ', buenos aires', ', argentina',
  ', capital federal.', ', caba.', ', buenos aires.', ', argentina.',
  'capital federal', 'caba', 'buenos aires', 'argentina'
];

/**
 * Limpia y acorta una dirección de Buenos Aires
 * @param direccion La dirección a limpiar
 * @returns Dirección limpia y acortada
 */
const cleanBuenosAiresAddress = (direccion: string): string => {
  if (!direccion) return '';
  
  // Convertir a minúsculas y quitar acentos para mejor coincidencia
  let cleaned = direccion.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // Quitar acentos
    .replace(/[^\w\s,]/g, '') // Quitar caracteres especiales
    .replace(/\s+/g, ' ') // Normalizar espacios
    .trim();
  
  // Quitar sufijos comunes
  BA_SUFFIXES.forEach(suffix => {
    if (cleaned.endsWith(suffix)) {
      cleaned = cleaned.substring(0, cleaned.length - suffix.length).trim();
    }
  });
  
  return cleaned;
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
  
  // Limpiar la dirección para hacerla más corta
  const cleanedAddress = cleanBuenosAiresAddress(direccion);
  
  // Usar el formato más corto posible de Google Maps
  const encodedDireccion = encodeURIComponent(cleanedAddress);
  
  // Usar el formato más corto posible de Google Maps
  return `https://maps.google.com/?q=${encodedDireccion},Buenos+Aires`;
};

/**
 * Utilidades para trabajar con Google Maps
 */

/**
 * Convierte una dirección en una URL de Google Maps
 * @param direccion La dirección a convertir
 * @returns URL de Google Maps con la dirección como destino
 */
export const formatDireccionToMapsUrl = (direccion: string): string => {
  if (!direccion || direccion.trim() === '') {
    return '';
  }
  
  // Codificar la dirección para URL
  const encodedDireccion = encodeURIComponent(direccion.trim());
  
  // Crear URL de Google Maps con la dirección como destino
  return `https://www.google.com/maps/search/?api=1&query=${encodedDireccion}`;
};

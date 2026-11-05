export interface GeoCoords {
  lat: number;
  lng: number;
}

/**
 * Obtiene la ubicación GPS del dispositivo (si el usuario autoriza).
 * Timeout corto para no bloquear el cambio de estado.
 */
export const getCurrentPosition = (timeoutMs = 8000): Promise<GeoCoords | null> => {
  return new Promise((resolve) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      resolve(null);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
      },
      () => resolve(null),
      {
        enableHighAccuracy: true,
        timeout: timeoutMs,
        maximumAge: 60_000,
      }
    );
  });
};

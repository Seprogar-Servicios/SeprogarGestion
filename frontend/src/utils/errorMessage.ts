/**
 * Extrae un mensaje legible para el admin desde:
 * - rejectWithValue (string | { message })
 * - Axios error
 * - Error estándar
 */
export function getErrorMessage(error: unknown, fallback = 'Ocurrió un error'): string {
  if (error == null) return fallback;

  if (typeof error === 'string') {
    const t = error.trim();
    return t || fallback;
  }

  if (typeof error === 'object') {
    const anyErr = error as Record<string, any>;

    // RTK unwrap(rejectWithValue({ message }))
    if (typeof anyErr.message === 'string' && anyErr.message.trim()) {
      // Evitar el genérico "Rejected" de RTK si hay payload mejor
      if (anyErr.message !== 'Rejected') return anyErr.message.trim();
    }

    if (typeof anyErr.payload === 'string' && anyErr.payload.trim()) {
      return anyErr.payload.trim();
    }
    if (anyErr.payload && typeof anyErr.payload.message === 'string') {
      return String(anyErr.payload.message).trim() || fallback;
    }

    // Axios
    const data = anyErr.response?.data;
    if (typeof data === 'string' && data.trim()) return data.trim();
    if (data && typeof data.message === 'string' && data.message.trim()) {
      const base = data.message.trim();
      const detail =
        typeof data.error === 'string' && data.error.trim() && data.error !== base
          ? ` (${data.error.trim()})`
          : '';
      return `${base}${detail}`;
    }
    if (Array.isArray(data?.errors) && data.errors.length) {
      return data.errors
        .map((e: any) => e?.message || e)
        .filter(Boolean)
        .join(' · ');
    }
  }

  return fallback;
}

/** Limpia el payload de tarea antes de POST/PUT para no romper Joi/Mongoose. */
export function sanitizeTaskPayload<T extends Record<string, any>>(raw: T): T {
  const data: Record<string, any> = { ...raw };

  // No reenviar metadatos de documento / UI
  delete data._id;
  delete data.id;
  delete data.__v;
  delete data.createdAt;
  delete data.updatedAt;
  delete data.fechaCreacion;
  delete data.fechaModificacion;
  delete data.materiales;
  delete data.creadoPor;
  delete data.horaInicio;
  delete data.horaFin;

  // Técnicos: siempre array de IDs (0, 1 o N)
  if (Array.isArray(data.tecnicos)) {
    data.tecnicos = data.tecnicos
      .map((t: any) => (typeof t === 'string' ? t : t?._id))
      .filter((id: any) => typeof id === 'string' && id.trim());
  } else if (data.tecnicos == null) {
    data.tecnicos = [];
  }

  // Fechas / textos vacíos → omitir o null
  if (data.fechaEjecucion === '' || data.fechaEjecucion == null) {
    delete data.fechaEjecucion;
  } else if (typeof data.fechaEjecucion === 'string' && data.fechaEjecucion.includes('T')) {
    data.fechaEjecucion = data.fechaEjecucion.slice(0, 10);
  }
  if (data.franja_horaria == null) data.franja_horaria = '';

  const toId = (v: any) =>
    v == null || v === '' ? null : typeof v === 'string' ? v : v?._id ? String(v._id) : null;

  data.especialidad = toId(data.especialidad);
  data.proveedor = toId(data.proveedor);

  // Coords: si no hay, no mandar objetos vacíos
  if (data.ubicacionMapa && (data.ubicacionMapa.lat == null || data.ubicacionMapa.lng == null)) {
    delete data.ubicacionMapa;
  }
  if (
    data.ubicacionDireccion &&
    data.ubicacionDireccion !== null &&
    (data.ubicacionDireccion.lat == null || data.ubicacionDireccion.lng == null)
  ) {
    delete data.ubicacionDireccion;
  }

  return data as T;
}

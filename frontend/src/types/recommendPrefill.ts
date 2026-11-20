/** Prefill del modal de alta de tarea desde Recomendación (filtro manual). */
export type RecommendCreatePrefill = {
  direccion?: string;
  especialidadId?: string;
  fechaEjecucion?: string;
  horaInicio?: string;
  horaFin?: string;
  tecnicoId?: string;
  coords?: { lat: number; lng: number };
};

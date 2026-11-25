const { haversineKm } = require('./geocode');

const parseHmToMinutes = (hm) => {
  if (!hm || typeof hm !== 'string') return null;
  const m = hm.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  return h * 60 + min;
};

const parseFranja = (franja) => {
  if (!franja || typeof franja !== 'string') return null;
  const m = franja.trim().match(/(\d{1,2}):(\d{2})\s*[-–—]\s*(\d{1,2}):(\d{2})/);
  if (!m) return null;
  const start = Number(m[1]) * 60 + Number(m[2]);
  let end = Number(m[3]) * 60 + Number(m[4]);
  // cruza medianoche
  if (end <= start) end += 24 * 60;
  return { start, end };
};

/** Solo coords ya cargadas (mapa o dirección confirmada). Nunca inventa. */
const taskCoords = (tarea) => {
  if (
    tarea?.ubicacionMapa &&
    typeof tarea.ubicacionMapa.lat === 'number' &&
    typeof tarea.ubicacionMapa.lng === 'number'
  ) {
    return { lat: tarea.ubicacionMapa.lat, lng: tarea.ubicacionMapa.lng };
  }
  if (
    tarea?.ubicacionDireccion &&
    typeof tarea.ubicacionDireccion.lat === 'number' &&
    typeof tarea.ubicacionDireccion.lng === 'number'
  ) {
    return { lat: tarea.ubicacionDireccion.lat, lng: tarea.ubicacionDireccion.lng };
  }
  return null;
};

/**
 * Punto de ancla del técnico para una franja propuesta.
 * - Sin tareas del día → ubicacionBase
 * - Con tareas → última tarea que termina antes/al inicio de la franja (o solapa)
 */
const resolveAnchor = (tecnico, tareasDia, proposedStart, proposedEnd) => {
  const base =
    tecnico.ubicacionBase?.lat != null && tecnico.ubicacionBase?.lng != null
      ? {
          lat: tecnico.ubicacionBase.lat,
          lng: tecnico.ubicacionBase.lng,
          fuente: 'base',
          label: tecnico.localidad || tecnico.direccion || 'Domicilio / base',
        }
      : null;

  const withTime = (tareasDia || [])
    .map((t) => {
      const franja = parseFranja(t.franja_horaria);
      const coords = taskCoords(t);
      return { task: t, franja, coords };
    })
    .filter((x) => x.franja)
    .sort((a, b) => a.franja.start - b.franja.start);

  if (withTime.length === 0) {
    return {
      anchor: base,
      modo: 'base',
      motivo: base
        ? 'Sin tareas ese día · cercanía a su domicilio/base'
        : 'Sin tareas ese día · sin ubicación base cargada',
      conflictoFranja: false,
      tareaAncla: null,
      tareasDelDia: 0,
    };
  }

  // Conflicto: solapa con alguna franja del día
  const conflicto = withTime.some(
    (x) => x.franja.start < proposedEnd && proposedStart < x.franja.end
  );

  // Última tarea que termina antes o al inicio propuesto
  const prev = [...withTime]
    .reverse()
    .find((x) => x.franja.end <= proposedStart + 15); // tolerancia 15 min

  if (prev && prev.coords) {
    return {
      anchor: {
        lat: prev.coords.lat,
        lng: prev.coords.lng,
        fuente: 'tarea',
        label: `#${prev.task.numero || ''} ${prev.task.titulo || ''}`.trim(),
      },
      modo: 'recorrido',
      motivo: `Cerca de terminar #${prev.task.numero || 'tarea'} (${prev.task.franja_horaria || 'sin franja'})`,
      conflictoFranja: conflicto,
      tareaAncla: {
        _id: prev.task._id,
        numero: prev.task.numero,
        titulo: prev.task.titulo,
        franja_horaria: prev.task.franja_horaria,
        direccion: prev.task.direccion,
      },
      tareasDelDia: withTime.length,
    };
  }

  // Si la primera tarea del día es después: viene de la base
  const first = withTime[0];
  if (first && first.franja.start >= proposedEnd && base) {
    return {
      anchor: base,
      modo: 'base_antes_recorrido',
      motivo: `Aún no empieza su recorrido · cerca de su base (primera tarea ${first.task.franja_horaria})`,
      conflictoFranja: conflicto,
      tareaAncla: null,
      tareasDelDia: withTime.length,
    };
  }

  // Fallback: tarea más cercana en tiempo (inicio)
  const nearest = withTime.reduce((best, cur) => {
    const d = Math.abs(cur.franja.start - proposedStart);
    if (!best || d < best.d) return { d, cur };
    return best;
  }, null);

  if (nearest?.cur?.coords) {
    return {
      anchor: {
        lat: nearest.cur.coords.lat,
        lng: nearest.cur.coords.lng,
        fuente: 'tarea',
        label: `#${nearest.cur.task.numero || ''}`.trim(),
      },
      modo: 'recorrido',
      motivo: `Referencia: tarea cercana en horario #${nearest.cur.task.numero || ''} (${nearest.cur.task.franja_horaria || ''})`,
      conflictoFranja: conflicto,
      tareaAncla: {
        _id: nearest.cur.task._id,
        numero: nearest.cur.task.numero,
        titulo: nearest.cur.task.titulo,
        franja_horaria: nearest.cur.task.franja_horaria,
        direccion: nearest.cur.task.direccion,
      },
      tareasDelDia: withTime.length,
    };
  }

  return {
    anchor: base,
    modo: base ? 'base' : 'sin_ubicacion',
    motivo: base
      ? 'Tiene tareas pero sin coords · se usa su base'
      : 'Sin ubicación utilizable para estimar distancia',
    conflictoFranja: conflicto,
    tareaAncla: null,
    tareasDelDia: withTime.length,
  };
};

/**
 * @param {object} opts
 * @param {object} opts.targetCoords {lat,lng}
 * @param {number} opts.proposedStart minutes
 * @param {number} opts.proposedEnd minutes
 * @param {Array} opts.tecnicos usuarios técnicos
 * @param {Map<string, Array>} opts.tareasPorTecnico
 */
const rankTecnicos = ({
  targetCoords,
  proposedStart,
  proposedEnd,
  tecnicos,
  tareasPorTecnico,
  /** true = ordenar solo por cercanía (ignora solape de franja al rankear) */
  priorizarCercania = false,
}) => {
  let omitidosSinCoords = 0;

  const ranked = [];
  for (const tec of tecnicos) {
    const tid = String(tec._id);
    const tareasDia = tareasPorTecnico.get(tid) || [];
    const resolved = resolveAnchor(tec, tareasDia, proposedStart, proposedEnd);

    // Sin ancla con coords reales → no entra a la recomendación
    if (!resolved.anchor || !targetCoords) {
      omitidosSinCoords += 1;
      continue;
    }

    const km = haversineKm(resolved.anchor, targetCoords);
    if (km == null) {
      omitidosSinCoords += 1;
      continue;
    }

    let score = km;
    if (!priorizarCercania && resolved.conflictoFranja) score += 50;

    ranked.push({
      tecnico: {
        _id: tec._id,
        nombre: tec.nombre,
        telefono: tec.telefono,
        localidad: tec.localidad,
        direccion: tec.direccion,
        color: tec.color,
        especialidad: tec.especialidad,
      },
      distanciaKm: Math.round(km * 10) / 10,
      modo: resolved.modo,
      motivo: resolved.motivo,
      conflictoFranja: resolved.conflictoFranja,
      tareasDelDia: resolved.tareasDelDia,
      ancla: {
        lat: resolved.anchor.lat,
        lng: resolved.anchor.lng,
        fuente: resolved.anchor.fuente,
        label: resolved.anchor.label,
      },
      tareaAncla: resolved.tareaAncla,
      score,
    });
  }

  ranked.sort((a, b) => a.score - b.score || a.distanciaKm - b.distanciaKm);
  return { recomendaciones: ranked, omitidosSinCoords };
};

module.exports = {
  parseHmToMinutes,
  parseFranja,
  resolveAnchor,
  rankTecnicos,
  taskCoords,
  haversineKm,
};

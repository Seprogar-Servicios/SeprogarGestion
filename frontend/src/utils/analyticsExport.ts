/** Export helpers for Analytics (CSV / Excel-friendly). */

export const downloadTextFile = (filename: string, content: string, mime = 'text/csv;charset=utf-8') => {
  const blob = new Blob(['\uFEFF' + content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

const escapeCsv = (value: unknown) => {
  const s = value == null ? '' : String(value);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
};

export const rowsToCsv = (headers: string[], rows: Array<Array<string | number | null | undefined>>) => {
  const lines = [headers.map(escapeCsv).join(',')];
  for (const row of rows) {
    lines.push(row.map(escapeCsv).join(','));
  }
  return lines.join('\n');
};

export const exportTasksCsv = (
  tasks: Array<{
    numero?: string;
    titulo?: string;
    estado?: string;
    cliente?: string;
    cuentaCliente?: string;
    fechaEjecucion?: string;
    fechaCompletado?: string | null;
    franja_horaria?: string;
    direccion?: string;
    origen?: string;
    tecnicos?: Array<{ nombre?: string } | string>;
  }>,
  filename = 'analisis-tareas.csv'
) => {
  const headers = [
    'numero',
    'titulo',
    'estado',
    'cliente',
    'cuenta',
    'fechaEjecucion',
    'fechaCompletado',
    'franja',
    'direccion',
    'origen',
    'tecnicos',
  ];
  const rows = tasks.map((t) => {
    const tecs = Array.isArray(t.tecnicos)
      ? t.tecnicos
          .map((x) => (typeof x === 'object' && x ? x.nombre || '' : String(x || '')))
          .filter(Boolean)
          .join(' | ')
      : '';
    return [
      t.numero,
      t.titulo,
      t.estado,
      t.cliente,
      t.cuentaCliente,
      t.fechaEjecucion,
      t.fechaCompletado,
      t.franja_horaria,
      t.direccion,
      t.origen,
      tecs,
    ];
  });
  downloadTextFile(filename, rowsToCsv(headers, rows));
};

export const exportKpisCsv = (
  rows: Array<{ metrica: string; valor: string | number; nota?: string }>,
  filename = 'analisis-kpis.csv'
) => {
  downloadTextFile(
    filename,
    rowsToCsv(
      ['metrica', 'valor', 'nota'],
      rows.map((r) => [r.metrica, r.valor, r.nota || ''])
    )
  );
};

export const exportConsorcioCsv = (
  tasks: Array<{
    numero?: string;
    titulo?: string;
    estado?: string;
    cliente?: string;
    precio?: number;
    fechaEjecucion?: string;
    fechaCreacion?: string;
    franja_horaria?: string;
    direccion?: string;
    administradorConsorcio?: { nombre?: string } | string | null;
    tecnicos?: Array<{ nombre?: string } | string>;
    comprobantePago?: string | null;
    fotos?: unknown[];
  }>,
  filename = 'analisis-consorcio.csv'
) => {
  const headers = [
    'numero',
    'titulo',
    'estado',
    'cliente',
    'precio',
    'fechaEjecucion',
    'fechaCreacion',
    'franja',
    'direccion',
    'admin',
    'tecnicos',
    'comprobante',
    'fotos',
  ];
  const rows = tasks.map((t) => {
    const admin =
      typeof t.administradorConsorcio === 'object' && t.administradorConsorcio
        ? t.administradorConsorcio.nombre || ''
        : '';
    const tecs = Array.isArray(t.tecnicos)
      ? t.tecnicos
          .map((x) => (typeof x === 'object' && x ? x.nombre || '' : String(x || '')))
          .filter(Boolean)
          .join(' | ')
      : '';
    return [
      t.numero,
      t.titulo,
      t.estado,
      t.cliente,
      t.precio ?? '',
      t.fechaEjecucion,
      t.fechaCreacion,
      t.franja_horaria,
      t.direccion,
      admin,
      tecs,
      t.comprobantePago ? 'si' : 'no',
      Array.isArray(t.fotos) ? t.fotos.length : 0,
    ];
  });
  downloadTextFile(filename, rowsToCsv(headers, rows));
};

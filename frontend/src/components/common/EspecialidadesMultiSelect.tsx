import React, { useMemo, useState } from 'react';
import { Search, X, Check } from 'lucide-react';

export type EspecialidadOption = {
  _id: string;
  nombre: string;
};

type Props = {
  options: EspecialidadOption[];
  value: string[];
  onChange: (ids: string[]) => void;
  label?: string;
  hint?: string;
  className?: string;
};

const EspecialidadesMultiSelect: React.FC<Props> = ({
  options,
  value,
  onChange,
  label = 'Especialidades',
  hint = 'Podés asignar una o varias especialidades.',
  className = '',
}) => {
  const [query, setQuery] = useState('');
  const selectedSet = useMemo(() => new Set(value), [value]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = [...(options || [])].sort((a, b) =>
      (a.nombre || '').localeCompare(b.nombre || '', 'es')
    );
    if (!q) return list;
    return list.filter((o) => (o.nombre || '').toLowerCase().includes(q));
  }, [options, query]);

  const selected = useMemo(
    () => value.map((id) => options.find((o) => o._id === id)).filter(Boolean) as EspecialidadOption[],
    [value, options]
  );

  const toggle = (id: string) => {
    if (selectedSet.has(id)) onChange(value.filter((x) => x !== id));
    else onChange([...value, id]);
  };

  return (
    <div className={className}>
      {label ? (
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
          {label}
        </label>
      ) : null}

      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {selected.map((o) => (
            <span
              key={o._id}
              className="inline-flex items-center gap-1 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-200 px-2.5 py-1 text-xs font-medium"
            >
              {o.nombre}
              <button
                type="button"
                onClick={() => onChange(value.filter((x) => x !== o._id))}
                className="rounded-full p-0.5 hover:bg-emerald-200/80 dark:hover:bg-emerald-800"
                aria-label={`Quitar ${o.nombre}`}
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="relative mb-2">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar especialidad…"
          className="w-full pl-9 pr-3 py-2.5 rounded-lg border-0 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="max-h-40 overflow-y-auto rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 divide-y divide-gray-100 dark:divide-gray-700">
        {filtered.length === 0 ? (
          <p className="px-3 py-3 text-sm text-gray-500">Sin coincidencias.</p>
        ) : (
          filtered.map((o) => {
            const checked = selectedSet.has(o._id);
            return (
              <button
                key={o._id}
                type="button"
                onClick={() => toggle(o._id)}
                className={`w-full flex items-center gap-3 px-3 py-2 text-left text-sm ${
                  checked
                    ? 'bg-emerald-50 dark:bg-emerald-900/20'
                    : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
                }`}
              >
                <span
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border ${
                    checked
                      ? 'bg-emerald-600 border-emerald-600 text-white'
                      : 'border-gray-300 dark:border-gray-500'
                  }`}
                >
                  {checked ? <Check className="h-3.5 w-3.5" /> : null}
                </span>
                <span className="font-medium text-gray-900 dark:text-white">{o.nombre}</span>
              </button>
            );
          })
        )}
      </div>
      {hint ? <p className="mt-1 text-[11px] text-gray-400">{hint}</p> : null}
    </div>
  );
};

export default EspecialidadesMultiSelect;

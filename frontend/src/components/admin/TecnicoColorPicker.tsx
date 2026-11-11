import React, { useMemo } from 'react';
import { TECNICO_COLOR_PALETTE, normalizeColor } from '../../utils/tecnicoColors';

type Props = {
  value?: string | null;
  onChange: (color: string) => void;
  /** Colores ya usados por otros técnicos */
  takenColors: string[];
  /** Al editar, el color actual del técnico no se bloquea */
  allowColor?: string | null;
  className?: string;
};

const TecnicoColorPicker: React.FC<Props> = ({
  value,
  onChange,
  takenColors,
  allowColor,
  className = '',
}) => {
  const taken = useMemo(() => {
    const set = new Set(
      takenColors.map((c) => normalizeColor(c)).filter((c): c is string => Boolean(c))
    );
    const own = normalizeColor(allowColor);
    if (own) set.delete(own);
    return set;
  }, [takenColors, allowColor]);

  const current = normalizeColor(value);

  return (
    <div className={className}>
      <div className="flex items-center gap-2 mb-2">
        <span
          className="inline-block h-6 w-6 rounded-full border border-slate-300 dark:border-slate-600 shadow-sm"
          style={{ backgroundColor: current || '#cbd5e1' }}
          title={current || 'Sin color'}
        />
        <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
          {current || 'Elegí un color'}
        </span>
      </div>
      <div className="grid grid-cols-10 sm:grid-cols-12 gap-1.5 max-h-40 overflow-y-auto p-1 rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-800/50">
        {TECNICO_COLOR_PALETTE.map((c) => {
          const isTaken = taken.has(c);
          const selected = current === c;
          return (
            <button
              key={c}
              type="button"
              disabled={isTaken}
              title={isTaken ? `${c} (en uso)` : c}
              onClick={() => onChange(c)}
              className={`h-6 w-6 rounded-md border transition focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-500 ${
                selected ? 'ring-2 ring-offset-1 ring-slate-900 dark:ring-white scale-110' : ''
              } ${isTaken ? 'opacity-25 cursor-not-allowed' : 'hover:scale-110 cursor-pointer'}`}
              style={{ backgroundColor: c }}
            />
          );
        })}
      </div>
      <p className="mt-1.5 text-[11px] text-slate-400">
        Cada técnico tiene un color único (aparecen apagados los ya usados).
      </p>
    </div>
  );
};

export default TecnicoColorPicker;

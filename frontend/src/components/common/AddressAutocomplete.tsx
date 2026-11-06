import React, { useEffect, useRef, useState } from 'react';
import { MapPin, Loader2 } from 'lucide-react';
import api from '../../config/api';

export type AddressSuggestion = {
  label: string;
  lat: number;
  lng: number;
};

type Props = {
  value: string;
  onChange: (value: string) => void;
  onSelect?: (suggestion: AddressSuggestion) => void;
  placeholder?: string;
  label?: string;
  disabled?: boolean;
  className?: string;
  inputClassName?: string;
  /** Solo localidad/barrio (misma API, copy distinto) */
  mode?: 'address' | 'localidad';
};

const AddressAutocomplete: React.FC<Props> = ({
  value,
  onChange,
  onSelect,
  placeholder,
  label,
  disabled,
  className = '',
  inputClassName = '',
  mode = 'address',
}) => {
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<number | null>(null);
  const skipFetchRef = useRef(false);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  useEffect(() => {
    if (skipFetchRef.current) {
      skipFetchRef.current = false;
      return;
    }
    if (debounceRef.current) window.clearTimeout(debounceRef.current);

    const q = value.trim();
    if (q.length < 3) {
      setSuggestions([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    debounceRef.current = window.setTimeout(async () => {
      try {
        const res = await api.get<{ success: boolean; data: AddressSuggestion[] }>('/geo/suggest', {
          params: { q, limit: 6 },
        });
        setSuggestions(res.data.data || []);
        setOpen(true);
      } catch {
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    }, 350);

    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, [value]);

  const pick = (s: AddressSuggestion) => {
    skipFetchRef.current = true;
    onChange(s.label);
    onSelect?.(s);
    setSuggestions([]);
    setOpen(false);
  };

  const defaultPlaceholder =
    mode === 'localidad'
      ? 'Ej. Lomas de Zamora, Palermo, Quilmes…'
      : 'Calle y altura, partido (Buenos Aires)…';

  return (
    <div className={`relative ${className}`} ref={wrapRef}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          {label}
        </label>
      )}
      <div className="relative">
        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
        <input
          type="text"
          value={value}
          disabled={disabled}
          autoComplete="off"
          placeholder={placeholder || defaultPlaceholder}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => suggestions.length > 0 && setOpen(true)}
          className={`w-full pl-9 pr-9 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${inputClassName}`}
        />
        {loading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 animate-spin" />
        )}
      </div>
      {open && suggestions.length > 0 && (
        <ul className="absolute z-50 mt-1 w-full max-h-56 overflow-auto rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-gray-800 shadow-lg">
          {suggestions.map((s) => (
            <li key={`${s.label}-${s.lat}-${s.lng}`}>
              <button
                type="button"
                className="w-full text-left px-3 py-2 text-sm text-slate-800 dark:text-slate-100 hover:bg-blue-50 dark:hover:bg-slate-700 flex items-start gap-2"
                onClick={() => pick(s)}
              >
                <MapPin className="h-3.5 w-3.5 mt-0.5 text-blue-500 flex-shrink-0" />
                <span>{s.label}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-1 text-[11px] text-slate-400">
        Sugerencias limitadas a Buenos Aires / Argentina
      </p>
    </div>
  );
};

export default AddressAutocomplete;

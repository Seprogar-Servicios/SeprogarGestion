import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
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
  const [errorHint, setErrorHint] = useState<string | null>(null);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number; width: number } | null>(
    null
  );
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLUListElement>(null);
  const debounceRef = useRef<number | null>(null);
  const skipFetchRef = useRef(false);

  const updateMenuPos = () => {
    const el = inputRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setMenuPos({
      top: rect.bottom + 4,
      left: rect.left,
      width: rect.width,
    });
  };

  useLayoutEffect(() => {
    if (!open) return;
    updateMenuPos();
  }, [open, suggestions.length, value]);

  useEffect(() => {
    if (!open) return;
    const onScrollOrResize = () => updateMenuPos();
    window.addEventListener('resize', onScrollOrResize);
    // capture scroll en contenedores con overflow (modales)
    window.addEventListener('scroll', onScrollOrResize, true);
    return () => {
      window.removeEventListener('resize', onScrollOrResize);
      window.removeEventListener('scroll', onScrollOrResize, true);
    };
  }, [open]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node;
      if (wrapRef.current?.contains(t) || menuRef.current?.contains(t)) return;
      setOpen(false);
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
      setErrorHint(null);
      setOpen(false);
      return;
    }

    setLoading(true);
    setErrorHint(null);
    debounceRef.current = window.setTimeout(async () => {
      try {
        const res = await api.get<{ success: boolean; data: AddressSuggestion[] }>('/geo/suggest', {
          params: { q, limit: 8 },
        });
        const list = res.data.data || [];
        setSuggestions(list);
        setOpen(list.length > 0);
        if (list.length === 0) {
          setErrorHint('Sin coincidencias en Buenos Aires. Probá calle + altura y partido.');
        }
      } catch (err: any) {
        setSuggestions([]);
        setOpen(false);
        const status = err?.response?.status;
        setErrorHint(
          status === 429
            ? 'Demasiadas consultas. Esperá un momento.'
            : 'No se pudieron cargar sugerencias de dirección.'
        );
      } finally {
        setLoading(false);
      }
    }, 300);

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
    setErrorHint(null);
  };

  const defaultPlaceholder =
    mode === 'localidad'
      ? 'Ej. Lomas de Zamora, Palermo, Quilmes…'
      : 'Ej. Av. Corrientes 1234, CABA';

  const menu =
    open && suggestions.length > 0 && menuPos
      ? createPortal(
          <ul
            ref={menuRef}
            className="fixed z-[9999] max-h-56 overflow-auto rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-gray-800 shadow-xl"
            style={{
              top: menuPos.top,
              left: menuPos.left,
              width: menuPos.width,
            }}
          >
            {suggestions.map((s) => (
              <li key={`${s.label}-${s.lat}-${s.lng}`}>
                <button
                  type="button"
                  className="w-full text-left px-3 py-2 text-sm text-slate-800 dark:text-slate-100 hover:bg-blue-50 dark:hover:bg-slate-700 flex items-start gap-2"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => pick(s)}
                >
                  <MapPin className="h-3.5 w-3.5 mt-0.5 text-blue-500 flex-shrink-0" />
                  <span>{s.label}</span>
                </button>
              </li>
            ))}
          </ul>,
          document.body
        )
      : null;

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
          ref={inputRef}
          type="text"
          value={value}
          disabled={disabled}
          autoComplete="off"
          placeholder={placeholder || defaultPlaceholder}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => {
            if (suggestions.length > 0) {
              updateMenuPos();
              setOpen(true);
            }
          }}
          className={`w-full pl-9 pr-9 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${inputClassName}`}
        />
        {loading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 animate-spin" />
        )}
      </div>
      {menu}
      {errorHint ? (
        <p className="mt-1 text-[11px] text-amber-600 dark:text-amber-400">{errorHint}</p>
      ) : (
        <p className="mt-1 text-[11px] text-slate-400">
          Sugerencias AMBA / Buenos Aires (USIG + Georef)
        </p>
      )}
    </div>
  );
};

export default AddressAutocomplete;

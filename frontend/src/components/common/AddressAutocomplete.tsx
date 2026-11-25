import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { MapPin, Loader2, CheckCircle2, Sparkles } from 'lucide-react';
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
  required?: boolean;
  className?: string;
  inputClassName?: string;
  /** Solo localidad/barrio (misma API, copy distinto) */
  mode?: 'address' | 'localidad';
  /** Oculta el texto de ayuda debajo del input */
  hideHint?: boolean;
  /**
   * Mostrar UX de “recomendado elegir de la lista”.
   * No bloquea guardar: el admin puede escribir libremente.
   * @deprecated requireSelect — se mantiene como alias de recommendSelect
   */
  recommendSelect?: boolean;
  requireSelect?: boolean;
  /** Estado externo: ya hay coords / sugerencia confirmada */
  confirmed?: boolean;
};

const AddressAutocomplete: React.FC<Props> = ({
  value,
  onChange,
  onSelect,
  placeholder,
  label,
  disabled,
  required,
  className = '',
  inputClassName = '',
  mode = 'address',
  hideHint = false,
  recommendSelect,
  requireSelect,
  confirmed: confirmedProp,
}) => {
  const showRecommend =
    typeof recommendSelect === 'boolean'
      ? recommendSelect
      : typeof requireSelect === 'boolean'
        ? requireSelect
        : true;

  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorHint, setErrorHint] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number; width: number } | null>(
    null
  );
  const [internalConfirmed, setInternalConfirmed] = useState(Boolean(confirmedProp));
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLUListElement>(null);
  const debounceRef = useRef<number | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const skipFetchRef = useRef(false);
  /** Evita pedir sugerencias al abrir un modal con dirección ya cargada. */
  const [interactive, setInteractive] = useState(false);

  const confirmed =
    typeof confirmedProp === 'boolean' ? confirmedProp : internalConfirmed;

  useEffect(() => {
    if (typeof confirmedProp === 'boolean') {
      setInternalConfirmed(confirmedProp);
    }
  }, [confirmedProp]);

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
      setActiveIndex(-1);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  useEffect(() => {
    if (!interactive) return;
    if (skipFetchRef.current) {
      skipFetchRef.current = false;
      return;
    }
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    abortRef.current?.abort();

    const q = value.trim();
    if (q.length < 3) {
      setSuggestions([]);
      setLoading(false);
      setErrorHint(null);
      setOpen(false);
      setActiveIndex(-1);
      return;
    }

    setLoading(true);
    setErrorHint(null);
    // Debounce un poco más: menos requests, mismo cache en backend
    debounceRef.current = window.setTimeout(async () => {
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      try {
        const res = await api.get<{ success: boolean; data: AddressSuggestion[] }>(
          '/geo/suggest',
          {
            params: { q, limit: 6 },
            signal: ctrl.signal,
          }
        );
        const list = res.data.data || [];
        setSuggestions(list);
        setActiveIndex(list.length > 0 ? 0 : -1);
        const focused = document.activeElement === inputRef.current;
        setOpen(list.length > 0 && focused);
        if (list.length === 0) {
          setErrorHint(
            mode === 'localidad'
              ? 'Sin coincidencias. Podés escribir a mano igual.'
              : 'Sin coincidencias. Podés guardar la dirección a mano igual.'
          );
        }
      } catch (err: any) {
        if (err?.code === 'ERR_CANCELED' || err?.name === 'CanceledError') return;
        setSuggestions([]);
        setOpen(false);
        setActiveIndex(-1);
        const status = err?.response?.status;
        setErrorHint(
          status === 429
            ? 'Demasiadas consultas. Esperá un momento.'
            : 'No se pudieron cargar sugerencias (podés escribir a mano).'
        );
      } finally {
        setLoading(false);
      }
    }, 220);

    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
      abortRef.current?.abort();
    };
  }, [value, mode, interactive]);

  const pick = (s: AddressSuggestion) => {
    skipFetchRef.current = true;
    setInternalConfirmed(true);
    onChange(s.label);
    onSelect?.(s);
    setSuggestions([]);
    setOpen(false);
    setActiveIndex(-1);
    setErrorHint(null);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open || suggestions.length === 0) {
      if (e.key === 'Escape') setOpen(false);
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % suggestions.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => (i <= 0 ? suggestions.length - 1 : i - 1));
    } else if (e.key === 'Enter' && activeIndex >= 0 && activeIndex < suggestions.length) {
      e.preventDefault();
      pick(suggestions[activeIndex]);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setOpen(false);
      setActiveIndex(-1);
    }
  };

  useEffect(() => {
    if (!open || activeIndex < 0 || !menuRef.current) return;
    const el = menuRef.current.children[activeIndex] as HTMLElement | undefined;
    el?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex, open]);

  const defaultPlaceholder =
    mode === 'localidad'
      ? 'Ej. Lomas de Zamora, Palermo, Quilmes…'
      : 'Calle y altura — ej. Av. Corrientes 1234';

  const hasText = value.trim().length > 0;
  const recommendHint = showRecommend && hasText && !confirmed;

  const menu =
    open && suggestions.length > 0 && menuPos
      ? createPortal(
          <ul
            ref={menuRef}
            role="listbox"
            className="fixed z-[9999] max-h-64 overflow-auto rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-gray-800 shadow-xl"
            style={{
              top: menuPos.top,
              left: menuPos.left,
              width: menuPos.width,
            }}
          >
            <li className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400 border-b border-slate-100 dark:border-slate-700 sticky top-0 bg-white dark:bg-gray-800">
              Recomendado · Buenos Aires
            </li>
            {suggestions.map((s, idx) => (
              <li key={`${s.label}-${s.lat}-${s.lng}`} role="option" aria-selected={idx === activeIndex}>
                <button
                  type="button"
                  className={`w-full text-left px-3 py-2.5 text-sm flex items-start gap-2 ${
                    idx === activeIndex
                      ? 'bg-blue-100 dark:bg-slate-600 text-slate-900 dark:text-white'
                      : 'text-slate-800 dark:text-slate-100 hover:bg-blue-50 dark:hover:bg-slate-700'
                  }`}
                  onMouseDown={(e) => e.preventDefault()}
                  onMouseEnter={() => setActiveIndex(idx)}
                  onClick={() => pick(s)}
                >
                  <MapPin className="h-3.5 w-3.5 mt-0.5 text-blue-500 flex-shrink-0" />
                  <span className="leading-snug">{s.label}</span>
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
          {required ? <span className="text-red-500"> *</span> : null}
        </label>
      )}
      <div className="relative">
        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          value={value}
          disabled={disabled}
          required={required}
          autoComplete="off"
          role="combobox"
          aria-expanded={open}
          aria-autocomplete="list"
          placeholder={placeholder || defaultPlaceholder}
          onChange={(e) => {
            setInteractive(true);
            setInternalConfirmed(false);
            onChange(e.target.value);
          }}
          onKeyDown={onKeyDown}
          onFocus={() => {
            setInteractive(true);
            if (suggestions.length > 0) {
              updateMenuPos();
              setOpen(true);
            }
          }}
          className={`w-full pl-9 pr-10 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-60 disabled:cursor-not-allowed ${
            confirmed && hasText
              ? 'border-emerald-400 dark:border-emerald-500'
              : recommendHint
                ? 'border-sky-300 dark:border-sky-600'
                : 'border-gray-300 dark:border-gray-600'
          } ${inputClassName}`}
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
          {loading ? (
            <Loader2 className="h-4 w-4 text-slate-400 animate-spin" />
          ) : confirmed && hasText ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          ) : recommendHint ? (
            <Sparkles className="h-4 w-4 text-sky-500" />
          ) : null}
        </span>
      </div>
      {menu}
      {!hideHint &&
        (errorHint ? (
          <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">{errorHint}</p>
        ) : confirmed && hasText ? (
          <p className="mt-1 text-[11px] text-emerald-600 dark:text-emerald-400">
            {mode === 'localidad'
              ? 'Localidad confirmada · útil para recomendaciones.'
              : 'Punto confirmado · útil para mapa y recomendaciones.'}
          </p>
        ) : recommendHint ? (
          <p className="mt-1 text-[11px] text-sky-700 dark:text-sky-300">
            {mode === 'localidad'
              ? 'Recomendado: elegí de la lista (opcional). Podés guardar a mano igual.'
              : 'Recomendado: elegí de la lista para mapa/recomendaciones (opcional). Podés guardar a mano.'}
          </p>
        ) : (
          <p className="mt-1 text-[11px] text-slate-400">
            {mode === 'localidad'
              ? 'Sugerencias CABA / AMBA (opcional).'
              : 'Calle + altura. Sugerencia recomendada pero opcional.'}
          </p>
        ))}
    </div>
  );
};

export default AddressAutocomplete;

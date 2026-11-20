/**
 * Anchos responsive unificados para todos los modales.
 * - sm/md: formularios cortos (ABM simple, confirmaciones)
 * - lg: formularios medianos
 * - xl: formularios de tarea / edición completa
 * - full: galerías, previews, tablas densas
 */
export type ModalSize = 'sm' | 'md' | 'lg' | 'xl' | 'full';

const WIDTH: Record<ModalSize, string> = {
  sm: 'w-full max-w-md lg:max-w-lg xl:max-w-xl',
  md: 'w-full max-w-lg lg:max-w-2xl xl:max-w-3xl',
  lg: 'w-full max-w-2xl lg:max-w-4xl xl:max-w-5xl 2xl:max-w-6xl',
  xl: 'w-full max-w-3xl lg:max-w-5xl xl:max-w-6xl 2xl:max-w-7xl',
  full: 'w-full max-w-4xl lg:max-w-6xl xl:max-w-7xl 2xl:max-w-[92vw]',
};

/** Overlay del modal (centrado, padding adaptable). */
export const modalOverlayClass =
  'fixed inset-0 z-50 flex items-center justify-center overflow-y-auto p-3 sm:p-6 bg-gray-900/70 backdrop-blur-sm';

/** Overlay alineado arriba (formularios largos). */
export const modalOverlayTopClass =
  'fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-3 sm:p-6 pt-10 sm:pt-14 bg-gray-900/70 backdrop-blur-sm';

/** Panel del modal según tamaño. Sumar bg/border/overflow según el caso. */
export const modalPanelClass = (size: ModalSize = 'md', extra = '') =>
  [
    'relative',
    WIDTH[size],
    'my-4 rounded-2xl shadow-2xl',
    extra,
  ]
    .filter(Boolean)
    .join(' ');

/** Grilla de campos dentro de modales anchos. */
export const modalFormGridClass =
  'grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3';

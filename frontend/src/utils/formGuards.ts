import type { KeyboardEvent } from 'react';

/**
 * Evita que Enter en inputs/selects envíe el formulario.
 * Solo se envía con click (o Enter) en el botón de submit.
 * Textareas quedan libres para saltos de línea.
 */
export function preventEnterSubmit(event: KeyboardEvent) {
  if (event.key !== 'Enter') return;

  const target = event.target as HTMLElement | null;
  if (!target) return;

  const tag = target.tagName.toLowerCase();
  if (tag === 'textarea') return;
  if (tag === 'button') return;
  if (tag === 'a') return;

  event.preventDefault();
}

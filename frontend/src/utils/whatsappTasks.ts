import type { Task } from '../types';
import { compareTasksBySchedule, toFechaEjecucionYmd } from './franjaHoraria';

/** Límite práctico de URL wa.me + texto (varía por dispositivo). */
const WA_URL_SAFE_LEN = 1800;

const WA_PANEL_KEY = 'futurgas.waPanel.v1';

export type WhatsAppPanelState = {
  open: boolean;
  selectedTecnico: string | null;
  selectedTasks: string[];
  expandedTecnico: string | null;
};

export const loadWhatsAppPanelState = (): Partial<WhatsAppPanelState> | null => {
  try {
    const raw = sessionStorage.getItem(WA_PANEL_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as Partial<WhatsAppPanelState>;
  } catch {
    return null;
  }
};

export const saveWhatsAppPanelState = (state: WhatsAppPanelState) => {
  try {
    sessionStorage.setItem(WA_PANEL_KEY, JSON.stringify(state));
  } catch {
    /* ignore quota / private mode */
  }
};

export const formatFechaEjecucionWa = (
  fecha?: string | null,
  style: 'long' | 'short' = 'long'
): string => {
  const ymd = toFechaEjecucionYmd(fecha || null);
  if (!ymd) return 'No programada';
  const [y, m, d] = ymd.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  if (style === 'short') {
    return dt.toLocaleDateString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  }
  return dt.toLocaleDateString('es-AR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

const digitsPhone = (phone: string) => phone.replace(/\D/g, '');

/** Mensaje admin → técnico (mismo formato que usan hoy). */
export const buildAdminTasksWhatsAppMessage = (tasks: Task[]): string => {
  const ordered = [...tasks].sort(compareTasksBySchedule);
  let message = `*=== TAREAS ASIGNADAS ===*\n\n`;

  ordered.forEach((task, index) => {
    message += `*TAREA ${index + 1}: ${String(task.titulo || '').toUpperCase()}*\n`;
    message += `--------------------------------\n`;
    message += `• *Numero:* ${task.numero}\n`;
    if (task.descripcion) message += `• *Descripcion:* ${task.descripcion}\n`;
    if (task.cliente) message += `• *Cliente:* ${task.cliente}\n`;
    if (task.numeroTitular) message += `• *Teléfono del Titular:* ${task.numeroTitular}\n`;
    if (task.direccion) message += `• *Direccion:* ${task.direccion}\n`;

    if (task.fechaEjecucion) {
      message += `• *Fecha de Ejecución:* ${formatFechaEjecucionWa(task.fechaEjecucion, 'long')}`;
      if (task.franja_horaria) message += ` - *Horario:* ${task.franja_horaria}`;
      message += '\n';
    } else {
      message += `• *Fecha de Ejecución:* No programada\n`;
    }
    message += '\n';
  });

  message += '*Tareas listadas correctamente*\n';
  return message;
};

/** Mensaje técnico → a sí mismo. */
export const buildUserTasksWhatsAppMessage = (
  tasks: Task[],
  userName: string
): string => {
  const ordered = [...tasks].sort(compareTasksBySchedule);
  let message = `*Recordatorio de Tareas Pendientes*\n\n`;
  message += `Hola ${userName},\n\n`;
  message += `Aquí tienes un resumen de tus tareas pendientes:\n\n`;

  ordered.forEach((task, index) => {
    message += `*Tarea ${index + 1}: ${task.titulo}*\n`;
    if (task.descripcion) message += `• *Descripción:* ${task.descripcion}\n`;
    if (task.cliente) message += `• *Cliente:* ${task.cliente}\n`;
    if (task.numeroTitular) message += `• *Teléfono:* ${task.numeroTitular}\n`;
    if (task.direccion) message += `• *Dirección:* ${task.direccion}\n`;

    if (task.fechaEjecucion) {
      message += `• *Fecha de Ejecución:* ${formatFechaEjecucionWa(task.fechaEjecucion, 'short')}`;
      if (task.franja_horaria) message += ` - ${task.franja_horaria}`;
      message += '\n';
    } else {
      message += `• *Fecha de Ejecución:* No programada\n`;
    }
    message += '\n';
  });

  message += '*Tareas listadas correctamente*\n';
  message += '*Recorda:* Puedes usar este mensaje como recordatorio de tus tareas pendientes.';
  message += '\n\n*Nota:* También puedes descargar estas tareas como eventos para tu calendario.';
  return message;
};

export type OpenWhatsAppResult =
  | { ok: true; mode: 'url' | 'clipboard' }
  | { ok: false; reason: string };

/**
 * Abre WhatsApp. Si el mensaje no entra en la URL, copia al portapapeles
 * y abre el chat vacío para pegar.
 */
export const openWhatsAppWithMessage = async (
  phone: string,
  message: string
): Promise<OpenWhatsAppResult> => {
  const digits = digitsPhone(phone || '');
  if (!digits) {
    return { ok: false, reason: 'Teléfono inválido' };
  }

  const encoded = encodeURIComponent(message);
  const withText = `https://wa.me/${digits}?text=${encoded}`;
  const bare = `https://wa.me/${digits}`;

  if (withText.length <= WA_URL_SAFE_LEN) {
    window.open(withText, '_blank', 'noopener,noreferrer');
    return { ok: true, mode: 'url' };
  }

  try {
    await navigator.clipboard.writeText(message);
    window.open(bare, '_blank', 'noopener,noreferrer');
    return { ok: true, mode: 'clipboard' };
  } catch {
    window.open(bare, '_blank', 'noopener,noreferrer');
    return {
      ok: false,
      reason:
        'El mensaje es muy largo para WhatsApp y no se pudo copiar al portapapeles. Reducí la cantidad de tareas.',
    };
  }
};

import React, { useEffect, useState } from 'react';
import { Bell, BellOff, Loader2 } from 'lucide-react';
import { enablePush, disablePush, getPushStatus, type PushStatus } from '../../utils/pushNotifications';
import { showError, showSuccess } from '../../utils/toastUtils';

const isIosNotStandalone = (): boolean => {
  if (typeof window === 'undefined') return false;
  const isIos = /iPhone|iPad|iPod/i.test(navigator.userAgent);
  const isStandalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true;
  return isIos && !isStandalone;
};

const PushNotificationsCard: React.FC = () => {
  const [status, setStatus] = useState<PushStatus | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = async () => {
    try {
      setStatus(await getPushStatus());
    } catch {
      setStatus('unsupported');
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const toggle = async () => {
    setBusy(true);
    try {
      if (status === 'enabled') {
        await disablePush();
        showSuccess('Notificaciones desactivadas en este dispositivo');
      } else {
        await enablePush();
        showSuccess('Notificaciones activadas en este dispositivo');
      }
    } catch (err: any) {
      showError(err?.message || 'No se pudieron cambiar las notificaciones');
    } finally {
      setBusy(false);
      await refresh();
    }
  };

  const enabled = status === 'enabled';
  const canToggle = status === 'enabled' || status === 'disabled';

  const description = (() => {
    switch (status) {
      case 'enabled':
        return 'Recibís avisos de tareas y novedades aunque la app esté cerrada.';
      case 'disabled':
        return 'Activalo para recibir avisos en este dispositivo aunque la app esté cerrada.';
      case 'denied':
        return 'Las notificaciones están bloqueadas en el navegador. Habilitalas desde la configuración del sitio.';
      case 'unconfigured':
        return 'Las notificaciones todavía no están configuradas para este entorno.';
      case 'unsupported':
        return isIosNotStandalone()
          ? 'En iPhone, primero agregá Seprogar a la pantalla de inicio (Compartir → Agregar a inicio) y abrila desde ahí.'
          : 'Este navegador no permite notificaciones push.';
      default:
        return 'Verificando…';
    }
  })();

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
          {enabled ? (
            <Bell className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          ) : (
            <BellOff className="h-5 w-5 text-slate-500 dark:text-slate-400" />
          )}
        </div>
        <div>
          <h3 className="text-base font-semibold text-slate-900 dark:text-white">
            Notificaciones en este dispositivo
          </h3>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{description}</p>
        </div>
      </div>

      {canToggle && (
        <button
          type="button"
          onClick={toggle}
          disabled={busy}
          className={`inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-60 cursor-pointer ${
            enabled
              ? 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600'
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
        >
          {busy && <Loader2 className="h-4 w-4 animate-spin" />}
          {enabled ? 'Desactivar' : 'Activar notificaciones'}
        </button>
      )}
    </div>
  );
};

export default PushNotificationsCard;

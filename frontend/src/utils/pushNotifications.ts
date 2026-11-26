import api from '../config/api';

/** Clave pública VAPID (pública por diseño). La privada vive solo en el backend. */
const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined;

export type PushStatus = 'unsupported' | 'unconfigured' | 'denied' | 'enabled' | 'disabled';

export const isPushSupported = (): boolean =>
  typeof window !== 'undefined' &&
  'serviceWorker' in navigator &&
  'PushManager' in window &&
  'Notification' in window;

const urlBase64ToUint8Array = (base64: string) => {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const normalized = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(normalized);
  const output = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) {
    output[i] = raw.charCodeAt(i);
  }
  return output;
};

export const getPushStatus = async (): Promise<PushStatus> => {
  if (!isPushSupported()) return 'unsupported';
  if (!VAPID_PUBLIC_KEY) return 'unconfigured';
  if (Notification.permission === 'denied') return 'denied';

  const registration = await navigator.serviceWorker.getRegistration('/');
  const subscription = await registration?.pushManager.getSubscription();
  return subscription && Notification.permission === 'granted' ? 'enabled' : 'disabled';
};

/** Debe llamarse desde un click del usuario (iOS lo exige). */
export const enablePush = async (): Promise<void> => {
  if (!isPushSupported()) throw new Error('Este navegador no permite notificaciones');
  if (!VAPID_PUBLIC_KEY) throw new Error('Notificaciones no configuradas');

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') throw new Error('Permiso de notificaciones no otorgado');

  await navigator.serviceWorker.register('/sw.js');
  const registration = await navigator.serviceWorker.ready;

  let subscription = await registration.pushManager.getSubscription();
  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    });
  }

  // El backend reasigna la suscripción al usuario logueado (upsert por endpoint)
  await api.post('/subscribe', subscription.toJSON());
};

/** Quita la suscripción de este dispositivo (logout o botón "desactivar"). */
export const disablePush = async (): Promise<void> => {
  if (!isPushSupported()) return;

  const registration = await navigator.serviceWorker.getRegistration('/');
  const subscription = await registration?.pushManager.getSubscription();
  if (!subscription) return;

  await api.delete('/subscribe', { data: { endpoint: subscription.endpoint } }).catch(() => undefined);
  await subscription.unsubscribe();
};

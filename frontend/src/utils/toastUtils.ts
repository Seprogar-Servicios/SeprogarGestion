import { toast } from 'react-toastify';
import type { ToastOptions } from 'react-toastify';

type ToastType = 'success' | 'error' | 'info' | 'warning';

const defaultOptions: ToastOptions = {
  position: 'top-right',
  autoClose: 5000,
  hideProgressBar: false,
  closeOnClick: true,
  pauseOnHover: true,
  draggable: true,
  theme: 'colored',
  className: '!rounded-lg !shadow-lg !mb-3',
  bodyClassName: '!m-0 !p-4',
};

const typeStyles = {
  success: '!bg-green-600',
  error: '!bg-red-600',
  info: '!bg-blue-600',
  warning: '!bg-yellow-600',
};

export const showToast = (
  type: ToastType,
  message: string,
  options: Partial<ToastOptions> = {}
) => {
  const toastOptions: ToastOptions = {
    ...defaultOptions,
    className: `${defaultOptions.className} ${typeStyles[type]}`,
    ...options,
  };

  toast[type](message, toastOptions);
};

// Helper methods for common toast types
export const showSuccess = (message: string, options: Partial<ToastOptions> = {}) => 
  showToast('success', message, options);

export const showError = (message: string, options: Partial<ToastOptions> = {}) => 
  showToast('error', message, options);

export const showInfo = (message: string, options: Partial<ToastOptions> = {}) => 
  showToast('info', message, options);

export const showWarning = (message: string, options: Partial<ToastOptions> = {}) => 
  showToast('warning', message, options);

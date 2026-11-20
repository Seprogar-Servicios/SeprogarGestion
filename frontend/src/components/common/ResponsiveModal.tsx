import React, { useEffect } from 'react';
import {
  modalOverlayClass,
  modalOverlayTopClass,
  modalPanelClass,
  type ModalSize,
} from '../../utils/responsiveModal';

type ResponsiveModalProps = {
  open: boolean;
  onClose?: () => void;
  /** sm=corto · md · lg · xl=tareas · full=galería */
  size?: ModalSize;
  /** Centrado o arriba (formularios largos) */
  align?: 'center' | 'top';
  children: React.ReactNode;
  /** Clases extra del panel (bg, overflow, etc.) */
  panelClassName?: string;
  /** Clases extra del overlay */
  overlayClassName?: string;
  /** Cerrar al hacer click fuera */
  closeOnBackdrop?: boolean;
  zIndexClass?: string;
};

/**
 * Modal responsive unificado: en pantallas grandes se ensancha;
 * en móviles mantiene ancho contenido.
 */
const ResponsiveModal: React.FC<ResponsiveModalProps> = ({
  open,
  onClose,
  size = 'md',
  align = 'center',
  children,
  panelClassName = 'bg-white dark:bg-gray-800 overflow-hidden',
  overlayClassName = '',
  closeOnBackdrop = true,
  zIndexClass,
}) => {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;

  const overlay =
    (align === 'top' ? modalOverlayTopClass : modalOverlayClass) +
    (zIndexClass ? ` ${zIndexClass}` : '') +
    (overlayClassName ? ` ${overlayClassName}` : '');

  return (
    <div
      className={overlay}
      role="dialog"
      aria-modal="true"
      onClick={closeOnBackdrop && onClose ? onClose : undefined}
    >
      <div
        className={modalPanelClass(size, panelClassName)}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
};

export default ResponsiveModal;

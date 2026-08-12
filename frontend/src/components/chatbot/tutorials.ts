import type { SepiTutorialId } from '../../utils/sepiEvents';

export interface SepiTutorialStep {
  text: string;
  /** Valor de data-sepi-target en el DOM */
  target: string;
  placement?: 'top' | 'bottom' | 'left' | 'right';
  /** Si true, al avanzar desde el paso anterior se hace click en el target */
  openOnEnter?: boolean;
}

export interface SepiTutorial {
  id: SepiTutorialId;
  title: string;
  route: string;
  intro: string;
  steps: SepiTutorialStep[];
}

export const SEPI_TUTORIALS: Record<SepiTutorialId, SepiTutorial> = {
  motivos: {
    id: 'motivos',
    title: 'Motivos de pago',
    route: '/admin/motivos-pago',
    intro: 'Los motivos clasifican pagos y recibos (sueldo, aguinaldo, adelanto…).',
    steps: [
      {
        text: 'Empezá acá: tocá Nuevo motivo para abrir el formulario.',
        target: 'motivos-create',
        placement: 'bottom',
      },
      {
        text: 'Completá el nombre del motivo (obligatorio). Ej: Adelanto.',
        target: 'motivos-nombre',
        placement: 'bottom',
        openOnEnter: true,
      },
      {
        text: 'Podés agregar una descripción opcional.',
        target: 'motivos-descripcion',
        placement: 'top',
      },
      {
        text: 'Dejá Activo marcado para poder usarlo en pagos y recibos.',
        target: 'motivos-activo',
        placement: 'top',
      },
      {
        text: 'Guardá el motivo. ¡Listo! Ya va a aparecer en los selectores.',
        target: 'motivos-guardar',
        placement: 'top',
      },
    ],
  },
  pagos: {
    id: 'pagos',
    title: 'Pagos manuales',
    route: '/admin/pagos-manuales',
    intro: 'Registrá adelantos u adicionales y generá el PDF para Recibos.',
    steps: [
      {
        text: 'Tocá Nuevo pago para cargar un pago manual.',
        target: 'pagos-create',
        placement: 'bottom',
      },
      {
        text: 'Elegí el técnico al que corresponde el pago.',
        target: 'pagos-tecnico',
        placement: 'bottom',
        openOnEnter: true,
      },
      {
        text: 'Seleccioná el motivo (adelanto, adicional, etc.).',
        target: 'pagos-motivo',
        placement: 'bottom',
      },
      {
        text: 'Indicá fecha y monto del pago.',
        target: 'pagos-monto',
        placement: 'bottom',
      },
      {
        text: 'Guardá. Después podés descargar el PDF con el ícono de descarga en la tabla.',
        target: 'pagos-guardar',
        placement: 'top',
      },
    ],
  },
  recibos: {
    id: 'recibos',
    title: 'Recibos',
    route: '/admin/recibos',
    intro: 'Los recibos son el comprobante que el técnico firma en Mis Recibos.',
    steps: [
      {
        text: 'Tocá Nuevo Recibo para cargar un comprobante.',
        target: 'recibos-create',
        placement: 'bottom',
      },
      {
        text: 'Elegí el técnico del recibo.',
        target: 'recibos-tecnico',
        placement: 'bottom',
        openOnEnter: true,
      },
      {
        text: 'Seleccioná el motivo: sueldo, aguinaldo, adicional…',
        target: 'recibos-motivo',
        placement: 'bottom',
      },
      {
        text: 'Subí el PDF del comprobante.',
        target: 'recibos-pdf',
        placement: 'top',
      },
      {
        text: 'Guardá con Cargar Recibo. El técnico lo verá para firmar.',
        target: 'recibos-guardar',
        placement: 'top',
      },
    ],
  },
  materiales: {
    id: 'materiales',
    title: 'Materiales',
    route: '/admin/materiales',
    intro: 'El catálogo de materiales se usa al cargar insumos en las tareas.',
    steps: [
      {
        text: 'Tocá Nuevo material para agregar uno al catálogo.',
        target: 'materiales-create',
        placement: 'bottom',
      },
      {
        text: 'Completá el nombre del material.',
        target: 'materiales-nombre',
        placement: 'bottom',
        openOnEnter: true,
      },
      {
        text: 'Indicá unidad y precio.',
        target: 'materiales-precio',
        placement: 'top',
      },
      {
        text: 'Guardá el material. Ya va a estar disponible en las tareas.',
        target: 'materiales-guardar',
        placement: 'top',
      },
    ],
  },
  categorias: {
    id: 'categorias',
    title: 'Categorías de materiales',
    route: '/admin/categorias-materiales',
    intro: 'Las categorías organizan el catálogo de materiales.',
    steps: [
      {
        text: 'Tocá Nueva Categoría para crear la primera.',
        target: 'categorias-create',
        placement: 'bottom',
      },
      {
        text: 'Escribí el nombre de la categoría.',
        target: 'categorias-nombre',
        placement: 'bottom',
        openOnEnter: true,
      },
      {
        text: 'Guardá. Después la vas a poder asociar a cada material.',
        target: 'categorias-guardar',
        placement: 'top',
      },
    ],
  },
  especialidades: {
    id: 'especialidades',
    title: 'Especialidades',
    route: '/admin/specialties',
    intro: 'Las especialidades agrupan a los técnicos por tipo de trabajo.',
    steps: [
      {
        text: 'Tocá Nueva especialidad para crear una.',
        target: 'especialidades-create',
        placement: 'bottom',
      },
      {
        text: 'Completá el nombre de la especialidad.',
        target: 'especialidades-nombre',
        placement: 'bottom',
        openOnEnter: true,
      },
      {
        text: 'Guardá. Luego podés asignarla a cada técnico en Usuarios.',
        target: 'especialidades-guardar',
        placement: 'top',
      },
    ],
  },
  usuarios: {
    id: 'usuarios',
    title: 'Usuarios',
    route: '/admin/users',
    intro: 'Acá aprobás técnicos y gestionás roles.',
    steps: [
      {
        text: 'Desde acá gestionás el alta de usuarios y técnicos.',
        target: 'usuarios-header',
        placement: 'bottom',
      },
      {
        text: 'Si hay pendientes, revisalos en esta sección para aprobarlos.',
        target: 'usuarios-pendientes',
        placement: 'bottom',
      },
      {
        text: 'También podés crear un usuario nuevo con este botón.',
        target: 'usuarios-create',
        placement: 'bottom',
      },
    ],
  },
};

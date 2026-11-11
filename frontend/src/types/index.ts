// User types
export interface User {
  _id: string;
  nombre: string;
  apellido?: string;
  email: string;
  rol: 'super_admin' | 'admin' | 'usuario' | 'tecnico' | 'adminConsorcio';
  especialidad?: string;
  aprobado: boolean;
  telefono?: string;
  direccion?: string;
  /** Localidad / barrio base del técnico */
  localidad?: string;
  ubicacionBase?: {
    lat: number;
    lng: number;
    actualizadoAt?: string;
  } | null;
  porcentajeTecnico?: number;
  /** Color único del técnico en calendario (#RRGGBB) */
  color?: string | null;
  createdAt: string;
  updatedAt: string;
}

// Observation types
export interface Observation {
  _id: string;
  titulo: string;
  descripcion: string;
  tarea: string;
  creadoPor: User;
  modificadoPor?: User;
  fechaCreacion: string;
  fechaModificacion?: string;
}

// Task types
export interface Task {
  _id: string;
  numero: string;
  titulo: string;
  descripcion?: string;
  estado: 'pendiente' | 'en progreso' | 'completada' | 'cancelada';
  tecnicos: User[];
  tecnicoAsignado?: User | string;
  fechaCreacion: string;
  fechaModificacion: string;
  fechaEjecucion?: string;
  franja_horaria?: string;
  creadoPor: User;
  cliente?: string;
  /** Cuenta comercial opcional (IKE, VAITTY, …). No requerida en datos viejos. */
  cuentaCliente?: '' | 'IKE' | 'VAITTY' | 'MDO' | 'Particular' | 'Consorcio' | 'Otro';
  fechaCompletado?: string | null;
  numeroTitular?: string;
  direccion?: string;
  origen?: 'manual' | 'whatsapp' | string;
  observaciones?: Observation[];
  ubicacionMapa?: {
    lat: number;
    lng: number;
    fuente?: 'gps' | 'direccion' | 'tecnico' | null;
    actualizadoAt?: string;
  } | null;
}

export type CuentaCliente = 'IKE' | 'VAITTY' | 'MDO' | 'Particular' | 'Consorcio' | 'Otro';

export type ReclamoMotivo =
  | 'mala_atencion'
  | 'trabajo_incompleto'
  | 'problema_tecnico'
  | 'demora'
  | 'otro';

export type ReclamoEstado = 'abierto' | 'resuelto' | 'reabierto';

export interface Reclamo {
  _id: string;
  tarea?: Task | string | null;
  cliente?: string;
  cuentaCliente?: '' | CuentaCliente;
  tecnicos?: User[];
  motivo: ReclamoMotivo;
  estado: ReclamoEstado;
  descripcion?: string;
  fechaReclamo: string;
  fechaResolucion?: string | null;
  creadoPor?: User;
  resueltoPor?: User | null;
  createdAt?: string;
  updatedAt?: string;
}

// Material types
export interface Material {
  _id: string;
  nombre: string;
  descripcion?: string;
  cantidad: string;
  unidad: string;
  precio?: number;
  categoria?: CategoriaMaterial | string;
  codigo?: string;
  origen?: 'stock' | 'excedente';
  createdAt: string;
  updatedAt: string;
}

// CategoriaMaterial types
export interface CategoriaMaterial {
  _id: string;
  nombre: string;
  descripcion?: string;
  createdAt: string;
  updatedAt: string;
}

// Specialty types
export interface Especialidad {
  _id: string;
  nombre: string;
  descripcion?: string;
  createdAt: string;
  updatedAt: string;
}

// Auth types
export interface AuthState {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
}

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  usuario?: T; // Para manejar respuestas del backend que usan 'usuario' en lugar de 'data'
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  nombre: string;
  email: string;
  password: string;
  rol: 'super_admin' | 'admin' | 'usuario' | 'tecnico' | 'adminConsorcio';
  especialidad?: string;
  telefono?: string;
}

// Filter types
export interface TaskFilters {
  estado?: string;
  tecnico?: string;
  cliente?: string;
  fechaInicio?: string;
  fechaFin?: string;
  fechaDesde?: string;
  fechaHasta?: string;
  fechaEjecucion?: string;
  upcomingFilter?: 'past' | 'next24h' | 'next48h' | 'nextWeek' | 'nextMonth' | 'custom';
  usuario?: string;
}

// TareaConsorcio types
export interface TareaConsorcio {
  _id: string;
  numero: string;
  titulo: string;
  descripcion: string;
  precio: number;
  estado: 'presupuesto' | 'confirmado' | 'pendiente' | 'en_progreso' | 'completada' | 'cancelada' | 'PENDIENTE_PAGO' | 'FACTURADO' | 'PAGADO';
  cliente: string;
  direccion: string;
  administradorConsorcio: {
    _id: string;
    nombre: string;
  };
  tecnicos: Array<{
    _id: string;
    nombre: string;
  }>;
  fotos: Array<{
    filename: string;
    originalName: string;
    path: string;
  }>;
  comprobantePago?: {
    filename: string;
    originalName?: string;
    path?: string;
    mimetype?: string;
    size?: number;
    uploadDate?: string;
    estadoValidacion: 'pendiente' | 'aprobado' | 'rechazado';
  };
  creadoPor: {
    _id: string;
    nombre: string;
  };
  fechaCreacion: string;
  fechaEjecucion: string;
  franja_horaria: string;
}

// Recibo types
export interface Recibo {
  _id: string;
  tecnico: User;
  motivo?: MotivoPago;
  mes: number;
  anio: number;
  url: string;
  estadoFirma: 'firmado' | 'no firmado';
  firma?: {
    imagen: string;
    fecha: string;
  };
  createdAt: string;
  updatedAt: string;
}

// MotivoPago types
export interface MotivoPago {
  _id: string;
  nombre: string;
  descripcion?: string;
  activo: boolean;
  createdAt: string;
  updatedAt: string;
}

// PagoManual types
export interface PagoManual {
  _id: string;
  monto: number;
  fechaEmision: string;
  tecnico: User;
  motivo: MotivoPago;
  tareas: Array<{
    _id: string;
    numero: string;
    titulo: string;
    estado?: string;
    fechaEjecucion?: string;
  }>;
  observaciones?: string;
  creadoPor?: User;
  createdAt: string;
  updatedAt: string;
}

// TareaLiquidacion types
export interface TareaLiquidacion {
  _id: string;
  tarea: {
    _id: string;
    numero: string;
    titulo: string;
    cliente: string;
    direccion: string;
    estado: string;
    fechaEjecucion: string;
    tecnicos: Array<{
      _id: string;
      nombre: string;
      email: string;
      porcentajeTecnico: number;
    }>;
  };
  manoObra: number;
  materiales: number;
  cobertura: number;
  excedente: number;
  materialReal: number;
  boletasMateriales: number;
  observacionesFinancieras: string;
  totalPresupuesto?: number;
  difExcedente?: number;
  gananciaMaterial?: number;
  gananciaTotal?: number;
  repartida?: number;
  pagoTecnico?: number;
  futurgas?: number;
  pago15Dias?: number;
  createdAt: string;
  updatedAt: string;
}

// MaterialTarea types
export interface MaterialTarea {
  _id: string;
  material?: Material;
  nombre: string;
  descripcion: string;
  cantidad: number;
  unidad: string;
  precio: number;
  origen?: 'stock' | 'excedente';
  agregadoPor: 'admin' | 'tecnico';
  tecnico?: User;
  comprobante?: {
    filename: string;
    originalName: string;
    path: string;
    mimetype: string;
    size: number;
    uploadDate: string;
  };
  estadoValidacion: 'pendiente' | 'aprobado' | 'rechazado';
  observaciones: string;
  fechaValidacion?: string;
  validadoPor?: User;
  createdAt: string;
  updatedAt: string;
}

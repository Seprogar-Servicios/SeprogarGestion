// User types
export interface User {
  _id: string;
  nombre: string;
  apellido?: string;
  email: string;
  rol: 'admin' | 'usuario' | 'tecnico';
  especialidad?: string;
  aprobado: boolean;
  telefono?: string;
  direccion?: string;
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
  numeroTitular?: string;
  direccion?: string;
  origen?: 'manual' | 'whatsapp' | string;
  observaciones?: Observation[];
}

// Material types
export interface Material {
  _id: string;
  nombre: string;
  descripcion?: string;
  cantidad: number;
  unidad: string;
  precio?: number;
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
  rol: 'admin' | 'usuario' | 'tecnico';
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
  upcomingFilter?: 'past' | 'next24h' | 'next48h' | 'nextWeek' | 'nextMonth' | 'custom';
  usuario?: string;
}

// Recibo types
export interface Recibo {
  _id: string;
  tecnico: User;
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

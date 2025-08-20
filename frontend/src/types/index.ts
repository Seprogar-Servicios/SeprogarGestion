// User types
export interface User {
  _id: string;
  nombre: string;
  email: string;
  rol: 'admin' | 'usuario';
  especialidad?: string;
  aprobado: boolean;
  telefono?: string;
  createdAt: string;
  updatedAt: string;
}

// Task types
export interface Task {
  _id: string;
  numero: string;
  titulo: string;
  descripcion?: string;
  estado: 'pendiente' | 'en progreso' | 'completada';
  tecnicos: User[];
  fechaCreacion: string;
  fechaModificacion: string;
  fechaEjecucion?: string;
  creadoPor: User;
  cliente?: string;
  numeroTitular?: string;
  direccion?: string;
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
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  nombre: string;
  email: string;
  password: string;
  rol: 'admin' | 'usuario';
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
  upcomingFilter?: 'next24h' | 'next48h' | 'nextWeek' | 'nextMonth' | 'custom';
  usuario?: string;
}

import type { User } from '../types';

export type AppRole = 'super_admin' | 'admin' | 'usuario' | 'adminConsorcio' | 'tecnico';

export const MAX_SUPER_ADMINS = 2;

export const isSuperAdmin = (user?: Pick<User, 'rol'> | null): boolean =>
  user?.rol === 'super_admin';

/** Admin operativo o Super Admin. Acepta user o string de rol. */
export const isAdminRole = (
  userOrRol?: Pick<User, 'rol'> | string | null
): boolean => {
  const rol = typeof userOrRol === 'string' ? userOrRol : userOrRol?.rol;
  return rol === 'admin' || rol === 'super_admin';
};

export const roleLabel = (rol?: string): string => {
  switch (rol) {
    case 'super_admin':
      return 'Super Admin';
    case 'admin':
      return 'Administrador';
    case 'adminConsorcio':
      return 'Admin. Consorcio';
    case 'usuario':
    case 'tecnico':
      return 'Técnico';
    default:
      return rol || 'Usuario';
  }
};

import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAppSelector } from '../../store';
import { isAdminRole, isSuperAdmin } from '../../utils/roles';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?:
    | 'super_admin'
    | 'admin'
    | 'usuario'
    | 'adminConsorcio'
    | 'tecnico'
    | ('super_admin' | 'admin' | 'usuario' | 'adminConsorcio' | 'tecnico')[];
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, requiredRole }) => {
  const { isAuthenticated, user } = useAppSelector((state) => state.auth);
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (requiredRole && user?.rol) {
    // Super Admin tiene acceso a cualquier ruta protegida
    if (isSuperAdmin(user)) {
      return <>{children}</>;
    }

    const allowedRoles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];

    if (allowedRoles.includes('admin') && isAdminRole(user)) {
      return <>{children}</>;
    }

    if (!allowedRoles.includes(user.rol as any)) {
      return <Navigate to="/unauthorized" replace />;
    }
  }

  return <>{children}</>;
};

export default ProtectedRoute;

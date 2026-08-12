import React, { useEffect } from 'react';
import { useAppSelector, useAppDispatch } from '../../store';
import { User, Mail, Phone, Shield, BadgeCheck, Calendar } from 'lucide-react';
import { fetchCurrentUser } from '../../store/slices/authSlice';
import ChangePassword from './ChangePassword';
import AdminPageHeader from '../common/AdminPageHeader';

const ProfilePage: React.FC = () => {
  const dispatch = useAppDispatch();
  const { user, loading } = useAppSelector((state) => state.auth);

  useEffect(() => {
    // Fetch the latest user data when the component mounts
    dispatch(fetchCurrentUser());
  }, [dispatch]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <p className="text-slate-500 dark:text-slate-400">Cargando datos del usuario...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex justify-center items-center h-64">
        <p className="text-slate-500 dark:text-slate-400">No hay información de usuario disponible</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Mi Perfil"
        description="Gestiona tu información personal y seguridad"
        eyebrow="Cuenta"
        icon={<User className="h-5 w-5" />}
      />

      <div className={user?.rol === 'usuario' ? 'grid grid-cols-1 gap-6' : 'grid grid-cols-1 md:grid-cols-3 gap-6'}>
        {/* Información del usuario */}
        <div className={user?.rol === 'tecnico' ? '' : 'md:col-span-1'}>
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="px-6 py-6 bg-blue-50/80 dark:bg-blue-900/20 border-b border-slate-200 dark:border-slate-700">
              <div className="flex items-center">
                <div className="flex-shrink-0 mr-4">
                  <div className="h-16 w-16 rounded-full bg-gradient-to-r from-blue-600 to-blue-800 flex items-center justify-center">
                    <User className="h-8 w-8 text-white" />
                  </div>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                    Información Personal
                  </h3>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400 flex items-center">
                    <BadgeCheck className="h-4 w-4 mr-1 text-blue-500" />
                    Detalles de tu cuenta
                  </p>
                </div>
              </div>
            </div>
            <div>
              <dl className="divide-y divide-slate-200 dark:divide-slate-700">
                <div className="px-6 py-4 flex items-center transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/60">
                  <dt className="w-10 flex-shrink-0">
                    <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                      <User className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    </div>
                  </dt>
                  <div className="ml-4 flex-1">
                    <dt className="text-sm font-medium text-slate-500 dark:text-slate-400">
                      Nombre
                    </dt>
                    <dd className="mt-1 text-base font-medium text-slate-900 dark:text-white">
                      {user.nombre}
                    </dd>
                  </div>
                </div>

                <div className="px-6 py-4 flex items-center transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/60">
                  <dt className="w-10 flex-shrink-0">
                    <div className="h-10 w-10 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                      <Mail className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                    </div>
                  </dt>
                  <div className="ml-4 flex-1">
                    <dt className="text-sm font-medium text-slate-500 dark:text-slate-400">
                      Email
                    </dt>
                    <dd className="mt-1 text-base font-medium text-slate-900 dark:text-white break-all">
                      {user.email}
                    </dd>
                  </div>
                </div>

                <div className="px-6 py-4 flex items-center transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/60">
                  <dt className="w-10 flex-shrink-0">
                    <div className="h-10 w-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                      <Phone className="h-5 w-5 text-green-600 dark:text-green-400" />
                    </div>
                  </dt>
                  <div className="ml-4 flex-1">
                    <dt className="text-sm font-medium text-slate-500 dark:text-slate-400">
                      Teléfono
                    </dt>
                    <dd className="mt-1 text-base font-medium text-slate-900 dark:text-white">
                      {user.telefono || 'No especificado'}
                    </dd>
                  </div>
                </div>

                <div className="px-6 py-4 flex items-center transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/60">
                  <dt className="w-10 flex-shrink-0">
                    <div className="h-10 w-10 rounded-full bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center">
                      <Shield className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                    </div>
                  </dt>
                  <div className="ml-4 flex-1">
                    <dt className="text-sm font-medium text-slate-500 dark:text-slate-400">
                      Rol
                    </dt>
                    <dd className="mt-1 text-base font-medium text-slate-900 dark:text-white">
                      {user.rol === 'admin' ? (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-300">
                          Administrador
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300">
                          Técnico
                        </span>
                      )}
                    </dd>
                  </div>
                </div>

                {user.createdAt && (
                  <div className="px-6 py-4 flex items-center transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/60">
                    <dt className="w-10 flex-shrink-0">
                      <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                        <Calendar className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                      </div>
                    </dt>
                    <div className="ml-4 flex-1">
                      <dt className="text-sm font-medium text-slate-500 dark:text-slate-400">
                        Miembro desde
                      </dt>
                      <dd className="mt-1 text-base font-medium text-slate-900 dark:text-white">
                        {new Date(user.createdAt).toLocaleDateString()}
                      </dd>
                    </div>
                  </div>
                )}
              </dl>
            </div>
          </div>
        </div>

        {user?.rol !== 'usuario' && (
          <div className="md:col-span-2">
            <ChangePassword />
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfilePage;

import React, { useEffect } from 'react';
import { useAppSelector, useAppDispatch } from '../../store';
import { User, Mail, Phone, Shield } from 'lucide-react';
import { fetchCurrentUser } from '../../store/slices/authSlice';
import ChangePassword from './ChangePassword';

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
        <p className="text-gray-500 dark:text-gray-400">Cargando datos del usuario...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex justify-center items-center h-64">
        <p className="text-gray-500 dark:text-gray-400">No hay información de usuario disponible</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Mi Perfil</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Información del usuario */}
        <div className="md:col-span-1">
          <div className="bg-white dark:bg-gray-800 shadow sm:rounded-lg overflow-hidden">
            <div className="px-4 py-5 sm:px-6 bg-gray-50 dark:bg-gray-700">
              <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">
                Información Personal
              </h3>
              <p className="mt-1 max-w-2xl text-sm text-gray-500 dark:text-gray-400">
                Detalles de tu cuenta
              </p>
            </div>
            <div className="border-t border-gray-200 dark:border-gray-600">
              <dl>
                <div className="bg-white dark:bg-gray-800 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 flex items-center">
                    <User className="h-4 w-4 mr-2" />
                    Nombre
                  </dt>
                  <dd className="mt-1 text-sm text-gray-900 dark:text-white sm:mt-0 sm:col-span-2">
                    {user.nombre}
                  </dd>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 flex items-center">
                    <Mail className="h-4 w-4 mr-2" />
                    Email
                  </dt>
                  <dd className="mt-1 text-sm text-gray-900 dark:text-white sm:mt-0 sm:col-span-2">
                    {user.email}
                  </dd>
                </div>
                <div className="bg-white dark:bg-gray-800 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 flex items-center">
                    <Phone className="h-4 w-4 mr-2" />
                    Teléfono
                  </dt>
                  <dd className="mt-1 text-sm text-gray-900 dark:text-white sm:mt-0 sm:col-span-2">
                    {user.telefono || 'No especificado'}
                  </dd>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 flex items-center">
                    <Shield className="h-4 w-4 mr-2" />
                    Rol
                  </dt>
                  <dd className="mt-1 text-sm text-gray-900 dark:text-white sm:mt-0 sm:col-span-2">
                    {user.rol === 'admin' ? 'Administrador' : 'Técnico'}
                  </dd>
                </div>
              </dl>
            </div>
          </div>
        </div>
        
        {/* Cambio de contraseña */}
        <div className="md:col-span-2">
          <ChangePassword />
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;

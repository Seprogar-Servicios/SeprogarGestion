import React, { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../store';
import { logoutUser } from '../../store/slices/authSlice';
import { 
  Menu, 
  X, 
  Home, 
  Calendar, 
  Users, 
  LogOut,
  Briefcase,
  UserCircle,
  Database,
  BarChart
} from 'lucide-react';

const Layout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAppSelector((state) => state.auth);

  const handleLogout = () => {
    dispatch(logoutUser());
    navigate('/login');
  };


  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: Home },
    { name: 'Tareas', href: '/tasks', icon: Calendar },
    { name: 'Calendario', href: '/calendar', icon: Calendar },
    { name: 'Mi Perfil', href: '/profile', icon: UserCircle },
  ];

  const adminNavigation = [
    { name: 'Usuarios', href: '/admin/users', icon: Users },
    { name: 'Especialidades', href: '/admin/specialties', icon: Briefcase },
    { name: 'Análisis', href: '/admin/analytics', icon: BarChart },
    { name: 'Importar/Exportar', href: '/admin/importar-exportar', icon: Database },
  ];

  // Verificar la ruta actual para resaltar el elemento activo
  const isActive = (path: string) => {
    // Para la ruta de dashboard, coincidir exactamente o la raíz
    if (path === '/dashboard') {
      return location.pathname === path || location.pathname === '/';
    }
    // Para otras rutas, verificar si la ruta actual comienza con el path
    return location.pathname.startsWith(path);
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-gray-100 dark:bg-gray-900">
      {/* Sidebar */}
      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-gray-800 transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0 flex-shrink-0 overflow-y-auto`}>
        <div className="flex items-center justify-between h-16 px-4 bg-[#0056a2] dark:bg-[#003b6f]">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="h-8 w-8 rounded-lg flex items-center justify-center overflow-hidden">
                <img src="/futurgas.png" alt="Futurgas Logo" className="h-7 w-7 object-contain" />
              </div>
            </div>
            <div className="ml-3">
              <h1 className="text-white font-semibold">FuturgasGestión</h1>
            </div>
          </div>
          <button
            className="lg:hidden text-white"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <nav className="mt-5 px-2">
          <div className="space-y-1">
            {navigation.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.name}
                  onClick={() => navigate(item.href)}
                  className="w-full group flex items-center px-2 py-2 text-base font-medium rounded-md text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white transition-colors"
                >
                  <Icon className="mr-4 h-6 w-6" />
                  {item.name}
                </button>
              );
            })}
            
            {/* Admin Section */}
            {user?.rol === 'admin' && (
              <>
                <div className="pt-4 pb-2">
                  <h3 className="px-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Administración
                  </h3>
                </div>
                {adminNavigation.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.name}
                      onClick={() => navigate(item.href)}
                      className={`w-full group flex items-center px-2 py-2 text-base font-medium rounded-md ${
                        isActive(item.href) 
                          ? 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white' 
                          : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white'
                      } transition-colors`}
                    >
                      <Icon className="mr-4 h-6 w-6" />
                      {item.name}
                    </button>
                  );
                })}
              </>
            )}
          </div>
        </nav>

        <div className="absolute bottom-0 w-full p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="h-8 w-8 bg-gray-300 dark:bg-gray-600 rounded-full flex items-center justify-center">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {user?.nombre.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="ml-3">
                <button 
                  onClick={() => navigate('/profile')} 
                  className="text-left hover:text-[#0056a2] dark:hover:text-[#f7941d]"
                >
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300 hover:underline">
                    {user?.nombre}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                    {user?.rol}
                  </p>
                </button>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        <div className="sticky top-0 z-10 bg-white dark:bg-gray-900 shadow-sm">
          <div className="flex items-center justify-between h-16 px-4 sm:px-6 lg:px-8">
            <button
              className="lg:hidden text-gray-500 hover:text-gray-600 dark:text-gray-400 dark:hover:text-gray-300"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="h-6 w-6" />
            </button>
            <div className="flex items-center">
              <div className="ml-3">
                <p className="text-sm text-gray-500 dark:text-gray-400">Hola, <span className="font-medium text-gray-900 dark:text-white">{user?.nombre}</span></p>
              </div>
            </div>
          </div>
        </div>
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-gray-600 bg-opacity-75 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
};

export default Layout;

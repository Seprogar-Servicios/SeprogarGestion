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
      {/* Mobile menu button */}
      <button
        onClick={() => setSidebarOpen(true)}
        className="fixed bottom-4 right-4 z-40 lg:hidden p-3 rounded-full bg-blue-600 text-white shadow-lg hover:bg-blue-700 transition-colors"
      >
        <Menu className="h-6 w-6" />
      </button>

      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 w-72 bg-gradient-to-b from-blue-600 to-blue-700 dark:from-gray-800 dark:to-gray-900 transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} transition-all duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0 flex-shrink-0 overflow-y-auto border-r border-blue-500/20 dark:border-gray-700`}>
        <div className="flex flex-col h-full">
          {/* Logo and close button */}
          <div className="flex items-center justify-between h-20 px-6 py-4 bg-blue-700 dark:bg-gray-900/50">
            <div className="flex items-center space-x-3">
              <div className="flex-shrink-0 bg-white/10 p-2 rounded-lg backdrop-blur-sm">
                <img src="/futurgas.png" alt="Futurgas Logo" className="h-8 w-8 object-contain" />
              </div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-white to-blue-100 bg-clip-text text-transparent">
                FuturgasGestión
              </h1>
            </div>
            <button
              className="lg:hidden text-blue-100 hover:text-white"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-3 py-6 space-y-1 overflow-y-auto">
            <div className="space-y-1.5">
              {navigation.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href);
                return (
                  <button
                    key={item.name}
                    onClick={() => {
                      navigate(item.href);
                      if (window.innerWidth < 1024) setSidebarOpen(false);
                    }}
                    className={`group w-full flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 cursor-pointer ${
                      active
                        ? 'bg-white/10 text-white shadow-lg shadow-blue-500/10'
                        : 'text-blue-100 hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    <Icon 
                      className={`mr-3 h-5 w-5 flex-shrink-0 ${
                        active ? 'text-blue-200' : 'text-blue-200/70'
                      }`} 
                    />
                    <span className="text-left">{item.name}</span>
                    {active && (
                      <span className="ml-auto h-2 w-2 rounded-full bg-blue-300"></span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Admin Section */}
            {user?.rol === 'admin' && (
              <div className="pt-6 mt-6 border-t border-blue-500/10">
                <h3 className="px-4 mb-3 text-xs font-semibold text-blue-200/70 uppercase tracking-wider">
                  Administración
                </h3>
                <div className="space-y-1.5">
                  {adminNavigation.map((item) => {
                    const Icon = item.icon;
                    const active = isActive(item.href);
                    return (
                      <button
                        key={item.name}
                        onClick={() => {
                          navigate(item.href);
                          if (window.innerWidth < 1024) setSidebarOpen(false);
                        }}
                        className={`group w-full flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 cursor-pointer ${
                          active
                            ? 'bg-white/10 text-white shadow-lg shadow-blue-500/10'
                            : 'text-blue-100 hover:bg-white/5 hover:text-white'
                        }`}
                      >
                        <Icon 
                          className={`mr-3 h-5 w-5 flex-shrink-0 ${
                            active ? 'text-blue-200' : 'text-blue-200/70'
                          }`} 
                        />
                        <span className="text-left">{item.name}</span>
                        {active && (
                          <span className="ml-auto h-2 w-2 rounded-full bg-blue-300"></span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </nav>

          {/* User profile and logout */}
          <div className="p-4 mt-auto border-t border-blue-500/10">
            <button 
              onClick={() => {
                navigate('/profile');
                if (window.innerWidth < 1024) setSidebarOpen(false);
              }}
              className="w-full text-left cursor-pointer"
            >
              <div className="flex items-center mb-4 px-2 py-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
                <div className="flex-shrink-0 h-10 w-10 rounded-full bg-blue-400/20 flex items-center justify-center text-blue-200">
                  <UserCircle className="h-6 w-6" />
                </div>
                <div className="ml-3 min-w-0 flex-1">
                  <p className="text-sm font-medium text-white truncate">
                    {user?.nombre || 'Usuario'}
                  </p>
                  <p className="text-xs text-blue-200/70 truncate">
                    {user?.rol === 'admin' ? 'Administrador' : 'Usuario'}
                  </p>
                </div>
              </div>
            </button>
            
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center px-4 py-2.5 text-sm font-medium text-blue-100 hover:text-white rounded-lg hover:bg-white/10 transition-colors group cursor-pointer"
            >
              <LogOut className="mr-2 h-4 w-4 text-blue-200 group-hover:text-white" />
              Cerrar sesión
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

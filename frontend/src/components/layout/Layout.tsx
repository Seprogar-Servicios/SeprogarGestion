import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../store';
import { logoutUser } from '../../store/slices/authSlice';
import ChatBot from '../../components/ChatBot';
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
  BarChart,
  FileText,
  Building,
  Shield,
  Package,
  FolderOpen,
  DollarSign,
  Tag,
  Wallet
} from 'lucide-react';

const Layout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAppSelector((state) => state.auth);

  // Redirigir a AdminConsorcio a su dashboard específico
  // Redirigir a técnicos a su dashboard específico
  useEffect(() => {
    if (user?.rol === 'adminConsorcio' && location.pathname === '/dashboard') {
      navigate('/adminConsorcio/dashboard', { replace: true });
    } else if (user?.rol === 'usuario' && location.pathname === '/dashboard') {
      navigate('/tecnico/dashboard', { replace: true });
    }
  }, [user, location.pathname, navigate]);

  const handleLogout = () => {
    dispatch(logoutUser());
    navigate('/login');
  };


  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: Home },
    { name: 'Tareas', href: '/tasks', icon: Calendar },
    { name: 'Calendario', href: '/calendar', icon: Calendar },
    ...(user?.rol === 'usuario' ? [{ name: 'Mis Recibos', href: '/mis-recibos', icon: FileText }] : []),
    { name: 'Legales', href: '/legales', icon: Shield },
    { name: 'Mi Perfil', href: '/profile', icon: UserCircle },
  ];

  const adminConsorcioNavigation = [
    { name: 'Dashboard', href: '/adminConsorcio/dashboard', icon: Home },
    { name: 'Análisis', href: '/adminConsorcio/analytics', icon: BarChart },
    { name: 'Calendario', href: '/adminConsorcio/calendario', icon: Calendar },
    { name: 'Legales', href: '/legales', icon: Shield },
    { name: 'Mi Perfil', href: '/adminConsorcio/profile', icon: UserCircle },
    { name: 'Tareas de Consorcio', href: '/adminConsorcio/tareas', icon: Building },
  ];

  const tecnicoNavigation = [
    { name: 'Dashboard', href: '/tecnico/dashboard', icon: Home },
    { name: 'Calendario', href: '/calendar', icon: Calendar },
    { name: 'Legales', href: '/legales', icon: Shield },
    { name: 'Liquidaciones', href: '/tecnico/liquidaciones', icon: DollarSign },
    { name: 'Mi Perfil', href: '/profile', icon: UserCircle },
    { name: 'Mis Recibos', href: '/mis-recibos', icon: FileText },
    { name: 'Pagos o adicionales', href: '/tecnico/pagos', icon: Wallet },
    { name: 'Tareas de Consorcio', href: '/tecnico/tareas-consorcio', icon: Building },
    { name: 'Tareas Normales', href: '/tasks', icon: Calendar },
  ];

  const adminNavigation = [
    { name: 'Dashboard', href: '/dashboard', icon: Home },
    { name: 'Análisis', href: '/admin/analytics', icon: BarChart },
    { name: 'Análisis de Consorcio', href: '/admin/analytics-consorcio', icon: BarChart },
    { name: 'Categorías de Materiales', href: '/admin/categorias-materiales', icon: FolderOpen },
    { name: 'Especialidades', href: '/admin/specialties', icon: Briefcase },
    { name: 'Importar/Exportar', href: '/admin/importar-exportar', icon: Database },
    { name: 'Liquidaciones', href: '/admin/liquidaciones', icon: DollarSign },
    { name: 'Materiales', href: '/admin/materiales', icon: Package },
    { name: 'Motivos de pago', href: '/admin/motivos-pago', icon: Tag },
    { name: 'Pagos manuales', href: '/admin/pagos-manuales', icon: Wallet },
    { name: 'Recibos', href: '/admin/recibos', icon: FileText },
    { name: 'Tareas', href: '/tasks', icon: Calendar },
    { name: 'Tareas de Consorcio', href: '/admin/tareas-consorcio', icon: Building },
    { name: 'Usuarios', href: '/admin/users', icon: Users },
    { name: 'Calendario', href: '/calendar', icon: Calendar },
    { name: 'Legales', href: '/legales', icon: Shield },
    { name: 'Mi Perfil', href: '/profile', icon: UserCircle },
  ];

  // Verificar la ruta actual para resaltar el elemento activo
  const isActive = (path: string) => {
    // Para la ruta de dashboard, coincidir exactamente o la raíz
    if (path === '/dashboard') {
      return location.pathname === path || location.pathname === '/';
    }
    // Para otras rutas, verificar coincidencia exacta o si es la ruta principal
    // Evitar que sub-rutas activen menús principales (ej: /admin/analytics-consorcio no active /admin/analytics)
    return location.pathname === path;
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-gray-100 dark:bg-gray-900">

      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 w-72 bg-gradient-to-b from-blue-600 to-blue-700 dark:from-gray-800 dark:to-gray-900 transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} transition-all duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0 flex-shrink-0 overflow-y-auto border-r border-blue-500/20 dark:border-gray-700`}>
        <div className="flex flex-col h-full">
          {/* Logo and close button */}
          <div className="flex items-center justify-between h-20 px-6 py-4 bg-blue-700 dark:bg-gray-900/50">
            <div className="flex items-center space-x-3 cursor-pointer" onClick={() => navigate('/dashboard')}>
              <div className="flex-shrink-0 bg-white/10 p-2 rounded-lg backdrop-blur-sm hover:bg-white/20 transition-colors">
                <img src="/Seprogar vector.svg" alt="Seprogar Logo" className="h-8 w-8 object-contain" />
              </div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-white to-blue-100 bg-clip-text text-transparent hover:text-blue-50 transition-colors">
                Seprogar
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
            {/* Navegación para Técnicos */}
            {user?.rol === 'usuario' && (
              <div className="space-y-1.5">
                {tecnicoNavigation.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.href);
                  const isDashboard = item.name === 'Dashboard';
                  return (
                    <button
                      key={item.name}
                      onClick={() => {
                        navigate(item.href);
                        if (window.innerWidth < 1024) setSidebarOpen(false);
                      }}
                      className={`group w-full flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 cursor-pointer ${
                        isDashboard
                          ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/30 hover:from-blue-600 hover:to-blue-700'
                          : active
                          ? 'bg-white/10 text-white shadow-lg shadow-blue-500/10'
                          : 'text-blue-100 hover:bg-white/5 hover:text-white'
                      }`}
                    >
                      <Icon 
                        className={`mr-3 h-5 w-5 flex-shrink-0 ${
                          isDashboard ? 'text-white' : active ? 'text-blue-200' : 'text-blue-200/70'
                        }`} 
                      />
                      <span className="text-left">{item.name}</span>
                      {active && !isDashboard && (
                        <span className="ml-auto h-2 w-2 rounded-full bg-blue-300"></span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Navegación general para otros roles (excepto Admin y AdminConsorcio) */}
            {user?.rol !== 'admin' && user?.rol !== 'adminConsorcio' && user?.rol !== 'usuario' && (
              <div className="space-y-1.5">
                {navigation.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.href);
                  const isDashboard = item.name === 'Dashboard';
                  return (
                    <button
                      key={item.name}
                      onClick={() => {
                        navigate(item.href);
                        if (window.innerWidth < 1024) setSidebarOpen(false);
                      }}
                      className={`group w-full flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 cursor-pointer ${
                        isDashboard
                          ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/30 hover:from-blue-600 hover:to-blue-700'
                          : active
                          ? 'bg-white/10 text-white shadow-lg shadow-blue-500/10'
                          : 'text-blue-100 hover:bg-white/5 hover:text-white'
                      }`}
                    >
                      <Icon 
                        className={`mr-3 h-5 w-5 flex-shrink-0 ${
                          isDashboard ? 'text-white' : active ? 'text-blue-200' : 'text-blue-200/70'
                        }`} 
                      />
                      <span className="text-left">{item.name}</span>
                      {active && !isDashboard && (
                        <span className="ml-auto h-2 w-2 rounded-full bg-blue-300"></span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Admin Section - Solo mostrar si es admin */}
            {user?.rol === 'admin' && (
              <div className="space-y-1.5">
                {adminNavigation.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.href);
                  const isDashboard = item.name === 'Dashboard';
                  return (
                    <button
                      key={item.name}
                      onClick={() => {
                        navigate(item.href);
                        if (window.innerWidth < 1024) setSidebarOpen(false);
                      }}
                      className={`group w-full flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 cursor-pointer ${
                        isDashboard
                          ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/30 hover:from-blue-600 hover:to-blue-700'
                          : active
                          ? 'bg-white/10 text-white shadow-lg shadow-blue-500/10'
                          : 'text-blue-100 hover:bg-white/5 hover:text-white'
                      }`}
                    >
                      <Icon 
                        className={`mr-3 h-5 w-5 flex-shrink-0 ${
                          isDashboard ? 'text-white' : active ? 'text-blue-200' : 'text-blue-200/70'
                        }`} 
                      />
                      <span className="text-left">{item.name}</span>
                      {active && !isDashboard && (
                        <span className="ml-auto h-2 w-2 rounded-full bg-blue-300"></span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {/* AdminConsorcio Section - Sin borde superior si es el único menú */}
            {user?.rol === 'adminConsorcio' && (
              <div className="space-y-1.5">
                {adminConsorcioNavigation.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.href);
                  const isDashboard = item.name === 'Dashboard';
                  return (
                    <button
                      key={item.name}
                      onClick={() => {
                        navigate(item.href);
                        if (window.innerWidth < 1024) setSidebarOpen(false);
                      }}
                      className={`group w-full flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 cursor-pointer ${
                        isDashboard
                          ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/30 hover:from-blue-600 hover:to-blue-700'
                          : active
                          ? 'bg-white/10 text-white shadow-lg shadow-blue-500/10'
                          : 'text-blue-100 hover:bg-white/5 hover:text-white'
                      }`}
                    >
                      <Icon 
                        className={`mr-3 h-5 w-5 flex-shrink-0 ${
                          isDashboard ? 'text-white' : active ? 'text-blue-200' : 'text-blue-200/70'
                        }`} 
                      />
                      <span className="text-left">{item.name}</span>
                      {active && !isDashboard && (
                        <span className="ml-auto h-2 w-2 rounded-full bg-blue-300"></span>
                      )}
                    </button>
                  );
                })}
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
                    {user?.rol === 'admin' ? 'Administrador' : 
                     user?.rol === 'adminConsorcio' ? 'Admin de Consorcio' : 
                     'Usuario'}
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
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Hola,{' '}
                  <span 
                    onClick={() => navigate('/profile')}
                    className="font-medium text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer transition-colors"
                  >
                    {user?.nombre}
                  </span>
                </p>
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
      
      {/* ChatBot Component */}
      <ChatBot />
      
    </div>
  );
};

export default Layout;

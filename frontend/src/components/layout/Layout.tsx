import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../store';
import { logoutUser } from '../../store/slices/authSlice';
import ChatBot from '../../components/ChatBot';
import SepiTour from '../../components/chatbot/SepiTour';
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
  DollarSign,
  Wallet,
  MapPin,
  ChevronDown,
  Pin,
  PinOff,
  Sun,
  Moon,
  AlertTriangle,
} from 'lucide-react';
import { isAdminRole, roleLabel } from '../../utils/roles';
import { useTheme } from '../../hooks/useTheme';

type NavItem = { name: string; href: string; icon: React.ComponentType<{ className?: string }> };
type NavGroup = { id: string; label: string; items: NavItem[] };

const SIDEBAR_PIN_KEY = 'seprogar-sidebar-pinned';
/** Ancho del riel vacío (solo ahí se abre el menú, no sobre el contenido) */
const EDGE_RAIL_PX = 48;
/** Cerrar si el cursor se aleja más allá del menú abierto */
const EDGE_KEEP_OPEN_PX = 256 + EDGE_RAIL_PX;

const Layout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
  const [sidebarPinned, setSidebarPinned] = useState(() => {
    try {
      const stored = localStorage.getItem(SIDEBAR_PIN_KEY);
      return stored === null ? true : stored === 'true';
    } catch {
      return true;
    }
  });
  const [desktopHoverOpen, setDesktopHoverOpen] = useState(false);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const desktopHoverOpenRef = useRef(false);

  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAppSelector((state) => state.auth);
  const { isDarkMode, toggleTheme } = useTheme();

  useEffect(() => {
    desktopHoverOpenRef.current = desktopHoverOpen;
  }, [desktopHoverOpen]);

  useEffect(() => {
    if (user?.rol === 'adminConsorcio' && location.pathname === '/dashboard') {
      navigate('/adminConsorcio/dashboard', { replace: true });
    } else if (user?.rol === 'usuario' && location.pathname === '/dashboard') {
      navigate('/tecnico/dashboard', { replace: true });
    }
  }, [user, location.pathname, navigate]);

  useEffect(() => {
    try {
      localStorage.setItem(SIDEBAR_PIN_KEY, String(sidebarPinned));
    } catch {
      /* ignore */
    }
    if (sidebarPinned) {
      setDesktopHoverOpen(false);
    }
  }, [sidebarPinned]);

  useEffect(() => {
    return () => {
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    };
  }, []);

  const clearCloseTimer = () => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  };

  const openDesktopSidebar = useCallback(() => {
    if (sidebarPinned) return;
    clearCloseTimer();
    setDesktopHoverOpen(true);
  }, [sidebarPinned]);

  const scheduleCloseDesktopSidebar = useCallback(() => {
    if (sidebarPinned) return;
    clearCloseTimer();
    closeTimerRef.current = setTimeout(() => {
      setDesktopHoverOpen(false);
    }, 420);
  }, [sidebarPinned]);

  // Solo cerrar por posición; la apertura es exclusiva del riel vacío
  useEffect(() => {
    if (sidebarPinned) return;

    const onMove = (e: MouseEvent) => {
      if (window.innerWidth < 1024) return;
      if (!desktopHoverOpenRef.current) return;
      // Seguir abierto mientras el cursor esté sobre el riel o el menú
      if (e.clientX <= EDGE_KEEP_OPEN_PX) {
        clearCloseTimer();
        return;
      }
      scheduleCloseDesktopSidebar();
    };

    window.addEventListener('mousemove', onMove, { passive: true });
    return () => window.removeEventListener('mousemove', onMove);
  }, [sidebarPinned, scheduleCloseDesktopSidebar]);

  const toggleSidebarPinned = () => {
    setSidebarPinned((prev) => !prev);
  };

  const handleLogout = () => {
    dispatch(logoutUser());
    navigate('/login');
  };

  const navItemClass = (active: boolean) => {
    if (active) {
      return 'bg-orange-500 text-white shadow-md shadow-orange-900/25 hover:bg-orange-600';
    }
    return 'text-blue-50/90 hover:bg-white/15 hover:text-white';
  };

  const navIconClass = (active: boolean) => {
    if (active) return 'text-white';
    return 'text-blue-100/80 group-hover:text-white';
  };

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: Home },
    { name: 'Tareas', href: '/tasks', icon: Calendar },
    { name: 'Calendario', href: '/calendar', icon: Calendar },
    ...(user?.rol === 'usuario'
      ? [{ name: 'Mis finanzas', href: '/tecnico/finanzas', icon: DollarSign }]
      : []),
    { name: 'Legales', href: '/legales', icon: Shield },
    { name: 'Mi Perfil', href: '/profile', icon: UserCircle },
  ];

  const adminConsorcioNavigation = [
    { name: 'Dashboard', href: '/adminConsorcio/dashboard', icon: Home },
    { name: 'Análisis', href: '/adminConsorcio/analytics', icon: BarChart },
    { name: 'Calendario', href: '/adminConsorcio/calendario', icon: Calendar },
    { name: 'Legales', href: '/legales', icon: Shield },
    { name: 'Mi Perfil', href: '/profile', icon: UserCircle },
    { name: 'Tareas de Consorcio', href: '/adminConsorcio/tareas', icon: Building },
  ];

  const tecnicoNavigation = [
    { name: 'Dashboard', href: '/tecnico/dashboard', icon: Home },
    { name: 'Calendario', href: '/calendar', icon: Calendar },
    { name: 'Tareas Normales', href: '/tasks', icon: Calendar },
    { name: 'Tareas de Consorcio', href: '/tecnico/tareas-consorcio', icon: Building },
    { name: 'Mis finanzas', href: '/tecnico/finanzas', icon: DollarSign },
    { name: 'Legales', href: '/legales', icon: Shield },
    { name: 'Mi Perfil', href: '/profile', icon: UserCircle },
  ];

  const adminNavGroups: NavGroup[] = useMemo(
    () => [
      {
        id: 'operacion',
        label: 'Operación',
        items: [
          { name: 'Dashboard', href: '/dashboard', icon: Home },
          { name: 'Calendario', href: '/calendar', icon: Calendar },
          { name: 'Mapa en vivo', href: '/admin/mapa-vivo', icon: MapPin },
          { name: 'Tareas', href: '/tasks', icon: Calendar },
          { name: 'Tareas de Consorcio', href: '/admin/tareas-consorcio', icon: Building },
        ],
      },
      {
        id: 'analisis',
        label: 'Análisis',
        items: [
          { name: 'Análisis', href: '/admin/analytics', icon: BarChart },
          { name: 'Reclamos', href: '/admin/reclamos', icon: AlertTriangle },
        ],
      },
      {
        id: 'catalogo',
        label: 'Catálogo',
        items: [
          { name: 'Catálogo', href: '/admin/catalogo', icon: Package },
          { name: 'Especialidades', href: '/admin/specialties', icon: Briefcase },
        ],
      },
      {
        id: 'finanzas',
        label: 'Finanzas',
        items: [
          { name: 'Liquidaciones', href: '/admin/liquidaciones', icon: DollarSign },
          { name: 'Recibos', href: '/admin/recibos', icon: FileText },
          { name: 'Pagos manuales', href: '/admin/pagos-manuales', icon: Wallet },
        ],
      },
      {
        id: 'sistema',
        label: 'Sistema',
        items: [
          { name: 'Usuarios', href: '/admin/users', icon: Users },
          { name: 'Importar/Exportar', href: '/admin/importar-exportar', icon: Database },
          { name: 'Legales', href: '/legales', icon: Shield },
          { name: 'Mi Perfil', href: '/profile', icon: UserCircle },
        ],
      },
    ],
    []
  );

  const isActive = (path: string) => {
    if (path === '/dashboard') {
      return location.pathname === path || location.pathname === '/';
    }
    return location.pathname === path;
  };

  const isGroupOpen = (group: NavGroup) => {
    if (openGroups[group.id] !== undefined) return openGroups[group.id];
    const hasActive = group.items.some((item) => isActive(item.href));
    return hasActive || group.id === 'operacion';
  };

  const toggleGroup = (id: string) => {
    setOpenGroups((prev) => {
      const group = adminNavGroups.find((g) => g.id === id);
      const currentlyOpen = group ? isGroupOpen(group) : false;
      return { ...prev, [id]: !currentlyOpen };
    });
  };

  const renderNavButton = (item: NavItem) => {
    const Icon = item.icon;
    const active = isActive(item.href);
    return (
      <button
        key={item.name}
        onClick={() => {
          navigate(item.href);
          if (window.innerWidth < 1024) setSidebarOpen(false);
          if (!sidebarPinned) scheduleCloseDesktopSidebar();
        }}
        className={`group w-full flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200 cursor-pointer ${navItemClass(active)}`}
      >
        <Icon className={`mr-2.5 h-4 w-4 flex-shrink-0 transition-colors ${navIconClass(active)}`} />
        <span className="text-left truncate">{item.name}</span>
        {active && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-white flex-shrink-0" />}
      </button>
    );
  };

  const desktopSidebarVisible = sidebarPinned || desktopHoverOpen;

  const sidebarClassName = [
    'fixed inset-y-0 left-0 z-50 w-64',
    'bg-gradient-to-b from-blue-600 via-blue-700 to-blue-800',
    'dark:from-slate-800 dark:via-slate-900 dark:to-slate-950',
    'overflow-hidden border-r border-blue-500/20 dark:border-slate-700',
    'transition-transform duration-300 ease-in-out will-change-transform',
    // Mobile
    sidebarOpen ? 'translate-x-0' : '-translate-x-full',
    // Desktop pinned: en flujo normal
    sidebarPinned ? 'lg:static lg:translate-x-0 lg:h-full lg:flex-shrink-0' : '',
    // Desktop auto-hide: overlay fijo
    !sidebarPinned
      ? desktopHoverOpen
        ? 'lg:translate-x-0 lg:shadow-2xl lg:shadow-black/20'
        : 'lg:-translate-x-full'
      : '',
  ]
    .filter(Boolean)
    .join(' ');

  const pinToggleButton = (
    <button
      type="button"
      onClick={toggleSidebarPinned}
      title={sidebarPinned ? 'Menú fijo: clic para auto-ocultar' : 'Auto-ocultar: clic para fijar'}
      aria-label={sidebarPinned ? 'Pasar a menú auto-ocultable' : 'Fijar menú lateral'}
      className="hidden lg:inline-flex items-center justify-center p-2 rounded-lg text-gray-500 hover:text-gray-800 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-white dark:hover:bg-gray-800 transition-colors"
    >
      {sidebarPinned ? <Pin className="h-4 w-4" /> : <PinOff className="h-4 w-4" />}
    </button>
  );

  return (
    <div className="h-screen flex flex-col lg:flex-row bg-gray-100 dark:bg-gray-900 overflow-hidden relative">
      {/* Riel vacío: único lugar que abre el menú (no solapa el contenido) */}
      {!sidebarPinned && (
        <div
          className="hidden lg:flex flex-shrink-0 h-full items-stretch relative z-[45] cursor-pointer"
          style={{ width: EDGE_RAIL_PX }}
          onMouseEnter={openDesktopSidebar}
          onMouseLeave={scheduleCloseDesktopSidebar}
          title="Abrir menú"
          aria-label="Abrir menú lateral"
        >
          <div className="w-full h-full bg-transparent hover:bg-blue-500/5 transition-colors duration-200" />
          <div className="pointer-events-none absolute inset-y-3 left-0 w-1 rounded-r bg-gradient-to-b from-blue-500/25 via-blue-500/55 to-blue-500/25" />
        </div>
      )}

      {/* Sidebar */}
      <div
        className={sidebarClassName}
        onMouseEnter={openDesktopSidebar}
        onMouseLeave={scheduleCloseDesktopSidebar}
      >
        <div className="flex flex-col h-full min-h-0">
          <div className="flex items-center justify-between h-16 px-4 py-3 bg-blue-800/40 dark:bg-slate-950/50 border-b border-white/10 flex-shrink-0">
            <div className="flex items-center space-x-2.5 cursor-pointer" onClick={() => navigate('/dashboard')}>
              <div className="flex-shrink-0 bg-white p-1 rounded-lg shadow-sm hover:shadow transition-shadow">
                <img src="/Seprogar vector.svg" alt="Seprogar Logo" className="h-7 w-7 object-contain" />
              </div>
              <div>
                <h1 className="text-base font-bold text-white leading-tight tracking-tight">
                  Seprogar
                </h1>
                <p className="text-[9px] text-blue-100/80 font-medium tracking-wide uppercase">Gestión</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={toggleSidebarPinned}
                title={sidebarPinned ? 'Auto-ocultar menú' : 'Fijar menú'}
                className="hidden lg:inline-flex p-1.5 rounded-md text-blue-100/80 hover:text-white hover:bg-white/10 transition-colors"
              >
                {sidebarPinned ? <Pin className="h-4 w-4" /> : <PinOff className="h-4 w-4" />}
              </button>
              <button
                className="lg:hidden text-blue-100 hover:text-white"
                onClick={() => setSidebarOpen(false)}
              >
                <X className="h-6 w-6" />
              </button>
            </div>
          </div>

          <nav className="flex-1 min-h-0 px-2.5 py-3 space-y-0.5 overflow-y-auto overscroll-contain">
            {user?.rol === 'usuario' && (
              <div className="space-y-0.5">{tecnicoNavigation.map(renderNavButton)}</div>
            )}

            {!isAdminRole(user) && user?.rol !== 'adminConsorcio' && user?.rol !== 'usuario' && (
              <div className="space-y-0.5">{navigation.map(renderNavButton)}</div>
            )}

            {isAdminRole(user) && (
              <div className="space-y-1">
                {adminNavGroups.map((group) => {
                  const open = isGroupOpen(group);
                  return (
                    <div key={group.id} className="rounded-lg">
                      <button
                        type="button"
                        onClick={() => toggleGroup(group.id)}
                        className="w-full flex items-center justify-between px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-blue-100/70 hover:text-white transition-colors"
                      >
                        <span>{group.label}</span>
                        <ChevronDown
                          className={`h-3.5 w-3.5 transition-transform duration-200 ${open ? 'rotate-0' : '-rotate-90'}`}
                        />
                      </button>
                      {open && (
                        <div className="space-y-0.5 pb-1">
                          {group.items.map(renderNavButton)}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {user?.rol === 'adminConsorcio' && (
              <div className="space-y-0.5">{adminConsorcioNavigation.map(renderNavButton)}</div>
            )}
          </nav>

          <div className="p-3 mt-auto border-t border-blue-500/10 flex-shrink-0">
            <button
              onClick={() => {
                navigate('/profile');
                if (window.innerWidth < 1024) setSidebarOpen(false);
              }}
              className="w-full text-left cursor-pointer"
            >
              <div className="flex items-center mb-2 px-2 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
                <div className="flex-shrink-0 h-8 w-8 rounded-full bg-blue-400/20 flex items-center justify-center text-blue-200">
                  <UserCircle className="h-5 w-5" />
                </div>
                <div className="ml-2.5 min-w-0 flex-1">
                  <p className="text-sm font-medium text-white truncate">
                    {user?.nombre || 'Usuario'}
                  </p>
                  <p className="text-[11px] text-blue-200/70 truncate">
                    {roleLabel(user?.rol)}
                  </p>
                </div>
              </div>
            </button>

            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center px-3 py-2 text-sm font-medium text-blue-100 hover:text-white rounded-lg hover:bg-white/10 transition-colors group cursor-pointer"
            >
              <LogOut className="mr-2 h-4 w-4 text-blue-200 group-hover:text-white" />
              Cerrar sesión
            </button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden min-w-0">
        <div className="sticky top-0 z-10 bg-white dark:bg-gray-900 shadow-sm">
          <div className="flex items-center justify-between h-16 px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-1">
              <button
                className="lg:hidden text-gray-500 hover:text-gray-600 dark:text-gray-400 dark:hover:text-gray-300"
                onClick={() => setSidebarOpen(true)}
              >
                <Menu className="h-6 w-6" />
              </button>
              {pinToggleButton}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={toggleTheme}
                title={isDarkMode ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
                aria-label={isDarkMode ? 'Activar modo claro' : 'Activar modo oscuro'}
                className="inline-flex items-center justify-center p-2 rounded-lg text-gray-500 hover:text-gray-800 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-white dark:hover:bg-gray-800 transition-colors"
              >
                {isDarkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </button>
              <div className="ml-1">
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
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 pb-8">
          <Outlet />
        </main>
      </div>

      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-gray-600 bg-opacity-75 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <ChatBot />
      <SepiTour />
    </div>
  );
};

export default Layout;

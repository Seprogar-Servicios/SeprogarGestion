import React, { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../../store';
import { fetchUsers, updateUser, createUser, deleteUser, fetchPendingUsers, approveUser } from '../../store/slices/usersSlice';
import { fetchEspecialidades } from '../../store/slices/especialidadesSlice';
import { 
  Users, 
  Search, 
  Edit, 
  Shield,
  User as UserIcon,
  Plus,
  RefreshCw,
  Key,
  Trash2,
  CheckCircle,
  AlertCircle,
  Clock
} from 'lucide-react';
import api from '../../config/api';
import type { User } from '../../types';
import { toast } from 'react-toastify';

const UserManagement: React.FC = () => {
  const { user } = useAppSelector((state) => state.auth);
  
  if (user?.rol !== 'admin') {
    return (
      <div className="p-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border-t-4 border-red-500 p-6">
          <div className="flex items-center gap-4">
            <div className="bg-red-100 dark:bg-red-900/30 p-3 rounded-full">
              <Shield className="h-6 w-6 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-red-600 dark:text-red-400">Acceso denegado</h2>
              <p className="text-gray-600 dark:text-gray-300">No tienes permisos de administrador para acceder a esta sección.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }
  const dispatch = useAppDispatch();
  const { users, pendingUsers, loading } = useAppSelector((state) => state.users);
  const { especialidades } = useAppSelector((state) => state.especialidades);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState<'all' | 'admin' | 'usuario'>('all');
  const [activeTab, setActiveTab] = useState<'approved' | 'pending'>('approved');
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showResetPasswordModal, setShowResetPasswordModal] = useState(false);
  const [resetPasswordUserId, setResetPasswordUserId] = useState<string>('');
  const [resetPasswordResult, setResetPasswordResult] = useState<{success: boolean, message: string, newPassword?: string}>({ success: false, message: '' });

  interface FormData {
    nombre: string;
    email: string;
    telefono: string;
    rol: 'admin' | 'usuario';
    password?: string;
    confirmPassword?: string;
  }

  const [formData, setFormData] = useState<FormData>({
    nombre: '',
    email: '',
    telefono: '',
    rol: 'usuario',
    password: '',
    confirmPassword: ''
  });

  const [showPassword, setShowPassword] = useState(false);
  const [createFormData, setCreateFormData] = useState({
    nombre: '',
    email: '',
    telefono: '',
    password: '',
    rol: 'usuario' as 'admin' | 'usuario',
    especialidad: ''
  });

  useEffect(() => {
    if (user?.rol === 'admin') {
      dispatch(fetchUsers());
      dispatch(fetchPendingUsers());
      dispatch(fetchEspecialidades());
    }
  }, [dispatch, user?.rol]);

  const handleResetPassword = async (userId: string) => {
    try {
      // Llamar al endpoint para resetear la contraseña usando la instancia de api
      const response = await api.post(`/usuarios/${userId}/reset-password`, {});
      
      // Importar toast dinámicamente
      const { toast } = await import('react-toastify');
      
      // Mostrar la nueva contraseña en un toast
      toast.success(
        <div>
          <p>Contraseña restablecida correctamente</p>
          <p className="font-mono bg-gray-100 p-2 mt-2 rounded">
            Nueva contraseña: <span className="font-bold">{response.data.newPassword}</span>
          </p>
          <p className="text-sm text-gray-600 mt-1">Por favor, anótala en un lugar seguro.</p>
        </div>,
        {
          position: "top-center",
          autoClose: 10000, // 10 segundos para que el usuario pueda copiar la contraseña
          hideProgressBar: false,
          closeOnClick: false,
          pauseOnHover: true,
          draggable: true,
          className: 'w-full max-w-md'
        }
      );
    } catch (error) {
      console.error('Error al restablecer la contraseña:', error);
      const { toast } = await import('react-toastify');
      toast.error('Error al restablecer la contraseña', {
        position: "top-right",
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });
    }
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    
    try {
      // Only send the fields that have changed
      const updatedFields: Partial<User> = {};
      Object.entries(formData).forEach(([key, value]) => {
        if (editingUser[key as keyof User] !== value) {
          updatedFields[key as keyof User] = value;
        }
      });
      
      if (Object.keys(updatedFields).length === 0) {
        const { toast } = await import('react-toastify');
        toast.info('No se realizaron cambios en el usuario', {
          position: "top-right",
          autoClose: 3000,
        });
        return;
      }

      const resultAction = await dispatch(updateUser({ 
        id: editingUser._id, 
        data: updatedFields 
      }));
      
      if (updateUser.fulfilled.match(resultAction)) {
        await dispatch(fetchUsers());
        setShowEditModal(false);
        setEditingUser(null);
        resetForm();
        
        const { toast } = await import('react-toastify');
        toast.success('Usuario actualizado correctamente', {
          position: "top-right",
          autoClose: 3000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
        });
      } else if (resultAction.payload) {
        // Handle API error with message
        const { toast } = await import('react-toastify');
        toast.error(`Error al actualizar: ${resultAction.payload}`, {
          position: "top-right",
          autoClose: 5000,
        });
      }
    } catch (error) {
      console.error('Error updating user:', error);
      const { toast } = await import('react-toastify');
      toast.error('Error inesperado al actualizar el usuario', {
        position: "top-right",
        autoClose: 5000,
      });
    }
  };

  const resetForm = () => {
    setFormData({
      nombre: '',
      email: '',
      telefono: '',
      rol: 'usuario',
      password: '',
      confirmPassword: ''
    });
  };

  const resetCreateForm = () => {
    setCreateFormData({
      nombre: '',
      email: '',
      telefono: '',
      password: '',
      rol: 'usuario',
      especialidad: ''
    });
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Usar createFormData en lugar de formData para la creación
      const userData = {
        ...createFormData,
        especialidad: createFormData.especialidad || undefined
      };
      
      await dispatch(createUser(userData)).unwrap();
      await dispatch(fetchUsers());
      setShowCreateModal(false);
      resetCreateForm();
      
      const { toast } = await import('react-toastify');
      toast.success('Usuario creado correctamente', {
        position: "top-right",
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });
    } catch (error) {
      console.error('Error creating user:', error);
      const { toast } = await import('react-toastify');
      toast.error('Error al crear el usuario', {
        position: "top-right",
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });
    }
  };

  const openEditModal = (user: User) => {
    setEditingUser(user);
    setFormData({
      nombre: user.nombre,
      email: user.email,
      telefono: user.telefono || '',
      rol: user.rol
    });
    setShowEditModal(true);
  };

  const handleDeleteUser = async (userId: string, userName: string) => {
    const { toast } = await import('react-toastify');
    
    const ConfirmToast = ({ closeToast }: { closeToast?: () => void }) => (
      <div className="p-4">
        <p className="mb-4">¿Estás seguro de que deseas eliminar al usuario <strong>{userName}</strong>?</p>
        <div className="flex justify-end space-x-2">
          <button
            onClick={async () => {
              try {
                const resultAction = await dispatch(deleteUser(userId));
                if (deleteUser.fulfilled.match(resultAction)) {
                  toast.success('Usuario eliminado correctamente', {
                    position: "top-right",
                    autoClose: 3000,
                  });
                  // Refresh the users list
                  await dispatch(fetchUsers());
                } else if (resultAction.payload) {
                  toast.error(`Error al eliminar: ${resultAction.payload}`, {
                    position: "top-right",
                    autoClose: 5000,
                  });
                }
              } catch (error) {
                console.error('Error deleting user:', error);
                toast.error('Error inesperado al eliminar el usuario', {
                  position: "top-right",
                  autoClose: 5000,
                });
              }
              closeToast?.();
            }}
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded hover:bg-red-700"
          >
            Eliminar
          </button>
          <button
            onClick={() => closeToast?.()}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded hover:bg-gray-300"
          >
            Cancelar
          </button>
        </div>
      </div>
    );

    toast(
      <ConfirmToast />,
      {
        position: "top-center",
        autoClose: false,
        closeButton: false,
        closeOnClick: false,
        draggable: true,
        className: 'w-full max-w-md'
      }
    );
  };

  // Asegurar que solo se muestren usuarios aprobados en la lista de usuarios filtrados
  const filteredUsers = users?.filter(user => {
    // Verificar que el usuario no esté en la lista de pendientes
    const isPending = pendingUsers?.some(pendingUser => pendingUser._id === user._id);
    if (isPending) return false;
    
    const matchesSearch = user.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = filterRole === 'all' || user.rol === filterRole;
    return matchesSearch && matchesRole;
  }) || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border-t-4 border-blue-500 p-4 mb-4 animate-fadeIn">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center">
            <div className="bg-blue-100 dark:bg-blue-900/30 p-3 rounded-full mr-4">
              <Users className="h-8 w-8 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Gestión de Usuarios
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 flex items-center">
                Administra usuarios del sistema y aprueba nuevos registros
              </p>
              {pendingUsers && pendingUsers.length > 0 && (
                <div className="mt-2 inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300">
                  <AlertCircle className="h-3 w-3 mr-1" />
                  {pendingUsers.length} {pendingUsers.length === 1 ? 'usuario pendiente' : 'usuarios pendientes'} de aprobación
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Tabs */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden mb-6">
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="flex -mb-px">
            <button
              onClick={() => setActiveTab('approved')}
              className={`${activeTab === 'approved' 
                ? 'border-blue-500 text-blue-600 dark:text-blue-400' 
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-200'} 
                whitespace-nowrap py-4 px-6 border-b-2 font-medium text-sm flex items-center transition-colors duration-200`}
            >
              <Users className="h-5 w-5 mr-2" />
              Usuarios Aprobados
            </button>
            <button
              onClick={() => setActiveTab('pending')}
              className={`${activeTab === 'pending' 
                ? 'border-yellow-500 text-yellow-600 dark:text-yellow-400' 
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-200'} 
                whitespace-nowrap py-4 px-6 border-b-2 font-medium text-sm flex items-center transition-colors duration-200 group relative`}
            >
              <Clock className="h-5 w-5 mr-2" />
              Usuarios Pendientes
              {pendingUsers && pendingUsers.length > 0 && (
                <span className="ml-2 inline-flex items-center justify-center h-5 min-w-5 px-1.5 text-xs font-medium text-white bg-yellow-500 rounded-full">
                  {pendingUsers.length}
                </span>
              )}
            </button>
          </nav>
        </div>
        
        {/* Header de usuarios */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center">
            <h2 className="text-lg font-medium text-gray-900 dark:text-white">
              {activeTab === 'approved' 
                ? `Usuarios del Sistema (${users?.length || 0})` 
                : `Solicitudes Pendientes (${pendingUsers?.length || 0})`}
            </h2>
          </div>
        </div>
      </div>

      {/* Filtros de búsqueda */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border-t-4 border-blue-500 p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-4 items-end">
          <div className="flex-1 w-full">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Buscar usuarios
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Buscar por nombre o email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 w-full border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200"
              />
            </div>
          </div>
          
          <div className="w-full md:w-auto">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Filtrar por rol
            </label>
            <select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value as 'all' | 'admin' | 'usuario')}
              className="w-full md:w-48 border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200"
            >
              <option value="all">Todos los roles</option>
              <option value="admin">Administradores</option>
              <option value="usuario">Usuarios</option>
            </select>
          </div>
          
          {activeTab === 'approved' && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="w-full md:w-auto bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-4 py-2 rounded-md flex items-center justify-center gap-2 transition-all duration-200 shadow-md hover:shadow-lg cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              Nuevo Usuario
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      {/* Pending Users Tab */}
      {activeTab === 'pending' && (
        <div className="space-y-4">
          {pendingUsers && pendingUsers.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {pendingUsers.map((pendingUser) => (
                <div key={pendingUser._id} className="bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden border border-gray-200 dark:border-gray-700 hover:shadow-lg hover:scale-[1.02] transition-all duration-300 transform">
                  <div className="bg-yellow-50 dark:bg-yellow-900/20 px-4 py-3 border-b border-yellow-100 dark:border-yellow-900/30">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-300">Solicitud Pendiente</h3>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300">
                        <Clock className="h-3 w-3 mr-1" />
                        Pendiente
                      </span>
                    </div>
                  </div>
                  <div className="p-5">
                    <div className="flex items-start">
                      <div className="flex-shrink-0">
                        <div className="h-12 w-12 rounded-full bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center">
                          <UserIcon className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
                        </div>
                      </div>
                      <div className="ml-4 flex-1">
                        <h4 className="text-lg font-semibold text-gray-900 dark:text-white">{pendingUser.nombre}</h4>
                        <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">{pendingUser.email}</p>
                        
                        {pendingUser.telefono && (
                          <div className="mt-2 flex items-center text-sm text-gray-500 dark:text-gray-400">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                            </svg>
                            {pendingUser.telefono}
                          </div>
                        )}
                        
                        <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between">
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            Registrado: {new Date(pendingUser.createdAt).toLocaleDateString()}
                          </span>
                          <div className="flex space-x-2">
                            <button
                              onClick={async () => {
                                try {
                                  await dispatch(approveUser(pendingUser._id)).unwrap();
                                  toast.success('Usuario aprobado exitosamente');
                                } catch (error) {
                                  toast.error('Error al aprobar el usuario');
                                }
                              }}
                              className="p-2 text-gray-400 hover:text-green-500 transition-colors duration-200 cursor-pointer"
                              title="Aprobar usuario"
                            >
                              <CheckCircle className="h-5 w-5" />
                            </button>
                            <button
                              onClick={() => handleDeleteUser(pendingUser._id, pendingUser.nombre)}
                              className="p-2 text-gray-400 hover:text-red-500 transition-colors duration-200 cursor-pointer"
                              title="Rechazar usuario"
                            >
                              <Trash2 className="h-5 w-5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden border border-gray-200 dark:border-gray-700 p-8 text-center">
              <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-yellow-50 dark:bg-yellow-900/20 mb-4">
                <Clock className="h-8 w-8 text-yellow-500 dark:text-yellow-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">No hay usuarios pendientes</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Todos los usuarios han sido aprobados o no hay nuevos registros pendientes.
              </p>
            </div>
          )}
        </div>
      )}
      
      {/* Approved Users Tab */}
      {activeTab === 'approved' && (
        <div className="space-y-4">
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden border border-gray-200 dark:border-gray-700">
                  <div className="bg-gray-50 dark:bg-gray-700/30 px-4 py-3 border-b border-gray-100 dark:border-gray-700">
                    <div className="animate-pulse h-4 w-32 bg-gray-200 dark:bg-gray-600 rounded"></div>
                  </div>
                  <div className="p-5">
                    <div className="flex items-start">
                      <div className="animate-pulse h-12 w-12 rounded-full bg-gray-200 dark:bg-gray-700 mr-4"></div>
                      <div className="flex-1 space-y-2">
                        <div className="animate-pulse h-5 w-3/4 bg-gray-200 dark:bg-gray-600 rounded"></div>
                        <div className="animate-pulse h-4 w-1/2 bg-gray-200 dark:bg-gray-600 rounded"></div>
                        <div className="animate-pulse h-4 w-2/3 bg-gray-200 dark:bg-gray-600 rounded"></div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : filteredUsers && filteredUsers.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredUsers.map((user) => (
                <div key={user._id} className="bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden border border-gray-200 dark:border-gray-700 hover:shadow-lg hover:scale-[1.02] transition-all duration-300 transform">
                  <div className={`px-4 py-3 border-b ${
                    user.rol === 'admin' 
                      ? 'bg-purple-50 dark:bg-purple-900/20 border-purple-100 dark:border-purple-900/30' 
                      : 'bg-blue-50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-900/30'
                  }`}>
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-medium">
                        {user.rol === 'admin' ? 'Administrador' : 'Técnico'}
                      </h3>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        user.rol === 'admin'
                          ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300'
                          : 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                      }`}>
                        {user.rol === 'admin' ? (
                          <Shield className="h-3 w-3 mr-1" />
                        ) : (
                          <UserIcon className="h-3 w-3 mr-1" />
                        )}
                        {user.rol === 'admin' ? 'Admin' : 'Técnico'}
                      </span>
                    </div>
                  </div>
                  <div className="p-5">
                    <div className="flex items-start">
                      <div className="flex-shrink-0">
                        <div className={`h-12 w-12 rounded-full flex items-center justify-center ${
                          user.rol === 'admin'
                            ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400'
                            : 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                        }`}>
                          {user.rol === 'admin' ? (
                            <Shield className="h-6 w-6" />
                          ) : (
                            <UserIcon className="h-6 w-6" />
                          )}
                        </div>
                      </div>
                      <div className="ml-4 flex-1">
                        <h4 className="text-lg font-semibold text-gray-900 dark:text-white">{user.nombre}</h4>
                        <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">{user.email}</p>
                        
                        {user.telefono && (
                          <div className="mt-2 flex items-center text-sm text-gray-500 dark:text-gray-400">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                            </svg>
                            {user.telefono}
                          </div>
                        )}
                        
                        <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between">
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            Registrado: {new Date(user.createdAt).toLocaleDateString()}
                          </span>
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => {
                                setResetPasswordUserId(user._id);
                                setShowResetPasswordModal(true);
                              }}
                              className="p-2 text-gray-400 hover:text-orange-500 transition-colors duration-200 cursor-pointer"
                              title="Blanquear contraseña"
                            >
                              <Key className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => openEditModal(user)}
                              className="p-2 text-gray-400 hover:text-blue-500 transition-colors duration-200 cursor-pointer"
                              title="Editar usuario"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteUser(user._id, user.nombre)}
                              className="p-2 text-gray-400 hover:text-red-500 transition-colors duration-200 cursor-pointer"
                              title="Eliminar usuario"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden border border-gray-200 dark:border-gray-700 p-8 text-center">
              <Users className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-lg font-medium text-gray-900 dark:text-white">No se encontraron usuarios</h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                No hay usuarios que coincidan con los filtros actuales
              </p>
            </div>
          )}
        </div>
      )}

      {/* Reset Password Modal */}
      {showResetPasswordModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75 overflow-y-auto h-full w-full z-50 flex items-center justify-center">
          <div className="relative mx-auto p-6 border w-full max-w-md shadow-xl rounded-lg bg-white dark:bg-gray-800 transition-all">
            <div className="absolute top-4 right-4">
              <button
                onClick={() => {
                  setShowResetPasswordModal(false);
                  setResetPasswordResult({ success: false, message: '' });
                }}
                className="text-gray-400 hover:text-gray-600 dark:text-gray-300 dark:hover:text-white transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="mt-2">
              <div className="flex items-center mb-6">
                <div className="bg-orange-100 dark:bg-orange-900 p-2 rounded-full mr-3">
                  <Key className="h-6 w-6 text-orange-600 dark:text-orange-400" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Blanquear Contraseña
                </h3>
              </div>
              
              {resetPasswordResult.message ? (
                <div className={`p-4 mb-4 rounded-md ${
                  resetPasswordResult.success 
                    ? 'bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800' 
                    : 'bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800'
                }`}>
                  <div className="flex">
                    <div className="flex-shrink-0">
                      {resetPasswordResult.success ? (
                        <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      ) : (
                        <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                    <div className="ml-3">
                      <h3 className={`text-sm font-medium ${
                        resetPasswordResult.success ? 'text-green-800 dark:text-green-400' : 'text-red-800 dark:text-red-400'
                      }`}>
                        {resetPasswordResult.message}
                      </h3>
                      {resetPasswordResult.success && resetPasswordResult.newPassword && (
                        <div className="mt-2 text-sm">
                          <p className="text-gray-700 dark:text-gray-300 mb-1">Nueva contraseña generada:</p>
                          <div className="flex items-center">
                            <code className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded font-mono text-sm">
                              {resetPasswordResult.newPassword}
                            </code>
                            <button 
                              onClick={() => {
                                navigator.clipboard.writeText(resetPasswordResult.newPassword || '');
                                alert('Contraseña copiada al portapapeles');
                              }}
                              className="ml-2 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                              title="Copiar al portapapeles"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                              </svg>
                            </button>
                          </div>
                          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                            Comparta esta contraseña con el usuario de forma segura. El usuario deberá cambiarla en su próximo inicio de sesión.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-6">
                  <p className="text-gray-700 dark:text-gray-300 mb-6">
                    ¿Está seguro que desea blanquear la contraseña de este usuario? 
                    <br />
                    <span className="text-sm text-gray-500 dark:text-gray-400 mt-1 block">
                      Se generará una nueva contraseña aleatoria que deberá compartir con el usuario.
                    </span>
                  </p>
                  <div className="flex justify-center space-x-3">
                    <button
                      onClick={() => setShowResetPasswordModal(false)}
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 dark:text-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={() => handleResetPassword(resetPasswordUserId)}
                      className="px-4 py-2 text-sm font-medium text-white bg-orange-500 hover:bg-orange-600 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 flex items-center"
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Blanquear Contraseña
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      
      {/* Edit User Modal */}
      {showEditModal && editingUser && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75 overflow-y-auto h-full w-full z-50 flex items-center justify-center">
          <div className="relative mx-auto p-6 border w-full max-w-md shadow-xl rounded-lg bg-white dark:bg-gray-800 transition-all">
            <div className="absolute top-4 right-4">
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setEditingUser(null);
                  resetForm();
                }}
                className="text-gray-400 hover:text-gray-600 dark:text-gray-300 dark:hover:text-white transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="mt-2">
              <div className="flex items-center mb-6">
                <div className="bg-blue-100 dark:bg-blue-900 p-2 rounded-full mr-3">
                  <UserIcon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Editar Usuario
                </h3>
              </div>
              
              <form onSubmit={handleUpdateUser} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Nombre *
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      value={formData.nombre}
                      onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                      className="block w-full border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm py-2.5 px-4 pl-10 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-colors"
                    />
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <UserIcon className="h-5 w-5 text-gray-400 dark:text-gray-500" />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Email *
                  </label>
                  <div className="relative">
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="block w-full border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm py-2.5 px-4 pl-10 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-colors"
                    />
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400 dark:text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Teléfono
                  </label>
                  <div className="relative">
                    <input
                      type="tel"
                      value={formData.telefono}
                      onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                      className="block w-full border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm py-2.5 px-4 pl-10 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-colors"
                      placeholder="Ej: 612345678"
                    />
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400 dark:text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Rol *
                  </label>
                  <div className="relative">
                    <select
                      value={formData.rol}
                      onChange={(e) => setFormData({ ...formData, rol: e.target.value as any })}
                      className="block w-full border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm py-2.5 px-4 pl-10 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-colors appearance-none"
                    >
                      <option value="usuario">Técnico/Usuario</option>
                      <option value="admin">Administrador</option>
                    </select>
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Shield className="h-5 w-5 text-gray-400 dark:text-gray-500" />
                    </div>
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end space-x-3 pt-5">
                  <button
                    type="button"
                    onClick={() => {
                      setShowEditModal(false);
                      setEditingUser(null);
                      resetForm();
                    }}
                    className="px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 flex items-center"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Actualizar
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Create User Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75 overflow-y-auto h-full w-full z-50 flex items-center justify-center">
          <div className="relative mx-auto p-6 border w-full max-w-md shadow-xl rounded-lg bg-white dark:bg-gray-800 transition-all">
            <div className="absolute top-4 right-4">
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  resetForm();
                }}
                className="text-gray-400 hover:text-gray-600 dark:text-gray-300 dark:hover:text-white transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="mt-2">
              <div className="flex items-center mb-6">
                <div className="bg-green-100 dark:bg-green-900 p-2 rounded-full mr-3">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Crear Nuevo Usuario
                </h3>
              </div>
              
              <form onSubmit={handleCreateUser} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Nombre *
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      value={createFormData.nombre}
                      onChange={(e) => setCreateFormData({ ...createFormData, nombre: e.target.value })}
                      className="block w-full border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm py-2.5 px-4 pl-10 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-colors"
                    />
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <UserIcon className="h-5 w-5 text-gray-400 dark:text-gray-500" />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Email *
                  </label>
                  <div className="relative">
                    <input
                      type="email"
                      required
                      value={createFormData.email}
                      onChange={(e) => setCreateFormData({ ...createFormData, email: e.target.value })}
                      className="block w-full border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm py-2.5 px-4 pl-10 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-colors"
                    />
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400 dark:text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Teléfono
                  </label>
                  <div className="relative">
                    <input
                      type="tel"
                      value={createFormData.telefono}
                      onChange={(e) => setCreateFormData({ ...createFormData, telefono: e.target.value })}
                      className="block w-full border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm py-2.5 px-4 pl-10 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-colors"
                      placeholder="Ej: 612345678"
                    />
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400 dark:text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Contraseña *
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={createFormData.password}
                      onChange={(e) => setCreateFormData({ ...createFormData, password: e.target.value })}
                      className="block w-full border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm py-2.5 px-4 pl-10 pr-10 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-colors"
                      placeholder="••••••••"
                    />
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400 dark:text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                    </div>
                    <button
                      type="button"
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                    >
                      {showPassword ? (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                        </svg>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Rol *
                  </label>
                  <div className="relative">
                    <select
                      value={createFormData.rol}
                      onChange={(e) => setCreateFormData({ ...createFormData, rol: e.target.value as any })}
                      className="block w-full border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm py-2.5 px-4 pl-10 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-colors appearance-none"
                    >
                      <option value="usuario">Técnico/Usuario</option>
                      <option value="admin">Administrador</option>
                    </select>
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Shield className="h-5 w-5 text-gray-400 dark:text-gray-500" />
                    </div>
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                </div>

                {createFormData.rol === 'usuario' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Especialidad
                    </label>
                    <select
                      value={createFormData.especialidad}
                      onChange={(e) => setCreateFormData({ ...createFormData, especialidad: e.target.value })}
                      className="block w-full border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm py-2.5 px-4 pl-10 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-colors appearance-none"
                    >
                      <option value="">Sin especialidad</option>
                      {especialidades?.map((esp) => (
                        <option key={esp._id} value={esp._id}>
                          {esp.nombre}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="flex justify-end space-x-3 pt-5">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateModal(false);
                      resetCreateForm();
                    }}
                    className="px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 flex items-center"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    Crear Usuario
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;

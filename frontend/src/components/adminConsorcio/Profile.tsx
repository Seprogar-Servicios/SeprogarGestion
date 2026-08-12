import React, { useState } from 'react';
import { useAppSelector } from '../../store';
import { 
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Building,
  Shield,
  Edit,
  Save,
  X,
  UserCircle
} from 'lucide-react';
import AdminPageHeader from '../common/AdminPageHeader';

const AdminConsorcioProfile: React.FC = () => {
  const { user } = useAppSelector((state) => state.auth);
  
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    nombre: user?.nombre || '',
    email: user?.email || '',
    telefono: user?.telefono || '',
    direccion: user?.direccion || ''
  });

  const [showSuccess, setShowSuccess] = useState(false);
  const [showError, setShowError] = useState(false);

  const handleEdit = () => {
    setFormData({
      nombre: user?.nombre || '',
      email: user?.email || '',
      telefono: user?.telefono || '',
      direccion: user?.direccion || ''
    });
    setIsEditing(true);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setFormData({
      nombre: user?.nombre || '',
      email: user?.email || '',
      telefono: user?.telefono || '',
      direccion: user?.direccion || ''
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`/api/usuarios/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        throw new Error('Error al actualizar el perfil');
      }

      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
      setIsEditing(false);
      
      // Actualizar el usuario en Redux si es necesario
      // dispatch(updateUser(updatedUser));
      
    } catch (error) {
      console.error('Error:', error);
      setShowError(true);
      setTimeout(() => setShowError(false), 3000);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Mi Perfil"
        description="Información de tu cuenta de administrador de consorcio"
        eyebrow="Consorcio"
        icon={<UserCircle className="h-5 w-5" />}
        actions={
          !isEditing ? (
            <button
              onClick={handleEdit}
              className="inline-flex items-center px-4 py-2.5 text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700"
            >
              <Edit className="h-4 w-4 mr-2" />
              Editar perfil
            </button>
          ) : (
            <>
              <button
                onClick={handleCancel}
                className="inline-flex items-center px-4 py-2.5 text-sm font-medium rounded-lg text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700"
              >
                <X className="h-4 w-4 mr-2" />
                Cancelar
              </button>
              <button
                onClick={handleSave}
                className="inline-flex items-center px-4 py-2.5 text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700"
              >
                <Save className="h-4 w-4 mr-2" />
                Guardar
              </button>
            </>
          )
        }
      />

      {/* Success/Error Messages */}
      {showSuccess && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-800 dark:text-green-300 px-4 py-3 rounded-lg">
          Perfil actualizado exitosamente
        </div>
      )}
      
      {showError && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-300 px-4 py-3 rounded-lg">
          Error al actualizar el perfil
        </div>
      )}

      {/* Profile Content */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700">
        <div className="p-6">
          {/* Profile Header */}
          <div className="flex items-center space-x-6 mb-8">
            <div className="h-24 w-24 bg-blue-50 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
              <User className="h-12 w-12 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                {user?.nombre}
              </h2>
              <div className="flex items-center space-x-2 mt-1">
                <span className="px-3 py-1 text-sm font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 rounded-full">
                  Administrador de Consorcio
                </span>
                <Shield className="h-4 w-4 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </div>

          {/* Profile Form */}
          <form onSubmit={handleSave} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Información Personal */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Información Personal
                </h3>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Nombre Completo
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      name="nombre"
                      value={formData.nombre}
                      onChange={handleChange}
                      disabled={!isEditing}
                      className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white ${
                        isEditing 
                          ? 'border-gray-300 dark:border-gray-600' 
                          : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800'
                      }`}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Correo Electrónico
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      disabled={!isEditing}
                      className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white ${
                        isEditing 
                          ? 'border-gray-300 dark:border-gray-600' 
                          : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800'
                      }`}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Teléfono
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="tel"
                      name="telefono"
                      value={formData.telefono}
                      onChange={handleChange}
                      disabled={!isEditing}
                      placeholder="+54 9 XXX XXX XXX"
                      className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white ${
                        isEditing 
                          ? 'border-gray-300 dark:border-gray-600' 
                          : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800'
                      }`}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Dirección
                  </label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      name="direccion"
                      value={formData.direccion}
                      onChange={handleChange}
                      disabled={!isEditing}
                      placeholder="Calle, Número, Ciudad"
                      className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white ${
                        isEditing 
                          ? 'border-gray-300 dark:border-gray-600' 
                          : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800'
                      }`}
                    />
                  </div>
                </div>
              </div>

              {/* Información de Cuenta */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Información de Cuenta
                </h3>
                
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <Building className="h-5 w-5 text-gray-400" />
                      <div>
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Rol</p>
                        <p className="text-gray-900 dark:text-white">Administrador de Consorcio</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <Calendar className="h-5 w-5 text-gray-400" />
                      <div>
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Miembro desde</p>
                        <p className="text-gray-900 dark:text-white">
                          {user?.createdAt ? new Date(user.createdAt).toLocaleDateString('es-AR') : 'N/A'}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <Shield className="h-5 w-5 text-gray-400" />
                      <div>
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Estado</p>
                        <p className="text-green-600 dark:text-green-400">Activo</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

                      </form>
        </div>
      </div>

      {/* Información Adicional */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Información Adicional
        </h3>
        <div className="space-y-4">
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 p-4 rounded-lg">
            <h4 className="font-medium text-yellow-800 dark:text-yellow-200 mb-2">
              Responsabilidades del Administrador de Consorcio
            </h4>
            <ul className="text-sm text-yellow-700 dark:text-yellow-300 space-y-1 list-disc list-inside">
              <li>Confirmar tareas asignadas por el administrador principal</li>
              <li>Gestionar el progreso de las tareas asignadas</li>
              <li>Subir comprobantes de pago cuando las tareas finalizan</li>
              <li>Coordinar con técnicos para la ejecución de tareas</li>
              <li>Mantener comunicación con clientes del consorcio</li>
            </ul>
          </div>
          
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-4 rounded-lg">
            <h4 className="font-medium text-blue-800 dark:text-blue-200 mb-2">
              Flujo de Trabajo
            </h4>
            <div className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
              <p>1. <strong>Pendiente de Confirmación:</strong> Tarea creada por admin, espera tu confirmación</p>
              <p>2. <strong>Confirmada:</strong> Tarea aceptada, lista para asignar técnico</p>
              <p>3. <strong>En Progreso:</strong> Técnico trabajando en la tarea</p>
              <p>4. <strong>Finalizada:</strong> Tarea completada, lista para comprobante</p>
              <p>5. <strong>Pendiente de Pago:</strong> Esperando que subas el comprobante</p>
              <p>6. <strong>Facturada:</strong> Comprobante subido, espera aprobación del admin</p>
              <p>7. <strong>Pagada:</strong> Proceso completo, tarea finalizada</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminConsorcioProfile;

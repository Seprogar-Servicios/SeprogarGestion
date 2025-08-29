import React, { useState } from 'react';
import { useAppSelector } from '../../store';
import { Lock, Eye, EyeOff, Save, AlertCircle, CheckCircle, Shield } from 'lucide-react';
import api from '../../config/api';
import { validatePassword } from '../../utils/passwordValidation';

interface ChangePasswordFormData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

const ChangePassword: React.FC = () => {
  useAppSelector((state) => state.auth);
  const [formData, setFormData] = useState<ChangePasswordFormData>({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [passwordValidation, setPasswordValidation] = useState<{ isValid: boolean; errors: string[] }>({ isValid: true, errors: [] });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    // Limpiar mensajes de error/éxito cuando el usuario empieza a escribir
    setError(null);
    setSuccess(null);
    
    // Validar contraseña cuando cambia
    if (name === 'newPassword') {
      setPasswordValidation(validatePassword(value));
    }
  };

  const validateForm = (): boolean => {
    if (!formData.currentPassword) {
      setError('La contraseña actual es requerida');
      return false;
    }
    if (!formData.newPassword) {
      setError('La nueva contraseña es requerida');
      return false;
    }
    
    // Validar requisitos de seguridad de la contraseña
    const validation = validatePassword(formData.newPassword);
    if (!validation.isValid) {
      setPasswordValidation(validation);
      setError('La contraseña no cumple con los requisitos de seguridad');
      return false;
    }
    
    if (formData.newPassword !== formData.confirmPassword) {
      setError('Las contraseñas no coinciden');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setLoading(true);
    setError(null);
    setSuccess(null);
    
    try {
      const response = await api.post('/usuarios/change-password', {
        currentPassword: formData.currentPassword,
        newPassword: formData.newPassword
      });
      
      // Verificamos el formato estándar de respuesta de la API {success: true, data: [...], message?: string}
      if (response.data && response.data.success) {
        setSuccess('Contraseña actualizada exitosamente');
        // Limpiar el formulario
        setFormData({
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        });
      } else {
        setError(response.data?.message || 'Error al cambiar la contraseña');
      }
    } catch (err: any) {
      console.error('Error al cambiar contraseña:', err);
      if (err.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        if (err.response.data && err.response.data.message) {
          setError(err.response.data.message);
        } else if (err.response.status === 401) {
          setError('No autorizado. Por favor, inicia sesión nuevamente.');
        } else if (err.response.status === 400) {
          setError('Datos inválidos. Verifica la información e inténtalo de nuevo.');
        } else {
          setError('Error en el servidor. Por favor, inténtalo más tarde.');
        }
      } else if (err.request) {
        // The request was made but no response was received
        setError('No se pudo conectar con el servidor. Verifica tu conexión a internet.');
      } else {
        // Something happened in setting up the request that triggered an Error
        setError('Error al procesar la solicitud. Por favor, inténtalo de nuevo.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 shadow-lg rounded-xl p-6 border border-gray-100 dark:border-gray-700 transition-all duration-300">
      <div className="flex items-center mb-6 pb-4 border-b border-gray-200 dark:border-gray-700">
        <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-3 rounded-full mr-4 shadow-lg">
          <Lock className="h-6 w-6 text-white animate-pulse" />
        </div>
        <div>
          <h2 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Cambiar Contraseña
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">Actualiza tus credenciales de seguridad</p>
        </div>
      </div>
      
      {error && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg shadow-sm animate-fadeIn">
          <div className="flex items-center">
            <div className="flex-shrink-0 bg-red-100 dark:bg-red-800/50 p-2 rounded-full">
              <AlertCircle className="h-5 w-5 text-red-500 dark:text-red-400" />
            </div>
            <div className="ml-3 flex-1">
              <p className="text-sm font-medium text-red-700 dark:text-red-400">{error}</p>
            </div>
          </div>
        </div>
      )}
      
      {success && (
        <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-lg shadow-sm animate-fadeIn">
          <div className="flex items-center">
            <div className="flex-shrink-0 bg-green-100 dark:bg-green-800/50 p-2 rounded-full">
              <CheckCircle className="h-5 w-5 text-green-500 dark:text-green-400" />
            </div>
            <div className="ml-3 flex-1">
              <p className="text-sm font-medium text-green-700 dark:text-green-400">{success}</p>
            </div>
          </div>
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="group">
          <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center">
            <Lock className="h-4 w-4 mr-2 text-blue-500" />
            Contraseña Actual
          </label>
          <div className="relative rounded-lg shadow-sm transition-all duration-300 group-hover:shadow-md">
            <input
              type={showCurrentPassword ? 'text' : 'password'}
              name="currentPassword"
              id="currentPassword"
              value={formData.currentPassword}
              onChange={handleChange}
              className="block w-full pr-10 border-gray-300 dark:border-gray-600 rounded-lg focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white transition-all duration-300 focus:shadow-md"
              placeholder="Ingrese su contraseña actual"
              required
            />
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                setShowCurrentPassword(!showCurrentPassword);
              }}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors duration-200"
            >
              {showCurrentPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>
        </div>
        
        <div className="group">
          <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center">
            <Shield className="h-4 w-4 mr-2 text-purple-500" />
            Nueva Contraseña
          </label>
          <div className="relative rounded-lg shadow-sm transition-all duration-300 group-hover:shadow-md">
            <input
              type={showNewPassword ? 'text' : 'password'}
              name="newPassword"
              id="newPassword"
              value={formData.newPassword}
              onChange={handleChange}
              className="block w-full pr-10 border-gray-300 dark:border-gray-600 rounded-lg focus:ring-purple-500 focus:border-purple-500 dark:bg-gray-700 dark:text-white transition-all duration-300 focus:shadow-md"
              placeholder="Ingrese su nueva contraseña"
              required
            />
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                setShowNewPassword(!showNewPassword);
              }}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 transition-colors duration-200"
            >
              {showNewPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>
          {/* Mostrar errores de validación de contraseña */}
          {formData.newPassword && !passwordValidation.isValid && (
            <div className="mt-3 p-4 bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-800 rounded-lg shadow-sm animate-fadeIn">
              <h4 className="text-sm font-medium text-yellow-800 dark:text-yellow-200 mb-2 flex items-center">
                <AlertCircle className="h-4 w-4 mr-2 text-yellow-500" />
                La contraseña debe cumplir los siguientes requisitos:
              </h4>
              <ul className="space-y-2">
                {passwordValidation.errors.map((error, index) => (
                  <li key={index} className="flex items-start">
                    <span className="inline-block h-5 w-5 rounded-full bg-yellow-100 dark:bg-yellow-800/50 flex-shrink-0 mr-2 flex items-center justify-center text-yellow-500">
                      {index + 1}
                    </span>
                    <span className="text-xs text-yellow-700 dark:text-yellow-300">{error}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          
          {/* Requisitos de contraseña */}
          {formData.newPassword && passwordValidation.isValid && (
            <div className="mt-3 p-4 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-lg shadow-sm animate-fadeIn">
              <div className="flex items-center">
                <div className="h-6 w-6 rounded-full bg-green-100 dark:bg-green-800/50 flex items-center justify-center mr-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                </div>
                <span className="text-sm font-medium text-green-700 dark:text-green-300">La contraseña cumple con todos los requisitos</span>
              </div>
            </div>
          )}
        </div>
        
        <div className="group">
          <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center">
            <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
            Confirmar Nueva Contraseña
          </label>
          <div className="relative rounded-lg shadow-sm transition-all duration-300 group-hover:shadow-md">
            <input
              type={showConfirmPassword ? 'text' : 'password'}
              name="confirmPassword"
              id="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              className="block w-full pr-10 border-gray-300 dark:border-gray-600 rounded-lg focus:ring-green-500 focus:border-green-500 dark:bg-gray-700 dark:text-white transition-all duration-300 focus:shadow-md"
              placeholder="Confirme su nueva contraseña"
              required
            />
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                setShowConfirmPassword(!showConfirmPassword);
              }}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-green-600 dark:hover:text-green-400 transition-colors duration-200"
            >
              {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>
        </div>
        
        <div className="mt-6">
          <button
            type="submit"
            disabled={loading || (formData.newPassword !== '' && !passwordValidation.isValid) || formData.newPassword !== formData.confirmPassword}
            className={`w-full flex justify-center py-3 px-6 border border-transparent rounded-lg shadow-md text-sm font-medium text-white transition-all duration-300 transform hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
              loading ? 'opacity-70 cursor-not-allowed bg-blue-500' : 
              formData.newPassword !== formData.confirmPassword ? 'bg-gray-500 hover:bg-gray-600' :
              !passwordValidation.isValid && formData.newPassword !== '' ? 'bg-gray-500 hover:bg-gray-600' :
              'bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 hover:shadow-lg'
            }`}
          >
            {loading ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span className="animate-pulse">Procesando...</span>
              </>
            ) : (
              <>
                <Save className="h-5 w-5 mr-2" />
                Cambiar Contraseña
              </>
            )}
          </button>
          
          {/* Indicador de estado de la contraseña */}
          {formData.newPassword && formData.confirmPassword && (
            <div className="mt-3 flex justify-center">
              {formData.newPassword === formData.confirmPassword ? (
                <span className="text-xs text-green-600 dark:text-green-400 flex items-center">
                  <CheckCircle className="h-3 w-3 mr-1" /> Las contraseñas coinciden
                </span>
              ) : (
                <span className="text-xs text-red-600 dark:text-red-400 flex items-center">
                  <AlertCircle className="h-3 w-3 mr-1" /> Las contraseñas no coinciden
                </span>
              )}
            </div>
          )}
        </div>
      </form>
    </div>
  );
};

export default ChangePassword;

import { Shield, Users, FileText, Lock, Eye, Mail, Phone, MapPin } from 'lucide-react';
import AdminPageHeader from './common/AdminPageHeader';

const Legales = () => {
  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Términos y Condiciones"
        description={`Seprogar Gestión — Última actualización: ${new Date().toLocaleDateString('es-AR')}`}
        eyebrow="Legal"
        icon={<Shield className="h-5 w-5" />}
      />

      <div className="space-y-6">
        {/* Aceptación de Términos */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
          <div className="flex items-start mb-4">
            <FileText className="h-6 w-6 text-blue-600 dark:text-blue-400 mr-3 mt-1" />
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
              1. Aceptación de los Términos
            </h2>
          </div>
          <div className="text-slate-700 dark:text-slate-300 space-y-3">
            <p>
              Al acceder y utilizar la plataforma Futurgas Gestión, usted acepta y se compromete a cumplir 
              con estos términos y condiciones en su totalidad. Si no está de acuerdo con alguno de estos 
              términos, no debe utilizar esta plataforma.
            </p>
            <p>
              Estos términos aplican a todos los usuarios de la plataforma, incluyendo administradores, 
              administradores de consorcio y técnicos.
            </p>
          </div>
        </div>

        {/* Descripción del Servicio */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
          <div className="flex items-start mb-4">
            <Users className="h-6 w-6 text-blue-600 dark:text-blue-400 mr-3 mt-1" />
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
              2. Descripción del Servicio
            </h2>
          </div>
          <div className="text-slate-700 dark:text-slate-300 space-y-3">
            <p>
              Futurgas Gestión es una plataforma de gestión de tareas diseñada para facilitar la 
              coordinación entre administradores, administradores de consorcio y técnicos en el 
              mantenimiento y gestión de propiedades.
            </p>
            <p>
              El servicio permite:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Creación y asignación de tareas de mantenimiento</li>
              <li>Gestión de estados y seguimiento de trabajos</li>
              <li>Subida de fotos y documentos relacionados</li>
              <li>Comunicación entre los diferentes roles</li>
              <li>Generación de informes y análisis</li>
            </ul>
          </div>
        </div>

        {/* Responsabilidades del Usuario */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
          <div className="flex items-start mb-4">
            <Shield className="h-6 w-6 text-blue-600 dark:text-blue-400 mr-3 mt-1" />
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
              3. Responsabilidades del Usuario
            </h2>
          </div>
          <div className="text-slate-700 dark:text-slate-300 space-y-3">
            <p className="font-semibold">Como usuario de la plataforma, usted se compromete a:</p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Proporcionar información veraz y actualizada</li>
              <li>Mantener la confidencialidad de sus credenciales de acceso</li>
              <li>Utilizar la plataforma para fines legítimos y profesionales</li>
              <li>No compartir su cuenta con terceros no autorizados</li>
              <li>Reportar cualquier vulnerabilidad o problema de seguridad detectado</li>
              <li>Respetar los derechos y privacidad de otros usuarios</li>
            </ul>
          </div>
        </div>

        {/* Privacidad y Protección de Datos */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
          <div className="flex items-start mb-4">
            <Lock className="h-6 w-6 text-blue-600 dark:text-blue-400 mr-3 mt-1" />
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
              4. Privacidad y Protección de Datos
            </h2>
          </div>
          <div className="text-slate-700 dark:text-slate-300 space-y-3">
            <p>
              Nos comprometemos a proteger la privacidad y seguridad de sus datos personales:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li><strong>Credenciales:</strong> Las contraseñas se almacenan de forma encriptada</li>
              <li><strong>Datos Personales:</strong> Nombre, email y rol son utilizados solo para la gestión del sistema</li>
              <li><strong>Archivos:</strong> Las fotos y documentos se almacenan de forma segura</li>
              <li><strong>Acceso:</strong> Solo usuarios autorizados pueden acceder a la información</li>
            </ul>
            <p className="mt-3">
              Los datos se conservarán únicamente mientras sea necesario para la prestación del servicio 
              y serán eliminados cuando el usuario solicite la cancelación de su cuenta.
            </p>
          </div>
        </div>

        {/* Propiedad Intelectual */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
          <div className="flex items-start mb-4">
            <FileText className="h-6 w-6 text-blue-600 dark:text-blue-400 mr-3 mt-1" />
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
              5. Propiedad Intelectual
            </h2>
          </div>
          <div className="text-slate-700 dark:text-slate-300 space-y-3">
            <p>
              La plataforma Futurgas Gestión, incluyendo su diseño, código, funcionalidades y 
              contenido, es propiedad intelectual de sus desarrolladores y está protegida por 
              las leyes de propiedad intelectual.
            </p>
            <p>
              Los usuarios conservan la propiedad de los contenidos que suben a la plataforma, 
              pero otorgan una licencia para su uso exclusivo dentro del sistema.
            </p>
          </div>
        </div>

        {/* Limitación de Responsabilidad */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
          <div className="flex items-start mb-4">
            <Eye className="h-6 w-6 text-blue-600 dark:text-blue-400 mr-3 mt-1" />
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
              6. Limitación de Responsabilidad
            </h2>
          </div>
          <div className="text-slate-700 dark:text-slate-300 space-y-3">
            <p>
              La plataforma se proporciona "tal como está" sin garantías explícitas o implícitas. 
              No nos hacemos responsables por:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Daños indirectos o consecuentes del uso del servicio</li>
              <li>Pérdida de datos debido a acciones del usuario</li>
              <li>Interrupciones del servicio por mantenimiento técnico</li>
              <li>Contenido subido por usuarios que viole derechos de terceros</li>
            </ul>
          </div>
        </div>

        {/* Contacto */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
          <div className="flex items-start mb-4">
            <Mail className="h-6 w-6 text-blue-600 dark:text-blue-400 mr-3 mt-1" />
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
              7. Contacto y Soporte
            </h2>
          </div>
          <div className="text-slate-700 dark:text-slate-300 space-y-3">
            <p>
              Para cualquier pregunta, duda o incidencia relacionada con estos términos o 
              el uso de la plataforma, puede contactarnos a través de:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
              <div className="flex items-center">
                <Mail className="h-5 w-5 text-slate-500 mr-2" />
                <span className="text-sm">seprogarservicios@gmail.com</span>
              </div>
              <div className="flex items-center">
                <Phone className="h-5 w-5 text-slate-500 mr-2" />
                <span className="text-sm">+54 11 6304-6138</span>
              </div>
              <div className="flex items-center">
                <MapPin className="h-5 w-5 text-slate-500 mr-2" />
                <span className="text-sm">Buenos Aires, Argentina</span>
              </div>
            </div>
          </div>
        </div>

        {/* Modificaciones */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
          <div className="flex items-start mb-4">
            <FileText className="h-6 w-6 text-blue-600 dark:text-blue-400 mr-3 mt-1" />
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
              8. Modificaciones de los Términos
            </h2>
          </div>
          <div className="text-slate-700 dark:text-slate-300 space-y-3">
            <p>
              Nos reservamos el derecho de modificar estos términos y condiciones en cualquier momento. 
              Las modificaciones entrarán en vigor desde su publicación en la plataforma.
            </p>
            <p>
              Se recomienda a los usuarios revisar periódicamente estos términos para estar 
              informados de cualquier actualización.
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
        <div className="text-center text-slate-600 dark:text-slate-400">
          <p className="text-sm">
            Al continuar utilizando esta plataforma, usted confirma haber leído, entendido 
            y aceptado estos términos y condiciones.
          </p>
          <p className="text-xs mt-2">
            © 2024 Seprogar Gestión. Todos los derechos reservados.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Legales;

import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Provider } from 'react-redux';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { store } from './store';
import Login from './components/auth/Login';
import Register from './components/auth/Register';
import Dashboard from './components/dashboard/Dashboard';
import TaskList from './components/tasks/TaskList';
import TaskCalendar from './components/tasks/TaskCalendar';
import TaskDetails from './components/tasks/TaskDetails';
import UserManagement from './components/admin/UserManagement';
import SpecialtyManagement from './components/admin/SpecialtyManagement';
import TareaConsorcioManagement from './components/admin/TareaConsorcioManagement';
import DataImportExport from './components/admin/DataImportExport';
import Liquidaciones from './components/admin/Liquidaciones';
import LiveMap from './components/admin/LiveMap';
import ReclamosManagement from './components/admin/ReclamosManagement';
import CatalogoHub from './components/admin/CatalogoHub';
import PagosHub from './components/admin/PagosHub';
import ProfilePage from './components/user/ProfilePage';
import Layout from './components/layout/Layout';
import ProtectedRoute from './components/common/ProtectedRoute';
import Analytics from './components/analytics/Analytics';
import RecibosAdmin from './components/recibos/admin/RecibosAdmin';
import TecnicoTareasConsorcio from './components/tecnico/TareasConsorcio';
import TecnicoDashboard from './components/tecnico/Dashboard';
import MisFinanzasHub from './components/tecnico/MisFinanzasHub';
// Importar componentes de AdminConsorcio
import AdminConsorcioDashboard from './components/adminConsorcio/Dashboard';
import AdminConsorcioTareasManagement from './components/adminConsorcio/TareasManagement';
import AdminConsorcioCalendar from './components/adminConsorcio/Calendar';
import AdminConsorcioAnalytics from './components/adminConsorcio/Analytics';
import Legales from './components/Legales';
import './App.css';

// Componente que envuelve las rutas para manejar la URL oculta
const AppRoutes = () => {
  
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      
      {/* Protected routes */}
      <Route path="/" element={
        <ProtectedRoute>
          <Layout />
        </ProtectedRoute>
      }>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="tasks" element={<TaskList />} />
        <Route path="tasks/:id" element={<TaskDetails />} />
        <Route path="calendar" element={<TaskCalendar />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="legales" element={<Legales />} />
        <Route path="mis-recibos" element={<Navigate to="/tecnico/finanzas?tab=recibos" replace />} />
        <Route path="tecnico/tareas-consorcio" element={
          <ProtectedRoute requiredRole="usuario">
            <TecnicoTareasConsorcio />
          </ProtectedRoute>
        } />
        <Route path="tecnico/dashboard" element={
          <ProtectedRoute requiredRole="usuario">
            <TecnicoDashboard />
          </ProtectedRoute>
        } />
        <Route path="tecnico/finanzas" element={
          <ProtectedRoute requiredRole="usuario">
            <MisFinanzasHub />
          </ProtectedRoute>
        } />
        <Route path="tecnico/liquidaciones" element={<Navigate to="/tecnico/finanzas" replace />} />
        <Route path="tecnico/pagos" element={<Navigate to="/tecnico/finanzas?tab=pagos" replace />} />
        <Route path="/admin/motivos-pago" element={<Navigate to="/admin/pagos-manuales?tab=motivos" replace />} />
        <Route path="/admin/pagos-manuales" element={
          <ProtectedRoute requiredRole="admin">
            <PagosHub />
          </ProtectedRoute>
        } />
        <Route path="/admin/users" element={<UserManagement />} />
        <Route path="/admin/specialties" element={<SpecialtyManagement />} />
        <Route path="/admin/tareas-consorcio" element={<TareaConsorcioManagement />} />
        <Route path="/admin/importar-exportar" element={<DataImportExport />} />
        <Route path="/admin/recibos" element={
          <ProtectedRoute requiredRole="admin">
            <RecibosAdmin />
          </ProtectedRoute>
        } />
        <Route path="/admin/analytics" element={
          <ProtectedRoute requiredRole="admin">
            <Analytics />
          </ProtectedRoute>
        } />
        <Route path="/admin/reclamos" element={
          <ProtectedRoute requiredRole="admin">
            <ReclamosManagement />
          </ProtectedRoute>
        } />
        <Route
          path="/admin/analytics-consorcio"
          element={<Navigate to="/admin/analytics?tab=consorcio" replace />}
        />
        <Route path="/admin/catalogo" element={
          <ProtectedRoute requiredRole="admin">
            <CatalogoHub />
          </ProtectedRoute>
        } />
        <Route path="/admin/materiales" element={<Navigate to="/admin/catalogo" replace />} />
        <Route
          path="/admin/categorias-materiales"
          element={<Navigate to="/admin/catalogo?tab=categorias" replace />}
        />
        <Route path="/admin/liquidaciones" element={
          <ProtectedRoute requiredRole="admin">
            <Liquidaciones />
          </ProtectedRoute>
        } />
        <Route path="/admin/mapa-vivo" element={
          <ProtectedRoute requiredRole="admin">
            <LiveMap />
          </ProtectedRoute>
        } />

        {/* Rutas específicas para AdminConsorcio */}
        <Route path="/adminConsorcio/dashboard" element={
          <ProtectedRoute requiredRole="adminConsorcio">
            <AdminConsorcioDashboard />
          </ProtectedRoute>
        } />
        <Route path="/adminConsorcio/tareas" element={
          <ProtectedRoute requiredRole="adminConsorcio">
            <AdminConsorcioTareasManagement />
          </ProtectedRoute>
        } />
        <Route path="/adminConsorcio/calendario" element={
          <ProtectedRoute requiredRole="adminConsorcio">
            <AdminConsorcioCalendar />
          </ProtectedRoute>
        } />
        <Route path="/adminConsorcio/analytics" element={
          <ProtectedRoute requiredRole="adminConsorcio">
            <AdminConsorcioAnalytics />
          </ProtectedRoute>
        } />
        <Route path="/adminConsorcio/profile" element={<Navigate to="/profile" replace />} />
      </Route>

      {/* Catch all route */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
};

function App() {
  return (
    <Provider store={store}>
      <Router 
        basename="/"
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true
        }}
      >
        <div className="App">
        <ToastContainer 
            position="top-right"
            autoClose={5000}
            hideProgressBar={false}
            newestOnTop={false}
            closeOnClick
            rtl={false}
            pauseOnFocusLoss
            draggable
            pauseOnHover
            theme="dark"
            toastClassName="!bg-gray-800 !rounded-lg !shadow-lg !mb-3 !font-sans !p-0"
            bodyClassName="!p-0 !m-0"
            progressClassName="!bg-blue-500"
          />
          <AppRoutes />
        </div>
      </Router>
    </Provider>
  );
}

export default App;

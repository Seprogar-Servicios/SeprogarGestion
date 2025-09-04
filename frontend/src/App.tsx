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
import DataImportExport from './components/admin/DataImportExport';
import ProfilePage from './components/user/ProfilePage';
import Layout from './components/layout/Layout';
import ProtectedRoute from './components/common/ProtectedRoute';
import Analytics from './components/analytics/Analytics';
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
        <Route path="/admin/users" element={<UserManagement />} />
        <Route path="/admin/specialties" element={<SpecialtyManagement />} />
        <Route path="/admin/importar-exportar" element={<DataImportExport />} />
        <Route path="/admin/analytics" element={
          <ProtectedRoute requiredRole="admin">
            <Analytics />
          </ProtectedRoute>
        } />
        {/* <Route path="/admin/materials" element={<MaterialManagement />} /> */}
        
        {/* Admin only routes - temporarily commented out */}
        {/* <Route path="users" element={
          <ProtectedRoute requiredRole="admin">
            <UserManagement />
          </ProtectedRoute>
        } />
        <Route path="materials" element={
          <ProtectedRoute requiredRole="admin">
            <MaterialManagement />
          </ProtectedRoute>
        } />
        <Route path="specialties" element={
          <ProtectedRoute requiredRole="admin">
            <SpecialtyManagement />
          </ProtectedRoute>
        } /> */}
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

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
import UserManagement from './components/admin/UserManagement';
import SpecialtyManagement from './components/admin/SpecialtyManagement';
import DataImportExport from './components/admin/DataImportExport';
import ProfilePage from './components/user/ProfilePage';
import Layout from './components/layout/Layout';
import ProtectedRoute from './components/common/ProtectedRoute';
// import MaterialManagement from './components/admin/MaterialManagement';
import './App.css';

function App() {
  return (
    <Provider store={store}>
      <Router>
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
            theme="light"
          />
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
              <Route path="calendar" element={<TaskCalendar />} />
              <Route path="profile" element={<ProfilePage />} />
              <Route path="/admin/users" element={<UserManagement />} />
              <Route path="/admin/specialties" element={<SpecialtyManagement />} />
              <Route path="/admin/importar-exportar" element={<DataImportExport />} />
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
        </div>
      </Router>
    </Provider>
  );
}

export default App;

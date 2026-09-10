import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/login/Login';
import Dashboard from './pages/dashboard/Dashboard';
import ApplicationsPage from './pages/dashboard/ApplicationsPage';
import NewApplicationPage from './pages/dashboard/NewApplicationPage';
import InvoicesPage from './pages/dashboard/InvoicesPage';
import TrackStatusPage from './pages/dashboard/TrackStatusPage';
import OfficerLogin from './pages/officer/Login/OfficerLogin';
import OfficerDashboard from './pages/officer/Dashboard/OfficerDashboard';
import OfficerLayout from './pages/officer/layout/OfficerLayout';
import OfficerAppointments from './pages/officer/Appointments/OfficerAppointments';
import AdminLogin from './admin/pages/Login/AdminLogin';
import AdminLayout from './admin/layouts/AdminLayout';
import AdminDashboard from './admin/pages/Dashboard/AdminDashboard';
import RolesPermissions from './admin/pages/Users/RolesPermissions';
import RolesList from './admin/pages/Users/RolesList';
import SlotConfiguration from './admin/pages/Configuration/SlotConfiguration';
import BlackoutDates from './admin/pages/Configuration/BlackoutDates';
import AuditLogs from './admin/pages/Support/AuditLogs';
import UserManagement from './admin/pages/Users/UserManagement';
import PortalSettings from './admin/pages/Configuration/PortalSettings';
import FeesAndTiers from './admin/pages/Configuration/FeesAndTiers';
import SmsNotifications from './admin/pages/Configuration/SmsNotifications';
import SupportTickets from './admin/pages/Support/SupportTickets';

// Dev-only preview of applicant screens; the dynamic import is dropped from production bundles.
const PreviewPage = import.meta.env.DEV ? React.lazy(() => import('./dev/PreviewPage')) : null;

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen bg-white">
          <Routes>
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="/login" element={<Login />} />
            
            {/* Officer Routes — protected for officer & director roles */}
            <Route path="/officer/login" element={<OfficerLogin />} />
            <Route path="/officer" element={
              <ProtectedRoute allowedRole={['officer', 'director']}>
                <OfficerLayout />
              </ProtectedRoute>
            }>
              <Route path="dashboard" element={<OfficerDashboard />} />
              <Route path="submissions" element={<OfficerDashboard />} />
              <Route path="appointments" element={<OfficerAppointments />} />
              <Route index element={<Navigate to="submissions" replace />} />
            </Route>

            {/* Admin Routes — protected for admin role */}
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/admin" element={
              <ProtectedRoute allowedRole={['admin']}>
                <AdminLayout />
              </ProtectedRoute>
            }>
              <Route path="dashboard" element={<AdminDashboard />} />
              <Route path="config/slots" element={<SlotConfiguration />} />
              <Route path="config/blackout" element={<BlackoutDates />} />
              <Route path="config/portal" element={<PortalSettings />} />
              <Route path="config/fees" element={<FeesAndTiers />} />
              <Route path="config/sms" element={<SmsNotifications />} />
              <Route path="users/management" element={<UserManagement />} />
              <Route path="users/roles" element={<RolesList />} />
              <Route path="users/roles/edit" element={<RolesPermissions />} />
              <Route path="users/roles/edit/:roleId" element={<RolesPermissions />} />
              <Route path="support/tickets" element={<SupportTickets />} />
              <Route path="support/logs" element={<AuditLogs />} />
              <Route index element={<Navigate to="dashboard" replace />} />
            </Route>

            {/* Applicant Routes */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute allowedRole="user">
                  <Dashboard />
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to="applications" replace />} />
              <Route path="applications" element={<ApplicationsPage />} />
              <Route path="new-application" element={<NewApplicationPage />} />
              <Route path="invoices" element={<InvoicesPage />} />
              <Route path="track-status" element={<TrackStatusPage />} />
            </Route>

            {/* Dev-only visual preview of applicant screens (never bundled in production) */}
            {PreviewPage && (
              <Route
                path="/__preview/*"
                element={
                  <React.Suspense fallback={null}>
                    <PreviewPage />
                  </React.Suspense>
                }
              />
            )}

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;

import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { AppShell } from './components/AppShell';
import { ProtectedRoute } from './components/ProtectedRoute';
import { RoleGate } from './components/RoleGate';
import { Home } from './pages/Home';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { ForgotPassword } from './pages/ForgotPassword';
import { ResetPassword } from './pages/ResetPassword';
import { Dashboard } from './pages/customer/Dashboard';
import { Appointments } from './pages/customer/Appointments';
import { NewAppointment } from './pages/customer/NewAppointment';
import { AppointmentDetail } from './pages/customer/AppointmentDetail';
import { Profile } from './pages/customer/Profile';
import { Vehicles } from './pages/customer/Vehicles';
import { StaffAppointments } from './pages/staff/StaffAppointments';
import { StaffAvailability } from './pages/staff/StaffAvailability';
import { AdminUsers } from './pages/admin/AdminUsers';
import { AdminAnalytics } from './pages/admin/AdminAnalytics';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<AppShell />}>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />

            <Route element={<ProtectedRoute />}>
              <Route
                element={<RoleGate allow={['CUSTOMER', 'ADMIN']} redirectTo="/staff/appointments" />}
              >
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/appointments" element={<Appointments />} />
                <Route path="/appointments/new" element={<NewAppointment />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/vehicles" element={<Vehicles />} />
              </Route>

              <Route path="/appointments/:id" element={<AppointmentDetail />} />

              <Route
                element={<RoleGate allow={['EMPLOYEE', 'ADMIN']} redirectTo="/dashboard" />}
              >
                <Route path="/staff/appointments" element={<StaffAppointments />} />
                <Route path="/staff/availability" element={<StaffAvailability />} />
              </Route>

              <Route element={<RoleGate allow={['ADMIN']} redirectTo="/dashboard" />}>
                <Route path="/admin/users" element={<AdminUsers />} />
                <Route path="/admin/analytics" element={<AdminAnalytics />} />
              </Route>
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

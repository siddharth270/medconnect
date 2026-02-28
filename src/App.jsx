import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';

// Pages
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import SetupProfilePage from './pages/SetupProfilePage';
import AuthCallback from './pages/AuthCallback';
import DoctorDashboard from './pages/doctor/DoctorDashboard';
import PatientsList from './pages/doctor/PatientsList';
import AddPatient from './pages/doctor/AddPatient';
import PatientDetail from './pages/doctor/PatientDetail';
import StartConsultation from './pages/doctor/StartConsultation';
import RecordingSession from './pages/doctor/RecordingSession';
import ConsultationResult from './pages/doctor/ConsultationResult';
import PatientDashboard from './pages/patient/PatientDashboard';
import PatientAppointments from './pages/patient/PatientAppointments';
import PatientPrescriptions from './pages/patient/PatientPrescriptions';
import PatientReminders from './pages/patient/PatientReminders';
import ConsultationDetail from './pages/patient/ConsultationDetail';
import Layout from './components/Layout';
import LoadingScreen from './components/LoadingScreen';

function ProtectedRoute({ children, requiredRole }) {
  const { user, profile, loading } = useAuth();

  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;
  if (!profile) return <Navigate to="/setup-profile" replace />;
  if (requiredRole && profile.role !== requiredRole) {
    return <Navigate to={profile.role === 'doctor' ? '/doctor' : '/patient'} replace />;
  }
  return children;
}

function PublicRoute({ children }) {
  const { user, profile, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (user && profile) {
    return <Navigate to={profile.role === 'doctor' ? '/doctor' : '/patient'} replace />;
  }
  return children;
}

export default function App() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
      <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />
      <Route path="/auth/callback" element={<AuthCallback />} />
      <Route path="/setup-profile" element={<SetupProfilePage />} />

      {/* Doctor routes */}
      <Route path="/doctor" element={<ProtectedRoute requiredRole="doctor"><Layout /></ProtectedRoute>}>
        <Route index element={<DoctorDashboard />} />
        <Route path="patients" element={<PatientsList />} />
        <Route path="patients/new" element={<AddPatient />} />
        <Route path="patients/:id" element={<PatientDetail />} />
        <Route path="consult" element={<StartConsultation />} />
        <Route path="consult/record" element={<RecordingSession />} />
        <Route path="consult/result" element={<ConsultationResult />} />
      </Route>

      {/* Patient routes */}
      <Route path="/patient" element={<ProtectedRoute requiredRole="patient"><Layout /></ProtectedRoute>}>
        <Route index element={<PatientDashboard />} />
        <Route path="appointments" element={<PatientAppointments />} />
        <Route path="prescriptions" element={<PatientPrescriptions />} />
        <Route path="reminders" element={<PatientReminders />} />
        <Route path="consultation/:id" element={<ConsultationDetail />} />
      </Route>

      {/* Default redirect */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

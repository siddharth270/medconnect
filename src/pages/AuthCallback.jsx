import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import LoadingScreen from '../components/LoadingScreen';

export default function AuthCallback() {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate('/login', { replace: true });
    } else if (!profile) {
      navigate('/setup-profile', { replace: true });
    } else {
      navigate(profile.role === 'doctor' ? '/doctor' : '/patient', { replace: true });
    }
  }, [user, profile, loading, navigate]);

  return <LoadingScreen />;
}

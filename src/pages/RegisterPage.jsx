import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Stethoscope, Mail, Lock, Eye, EyeOff, ArrowRight, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';

const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
  </svg>
);
const MicrosoftIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5">
    <rect x="1" y="1" width="10" height="10" fill="#F25022"/>
    <rect x="13" y="1" width="10" height="10" fill="#7FBA00"/>
    <rect x="1" y="13" width="10" height="10" fill="#00A4EF"/>
    <rect x="13" y="13" width="10" height="10" fill="#FFB900"/>
  </svg>
);
const YahooIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5">
    <path fill="#6001D2" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm3.5 5.5L12 13l-3.5-5.5h2.3L12 10l1.2-2.5h2.3zM12 15a1.5 1.5 0 110 3 1.5 1.5 0 010-3z"/>
  </svg>
);

export default function RegisterPage() {
  const { signUpWithEmail, signInWithProvider } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) return toast.error('Please fill in all fields');
    if (password.length < 6) return toast.error('Password must be at least 6 characters');
    if (password !== confirmPwd) return toast.error('Passwords do not match');

    setLoading(true);
    try {
      await signUpWithEmail(email, password);
      toast.success('Account created! Please check your email to confirm, then set up your profile.');
    } catch (err) {
      toast.error(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const handleOAuth = async (provider) => {
    try {
      await signInWithProvider(provider);
    } catch (err) {
      toast.error(err.message || `${provider} sign up failed`);
    }
  };

  return (
    <div className="min-h-screen bg-surface-0 flex flex-col items-center justify-center p-6">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-orchid/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-brand-600/10 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-sm animate-fade-in">
        <Link to="/login" className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-white mb-6 transition-colors">
          <ArrowLeft size={14} /> Back to login
        </Link>

        <div className="mb-8">
          <h1 className="font-display text-2xl font-bold">Create Account</h1>
          <p className="text-gray-500 text-sm mt-1">Join MedConnect as a doctor or patient</p>
        </div>

        {/* OAuth Providers */}
        <div className="space-y-3 mb-6">
          <button onClick={() => handleOAuth('google')} className="btn-secondary w-full flex items-center justify-center gap-3 py-3">
            <GoogleIcon /> <span>Continue with Google</span>
          </button>
          <button onClick={() => handleOAuth('azure')} className="btn-secondary w-full flex items-center justify-center gap-3 py-3">
            <MicrosoftIcon /> <span>Continue with Microsoft</span>
          </button>
          <button onClick={() => handleOAuth('yahoo')} className="btn-secondary w-full flex items-center justify-center gap-3 py-3">
            <YahooIcon /> <span>Continue with Yahoo</span>
          </button>
        </div>

        <div className="flex items-center gap-3 mb-6">
          <div className="flex-1 h-px bg-surface-200" />
          <span className="text-xs text-gray-500 uppercase tracking-wider">or use email</span>
          <div className="flex-1 h-px bg-surface-200" />
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="relative">
            <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
            <input type="email" placeholder="Email address" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full pl-11" />
          </div>
          <div className="relative">
            <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
            <input type={showPwd ? 'text' : 'password'} placeholder="Password (min 6 chars)" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full pl-11 pr-11" />
            <button type="button" onClick={() => setShowPwd(!showPwd)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500">
              {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          <div className="relative">
            <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
            <input type="password" placeholder="Confirm password" value={confirmPwd} onChange={(e) => setConfirmPwd(e.target.value)} className="w-full pl-11" />
          </div>
          <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2">
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>Create Account <ArrowRight size={16} /></>
            )}
          </button>
        </form>

        <p className="text-center text-sm text-gray-400 mt-6">
          Already have an account?{' '}
          <Link to="/login" className="text-brand-400 font-medium hover:text-brand-300 transition-colors">
            Sign In
          </Link>
        </p>
      </div>
    </div>
  );
}

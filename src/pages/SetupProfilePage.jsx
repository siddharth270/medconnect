import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Stethoscope, Heart, User, ArrowRight, Building2, BadgeCheck } from 'lucide-react';
import toast from 'react-hot-toast';

export default function SetupProfilePage() {
  const { user, profile, createProfile } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1); // 1 = role, 2 = details
  const [role, setRole] = useState('');
  const [form, setForm] = useState({
    full_name: '',
    phone: '',
    specialization: '',
    license_number: '',
    clinic_name: '',
    date_of_birth: '',
    gender: '',
    blood_group: '',
  });
  const [loading, setLoading] = useState(false);

  // If already has profile, redirect
  if (profile) {
    navigate(profile.role === 'doctor' ? '/doctor' : '/patient', { replace: true });
    return null;
  }

  if (!user) {
    navigate('/login', { replace: true });
    return null;
  }

  const handleSubmit = async () => {
    if (!form.full_name.trim()) return toast.error('Name is required');
    setLoading(true);
    try {
      const profileData = {
        full_name: form.full_name,
        role,
        phone: form.phone || null,
        gender: form.gender || null,
      };

      if (role === 'doctor') {
        profileData.specialization = form.specialization || null;
        profileData.license_number = form.license_number || null;
        profileData.clinic_name = form.clinic_name || null;
      } else {
        profileData.date_of_birth = form.date_of_birth || null;
        profileData.blood_group = form.blood_group || null;
      }

      await createProfile(profileData);
      toast.success('Profile created!');
      navigate(role === 'doctor' ? '/doctor' : '/patient', { replace: true });
    } catch (err) {
      toast.error(err.message || 'Failed to create profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface-0 flex flex-col items-center justify-center p-6">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-brand-600/5 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-sm animate-fade-in">
        <div className="mb-8">
          <p className="text-xs text-brand-400 font-medium uppercase tracking-widest mb-2">
            Step {step} of 2
          </p>
          <h1 className="font-display text-2xl font-bold">
            {step === 1 ? 'Choose Your Role' : 'Complete Your Profile'}
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            {step === 1
              ? 'How will you use MedConnect?'
              : `Set up your ${role} profile`}
          </p>
        </div>

        {step === 1 ? (
          <div className="space-y-4">
            <button
              onClick={() => { setRole('doctor'); setStep(2); }}
              className={`w-full card hover:border-brand-500/50 transition-all group text-left`}
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-brand-500/10 flex items-center justify-center shrink-0 group-hover:bg-brand-500/20 transition-colors">
                  <Stethoscope size={22} className="text-brand-400" />
                </div>
                <div className="flex-1">
                  <h3 className="font-display font-semibold">I'm a Doctor</h3>
                  <p className="text-sm text-gray-400 mt-1">
                    Manage patients, record consultations, generate SOAP notes and prescriptions
                  </p>
                </div>
                <ArrowRight size={16} className="text-gray-600 mt-1 group-hover:text-brand-400 transition-colors" />
              </div>
            </button>

            <button
              onClick={() => { setRole('patient'); setStep(2); }}
              className={`w-full card hover:border-mint/50 transition-all group text-left`}
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-mint/10 flex items-center justify-center shrink-0 group-hover:bg-mint/20 transition-colors">
                  <Heart size={22} className="text-mint" />
                </div>
                <div className="flex-1">
                  <h3 className="font-display font-semibold">I'm a Patient</h3>
                  <p className="text-sm text-gray-400 mt-1">
                    View appointments, prescriptions, recordings, and set medication reminders
                  </p>
                </div>
                <ArrowRight size={16} className="text-gray-600 mt-1 group-hover:text-mint transition-colors" />
              </div>
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Full Name *</label>
              <input
                type="text" placeholder="Dr. Jane Smith" value={form.full_name}
                onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                className="w-full"
              />
            </div>

            <div>
              <label className="text-xs text-gray-400 mb-1 block">Phone</label>
              <input
                type="tel" placeholder="+1 (555) 000-0000" value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="w-full"
              />
            </div>

            <div>
              <label className="text-xs text-gray-400 mb-1 block">Gender</label>
              <select value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })} className="w-full">
                <option value="">Select</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
                <option value="prefer_not_to_say">Prefer not to say</option>
              </select>
            </div>

            {role === 'doctor' && (
              <>
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Specialization</label>
                  <input
                    type="text" placeholder="e.g. General Practice, Cardiology"
                    value={form.specialization} onChange={(e) => setForm({ ...form, specialization: e.target.value })}
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">License Number</label>
                  <input
                    type="text" placeholder="Medical license #"
                    value={form.license_number} onChange={(e) => setForm({ ...form, license_number: e.target.value })}
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Clinic / Hospital</label>
                  <input
                    type="text" placeholder="Organization name"
                    value={form.clinic_name} onChange={(e) => setForm({ ...form, clinic_name: e.target.value })}
                    className="w-full"
                  />
                </div>
              </>
            )}

            {role === 'patient' && (
              <>
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Date of Birth</label>
                  <input
                    type="date" value={form.date_of_birth}
                    onChange={(e) => setForm({ ...form, date_of_birth: e.target.value })}
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Blood Group</label>
                  <select value={form.blood_group} onChange={(e) => setForm({ ...form, blood_group: e.target.value })} className="w-full">
                    <option value="">Select</option>
                    {['A+','A-','B+','B-','AB+','AB-','O+','O-'].map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>
              </>
            )}

            <div className="flex gap-3 pt-2">
              <button onClick={() => setStep(1)} className="btn-secondary flex-1">Back</button>
              <button onClick={handleSubmit} disabled={loading} className="btn-primary flex-1 flex items-center justify-center gap-2">
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>Complete <ArrowRight size={16} /></>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
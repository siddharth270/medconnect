import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { createPatient } from '../../utils/db';
import { ArrowLeft, Save, User, Mail, Phone, Heart, Ruler, Weight, Thermometer, Activity } from 'lucide-react';
import toast from 'react-hot-toast';

function Field({ icon: Icon, label, name, type = 'text', placeholder, value, onChange }) {
  return (
    <div>
      <label className="text-xs text-gray-400 mb-1 block">{label}</label>
      <div className="relative">
        {Icon && <Icon size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />}
        <input
          type={type} placeholder={placeholder} value={value}
          onChange={onChange} className={`w-full ${Icon ? 'pl-10' : ''}`}
        />
      </div>
    </div>
  );
}

export default function AddPatient() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    full_name: '', email: '', phone: '', age: '', gender: '',
    height_cm: '', weight_kg: '', blood_group: '',
    blood_pressure: '', heart_rate: '', temperature: '', oxygen_sat: '',
    allergies: '', medical_history: '',
  });

  const set = (key) => (e) => setForm(prev => ({ ...prev, [key]: e.target.value }));

  const handleSubmit = async () => {
    if (!form.full_name.trim()) return toast.error('Patient name is required');
    setLoading(true);
    try {
      const data = {
        doctor_id: profile.id,
        full_name: form.full_name,
        email: form.email || null,
        phone: form.phone || null,
        age: form.age ? parseInt(form.age) : null,
        gender: form.gender || null,
        height_cm: form.height_cm ? parseFloat(form.height_cm) : null,
        weight_kg: form.weight_kg ? parseFloat(form.weight_kg) : null,
        blood_group: form.blood_group || null,
        blood_pressure: form.blood_pressure || null,
        heart_rate: form.heart_rate ? parseInt(form.heart_rate) : null,
        temperature: form.temperature ? parseFloat(form.temperature) : null,
        oxygen_sat: form.oxygen_sat ? parseFloat(form.oxygen_sat) : null,
        allergies: form.allergies ? form.allergies.split(',').map(a => a.trim()) : [],
        medical_history: form.medical_history || null,
      };
      const patient = await createPatient(data);
      toast.success('Patient added!');
      navigate(`/doctor/patients/${patient.id}`);
    } catch (err) {
      toast.error(err.message || 'Failed to add patient');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-5 animate-slide-up">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-xl bg-surface-100 border border-surface-200 flex items-center justify-center">
          <ArrowLeft size={16} />
        </button>
        <h2 className="font-display text-xl font-bold">Add New Patient</h2>
      </div>

      {/* Personal Info */}
      <div className="card space-y-3">
        <h3 className="text-xs text-gray-400 uppercase tracking-wider font-medium">Personal Information</h3>
        <Field icon={User} label="Full Name *" name="full_name" placeholder="John Doe" value={form.full_name} onChange={set('full_name')} />
        <Field icon={Mail} label="Email" name="email" type="email" placeholder="patient@email.com" value={form.email} onChange={set('email')} />
        <Field icon={Phone} label="Phone" name="phone" type="tel" placeholder="+1 555 000 0000" value={form.phone} onChange={set('phone')} />
        <div className="grid grid-cols-2 gap-3">
          <Field label="Age" name="age" type="number" placeholder="45" value={form.age} onChange={set('age')} />
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Gender</label>
            <select value={form.gender} onChange={set('gender')} className="w-full">
              <option value="">Select</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <Field icon={Ruler} label="Height (cm)" name="height_cm" type="number" placeholder="175" value={form.height_cm} onChange={set('height_cm')} />
          <Field icon={Weight} label="Weight (kg)" name="weight_kg" type="number" placeholder="70" value={form.weight_kg} onChange={set('weight_kg')} />
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Blood Group</label>
            <select value={form.blood_group} onChange={set('blood_group')} className="w-full">
              <option value="">Select</option>
              {['A+','A-','B+','B-','AB+','AB-','O+','O-'].map(g => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Vitals */}
      <div className="card space-y-3">
        <h3 className="text-xs text-gray-400 uppercase tracking-wider font-medium">Vitals</h3>
        <div className="grid grid-cols-2 gap-3">
          <Field icon={Activity} label="Blood Pressure" name="blood_pressure" placeholder="120/80" value={form.blood_pressure} onChange={set('blood_pressure')} />
          <Field icon={Heart} label="Heart Rate (bpm)" name="heart_rate" type="number" placeholder="72" value={form.heart_rate} onChange={set('heart_rate')} />
          <Field icon={Thermometer} label="Temperature (°F)" name="temperature" type="number" placeholder="98.6" value={form.temperature} onChange={set('temperature')} />
          <Field label="SpO₂ (%)" name="oxygen_sat" type="number" placeholder="98" value={form.oxygen_sat} onChange={set('oxygen_sat')} />
        </div>
      </div>

      {/* Medical History */}
      <div className="card space-y-3">
        <h3 className="text-xs text-gray-400 uppercase tracking-wider font-medium">Medical History</h3>
        <div>
          <label className="text-xs text-gray-400 mb-1 block">Allergies (comma-separated)</label>
          <input type="text" placeholder="Penicillin, Peanuts" value={form.allergies} onChange={set('allergies')} className="w-full" />
        </div>
        <div>
          <label className="text-xs text-gray-400 mb-1 block">Medical History</label>
          <textarea
            placeholder="Previous conditions, surgeries, ongoing treatments..."
            value={form.medical_history} onChange={set('medical_history')}
            rows={3} className="w-full bg-surface-100 border border-surface-300 text-white placeholder-gray-500 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-brand-500/50 resize-none"
          />
        </div>
      </div>

      <button onClick={handleSubmit} disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2">
        {loading ? (
          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        ) : (
          <><Save size={16} /> Save Patient</>
        )}
      </button>
    </div>
  );
}
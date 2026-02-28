import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { getPatients } from '../../utils/db';
import {
  Search, Plus, FileText, Pill, ChevronRight,
  Stethoscope, User
} from 'lucide-react';

export default function StartConsultation() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const preselectedPatientId = location.state?.patientId;

  const [patients, setPatients] = useState([]);
  const [search, setSearch] = useState('');
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [consultType, setConsultType] = useState(null); // 'soap_note' | 'prescription'
  const [step, setStep] = useState(preselectedPatientId ? 2 : 1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPatients();
  }, []);

  async function loadPatients() {
    try {
      const data = await getPatients(profile.id);
      setPatients(data);
      if (preselectedPatientId) {
        const found = data.find(p => p.id === preselectedPatientId);
        if (found) setSelectedPatient(found);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const filtered = patients.filter(p =>
    p.full_name?.toLowerCase().includes(search.toLowerCase())
  );

  const handleStart = () => {
    if (!selectedPatient || !consultType) return;
    navigate('/doctor/consult/record', {
      state: { patient: selectedPatient, consultType },
    });
  };

  return (
    <div className="space-y-5 animate-slide-up">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500 to-brand-600 flex items-center justify-center">
          <Stethoscope size={18} className="text-white" />
        </div>
        <div>
          <h2 className="font-display text-xl font-bold">Start Consultation</h2>
          <p className="text-xs text-gray-500">Step {step} of 3</p>
        </div>
      </div>

      {/* Progress */}
      <div className="flex gap-1">
        {[1, 2, 3].map(s => (
          <div key={s} className={`flex-1 h-1 rounded-full transition-all ${
            s <= step ? 'bg-brand-500' : 'bg-surface-200'
          }`} />
        ))}
      </div>

      {/* Step 1: Select Patient */}
      {step === 1 && (
        <div className="space-y-4">
          <h3 className="font-display font-semibold">Select a Patient</h3>

          <div className="relative">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
            <input type="text" placeholder="Search patients..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full pl-11" />
          </div>

          <button
            onClick={() => navigate('/doctor/patients/new')}
            className="btn-secondary w-full flex items-center justify-center gap-2 text-sm"
          >
            <Plus size={14} /> Add New Patient
          </button>

          {loading ? (
            <div className="flex justify-center py-8">
              <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {filtered.map(patient => (
                <button
                  key={patient.id}
                  onClick={() => { setSelectedPatient(patient); setStep(2); }}
                  className={`card w-full text-left flex items-center gap-3 transition-all hover:border-brand-500/40 ${
                    selectedPatient?.id === patient.id ? 'border-brand-500 bg-brand-500/5' : ''
                  }`}
                >
                  <div className="w-10 h-10 rounded-full bg-surface-200 flex items-center justify-center shrink-0">
                    <span className="text-sm font-bold text-gray-400">
                      {patient.full_name?.charAt(0)?.toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{patient.full_name}</p>
                    <p className="text-xs text-gray-500">
                      {patient.age && `${patient.age}y`}
                      {patient.gender && ` · ${patient.gender}`}
                    </p>
                  </div>
                  <ChevronRight size={14} className="text-gray-600" />
                </button>
              ))}
              {filtered.length === 0 && (
                <p className="text-center text-gray-500 text-sm py-8">No patients found</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Step 2: Choose Type */}
      {step === 2 && (
        <div className="space-y-4">
          {/* Selected patient pill */}
          <div className="card flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-brand-500/10 flex items-center justify-center">
              <User size={14} className="text-brand-400" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium">{selectedPatient?.full_name}</p>
              <p className="text-xs text-gray-500">Selected patient</p>
            </div>
            <button onClick={() => setStep(1)} className="text-xs text-brand-400 hover:text-brand-300">
              Change
            </button>
          </div>

          <h3 className="font-display font-semibold">Choose Note Type</h3>

          <button
            onClick={() => { setConsultType('soap_note'); setStep(3); }}
            className={`card w-full text-left group hover:border-brand-500/40 transition-all ${
              consultType === 'soap_note' ? 'border-brand-500' : ''
            }`}
          >
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-brand-500/10 flex items-center justify-center shrink-0">
                <FileText size={20} className="text-brand-400" />
              </div>
              <div className="flex-1">
                <h4 className="font-display font-semibold">SOAP Notes</h4>
                <p className="text-sm text-gray-400 mt-1">
                  Structured clinical documentation — Subjective, Objective, Assessment, Plan
                </p>
              </div>
            </div>
          </button>

          <button
            onClick={() => { setConsultType('prescription'); setStep(3); }}
            className={`card w-full text-left group hover:border-mint/40 transition-all ${
              consultType === 'prescription' ? 'border-mint' : ''
            }`}
          >
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-mint/10 flex items-center justify-center shrink-0">
                <Pill size={20} className="text-mint" />
              </div>
              <div className="flex-1">
                <h4 className="font-display font-semibold">Prescription</h4>
                <p className="text-sm text-gray-400 mt-1">
                  Generate a prescription with medications, dosages, and instructions
                </p>
              </div>
            </div>
          </button>
        </div>
      )}

      {/* Step 3: Confirm & Start */}
      {step === 3 && (
        <div className="space-y-4">
          <div className="card space-y-3">
            <h3 className="text-xs text-gray-400 uppercase tracking-wider font-medium">Summary</h3>
            <div className="flex items-center justify-between py-1">
              <span className="text-sm text-gray-400">Patient</span>
              <span className="text-sm font-medium">{selectedPatient?.full_name}</span>
            </div>
            <div className="flex items-center justify-between py-1">
              <span className="text-sm text-gray-400">Note Type</span>
              <span className={`tag ${consultType === 'soap_note' ? 'bg-brand-500/10 text-brand-400' : 'bg-mint/10 text-mint'}`}>
                {consultType === 'soap_note' ? 'SOAP Notes' : 'Prescription'}
              </span>
            </div>
          </div>

          <div className="glass p-4 text-center">
            <p className="text-sm text-gray-400 mb-1">
              🎤 Microphone access will be requested
            </p>
            <p className="text-xs text-gray-600">
              The conversation will be transcribed in real-time using your browser's speech recognition
            </p>
          </div>

          <div className="flex gap-3">
            <button onClick={() => setStep(2)} className="btn-secondary flex-1">Back</button>
            <button onClick={handleStart} className="btn-primary flex-1 flex items-center justify-center gap-2">
              Start Recording <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

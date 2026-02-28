import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getPatient, getConsultations } from '../../utils/db';
import {
  ArrowLeft, User, Heart, Thermometer, Activity,
  Droplets, FileText, Pill, Calendar, ChevronRight
} from 'lucide-react';
import { format } from 'date-fns';

export default function PatientDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [patient, setPatient] = useState(null);
  const [consultations, setConsultations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [id]);

  async function loadData() {
    try {
      const [p, c] = await Promise.all([
        getPatient(id),
        getConsultations(id),
      ]);
      setPatient(p);
      setConsultations(c);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!patient) {
    return <div className="text-center py-20 text-gray-500">Patient not found</div>;
  }

  const vitals = [
    { icon: Activity, label: 'BP', value: patient.blood_pressure, color: 'text-brand-400' },
    { icon: Heart, label: 'HR', value: patient.heart_rate ? `${patient.heart_rate} bpm` : null, color: 'text-coral' },
    { icon: Thermometer, label: 'Temp', value: patient.temperature ? `${patient.temperature}°F` : null, color: 'text-amber' },
    { icon: Droplets, label: 'SpO₂', value: patient.oxygen_sat ? `${patient.oxygen_sat}%` : null, color: 'text-mint' },
  ].filter(v => v.value);

  return (
    <div className="space-y-5 animate-slide-up">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-xl bg-surface-100 border border-surface-200 flex items-center justify-center">
          <ArrowLeft size={16} />
        </button>
        <h2 className="font-display text-xl font-bold">Patient Profile</h2>
      </div>

      {/* Patient Header */}
      <div className="card flex items-center gap-4">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-500/20 to-orchid/20 flex items-center justify-center shrink-0">
          <span className="font-display text-xl font-bold text-white/80">
            {patient.full_name?.charAt(0)?.toUpperCase()}
          </span>
        </div>
        <div>
          <h3 className="font-display text-lg font-semibold">{patient.full_name}</h3>
          <p className="text-sm text-gray-500">
            {[
              patient.age && `${patient.age} years`,
              patient.gender,
              patient.blood_group,
            ].filter(Boolean).join(' · ')}
          </p>
          {patient.email && <p className="text-xs text-gray-600 mt-0.5">{patient.email}</p>}
        </div>
      </div>

      {/* Vitals */}
      {vitals.length > 0 && (
        <div>
          <h3 className="text-xs text-gray-400 uppercase tracking-wider font-medium mb-2">Latest Vitals</h3>
          <div className="grid grid-cols-2 gap-2">
            {vitals.map(({ icon: Icon, label, value, color }) => (
              <div key={label} className="card flex items-center gap-3 py-3">
                <Icon size={16} className={color} />
                <div>
                  <p className="text-xs text-gray-500">{label}</p>
                  <p className="text-sm font-medium font-mono">{value}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Allergies */}
      {patient.allergies?.length > 0 && (
        <div>
          <h3 className="text-xs text-gray-400 uppercase tracking-wider font-medium mb-2">Allergies</h3>
          <div className="flex flex-wrap gap-2">
            {patient.allergies.map((a, i) => (
              <span key={i} className="tag bg-coral/10 text-coral">{a}</span>
            ))}
          </div>
        </div>
      )}

      {/* Start Consultation Button */}
      <button
        onClick={() => navigate('/doctor/consult', { state: { patientId: patient.id } })}
        className="btn-primary w-full flex items-center justify-center gap-2"
      >
        Start Consultation <ChevronRight size={16} />
      </button>

      {/* Consultation History */}
      <div>
        <h3 className="text-xs text-gray-400 uppercase tracking-wider font-medium mb-2">
          Consultation History ({consultations.length})
        </h3>
        {consultations.length > 0 ? (
          <div className="space-y-2">
            {consultations.map((c) => (
              <div key={c.id} className="card flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                  c.type === 'soap_note' ? 'bg-brand-500/10' : 'bg-mint/10'
                }`}>
                  {c.type === 'soap_note' ? (
                    <FileText size={16} className="text-brand-400" />
                  ) : (
                    <Pill size={16} className="text-mint" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">
                    {c.type === 'soap_note' ? 'SOAP Note' : 'Prescription'}
                  </p>
                  <p className="text-xs text-gray-500">
                    {format(new Date(c.created_at), 'MMM d, yyyy h:mm a')}
                    {c.duration_secs && ` · ${Math.floor(c.duration_secs / 60)}m ${c.duration_secs % 60}s`}
                  </p>
                </div>
                <span className={`tag ${c.ai_processed ? 'bg-mint/10 text-mint' : 'bg-amber/10 text-amber'}`}>
                  {c.ai_processed ? 'Processed' : 'Raw'}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="card text-center py-6 text-gray-500 text-sm">
            No consultations yet
          </div>
        )}
      </div>
    </div>
  );
}

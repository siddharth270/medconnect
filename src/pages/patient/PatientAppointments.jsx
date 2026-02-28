import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { getPatientAppointments, getPatientConsultations } from '../../utils/db';
import { CalendarDays, Clock, FileText, Pill, ChevronRight, Mic } from 'lucide-react';
import { format } from 'date-fns';

export default function PatientAppointments() {
  const { profile } = useAuth();
  const [appointments, setAppointments] = useState([]);
  const [consultations, setConsultations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [apts, consults] = await Promise.all([
        getPatientAppointments(profile.id),
        getPatientConsultations(profile.id),
      ]);
      setAppointments(apts);
      setConsultations(consults);
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

  return (
    <div className="space-y-6 animate-slide-up">
      <h2 className="font-display text-xl font-bold">Appointments & Visits</h2>

      {/* Upcoming */}
      <div>
        <h3 className="text-xs text-gray-400 uppercase tracking-wider font-medium mb-2">Upcoming</h3>
        {appointments.filter(a => a.status === 'scheduled').length > 0 ? (
          <div className="space-y-2">
            {appointments.filter(a => a.status === 'scheduled').map(apt => (
              <div key={apt.id} className="card flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-brand-500/10 flex items-center justify-center shrink-0">
                  <Clock size={16} className="text-brand-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">
                    Dr. {apt.profiles?.full_name}
                    {apt.profiles?.specialization && (
                      <span className="text-gray-500 font-normal"> · {apt.profiles.specialization}</span>
                    )}
                  </p>
                  <p className="text-xs text-gray-500">
                    {apt.scheduled_at
                      ? format(new Date(apt.scheduled_at), 'EEEE, MMM d, yyyy · h:mm a')
                      : 'Time TBD'}
                  </p>
                  {apt.chief_complaint && (
                    <p className="text-xs text-gray-600 mt-0.5">Reason: {apt.chief_complaint}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="card text-center py-6 text-sm text-gray-500">
            No upcoming appointments
          </div>
        )}
      </div>

      {/* Consultation History */}
      <div>
        <h3 className="text-xs text-gray-400 uppercase tracking-wider font-medium mb-2">
          Consultation History ({consultations.length})
        </h3>
        {consultations.length > 0 ? (
          <div className="space-y-2">
            {consultations.map(c => (
              <Link
                key={c.id}
                to={`/patient/consultation/${c.id}`}
                className="card flex items-center gap-3 hover:border-surface-300 transition-all"
              >
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
                    {format(new Date(c.created_at), 'MMM d, yyyy')}
                    {c.duration_secs && ` · ${Math.floor(c.duration_secs / 60)}m`}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {c.audio_url && <Mic size={12} className="text-gray-600" />}
                  <ChevronRight size={14} className="text-gray-600" />
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="card text-center py-8">
            <CalendarDays size={24} className="text-gray-600 mx-auto mb-2" />
            <p className="text-sm text-gray-500">
              No consultation records yet. Your doctor will add records after your visit.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

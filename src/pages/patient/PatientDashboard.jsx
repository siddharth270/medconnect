import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { getPatientAppointments, getPatientPrescriptions, getReminders } from '../../utils/db';
import {
  CalendarDays, Pill, Bell, ChevronRight,
  FileText, Clock, Heart
} from 'lucide-react';
import { format, isAfter } from 'date-fns';

export default function PatientDashboard() {
  const { profile } = useAuth();
  const [appointments, setAppointments] = useState([]);
  const [prescriptions, setPrescriptions] = useState([]);
  const [reminders, setReminders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [apts, rxs, rems] = await Promise.all([
        getPatientAppointments(profile.id),
        getPatientPrescriptions(profile.id),
        getReminders(profile.id),
      ]);
      setAppointments(apts);
      setPrescriptions(rxs);
      setReminders(rems);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const upcomingApts = appointments.filter(
    a => a.scheduled_at && isAfter(new Date(a.scheduled_at), new Date()) && a.status === 'scheduled'
  );

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-mint border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-slide-up">
      {/* Greeting */}
      <div>
        <h2 className="font-display text-2xl font-bold">
          {greeting()}, {profile.full_name?.split(' ')[0]}
        </h2>
        <p className="text-gray-500 text-sm mt-1">Your health overview</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="stat-card">
          <CalendarDays size={16} className="text-brand-400" />
          <span className="font-display text-2xl font-bold">{appointments.length}</span>
          <span className="text-[10px] text-gray-500 uppercase tracking-wider">Visits</span>
        </div>
        <div className="stat-card">
          <Pill size={16} className="text-mint" />
          <span className="font-display text-2xl font-bold">{prescriptions.length}</span>
          <span className="text-[10px] text-gray-500 uppercase tracking-wider">Rx</span>
        </div>
        <div className="stat-card">
          <Bell size={16} className="text-amber" />
          <span className="font-display text-2xl font-bold">{reminders.length}</span>
          <span className="text-[10px] text-gray-500 uppercase tracking-wider">Reminders</span>
        </div>
      </div>

      {/* Upcoming Appointments */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-display font-semibold">Upcoming Appointments</h3>
          <Link to="/patient/appointments" className="text-xs text-brand-400 flex items-center gap-1">
            View all <ChevronRight size={12} />
          </Link>
        </div>
        {upcomingApts.length > 0 ? (
          <div className="space-y-2">
            {upcomingApts.slice(0, 3).map(apt => (
              <div key={apt.id} className="card flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-brand-500/10 flex items-center justify-center shrink-0">
                  <Clock size={16} className="text-brand-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    Dr. {apt.profiles?.full_name || 'Unknown'}
                  </p>
                  <p className="text-xs text-gray-500">
                    {format(new Date(apt.scheduled_at), 'MMM d, yyyy · h:mm a')}
                  </p>
                </div>
                <span className="tag bg-brand-500/10 text-brand-400">{apt.status}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="card text-center py-6">
            <CalendarDays size={20} className="text-gray-600 mx-auto mb-2" />
            <p className="text-sm text-gray-500">No upcoming appointments</p>
          </div>
        )}
      </div>

      {/* Active Reminders */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-display font-semibold">Medication Reminders</h3>
          <Link to="/patient/reminders" className="text-xs text-brand-400 flex items-center gap-1">
            Manage <ChevronRight size={12} />
          </Link>
        </div>
        {reminders.length > 0 ? (
          <div className="space-y-2">
            {reminders.slice(0, 3).map(rem => (
              <div key={rem.id} className="card flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-mint/10 flex items-center justify-center shrink-0">
                  <Pill size={16} className="text-mint" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{rem.medication_name}</p>
                  <p className="text-xs text-gray-500">
                    {rem.dosage} · {rem.times_of_day?.map(t => t.slice(0, 5)).join(', ')}
                  </p>
                </div>
                <Bell size={14} className="text-amber" />
              </div>
            ))}
          </div>
        ) : (
          <div className="card text-center py-6">
            <Bell size={20} className="text-gray-600 mx-auto mb-2" />
            <p className="text-sm text-gray-500">No active reminders</p>
            <Link to="/patient/prescriptions" className="text-xs text-brand-400 mt-1 inline-block">
              Set up from your prescriptions →
            </Link>
          </div>
        )}
      </div>

      {/* Recent Prescriptions */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-display font-semibold">Recent Prescriptions</h3>
          <Link to="/patient/prescriptions" className="text-xs text-brand-400 flex items-center gap-1">
            View all <ChevronRight size={12} />
          </Link>
        </div>
        {prescriptions.length > 0 ? (
          <div className="space-y-2">
            {prescriptions.slice(0, 3).map(rx => (
              <div key={rx.id} className="card flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-orchid/10 flex items-center justify-center shrink-0">
                  <FileText size={16} className="text-orchid" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{rx.diagnosis || 'Prescription'}</p>
                  <p className="text-xs text-gray-500">
                    Dr. {rx.profiles?.full_name} · {format(new Date(rx.created_at), 'MMM d, yyyy')}
                  </p>
                </div>
                <span className="text-xs text-gray-500">
                  {rx.prescription_medications?.length || 0} meds
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="card text-center py-6">
            <FileText size={20} className="text-gray-600 mx-auto mb-2" />
            <p className="text-sm text-gray-500">No prescriptions yet</p>
          </div>
        )}
      </div>
    </div>
  );
}

import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { getDoctorStats, getPatients } from '../../utils/db';
import {
  Users, CalendarDays, FileText, Stethoscope,
  Plus, ChevronRight, Clock, TrendingUp,
} from 'lucide-react';
import { format } from 'date-fns';

export default function DoctorDashboard() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [recentPatients, setRecentPatients] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [statsData, patientsData] = await Promise.all([
        getDoctorStats(profile.id),
        getPatients(),
      ]);
      setStats(statsData);
      setRecentPatients(patientsData.slice(0, 5));
    } catch (err) {
      console.error('Dashboard load error:', err);
    } finally {
      setLoading(false);
    }
  }

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-slide-up">
      {/* Greeting */}
      <div>
        <h2 className="font-display text-2xl font-bold">
          {greeting()}, Dr. {profile.full_name?.split(' ').pop()}
        </h2>
        <p className="text-gray-500 text-sm mt-1">
          {format(new Date(), 'EEEE, MMMM d, yyyy')}
        </p>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => navigate('/doctor/consult')}
          className="card-glow group flex items-center gap-3 hover:border-brand-500/40 transition-all"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500 to-brand-600 flex items-center justify-center shrink-0">
            <Stethoscope size={18} className="text-white" />
          </div>
          <div className="text-left">
            <p className="text-sm font-medium">Start Consult</p>
            <p className="text-xs text-gray-500">Begin recording</p>
          </div>
        </button>
        <button
          onClick={() => navigate('/doctor/patients/new')}
          className="card group flex items-center gap-3 hover:border-mint/40 transition-all"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-600 to-mint flex items-center justify-center shrink-0">
            <Plus size={18} className="text-white" />
          </div>
          <div className="text-left">
            <p className="text-sm font-medium">Add Patient</p>
            <p className="text-xs text-gray-500">New record</p>
          </div>
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-3">
        <div className="stat-card">
          <Users size={16} className="text-brand-400" />
          <span className="font-display text-2xl font-bold">{stats?.totalPatients || 0}</span>
          <span className="text-[10px] text-gray-500 uppercase tracking-wider">Patients</span>
        </div>
        <div className="stat-card">
          <CalendarDays size={16} className="text-amber" />
          <span className="font-display text-2xl font-bold">{stats?.upcomingAppointments || 0}</span>
          <span className="text-[10px] text-gray-500 uppercase tracking-wider">Upcoming</span>
        </div>
        <div className="stat-card">
          <FileText size={16} className="text-mint" />
          <span className="font-display text-2xl font-bold">{stats?.totalConsultations || 0}</span>
          <span className="text-[10px] text-gray-500 uppercase tracking-wider">Consults</span>
        </div>
      </div>

      {/* Today's Schedule */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-display font-semibold">Today's Schedule</h3>
          <span className="text-xs text-gray-500">
            {stats?.todayAppointments?.length || 0} appointments
          </span>
        </div>
        {stats?.todayAppointments?.length > 0 ? (
          <div className="space-y-2">
            {stats.todayAppointments.map((apt) => (
              <div key={apt.id} className="card flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-surface-200 flex items-center justify-center shrink-0">
                  <Clock size={16} className="text-gray-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{apt.patients?.full_name}</p>
                  <p className="text-xs text-gray-500">
                    {apt.scheduled_at
                      ? format(new Date(apt.scheduled_at), 'h:mm a')
                      : 'No time set'}
                    {apt.chief_complaint && ` · ${apt.chief_complaint}`}
                  </p>
                </div>
                <span className={`tag ${
                  apt.status === 'completed' ? 'bg-mint/10 text-mint' :
                  apt.status === 'in_progress' ? 'bg-amber/10 text-amber' :
                  'bg-brand-500/10 text-brand-400'
                }`}>
                  {apt.status}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="card text-center py-8">
            <CalendarDays size={24} className="text-gray-600 mx-auto mb-2" />
            <p className="text-sm text-gray-500">No appointments today</p>
          </div>
        )}
      </div>

      {/* Recent Patients */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-display font-semibold">Recent Patients</h3>
          <Link to="/doctor/patients" className="text-xs text-brand-400 hover:text-brand-300 transition-colors flex items-center gap-1">
            View all <ChevronRight size={12} />
          </Link>
        </div>
        {recentPatients.length > 0 ? (
          <div className="space-y-2">
            {recentPatients.map((patient) => (
              <Link
                key={patient.id}
                to={`/doctor/patients/${patient.id}`}
                className="card flex items-center gap-3 hover:border-surface-300 transition-all"
              >
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand-500/20 to-orchid/20 flex items-center justify-center shrink-0">
                  <span className="text-sm font-display font-bold text-white/80">
                    {patient.full_name?.charAt(0)?.toUpperCase()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{patient.full_name}</p>
                  <p className="text-xs text-gray-500">
                    {patient.age && `${patient.age}y`}
                    {patient.gender && ` · ${patient.gender}`}
                    {patient.blood_group && ` · ${patient.blood_group}`}
                  </p>
                </div>
                <ChevronRight size={14} className="text-gray-600" />
              </Link>
            ))}
          </div>
        ) : (
          <div className="card text-center py-8">
            <Users size={24} className="text-gray-600 mx-auto mb-2" />
            <p className="text-sm text-gray-500 mb-3">No patients yet</p>
            <Link to="/doctor/patients/new" className="btn-primary inline-flex items-center gap-2 text-sm">
              <Plus size={14} /> Add First Patient
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
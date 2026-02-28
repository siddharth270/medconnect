import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  LayoutDashboard,
  Users,
  Stethoscope,
  CalendarDays,
  Pill,
  Bell,
  LogOut,
  Menu,
  X,
} from 'lucide-react';
import { useState } from 'react';

export default function Layout() {
  const { profile, signOut, isDoctor } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const doctorNav = [
    { to: '/doctor', icon: LayoutDashboard, label: 'Dashboard', end: true },
    { to: '/doctor/patients', icon: Users, label: 'Patients' },
    { to: '/doctor/consult', icon: Stethoscope, label: 'Consult' },
  ];

  const patientNav = [
    { to: '/patient', icon: LayoutDashboard, label: 'Home', end: true },
    { to: '/patient/appointments', icon: CalendarDays, label: 'Visits' },
    { to: '/patient/prescriptions', icon: Pill, label: 'Rx' },
    { to: '/patient/reminders', icon: Bell, label: 'Reminders' },
  ];

  const navItems = isDoctor ? doctorNav : patientNav;

  return (
    <div className="min-h-screen bg-surface-0 flex flex-col safe-top">
      {/* Top Bar */}
      <header className="sticky top-0 z-40 bg-surface-0/80 backdrop-blur-xl border-b border-surface-200">
        <div className="flex items-center justify-between px-4 py-3 max-w-2xl mx-auto">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-500 to-mint flex items-center justify-center">
              <Stethoscope size={16} className="text-white" />
            </div>
            <div>
              <h1 className="font-display font-semibold text-sm leading-tight">MedConnect</h1>
              <p className="text-[10px] text-gray-500 uppercase tracking-widest">
                {profile?.role}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400 hidden sm:block">{profile?.full_name}</span>
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="w-9 h-9 rounded-xl bg-surface-100 flex items-center justify-center border border-surface-200"
            >
              {menuOpen ? <X size={16} /> : <Menu size={16} />}
            </button>
          </div>
        </div>

        {/* Dropdown menu */}
        {menuOpen && (
          <div className="absolute right-4 top-14 bg-surface-100 border border-surface-200 rounded-xl shadow-2xl p-2 z-50 min-w-[180px] animate-fade-in">
            <div className="px-3 py-2 border-b border-surface-200 mb-1">
              <p className="text-sm font-medium">{profile?.full_name}</p>
              <p className="text-xs text-gray-500">{profile?.email}</p>
            </div>
            <button
              onClick={handleSignOut}
              className="flex items-center gap-2 w-full px-3 py-2 text-sm text-coral hover:bg-surface-200 rounded-lg transition-colors"
            >
              <LogOut size={14} />
              Sign Out
            </button>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto pb-24">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <Outlet />
        </div>
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-surface-0/90 backdrop-blur-xl border-t border-surface-200 safe-bottom z-40">
        <div className="flex items-center justify-around max-w-2xl mx-auto py-2 px-2">
          {navItems.map(({ to, icon: Icon, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `nav-item ${isActive ? 'active' : ''}`
              }
              onClick={() => setMenuOpen(false)}
            >
              <Icon size={20} />
              <span className="text-[10px] font-medium">{label}</span>
            </NavLink>
          ))}
        </div>
      </nav>

      {/* Click outside to close menu */}
      {menuOpen && (
        <div className="fixed inset-0 z-30" onClick={() => setMenuOpen(false)} />
      )}
    </div>
  );
}

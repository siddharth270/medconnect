import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { getPatients } from '../../utils/db';
import { Plus, Search, ChevronRight, Users } from 'lucide-react';

export default function PatientsList() {
  const { profile } = useAuth();
  const [patients, setPatients] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPatients();
  }, []);

  async function loadPatients() {
    try {
      const data = await getPatients(profile.id);
      setPatients(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const filtered = patients.filter((p) =>
    p.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    p.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4 animate-slide-up">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-xl font-bold">Patients</h2>
        <Link to="/doctor/patients/new" className="btn-primary text-sm flex items-center gap-1.5 px-4 py-2">
          <Plus size={14} /> Add New
        </Link>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
        <input
          type="text"
          placeholder="Search patients..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-11"
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length > 0 ? (
        <div className="space-y-2">
          {filtered.map((patient) => (
            <Link
              key={patient.id}
              to={`/doctor/patients/${patient.id}`}
              className="card flex items-center gap-3 hover:border-surface-300 transition-all"
            >
              <div className="w-11 h-11 rounded-full bg-gradient-to-br from-brand-500/20 to-orchid/20 flex items-center justify-center shrink-0">
                <span className="text-sm font-display font-bold text-white/80">
                  {patient.full_name?.charAt(0)?.toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{patient.full_name}</p>
                <p className="text-xs text-gray-500">
                  {[
                    patient.age && `${patient.age}y`,
                    patient.gender,
                    patient.blood_group,
                    patient.email,
                  ].filter(Boolean).join(' · ')}
                </p>
              </div>
              <ChevronRight size={14} className="text-gray-600 shrink-0" />
            </Link>
          ))}
        </div>
      ) : (
        <div className="card text-center py-12">
          <Users size={32} className="text-gray-600 mx-auto mb-3" />
          <p className="text-gray-400 mb-1">
            {search ? 'No matching patients' : 'No patients yet'}
          </p>
          {!search && (
            <Link to="/doctor/patients/new" className="text-sm text-brand-400 hover:text-brand-300 transition-colors">
              Add your first patient →
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

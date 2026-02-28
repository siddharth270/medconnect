import { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { getPatientPrescriptions, createReminder } from '../../utils/db';
import { requestNotificationPermission } from '../../utils/ai';
import { Pill, Bell, Calendar, ChevronDown, ChevronUp, Check, Plus } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

export default function PatientPrescriptions() {
  const { profile } = useAuth();
  const [prescriptions, setPrescriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);
  const [reminderModal, setReminderModal] = useState(null); // medication object

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const data = await getPatientPrescriptions(profile.id);
      setPrescriptions(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSetReminder(med) {
    const granted = await requestNotificationPermission();
    if (!granted) {
      toast.error('Please allow notifications to set reminders');
      return;
    }
    setReminderModal(med);
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-8 h-8 border-2 border-mint border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-slide-up">
      <h2 className="font-display text-xl font-bold">Prescriptions</h2>

      {prescriptions.length > 0 ? (
        <div className="space-y-3">
          {prescriptions.map((rx) => (
            <div key={rx.id} className="card">
              <button
                onClick={() => setExpanded(expanded === rx.id ? null : rx.id)}
                className="w-full flex items-center gap-3 text-left"
              >
                <div className="w-10 h-10 rounded-xl bg-mint/10 flex items-center justify-center shrink-0">
                  <Pill size={16} className="text-mint" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{rx.diagnosis || 'Prescription'}</p>
                  <p className="text-xs text-gray-500">
                    Dr. {rx.profiles?.full_name} · {format(new Date(rx.created_at), 'MMM d, yyyy')}
                  </p>
                </div>
                {expanded === rx.id ? <ChevronUp size={14} className="text-gray-500" /> : <ChevronDown size={14} className="text-gray-500" />}
              </button>

              {expanded === rx.id && (
                <div className="mt-4 pt-4 border-t border-surface-200 space-y-3">
                  {rx.prescription_medications?.length > 0 ? (
                    rx.prescription_medications.map((med, i) => (
                      <div key={med.id || i} className="bg-surface-100 rounded-xl p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-semibold text-white">{med.medication_name}</h4>
                          <button
                            onClick={() => handleSetReminder(med)}
                            className="tag bg-amber/10 text-amber hover:bg-amber/20 transition-colors cursor-pointer"
                          >
                            <Bell size={10} /> Set Reminder
                          </button>
                        </div>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                          <div><span className="text-gray-500">Dosage:</span> <span className="text-gray-300">{med.dosage}</span></div>
                          <div><span className="text-gray-500">Frequency:</span> <span className="text-gray-300">{med.frequency}</span></div>
                          <div><span className="text-gray-500">Duration:</span> <span className="text-gray-300">{med.duration || 'As directed'}</span></div>
                          <div><span className="text-gray-500">Route:</span> <span className="text-gray-300">{med.route}</span></div>
                        </div>
                        {med.instructions && (
                          <p className="text-xs text-gray-400 italic">📋 {med.instructions}</p>
                        )}
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-gray-500 text-center py-2">No medication details</p>
                  )}

                  {rx.notes && (
                    <div className="text-xs text-gray-400 pt-2 border-t border-surface-200">
                      <span className="font-medium text-gray-500">Notes:</span> {rx.notes}
                    </div>
                  )}
                  {rx.follow_up_date && (
                    <div className="flex items-center gap-1 text-xs text-gray-400">
                      <Calendar size={10} />
                      Follow-up: {format(new Date(rx.follow_up_date), 'MMM d, yyyy')}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="card text-center py-12">
          <Pill size={32} className="text-gray-600 mx-auto mb-3" />
          <p className="text-gray-400 mb-1">No prescriptions</p>
          <p className="text-xs text-gray-600">
            Prescriptions will appear here after your doctor creates them
          </p>
        </div>
      )}

      {/* Reminder Setup Modal */}
      {reminderModal && (
        <ReminderSetup
          medication={reminderModal}
          patientId={profile.id}
          onClose={() => setReminderModal(null)}
          onSaved={() => {
            setReminderModal(null);
            toast.success('Reminder set!');
          }}
        />
      )}
    </div>
  );
}

function ReminderSetup({ medication, patientId, onClose, onSaved }) {
  const [times, setTimes] = useState(['08:00']);
  const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState('');
  const [saving, setSaving] = useState(false);

  const addTime = () => setTimes([...times, '12:00']);
  const removeTime = (i) => setTimes(times.filter((_, idx) => idx !== i));
  const updateTime = (i, val) => {
    const t = [...times];
    t[i] = val;
    setTimes(t);
  };

  const handleSave = async () => {
    if (times.length === 0) return toast.error('Add at least one time');
    setSaving(true);
    try {
      await createReminder({
        patient_user_id: patientId,
        prescription_med_id: medication.id || null,
        medication_name: medication.medication_name,
        dosage: medication.dosage,
        frequency: medication.frequency,
        times_of_day: times.map(t => t + ':00'),  // HH:MM:SS format
        start_date: startDate,
        end_date: endDate || null,
        is_active: true,
      });
      onSaved();
    } catch (err) {
      toast.error(err.message || 'Failed to save reminder');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-surface-50 border border-surface-200 rounded-2xl w-full max-w-sm p-5 space-y-4 animate-slide-up" onClick={e => e.stopPropagation()}>
        <div>
          <h3 className="font-display font-semibold">Set Reminder</h3>
          <p className="text-sm text-gray-500">{medication.medication_name} · {medication.dosage}</p>
        </div>

        <div>
          <label className="text-xs text-gray-400 mb-1 block">Reminder Times</label>
          {times.map((t, i) => (
            <div key={i} className="flex items-center gap-2 mb-2">
              <input
                type="time" value={t}
                onChange={(e) => updateTime(i, e.target.value)}
                className="flex-1"
              />
              {times.length > 1 && (
                <button onClick={() => removeTime(i)} className="text-coral text-xs">Remove</button>
              )}
            </div>
          ))}
          <button onClick={addTime} className="text-xs text-brand-400 flex items-center gap-1">
            <Plus size={12} /> Add time
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Start Date</label>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full" />
          </div>
          <div>
            <label className="text-xs text-gray-400 mb-1 block">End Date (optional)</label>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full" />
          </div>
        </div>

        <div className="flex gap-3">
          <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="btn-mint flex-1 flex items-center justify-center gap-2">
            {saving ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <><Bell size={14} /> Save Reminder</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

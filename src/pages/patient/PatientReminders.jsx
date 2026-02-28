import { useEffect, useState, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { getReminders, deleteReminder } from '../../utils/db';
import { scheduleReminder, requestNotificationPermission } from '../../utils/ai';
import { Bell, BellOff, Clock, Pill, Trash2, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

export default function PatientReminders() {
  const { profile } = useAuth();
  const [reminders, setReminders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notifPermission, setNotifPermission] = useState('default');
  const scheduledTimers = useRef([]);

  useEffect(() => {
    setNotifPermission(Notification?.permission || 'default');
    loadReminders();
    return () => {
      // Clear all scheduled timers on unmount
      scheduledTimers.current.forEach(clearTimeout);
    };
  }, []);

  async function loadReminders() {
    try {
      const data = await getReminders(profile.id);
      setReminders(data);
      // Schedule notifications for each reminder
      scheduleAll(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  function scheduleAll(rems) {
    scheduledTimers.current.forEach(clearTimeout);
    scheduledTimers.current = [];

    rems.forEach(rem => {
      rem.times_of_day?.forEach(time => {
        const timer = scheduleReminder(
          rem.medication_name,
          rem.dosage,
          time.slice(0, 5),
          rem.frequency
        );
        if (timer) scheduledTimers.current.push(timer);
      });
    });
  }

  async function handleEnableNotifications() {
    const granted = await requestNotificationPermission();
    setNotifPermission(granted ? 'granted' : 'denied');
    if (granted) {
      toast.success('Notifications enabled!');
      scheduleAll(reminders);
    }
  }

  async function handleDelete(id) {
    try {
      await deleteReminder(id);
      setReminders(reminders.filter(r => r.id !== id));
      toast.success('Reminder removed');
    } catch (err) {
      toast.error('Failed to remove');
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-8 h-8 border-2 border-amber border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-slide-up">
      <h2 className="font-display text-xl font-bold">Medication Reminders</h2>

      {/* Notification Permission Banner */}
      {notifPermission !== 'granted' && (
        <div className="glass p-4 flex items-start gap-3">
          <AlertCircle size={16} className="text-amber shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium">Enable Notifications</p>
            <p className="text-xs text-gray-400 mt-0.5">
              Allow notifications to receive medication reminders on your phone
            </p>
          </div>
          <button onClick={handleEnableNotifications} className="btn-primary text-xs px-3 py-1.5 shrink-0">
            Enable
          </button>
        </div>
      )}

      {reminders.length > 0 ? (
        <div className="space-y-3">
          {reminders.map(rem => (
            <div key={rem.id} className="card">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber/10 flex items-center justify-center shrink-0 mt-0.5">
                  <Bell size={16} className="text-amber" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold">{rem.medication_name}</h4>
                    <button
                      onClick={() => handleDelete(rem.id)}
                      className="text-gray-600 hover:text-coral transition-colors p-1"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">{rem.dosage} · {rem.frequency}</p>

                  <div className="flex flex-wrap gap-2 mt-2">
                    {rem.times_of_day?.map((t, i) => (
                      <span key={i} className="tag bg-surface-200 text-gray-300 font-mono">
                        <Clock size={10} /> {t.slice(0, 5)}
                      </span>
                    ))}
                  </div>

                  <p className="text-[10px] text-gray-600 mt-2">
                    Started {rem.start_date}
                    {rem.end_date && ` · Ends ${rem.end_date}`}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="card text-center py-12">
          <BellOff size={32} className="text-gray-600 mx-auto mb-3" />
          <p className="text-gray-400 mb-1">No active reminders</p>
          <p className="text-xs text-gray-600">
            Go to your prescriptions to set up medication reminders
          </p>
        </div>
      )}

      {/* How it works */}
      <div className="glass p-4 space-y-2">
        <h4 className="text-xs text-gray-400 uppercase tracking-wider font-medium">How Reminders Work</h4>
        <div className="space-y-1.5 text-xs text-gray-500">
          <p>🔔 You'll receive push notifications at your scheduled times</p>
          <p>💊 Reminders are based on your doctor's prescriptions</p>
          <p>📱 Keep this app added to your homescreen for best results</p>
          <p>⚡ Notifications work even when the app is in the background</p>
        </div>
      </div>
    </div>
  );
}

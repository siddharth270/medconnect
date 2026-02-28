import { supabase } from '../lib/supabase';

// ── Patient Operations ──

export async function getPatients() {
  const { data, error } = await supabase
    .from('patients')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function getPatient(patientId) {
  const { data, error } = await supabase
    .from('patients')
    .select('*')
    .eq('id', patientId)
    .single();
  if (error) throw error;
  return data;
}

export async function createPatient(patientData) {
  const { data, error } = await supabase
    .from('patients')
    .insert(patientData)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updatePatient(patientId, updates) {
  const { data, error } = await supabase
    .from('patients')
    .update(updates)
    .eq('id', patientId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ── Appointment Operations ──

export async function getAppointments(doctorId, status) {
  let query = supabase
    .from('appointments')
    .select('*, patients(full_name, age, gender)')
    .eq('doctor_id', doctorId)
    .order('scheduled_at', { ascending: true });
  if (status) query = query.eq('status', status);
  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function getPatientAppointments(patientUserId) {
  // Get patient records linked to this user
  const { data: patientRecords } = await supabase
    .from('patients')
    .select('id')
    .eq('linked_user_id', patientUserId);

  if (!patientRecords?.length) return [];

  const patientIds = patientRecords.map((p) => p.id);
  const { data, error } = await supabase
    .from('appointments')
    .select('*, patients(full_name), profiles!appointments_doctor_id_fkey(full_name, specialization)')
    .in('patient_id', patientIds)
    .order('scheduled_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function createAppointment(appointmentData) {
  const { data, error } = await supabase
    .from('appointments')
    .insert(appointmentData)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateAppointment(id, updates) {
  const { data, error } = await supabase
    .from('appointments')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ── Consultation Operations ──

export async function createConsultation(consultData) {
  const { data, error } = await supabase
    .from('consultations')
    .insert(consultData)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getConsultations(patientId) {
  const { data, error } = await supabase
    .from('consultations')
    .select('*, soap_notes(*), prescriptions(*, prescription_medications(*))')
    .eq('patient_id', patientId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function getPatientConsultations(patientUserId) {
  const { data: patientRecords } = await supabase
    .from('patients')
    .select('id')
    .eq('linked_user_id', patientUserId);

  if (!patientRecords?.length) return [];

  const patientIds = patientRecords.map((p) => p.id);
  const { data, error } = await supabase
    .from('consultations')
    .select('*, soap_notes(*), prescriptions(*, prescription_medications(*)), patients(full_name)')
    .in('patient_id', patientIds)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

// ── SOAP Note Operations ──

export async function createSOAPNote(noteData) {
  const { data, error } = await supabase
    .from('soap_notes')
    .insert(noteData)
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ── Prescription Operations ──

export async function createPrescription(rxData) {
  const { data, error } = await supabase
    .from('prescriptions')
    .insert(rxData)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function createPrescriptionMedications(meds) {
  const { data, error } = await supabase
    .from('prescription_medications')
    .insert(meds)
    .select();
  if (error) throw error;
  return data;
}

export async function getPatientPrescriptions(patientUserId) {
  const { data: patientRecords } = await supabase
    .from('patients')
    .select('id')
    .eq('linked_user_id', patientUserId);

  if (!patientRecords?.length) return [];

  const patientIds = patientRecords.map((p) => p.id);
  const { data, error } = await supabase
    .from('prescriptions')
    .select('*, prescription_medications(*), patients(full_name), profiles!prescriptions_doctor_id_fkey(full_name)')
    .in('patient_id', patientIds)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

// ── Medication Reminder Operations ──

export async function getReminders(userId) {
  const { data, error } = await supabase
    .from('medication_reminders')
    .select('*')
    .eq('patient_user_id', userId)
    .eq('is_active', true)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function createReminder(reminderData) {
  const { data, error } = await supabase
    .from('medication_reminders')
    .insert(reminderData)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateReminder(id, updates) {
  const { data, error } = await supabase
    .from('medication_reminders')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteReminder(id) {
  const { error } = await supabase
    .from('medication_reminders')
    .update({ is_active: false })
    .eq('id', id);
  if (error) throw error;
}

// ── Audio Storage ──

export async function uploadAudio(userId, blob, filename) {
  const path = `${userId}/${filename}`;
  const { data, error } = await supabase.storage
    .from('recordings')
    .upload(path, blob, {
      contentType: 'audio/webm',
      upsert: false,
    });
  if (error) throw error;
  return data.path;
}

export async function getAudioUrl(path) {
  const { data } = supabase.storage
    .from('recordings')
    .getPublicUrl(path);
  return data.publicUrl;
}

// ── Dashboard Stats ──

export async function getDoctorStats(doctorId) {
  const [patients, upcoming, completed, today] = await Promise.all([
    supabase.from('patients').select('id', { count: 'exact' }),
    supabase
      .from('appointments')
      .select('id', { count: 'exact' })
      .eq('doctor_id', doctorId)
      .eq('status', 'scheduled')
      .gte('scheduled_at', new Date().toISOString()),
    supabase
      .from('consultations')
      .select('id', { count: 'exact' })
      .eq('doctor_id', doctorId),
    supabase
      .from('appointments')
      .select('*, patients(full_name, age, gender)')
      .eq('doctor_id', doctorId)
      .gte('scheduled_at', new Date(new Date().setHours(0, 0, 0, 0)).toISOString())
      .lte('scheduled_at', new Date(new Date().setHours(23, 59, 59, 999)).toISOString())
      .order('scheduled_at', { ascending: true }),
  ]);

  return {
    totalPatients: patients.count || 0,
    upcomingAppointments: upcoming.count || 0,
    totalConsultations: completed.count || 0,
    todayAppointments: today.data || [],
  };
}
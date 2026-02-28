-- ============================================================
-- MedConnect PWA — Supabase PostgreSQL Schema
-- ============================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- 1. USER PROFILES (extends Supabase auth.users)
-- ============================================================
CREATE TYPE user_role AS ENUM ('doctor', 'patient');

CREATE TABLE profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email         TEXT UNIQUE NOT NULL,
  full_name     TEXT NOT NULL,
  role          user_role NOT NULL,
  phone         TEXT,
  avatar_url    TEXT,
  specialization TEXT,          -- doctors only
  license_number TEXT,          -- doctors only
  clinic_name   TEXT,           -- doctors only
  date_of_birth DATE,           -- patients only
  gender        TEXT,
  blood_group   TEXT,
  allergies     TEXT[],
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 2. PATIENTS (managed by doctors)
-- ============================================================
CREATE TABLE patients (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  doctor_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  linked_user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,  -- links to patient account
  email         TEXT,
  full_name     TEXT NOT NULL,
  age           INT,
  gender        TEXT,
  height_cm     NUMERIC(5,1),
  weight_kg     NUMERIC(5,1),
  blood_group   TEXT,
  blood_pressure TEXT,
  heart_rate    INT,
  temperature   NUMERIC(4,1),
  oxygen_sat    NUMERIC(4,1),
  allergies     TEXT[],
  medical_history TEXT,
  phone         TEXT,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_patients_doctor ON patients(doctor_id);
CREATE INDEX idx_patients_email ON patients(email);
CREATE INDEX idx_patients_linked_user ON patients(linked_user_id);

-- ============================================================
-- 3. APPOINTMENTS
-- ============================================================
CREATE TYPE appointment_status AS ENUM ('scheduled', 'in_progress', 'completed', 'cancelled');

CREATE TABLE appointments (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  doctor_id       UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  patient_id      UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  scheduled_at    TIMESTAMPTZ,
  status          appointment_status DEFAULT 'scheduled',
  chief_complaint TEXT,
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_appointments_doctor ON appointments(doctor_id);
CREATE INDEX idx_appointments_patient ON appointments(patient_id);
CREATE INDEX idx_appointments_status ON appointments(status);
CREATE INDEX idx_appointments_scheduled ON appointments(scheduled_at);

-- ============================================================
-- 4. CONSULTATIONS (recording sessions)
-- ============================================================
CREATE TYPE consultation_type AS ENUM ('soap_note', 'prescription');

CREATE TABLE consultations (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  appointment_id  UUID REFERENCES appointments(id) ON DELETE SET NULL,
  doctor_id       UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  patient_id      UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  type            consultation_type NOT NULL,
  transcript      TEXT,
  audio_url       TEXT,           -- stored in Supabase Storage
  duration_secs   INT,
  ai_processed    BOOLEAN DEFAULT false,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_consultations_doctor ON consultations(doctor_id);
CREATE INDEX idx_consultations_patient ON consultations(patient_id);

-- ============================================================
-- 5. SOAP NOTES
-- ============================================================
CREATE TABLE soap_notes (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  consultation_id UUID UNIQUE NOT NULL REFERENCES consultations(id) ON DELETE CASCADE,
  doctor_id       UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  patient_id      UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  subjective      TEXT,
  objective       TEXT,
  assessment      TEXT,
  plan            TEXT,
  icd_codes       TEXT[],
  follow_up_date  DATE,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 6. PRESCRIPTIONS
-- ============================================================
CREATE TABLE prescriptions (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  consultation_id UUID UNIQUE NOT NULL REFERENCES consultations(id) ON DELETE CASCADE,
  doctor_id       UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  patient_id      UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  diagnosis       TEXT,
  notes           TEXT,
  follow_up_date  DATE,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 7. PRESCRIPTION MEDICATIONS (line items)
-- ============================================================
CREATE TABLE prescription_medications (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  prescription_id UUID NOT NULL REFERENCES prescriptions(id) ON DELETE CASCADE,
  medication_name TEXT NOT NULL,
  dosage          TEXT NOT NULL,
  frequency       TEXT NOT NULL,       -- e.g. "twice daily"
  duration        TEXT,                -- e.g. "7 days"
  route           TEXT DEFAULT 'oral', -- oral, topical, IV, etc.
  instructions    TEXT,                -- e.g. "take after meals"
  quantity        INT,
  refills         INT DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_rx_meds_prescription ON prescription_medications(prescription_id);

-- ============================================================
-- 8. MEDICATION REMINDERS (patient-side)
-- ============================================================
CREATE TABLE medication_reminders (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_user_id   UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  prescription_med_id UUID REFERENCES prescription_medications(id) ON DELETE SET NULL,
  medication_name   TEXT NOT NULL,
  dosage            TEXT,
  frequency         TEXT,
  times_of_day      TIME[] NOT NULL,   -- e.g. {08:00, 20:00}
  start_date        DATE NOT NULL,
  end_date          DATE,
  is_active         BOOLEAN DEFAULT true,
  created_at        TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_reminders_patient ON medication_reminders(patient_user_id);
CREATE INDEX idx_reminders_active ON medication_reminders(is_active);

-- ============================================================
-- 9. ROW-LEVEL SECURITY POLICIES
-- ============================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE consultations ENABLE ROW LEVEL SECURITY;
ALTER TABLE soap_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE prescriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE prescription_medications ENABLE ROW LEVEL SECURITY;
ALTER TABLE medication_reminders ENABLE ROW LEVEL SECURITY;

-- Profiles: users can read/update their own profile
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Doctors can view all profiles (to find patients)
CREATE POLICY "Doctors can view all profiles"
  ON profiles FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'doctor')
  );

-- Patients: doctors see their own patients; patients see themselves
CREATE POLICY "Doctors manage their patients"
  ON patients FOR ALL USING (doctor_id = auth.uid());
CREATE POLICY "Linked patients can view their record"
  ON patients FOR SELECT USING (linked_user_id = auth.uid());

-- Appointments
CREATE POLICY "Doctors manage their appointments"
  ON appointments FOR ALL USING (doctor_id = auth.uid());
CREATE POLICY "Patients view their appointments"
  ON appointments FOR SELECT USING (
    patient_id IN (SELECT id FROM patients WHERE linked_user_id = auth.uid())
  );

-- Consultations
CREATE POLICY "Doctors manage their consultations"
  ON consultations FOR ALL USING (doctor_id = auth.uid());
CREATE POLICY "Patients view their consultations"
  ON consultations FOR SELECT USING (
    patient_id IN (SELECT id FROM patients WHERE linked_user_id = auth.uid())
  );

-- SOAP Notes
CREATE POLICY "Doctors manage their soap notes"
  ON soap_notes FOR ALL USING (doctor_id = auth.uid());
CREATE POLICY "Patients view their soap notes"
  ON soap_notes FOR SELECT USING (
    patient_id IN (SELECT id FROM patients WHERE linked_user_id = auth.uid())
  );

-- Prescriptions
CREATE POLICY "Doctors manage their prescriptions"
  ON prescriptions FOR ALL USING (doctor_id = auth.uid());
CREATE POLICY "Patients view their prescriptions"
  ON prescriptions FOR SELECT USING (
    patient_id IN (SELECT id FROM patients WHERE linked_user_id = auth.uid())
  );

-- Prescription Medications
CREATE POLICY "Doctors manage prescription meds"
  ON prescription_medications FOR ALL USING (
    prescription_id IN (SELECT id FROM prescriptions WHERE doctor_id = auth.uid())
  );
CREATE POLICY "Patients view their prescription meds"
  ON prescription_medications FOR SELECT USING (
    prescription_id IN (
      SELECT id FROM prescriptions WHERE patient_id IN (
        SELECT id FROM patients WHERE linked_user_id = auth.uid()
      )
    )
  );

-- Medication Reminders
CREATE POLICY "Patients manage their reminders"
  ON medication_reminders FOR ALL USING (patient_user_id = auth.uid());

-- ============================================================
-- 10. HELPER FUNCTIONS
-- ============================================================

-- Auto-link patient record when a patient signs up with matching email
CREATE OR REPLACE FUNCTION link_patient_on_signup()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE patients
  SET linked_user_id = NEW.id
  WHERE email = NEW.email AND linked_user_id IS NULL;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_profile_created
  AFTER INSERT ON profiles
  FOR EACH ROW
  WHEN (NEW.role = 'patient')
  EXECUTE FUNCTION link_patient_on_signup();

-- Auto-update updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_profiles_updated   BEFORE UPDATE ON profiles       FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER tr_patients_updated   BEFORE UPDATE ON patients       FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER tr_appointments_upd   BEFORE UPDATE ON appointments   FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER tr_consultations_upd  BEFORE UPDATE ON consultations  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER tr_soap_notes_upd     BEFORE UPDATE ON soap_notes     FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER tr_prescriptions_upd  BEFORE UPDATE ON prescriptions  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- 11. STORAGE BUCKETS (run in Supabase dashboard)
-- ============================================================
-- Create a bucket called 'recordings' for audio files
-- INSERT INTO storage.buckets (id, name, public) VALUES ('recordings', 'recordings', false);

-- Storage policies for recordings bucket:
-- CREATE POLICY "Doctors upload recordings"
--   ON storage.objects FOR INSERT
--   WITH CHECK (bucket_id = 'recordings' AND auth.uid()::text = (storage.foldername(name))[1]);
-- CREATE POLICY "Users read own recordings"
--   ON storage.objects FOR SELECT
--   USING (bucket_id = 'recordings' AND auth.uid()::text = (storage.foldername(name))[1]);

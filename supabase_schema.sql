-- ============================================================
-- Elite Dental Studio EMR — Supabase Schema
-- Run this in the Supabase SQL Editor (Dashboard > SQL Editor)
-- ============================================================

-- 1. USERS (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.users (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email         TEXT NOT NULL UNIQUE,
  full_name     TEXT NOT NULL,
  role          TEXT NOT NULL CHECK (role IN ('DOCTOR', 'RECEPTIONIST')),
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- 2. SERVICES (dental service catalog)
CREATE TABLE IF NOT EXISTS public.services (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name              TEXT NOT NULL UNIQUE,
  duration_minutes  INTEGER NOT NULL DEFAULT 30,
  color             TEXT NOT NULL DEFAULT '#10B981',
  description       TEXT,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

-- 3. PATIENTS
CREATE TABLE IF NOT EXISTS public.patients (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id           TEXT NOT NULL UNIQUE,  -- e.g. EDS-2026-0001
  first_name           TEXT NOT NULL,
  last_name            TEXT NOT NULL,
  date_of_birth        DATE NOT NULL,
  gender               TEXT NOT NULL,
  contact_number       TEXT NOT NULL,
  email                TEXT,
  address              TEXT,
  medical_history      TEXT,
  allergies            TEXT,
  has_bleeding_disorder BOOLEAN NOT NULL DEFAULT FALSE,
  created_at           TIMESTAMPTZ DEFAULT NOW()
);

-- 4. APPOINTMENTS
CREATE TABLE IF NOT EXISTS public.appointments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id      UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  doctor_id       UUID NOT NULL REFERENCES public.users(id) ON DELETE SET NULL,
  service_id      UUID NOT NULL REFERENCES public.services(id),
  start_time      TIMESTAMPTZ NOT NULL,
  end_time        TIMESTAMPTZ NOT NULL,
  status          TEXT NOT NULL DEFAULT 'SCHEDULED'
                  CHECK (status IN ('SCHEDULED','WAITING','IN_SESSION','COMPLETED','CANCELLED')),
  chief_complaint TEXT,
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- 5. VISITS (dental visit records)
CREATE TABLE IF NOT EXISTS public.visits (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id          UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  doctor_id           UUID NOT NULL REFERENCES public.users(id),
  appointment_id      UUID REFERENCES public.appointments(id),
  tooth_numbers       TEXT,
  chief_complaint     TEXT,
  procedure_performed TEXT,
  medical_notes       TEXT,
  diagnosis           TEXT,
  prescription        TEXT,
  total_cost          NUMERIC(10,2),
  amount_paid         NUMERIC(10,2),
  previous_balance    NUMERIC(10,2) DEFAULT 0,
  visit_date          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- 6. ATTACHMENTS (file records — actual files stored in Supabase Storage)
CREATE TABLE IF NOT EXISTS public.attachments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id        UUID NOT NULL REFERENCES public.visits(id) ON DELETE CASCADE,
  patient_id      UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  file_name       TEXT NOT NULL,
  file_type       TEXT NOT NULL,
  storage_path    TEXT NOT NULL,
  file_size_bytes BIGINT,
  category        TEXT NOT NULL DEFAULT 'OTHER'
                  CHECK (category IN ('X_RAY','LAB_RESULT','CLINICAL_PHOTO','PRESCRIPTION','OTHER')),
  uploaded_by_id  UUID REFERENCES public.users(id),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ──────────────────────────────────────────────────────────────
-- SEED DATA — Services
-- ──────────────────────────────────────────────────────────────
INSERT INTO public.services (name, duration_minutes, color, description) VALUES
  ('Consultation',  15, '#4F9CF9', 'Initial or follow-up consultation'),
  ('Extraction',    30, '#E57373', 'Simple or surgical tooth extraction'),
  ('Filling',       45, '#81C995', 'Amalgam or composite restoration'),
  ('Scaling',       60, '#C9A84C', 'Full mouth scaling and polishing'),
  ('Root Canal',    90, '#BA68C8', 'Endodontic treatment'),
  ('Crown',         60, '#FFB74D', 'Porcelain or metal crown placement'),
  ('Whitening',     45, '#4DD0E1', 'In-office teeth whitening session')
ON CONFLICT (name) DO NOTHING;

-- ──────────────────────────────────────────────────────────────
-- RLS POLICIES
-- Enable RLS on all tables, allow authenticated users access
-- ──────────────────────────────────────────────────────────────
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attachments ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read all (service_role bypasses RLS anyway)
CREATE POLICY "Authenticated read users" ON public.users FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated read services" ON public.services FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated read patients" ON public.patients FOR ALL TO authenticated USING (true);
CREATE POLICY "Authenticated read appointments" ON public.appointments FOR ALL TO authenticated USING (true);
CREATE POLICY "Authenticated read visits" ON public.visits FOR ALL TO authenticated USING (true);
CREATE POLICY "Authenticated read attachments" ON public.attachments FOR ALL TO authenticated USING (true);

-- ──────────────────────────────────────────────────────────────
-- AUTO-REGISTER USER PROFILE ON SIGNUP
-- ──────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'role', 'RECEPTIONIST')
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ──────────────────────────────────────────────────────────────
-- HOW TO CREATE STAFF ACCOUNTS
-- Run these in SQL Editor after setting up the schema:
-- 
-- Method 1: Use Supabase Auth dashboard → "Invite User"
--   Then update their role:
--   UPDATE public.users SET role = 'DOCTOR', full_name = 'Dr. Ahmed Fahmy' WHERE email = 'doctor@elitedental.com';
--
-- Method 2: Use Supabase Auth API or dashboard to create user,
--   the trigger will auto-create the users row.
--   Then set role:
--   UPDATE public.users SET role = 'RECEPTIONIST', full_name = 'Sara Hassan' WHERE email = 'reception@elitedental.com';
-- ──────────────────────────────────────────────────────────────

-- ─────────────────────────────────────────────────────────────────────────────
-- FabriSense Cloud Schema Migration: Initial Supabase Setup
-- Supports: Profiles, Inspections, Defects, Reports, Model Telemetry, System Logs, Settings
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Custom ENUM types
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('admin', 'manager', 'inspector');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE fabric_grade AS ENUM ('A', 'B', 'C');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE inspection_status AS ENUM ('Passed', 'Review', 'Failed');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE defect_severity AS ENUM ('Low', 'Moderate', 'Critical');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. PROFILES TABLE (Linked to auth.users)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  phone TEXT,
  role user_role NOT NULL DEFAULT 'inspector',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'pending')),
  avatar_url TEXT,
  inspection_count INTEGER NOT NULL DEFAULT 0,
  last_active TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for profile queries
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. INSPECTIONS TABLE
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.inspections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id VARCHAR(50) UNIQUE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  inspector_name TEXT,
  inspector_email TEXT,
  fabric_type TEXT NOT NULL,
  fabric_name TEXT NOT NULL,
  image_url TEXT NOT NULL,
  inspection_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  defect_count INTEGER NOT NULL DEFAULT 0,
  grade fabric_grade NOT NULL DEFAULT 'B',
  status inspection_status NOT NULL DEFAULT 'Review',
  overall_summary TEXT,
  recommended_action TEXT,
  model_version TEXT NOT NULL DEFAULT 'YOLOv8x-Fabric-v4.2.1',
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for rapid dashboard and report queries
CREATE INDEX IF NOT EXISTS idx_inspections_inspection_id ON public.inspections(inspection_id);
CREATE INDEX IF NOT EXISTS idx_inspections_user_id ON public.inspections(user_id);
CREATE INDEX IF NOT EXISTS idx_inspections_grade ON public.inspections(grade);
CREATE INDEX IF NOT EXISTS idx_inspections_status ON public.inspections(status);
CREATE INDEX IF NOT EXISTS idx_inspections_date ON public.inspections(inspection_date DESC);
CREATE INDEX IF NOT EXISTS idx_inspections_fabric ON public.inspections(fabric_type);

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. DEFECTS TABLE (Bounding boxes & localized classifications)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.defects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id VARCHAR(50) NOT NULL REFERENCES public.inspections(inspection_id) ON DELETE CASCADE,
  defect_type TEXT NOT NULL,
  confidence NUMERIC(5, 2) NOT NULL CHECK (confidence >= 0 AND confidence <= 100),
  severity defect_severity NOT NULL DEFAULT 'Moderate',
  x NUMERIC(6, 2) NOT NULL,
  y NUMERIC(6, 2) NOT NULL,
  width NUMERIC(6, 2) NOT NULL,
  height NUMERIC(6, 2) NOT NULL,
  explanation TEXT,
  recommended_action TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_defects_inspection_id ON public.defects(inspection_id);
CREATE INDEX IF NOT EXISTS idx_defects_type ON public.defects(defect_type);
CREATE INDEX IF NOT EXISTS idx_defects_severity ON public.defects(severity);

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. REPORTS TABLE (Quality Audit Certificates & PDFs)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id VARCHAR(50) NOT NULL REFERENCES public.inspections(inspection_id) ON DELETE CASCADE,
  report_number VARCHAR(60) UNIQUE NOT NULL,
  report_path TEXT,
  status TEXT NOT NULL DEFAULT 'Generated' CHECK (status IN ('Generated', 'Pending', 'Failed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reports_inspection_id ON public.reports(inspection_id);
CREATE INDEX IF NOT EXISTS idx_reports_report_number ON public.reports(report_number);

-- ─────────────────────────────────────────────────────────────────────────────
-- 7. MODEL VERSIONS TABLE (Telemetry & Specs)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.model_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_name TEXT NOT NULL,
  model_version TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Active',
  api_status TEXT NOT NULL DEFAULT 'Online',
  dataset_name TEXT NOT NULL DEFAULT 'TextileDefect-45k-augmented',
  accuracy_map50 NUMERIC(5, 2) DEFAULT 94.2,
  training_samples INTEGER DEFAULT 12450,
  validation_samples INTEGER DEFAULT 2400,
  edge_hardware TEXT DEFAULT 'Jetson Orin 64GB',
  response_latency_ms INTEGER DEFAULT 245,
  api_uptime_pct NUMERIC(5, 2) DEFAULT 99.8,
  camera_feed_fps INTEGER DEFAULT 30,
  detection_classes TEXT DEFAULT 'Hole, Stain, Broken Yarn, Tear, Contamination',
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_trained_date TIMESTAMPTZ DEFAULT now() - interval '20 days',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 8. SYSTEM LOGS TABLE (Live Diagnostics Console)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.system_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  level TEXT NOT NULL DEFAULT 'INFO' CHECK (level IN ('INFO', 'SUCCESS', 'WARNING', 'ERROR')),
  prefix TEXT,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_system_logs_created_at ON public.system_logs(created_at DESC);

-- ─────────────────────────────────────────────────────────────────────────────
-- 9. SYSTEM SETTINGS TABLE (Key-Value Config)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.system_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 10. ROW LEVEL SECURITY (RLS) POLICIES
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inspections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.defects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.model_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Helper function: get user role from profiles
CREATE OR REPLACE FUNCTION public.get_auth_role()
RETURNS TEXT AS $$
  SELECT role::text FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Profiles Policies
DROP POLICY IF EXISTS "Profiles are readable by authenticated users" ON public.profiles;
CREATE POLICY "Profiles are readable by authenticated users"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Admins can manage all profiles" ON public.profiles;
CREATE POLICY "Admins can manage all profiles"
  ON public.profiles FOR ALL
  TO authenticated
  USING (public.get_auth_role() = 'admin' OR public.get_auth_role() = 'manager');

-- Inspections Policies
DROP POLICY IF EXISTS "Inspections are viewable by authenticated users" ON public.inspections;
CREATE POLICY "Inspections are viewable by authenticated users"
  ON public.inspections FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Inspectors and admins can create inspections" ON public.inspections;
CREATE POLICY "Inspectors and admins can create inspections"
  ON public.inspections FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Admins and managers can update inspections" ON public.inspections;
CREATE POLICY "Admins and managers can update inspections"
  ON public.inspections FOR UPDATE
  TO authenticated
  USING (public.get_auth_role() IN ('admin', 'manager') OR auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can delete inspections" ON public.inspections;
CREATE POLICY "Admins can delete inspections"
  ON public.inspections FOR DELETE
  TO authenticated
  USING (public.get_auth_role() IN ('admin', 'manager'));

-- Defects Policies
DROP POLICY IF EXISTS "Defects are readable by authenticated users" ON public.defects;
CREATE POLICY "Defects are readable by authenticated users"
  ON public.defects FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Defects can be inserted by authenticated users" ON public.defects;
CREATE POLICY "Defects can be inserted by authenticated users"
  ON public.defects FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Reports Policies
DROP POLICY IF EXISTS "Reports are readable by authenticated users" ON public.reports;
CREATE POLICY "Reports are readable by authenticated users"
  ON public.reports FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Reports can be inserted by authenticated users" ON public.reports;
CREATE POLICY "Reports can be inserted by authenticated users"
  ON public.reports FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Settings & Telemetry Policies
DROP POLICY IF EXISTS "Settings readable by authenticated users" ON public.system_settings;
CREATE POLICY "Settings readable by authenticated users"
  ON public.system_settings FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Settings editable by admins" ON public.system_settings;
CREATE POLICY "Settings editable by admins"
  ON public.system_settings FOR ALL
  TO authenticated
  USING (public.get_auth_role() IN ('admin', 'manager'));

DROP POLICY IF EXISTS "Model telemetry readable by authenticated users" ON public.model_versions;
CREATE POLICY "Model telemetry readable by authenticated users"
  ON public.model_versions FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Logs readable by authenticated users" ON public.system_logs;
CREATE POLICY "Logs readable by authenticated users"
  ON public.system_logs FOR SELECT
  TO authenticated
  USING (true);

-- Service Role Key Bypass:
-- By default, Supabase service-role key automatically bypasses RLS for backend batch operations.

-- ─────────────────────────────────────────────────────────────────────────────
-- 11. AUTOMATIC PROFILE CREATION TRIGGER ON AUTH SIGNUP
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name, role, status, avatar_url)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    CASE
      WHEN lower(trim(coalesce(new.raw_user_meta_data->>'role', ''))) = 'admin' THEN 'admin'::user_role
      WHEN lower(trim(coalesce(new.raw_user_meta_data->>'role', ''))) = 'manager' THEN 'manager'::user_role
      ELSE 'inspector'::user_role
    END,
    'active',
    new.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    name = COALESCE(EXCLUDED.name, profiles.name),
    updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ─────────────────────────────────────────────────────────────────────────────
-- 12. STORAGE BUCKET CONFIGURATION (inspection-images)
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'inspection-images',
  'inspection-images',
  true,
  15728640, -- 15MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/jpg']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 15728640;

-- Storage RLS Policies
DROP POLICY IF EXISTS "Public inspection images access" ON storage.objects;
CREATE POLICY "Public inspection images access"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'inspection-images');

DROP POLICY IF EXISTS "Authenticated users can upload inspection images" ON storage.objects;
CREATE POLICY "Authenticated users can upload inspection images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'inspection-images');

-- ─────────────────────────────────────────────────────────────────────────────
-- 13. REALTIME PUBLICATION SETUP
-- ─────────────────────────────────────────────────────────────────────────────
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.inspections;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.defects;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.system_logs;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

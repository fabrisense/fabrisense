-- ─────────────────────────────────────────────────────────────────────────────
-- FabriSense Migration: Fix user_role Enum Reference in Auth Profile Trigger
-- Resolves: ERROR: type "user role" does not exist (SQLSTATE 42704)
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Ensure public.user_role ENUM exists with valid values (admin, manager, inspector)
DO $$ BEGIN
  CREATE TYPE public.user_role AS ENUM ('admin', 'manager', 'inspector');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 2. Update handle_new_user() with explicit schema-qualified public.user_role and safe search_path
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_role_input TEXT;
  v_role public.user_role;
  v_full_name TEXT;
BEGIN
  -- Normalize role string from user or app metadata
  v_role_input := lower(trim(COALESCE(
    new.raw_user_meta_data->>'role',
    new.raw_app_meta_data->>'role',
    ''
  )));

  -- Map to valid public.user_role enum value ('admin', 'manager', or 'inspector')
  IF v_role_input = 'admin' THEN
    v_role := 'admin'::public.user_role;
  ELSIF v_role_input = 'manager' THEN
    v_role := 'manager'::public.user_role;
  ELSE
    v_role := 'inspector'::public.user_role;
  END IF;

  -- Extract display name (check full_name, name, or fallback to email prefix)
  v_full_name := COALESCE(
    NULLIF(trim(new.raw_user_meta_data->>'full_name'), ''),
    NULLIF(trim(new.raw_user_meta_data->>'name'), ''),
    split_part(new.email, '@', 1)
  );

  -- Insert or update public.profiles with valid enum and schema fields
  INSERT INTO public.profiles (
    id,
    email,
    name,
    role,
    status,
    avatar_url,
    created_at,
    updated_at
  )
  VALUES (
    new.id,
    new.email,
    v_full_name,
    v_role,
    'active',
    new.raw_user_meta_data->>'avatar_url',
    now(),
    now()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    name = COALESCE(EXCLUDED.name, public.profiles.name),
    updated_at = now();

  RETURN NEW;
END;
$$;

-- 3. Recreate the trigger on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

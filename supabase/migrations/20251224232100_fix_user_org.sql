-- Ensure users/org schema and onboarding hooks are consistent.

ALTER TABLE IF EXISTS public.users
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS name text,
  ADD COLUMN IF NOT EXISTS role text,
  ADD COLUMN IF NOT EXISTS organization_id uuid;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'users_id_fkey'
  ) THEN
    ALTER TABLE public.users
      ADD CONSTRAINT users_id_fkey
      FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'users_organization_id_fkey'
  ) THEN
    ALTER TABLE public.users
      ADD CONSTRAINT users_organization_id_fkey
      FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.users (id, email, name, role, created_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
    'member',
    NOW()
  )
  ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email,
        name = EXCLUDED.name;

  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'on_auth_user_created'
  ) THEN
    CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE PROCEDURE public.handle_new_user();
  END IF;
END $$;

INSERT INTO public.users (id, email, name, role, created_at)
SELECT u.id,
       u.email,
       COALESCE(u.raw_user_meta_data->>'name', u.email),
       'member',
       NOW()
FROM auth.users u
LEFT JOIN public.users pu ON pu.id = u.id
WHERE pu.id IS NULL
ON CONFLICT (id) DO NOTHING;

WITH missing AS (
  SELECT id AS user_id,
         COALESCE(name, email, 'My Organization') AS org_name,
         gen_random_uuid() AS org_id
  FROM public.users
  WHERE organization_id IS NULL
),
inserted AS (
  INSERT INTO public.organizations (id, name)
  SELECT org_id, org_name
  FROM missing
)
UPDATE public.users u
SET organization_id = m.org_id
FROM missing m
WHERE u.id = m.user_id;

CREATE OR REPLACE FUNCTION public.create_default_org_for_current_user()
RETURNS public.organizations
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  profile_row public.users;
  org_row public.organizations;
BEGIN
  SELECT * INTO profile_row
  FROM public.users
  WHERE id = auth.uid();

  IF profile_row.id IS NULL THEN
    INSERT INTO public.users (id, email, name, role, created_at)
    SELECT u.id,
           u.email,
           COALESCE(u.raw_user_meta_data->>'name', u.email),
           'member',
           NOW()
    FROM auth.users u
    WHERE u.id = auth.uid()
    RETURNING * INTO profile_row;
  END IF;

  IF profile_row.organization_id IS NOT NULL THEN
    SELECT * INTO org_row
    FROM public.organizations
    WHERE id = profile_row.organization_id;
    RETURN org_row;
  END IF;

  INSERT INTO public.organizations (id, name)
  VALUES (gen_random_uuid(), COALESCE(profile_row.name, 'My Organization'))
  RETURNING * INTO org_row;

  UPDATE public.users
  SET organization_id = org_row.id
  WHERE id = auth.uid();

  RETURN org_row;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_default_org_for_current_user() TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_default_org_for_current_user() TO service_role;

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'users'
      AND policyname = 'Users can update own profile'
  ) THEN
    CREATE POLICY "Users can update own profile"
    ON public.users
    FOR UPDATE
    USING (auth.uid() = id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'users'
      AND policyname = 'Users view profiles in same org'
  ) THEN
    CREATE POLICY "Users view profiles in same org"
    ON public.users
    FOR SELECT
    USING (organization_id = public.get_user_org_id() OR id = auth.uid());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'organizations'
      AND policyname = 'Users can view own organization data'
  ) THEN
    CREATE POLICY "Users can view own organization data"
    ON public.organizations
    FOR SELECT
    USING (id = public.get_user_org_id());
  END IF;
END $$;

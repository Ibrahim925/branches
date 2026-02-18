-- Add profile onboarding fields and keep claimed nodes synced to profile identity.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS first_name TEXT,
  ADD COLUMN IF NOT EXISTS last_name TEXT,
  ADD COLUMN IF NOT EXISTS avatar_url TEXT,
  ADD COLUMN IF NOT EXISTS gender TEXT,
  ADD COLUMN IF NOT EXISTS bio TEXT,
  ADD COLUMN IF NOT EXISTS birthdate DATE,
  ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN NOT NULL DEFAULT FALSE;

UPDATE public.profiles
SET
  first_name = COALESCE(
    first_name,
    NULLIF(split_part(COALESCE(display_name, ''), ' ', 1), '')
  ),
  last_name = COALESCE(
    last_name,
    NULLIF(
      btrim(regexp_replace(COALESCE(display_name, ''), '^\S+\s*', '')),
      ''
    )
  ),
  onboarding_completed = TRUE
WHERE onboarding_completed = FALSE;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  meta_display_name TEXT := NULLIF(btrim(COALESCE(NEW.raw_user_meta_data->>'display_name', '')), '');
  meta_first_name TEXT := NULLIF(btrim(COALESCE(NEW.raw_user_meta_data->>'first_name', '')), '');
  meta_last_name TEXT := NULLIF(btrim(COALESCE(NEW.raw_user_meta_data->>'last_name', '')), '');
BEGIN
  INSERT INTO public.profiles (
    id,
    email,
    display_name,
    first_name,
    last_name,
    onboarding_completed
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(meta_display_name, NULLIF(CONCAT_WS(' ', meta_first_name, meta_last_name), '')),
    meta_first_name,
    meta_last_name,
    FALSE
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.apply_claimed_profile_to_node()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  profile_row public.profiles%ROWTYPE;
  resolved_first_name TEXT;
  resolved_last_name TEXT;
BEGIN
  IF NEW.claimed_by IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT *
  INTO profile_row
  FROM public.profiles
  WHERE id = NEW.claimed_by
  LIMIT 1;

  IF profile_row.id IS NULL THEN
    RETURN NEW;
  END IF;

  resolved_first_name := COALESCE(
    NULLIF(btrim(profile_row.first_name), ''),
    NULLIF(split_part(COALESCE(profile_row.display_name, ''), ' ', 1), ''),
    NEW.first_name,
    'Family Member'
  );

  resolved_last_name := COALESCE(
    NULLIF(btrim(profile_row.last_name), ''),
    NULLIF(
      btrim(regexp_replace(COALESCE(profile_row.display_name, ''), '^\S+\s*', '')),
      ''
    ),
    NEW.last_name
  );

  NEW.first_name := resolved_first_name;
  NEW.last_name := resolved_last_name;
  NEW.avatar_url := profile_row.avatar_url;
  NEW.birthdate := profile_row.birthdate;
  NEW.bio := profile_row.bio;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_nodes_apply_claimed_profile ON public.nodes;
CREATE TRIGGER trg_nodes_apply_claimed_profile
  BEFORE INSERT OR UPDATE OF claimed_by, first_name, last_name, avatar_url, birthdate, bio
  ON public.nodes
  FOR EACH ROW
  EXECUTE FUNCTION public.apply_claimed_profile_to_node();

CREATE OR REPLACE FUNCTION public.sync_claimed_nodes_from_profile()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  resolved_first_name TEXT;
  resolved_last_name TEXT;
BEGIN
  resolved_first_name := COALESCE(
    NULLIF(btrim(NEW.first_name), ''),
    NULLIF(split_part(COALESCE(NEW.display_name, ''), ' ', 1), ''),
    'Family Member'
  );

  resolved_last_name := COALESCE(
    NULLIF(btrim(NEW.last_name), ''),
    NULLIF(
      btrim(regexp_replace(COALESCE(NEW.display_name, ''), '^\S+\s*', '')),
      ''
    )
  );

  UPDATE public.nodes
  SET
    first_name = resolved_first_name,
    last_name = resolved_last_name,
    avatar_url = NEW.avatar_url,
    birthdate = NEW.birthdate,
    bio = NEW.bio,
    updated_at = NOW()
  WHERE claimed_by = NEW.id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_profiles_sync_claimed_nodes ON public.profiles;
CREATE TRIGGER trg_profiles_sync_claimed_nodes
  AFTER INSERT OR UPDATE OF first_name, last_name, display_name, avatar_url, bio, birthdate
  ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_claimed_nodes_from_profile();

CREATE OR REPLACE FUNCTION public.can_access_own_profile_avatar_object(_object_name TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  owner_id UUID;
BEGIN
  BEGIN
    owner_id := split_part(_object_name, '/', 1)::UUID;
  EXCEPTION WHEN others THEN
    RETURN FALSE;
  END;

  RETURN owner_id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public;

REVOKE ALL ON FUNCTION public.can_access_own_profile_avatar_object(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_access_own_profile_avatar_object(TEXT) TO authenticated;

INSERT INTO storage.buckets (id, name, public)
VALUES ('profile-avatars', 'profile-avatars', true)
ON CONFLICT (id) DO UPDATE
SET public = EXCLUDED.public;

DROP POLICY IF EXISTS "Users can upload own profile avatars" ON storage.objects;
CREATE POLICY "Users can upload own profile avatars"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'profile-avatars'
    AND public.can_access_own_profile_avatar_object(name)
  );

DROP POLICY IF EXISTS "Authenticated users can view profile avatars" ON storage.objects;
CREATE POLICY "Authenticated users can view profile avatars"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'profile-avatars');

DROP POLICY IF EXISTS "Users can delete own profile avatars" ON storage.objects;
CREATE POLICY "Users can delete own profile avatars"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'profile-avatars'
    AND public.can_access_own_profile_avatar_object(name)
  );

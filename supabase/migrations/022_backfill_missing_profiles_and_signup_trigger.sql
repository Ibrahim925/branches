-- Ensure every auth user has a matching profile row for FK references (e.g. graphs.created_by).
-- Also ensure the signup trigger exists in case it was missing on hosted projects.

INSERT INTO public.profiles (
  id,
  email,
  display_name,
  first_name,
  last_name,
  onboarding_completed
)
SELECT
  u.id,
  u.email,
  COALESCE(
    NULLIF(btrim(u.raw_user_meta_data->>'display_name'), ''),
    NULLIF(btrim(CONCAT_WS(' ', u.raw_user_meta_data->>'first_name', u.raw_user_meta_data->>'last_name')), ''),
    NULLIF(split_part(COALESCE(u.email, ''), '@', 1), '')
  ) AS display_name,
  NULLIF(btrim(u.raw_user_meta_data->>'first_name'), '') AS first_name,
  NULLIF(btrim(u.raw_user_meta_data->>'last_name'), '') AS last_name,
  FALSE AS onboarding_completed
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE p.id IS NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger t
    JOIN pg_class c ON c.oid = t.tgrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE t.tgname = 'on_auth_user_created'
      AND n.nspname = 'auth'
      AND c.relname = 'users'
  ) THEN
    CREATE TRIGGER on_auth_user_created
      AFTER INSERT ON auth.users
      FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
  END IF;
END
$$;

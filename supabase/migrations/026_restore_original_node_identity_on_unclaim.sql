-- Preserve original node identity when a node is claimed,
-- and restore that original data when the node is unclaimed.

ALTER TABLE public.nodes
  ADD COLUMN IF NOT EXISTS pre_claim_first_name TEXT,
  ADD COLUMN IF NOT EXISTS pre_claim_last_name TEXT,
  ADD COLUMN IF NOT EXISTS pre_claim_avatar_url TEXT,
  ADD COLUMN IF NOT EXISTS pre_claim_birthdate DATE,
  ADD COLUMN IF NOT EXISTS pre_claim_bio TEXT;

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
  IF TG_OP = 'UPDATE' AND OLD.claimed_by IS DISTINCT FROM NEW.claimed_by THEN
    -- Claim transition: snapshot current node identity for later restore.
    IF OLD.claimed_by IS NULL AND NEW.claimed_by IS NOT NULL THEN
      NEW.pre_claim_first_name := OLD.first_name;
      NEW.pre_claim_last_name := OLD.last_name;
      NEW.pre_claim_avatar_url := OLD.avatar_url;
      NEW.pre_claim_birthdate := OLD.birthdate;
      NEW.pre_claim_bio := OLD.bio;
    END IF;

    -- Unclaim transition: restore the pre-claim node identity.
    IF OLD.claimed_by IS NOT NULL AND NEW.claimed_by IS NULL THEN
      NEW.first_name := COALESCE(
        NEW.pre_claim_first_name,
        OLD.pre_claim_first_name,
        NEW.first_name,
        OLD.first_name,
        'Family Member'
      );
      NEW.last_name := COALESCE(
        NEW.pre_claim_last_name,
        OLD.pre_claim_last_name,
        NEW.last_name,
        OLD.last_name
      );
      NEW.avatar_url := COALESCE(
        NEW.pre_claim_avatar_url,
        OLD.pre_claim_avatar_url,
        NEW.avatar_url,
        OLD.avatar_url
      );
      NEW.birthdate := COALESCE(
        NEW.pre_claim_birthdate,
        OLD.pre_claim_birthdate,
        NEW.birthdate,
        OLD.birthdate
      );
      NEW.bio := COALESCE(
        NEW.pre_claim_bio,
        OLD.pre_claim_bio,
        NEW.bio,
        OLD.bio
      );

      NEW.pre_claim_first_name := NULL;
      NEW.pre_claim_last_name := NULL;
      NEW.pre_claim_avatar_url := NULL;
      NEW.pre_claim_birthdate := NULL;
      NEW.pre_claim_bio := NULL;

      RETURN NEW;
    END IF;
  END IF;

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

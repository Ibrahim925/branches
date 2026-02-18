-- Add image crop controls for memories and profile avatars.

ALTER TABLE public.memories
  ADD COLUMN IF NOT EXISTS media_zoom DOUBLE PRECISION NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS media_focus_x DOUBLE PRECISION NOT NULL DEFAULT 50,
  ADD COLUMN IF NOT EXISTS media_focus_y DOUBLE PRECISION NOT NULL DEFAULT 50;

ALTER TABLE public.memories
  DROP CONSTRAINT IF EXISTS memories_media_zoom_range_check;
ALTER TABLE public.memories
  ADD CONSTRAINT memories_media_zoom_range_check
  CHECK (media_zoom >= 1 AND media_zoom <= 3);

ALTER TABLE public.memories
  DROP CONSTRAINT IF EXISTS memories_media_focus_x_range_check;
ALTER TABLE public.memories
  ADD CONSTRAINT memories_media_focus_x_range_check
  CHECK (media_focus_x >= 0 AND media_focus_x <= 100);

ALTER TABLE public.memories
  DROP CONSTRAINT IF EXISTS memories_media_focus_y_range_check;
ALTER TABLE public.memories
  ADD CONSTRAINT memories_media_focus_y_range_check
  CHECK (media_focus_y >= 0 AND media_focus_y <= 100);

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS avatar_zoom DOUBLE PRECISION NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS avatar_focus_x DOUBLE PRECISION NOT NULL DEFAULT 50,
  ADD COLUMN IF NOT EXISTS avatar_focus_y DOUBLE PRECISION NOT NULL DEFAULT 50;

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_avatar_zoom_range_check;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_avatar_zoom_range_check
  CHECK (avatar_zoom >= 1 AND avatar_zoom <= 3);

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_avatar_focus_x_range_check;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_avatar_focus_x_range_check
  CHECK (avatar_focus_x >= 0 AND avatar_focus_x <= 100);

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_avatar_focus_y_range_check;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_avatar_focus_y_range_check
  CHECK (avatar_focus_y >= 0 AND avatar_focus_y <= 100);

DROP FUNCTION IF EXISTS public.create_memory_with_subjects(
  UUID,
  UUID,
  TEXT,
  TEXT,
  TEXT,
  TEXT,
  TEXT,
  DATE,
  TEXT[],
  UUID[],
  UUID[]
);

CREATE OR REPLACE FUNCTION public.create_memory_with_subjects(
  _graph_id UUID,
  _node_id UUID,
  _type TEXT,
  _title TEXT,
  _content TEXT,
  _media_url TEXT,
  _media_type TEXT,
  _event_date DATE,
  _tags TEXT[],
  _subject_user_ids UUID[],
  _subject_node_ids UUID[],
  _media_zoom DOUBLE PRECISION DEFAULT 1,
  _media_focus_x DOUBLE PRECISION DEFAULT 50,
  _media_focus_y DOUBLE PRECISION DEFAULT 50
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  current_user_id UUID := auth.uid();
  new_memory_id UUID;
  unique_subject_user_ids UUID[];
  unique_subject_node_ids UUID[];
  invalid_subject_user_count INTEGER := 0;
  invalid_subject_node_count INTEGER := 0;
  node_graph_id UUID;
  node_claimed_by UUID;
  normalized_media_zoom DOUBLE PRECISION := GREATEST(1, LEAST(3, COALESCE(_media_zoom, 1)));
  normalized_media_focus_x DOUBLE PRECISION := GREATEST(0, LEAST(100, COALESCE(_media_focus_x, 50)));
  normalized_media_focus_y DOUBLE PRECISION := GREATEST(0, LEAST(100, COALESCE(_media_focus_y, 50)));
BEGIN
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'You must be signed in to create a memory.';
  END IF;

  IF _title IS NULL OR btrim(_title) = '' THEN
    RAISE EXCEPTION 'Title is required.';
  END IF;

  IF NOT public.is_graph_member(_graph_id) THEN
    RAISE EXCEPTION 'You are not a member of this tree.';
  END IF;

  IF _node_id IS NOT NULL THEN
    SELECT n.graph_id, n.claimed_by
    INTO node_graph_id, node_claimed_by
    FROM public.nodes n
    WHERE n.id = _node_id
    LIMIT 1;

    IF node_graph_id IS NULL OR node_graph_id <> _graph_id THEN
      RAISE EXCEPTION 'Selected family member does not belong to this tree.';
    END IF;
  END IF;

  SELECT array_agg(DISTINCT subject_id)
  INTO unique_subject_user_ids
  FROM unnest(COALESCE(_subject_user_ids, '{}'::UUID[])) AS subject_id
  WHERE subject_id IS NOT NULL;

  SELECT array_agg(DISTINCT subject_id)
  INTO unique_subject_node_ids
  FROM unnest(COALESCE(_subject_node_ids, '{}'::UUID[])) AS subject_id
  WHERE subject_id IS NOT NULL;

  IF _node_id IS NOT NULL AND node_claimed_by IS NULL THEN
    IF unique_subject_node_ids IS NULL THEN
      unique_subject_node_ids := ARRAY[_node_id];
    ELSIF NOT (_node_id = ANY(unique_subject_node_ids)) THEN
      unique_subject_node_ids := array_append(unique_subject_node_ids, _node_id);
    END IF;
  END IF;

  IF (unique_subject_user_ids IS NULL OR array_length(unique_subject_user_ids, 1) IS NULL)
    AND (unique_subject_node_ids IS NULL OR array_length(unique_subject_node_ids, 1) IS NULL) THEN
    RAISE EXCEPTION 'At least one tagged subject is required.';
  END IF;

  IF unique_subject_user_ids IS NOT NULL
    AND array_length(unique_subject_user_ids, 1) IS NOT NULL THEN
    SELECT count(*)
    INTO invalid_subject_user_count
    FROM unnest(unique_subject_user_ids) AS subject_id
    WHERE NOT EXISTS (
      SELECT 1
      FROM public.user_graph_memberships ugm
      WHERE ugm.graph_id = _graph_id
        AND ugm.profile_id = subject_id
    );
  END IF;

  IF invalid_subject_user_count > 0 THEN
    RAISE EXCEPTION 'All tagged people must belong to the selected tree.';
  END IF;

  IF unique_subject_node_ids IS NOT NULL
    AND array_length(unique_subject_node_ids, 1) IS NOT NULL THEN
    SELECT count(*)
    INTO invalid_subject_node_count
    FROM unnest(unique_subject_node_ids) AS subject_id
    WHERE NOT EXISTS (
      SELECT 1
      FROM public.nodes n
      WHERE n.id = subject_id
        AND n.graph_id = _graph_id
    );
  END IF;

  IF invalid_subject_node_count > 0 THEN
    RAISE EXCEPTION 'All tagged nodes must belong to the selected tree.';
  END IF;

  INSERT INTO public.memories (
    graph_id,
    node_id,
    author_id,
    type,
    title,
    content,
    media_url,
    media_type,
    media_zoom,
    media_focus_x,
    media_focus_y,
    event_date,
    tags
  )
  VALUES (
    _graph_id,
    _node_id,
    current_user_id,
    _type,
    btrim(_title),
    _content,
    _media_url,
    _media_type,
    normalized_media_zoom,
    normalized_media_focus_x,
    normalized_media_focus_y,
    _event_date,
    COALESCE(_tags, '{}')
  )
  RETURNING id
  INTO new_memory_id;

  IF unique_subject_user_ids IS NOT NULL
    AND array_length(unique_subject_user_ids, 1) IS NOT NULL THEN
    INSERT INTO public.memory_subjects (
      memory_id,
      subject_user_id,
      tagged_by
    )
    SELECT
      new_memory_id,
      subject_id,
      current_user_id
    FROM unnest(unique_subject_user_ids) AS subject_id
    ON CONFLICT DO NOTHING;
  END IF;

  IF unique_subject_node_ids IS NOT NULL
    AND array_length(unique_subject_node_ids, 1) IS NOT NULL THEN
    INSERT INTO public.memory_subjects (
      memory_id,
      subject_node_id,
      tagged_by
    )
    SELECT
      new_memory_id,
      subject_id,
      current_user_id
    FROM unnest(unique_subject_node_ids) AS subject_id
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN new_memory_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_memory_with_subjects(
  UUID,
  UUID,
  TEXT,
  TEXT,
  TEXT,
  TEXT,
  TEXT,
  DATE,
  TEXT[],
  UUID[],
  UUID[],
  DOUBLE PRECISION,
  DOUBLE PRECISION,
  DOUBLE PRECISION
) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.create_memory_with_subjects(
  UUID,
  UUID,
  TEXT,
  TEXT,
  TEXT,
  TEXT,
  TEXT,
  DATE,
  TEXT[],
  UUID[],
  UUID[],
  DOUBLE PRECISION,
  DOUBLE PRECISION,
  DOUBLE PRECISION
) TO authenticated;

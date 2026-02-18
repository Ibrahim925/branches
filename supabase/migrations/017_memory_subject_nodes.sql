-- Allow memory tagging for unclaimed tree nodes.
-- Keeps claimed-account tagging via subject_user_id and adds node-level tags.

ALTER TABLE public.memory_subjects
  ALTER COLUMN subject_user_id DROP NOT NULL;

ALTER TABLE public.memory_subjects
  ADD COLUMN IF NOT EXISTS subject_node_id UUID REFERENCES public.nodes(id) ON DELETE CASCADE;

DROP INDEX IF EXISTS idx_memory_subjects_subject;
CREATE INDEX IF NOT EXISTS idx_memory_subjects_subject_user
  ON public.memory_subjects(subject_user_id);

CREATE INDEX IF NOT EXISTS idx_memory_subjects_subject_node
  ON public.memory_subjects(subject_node_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_memory_subjects_memory_subject_node_unique
  ON public.memory_subjects(memory_id, subject_node_id)
  WHERE subject_node_id IS NOT NULL;

ALTER TABLE public.memory_subjects
  DROP CONSTRAINT IF EXISTS memory_subjects_exactly_one_subject_check;

ALTER TABLE public.memory_subjects
  ADD CONSTRAINT memory_subjects_exactly_one_subject_check
  CHECK (
    (subject_user_id IS NOT NULL AND subject_node_id IS NULL)
    OR (subject_user_id IS NULL AND subject_node_id IS NOT NULL)
  );

DROP POLICY IF EXISTS "Memory authors can tag subjects" ON public.memory_subjects;
CREATE POLICY "Memory authors can tag subjects"
  ON public.memory_subjects
  FOR INSERT
  WITH CHECK (
    tagged_by = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.memories m
      WHERE m.id = memory_id
        AND m.author_id = auth.uid()
    )
    AND (
      (
        subject_user_id IS NOT NULL
        AND subject_node_id IS NULL
        AND EXISTS (
          SELECT 1
          FROM public.memories m
          INNER JOIN public.user_graph_memberships ugm
            ON ugm.graph_id = m.graph_id
          WHERE m.id = memory_id
            AND ugm.profile_id = subject_user_id
        )
      )
      OR (
        subject_user_id IS NULL
        AND subject_node_id IS NOT NULL
        AND EXISTS (
          SELECT 1
          FROM public.memories m
          INNER JOIN public.nodes n
            ON n.id = subject_node_id
          WHERE m.id = memory_id
            AND n.graph_id = m.graph_id
        )
      )
    )
  );

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
  _subject_node_ids UUID[]
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

  -- Memories tied to an unclaimed node should always tag that node.
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
  UUID[]
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
  UUID[]
) TO authenticated;

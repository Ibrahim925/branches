-- Add tagged memory subjects and safe creation flow.
-- Tree in product language maps to graph in schema.

CREATE TABLE IF NOT EXISTS public.memory_subjects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  memory_id UUID NOT NULL REFERENCES public.memories(id) ON DELETE CASCADE,
  subject_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  tagged_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(memory_id, subject_user_id)
);

CREATE INDEX IF NOT EXISTS idx_memory_subjects_memory
  ON public.memory_subjects(memory_id);

CREATE INDEX IF NOT EXISTS idx_memory_subjects_subject
  ON public.memory_subjects(subject_user_id);

-- Backfill existing memories so each one has at least one subject.
INSERT INTO public.memory_subjects (memory_id, subject_user_id, tagged_by)
SELECT m.id, m.author_id, m.author_id
FROM public.memories m
ON CONFLICT (memory_id, subject_user_id) DO NOTHING;

-- If a memory is tied to a claimed node, also tag that claimed user.
INSERT INTO public.memory_subjects (memory_id, subject_user_id, tagged_by)
SELECT m.id, n.claimed_by, m.author_id
FROM public.memories m
INNER JOIN public.nodes n ON n.id = m.node_id
WHERE n.claimed_by IS NOT NULL
  AND EXISTS (
    SELECT 1
    FROM public.user_graph_memberships ugm
    WHERE ugm.graph_id = m.graph_id
      AND ugm.profile_id = n.claimed_by
  )
ON CONFLICT (memory_id, subject_user_id) DO NOTHING;

ALTER TABLE public.memory_subjects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Graph members can view memory subjects" ON public.memory_subjects;
CREATE POLICY "Graph members can view memory subjects"
  ON public.memory_subjects
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.memories m
      WHERE m.id = memory_id
        AND public.is_graph_member(m.graph_id)
    )
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
    AND EXISTS (
      SELECT 1
      FROM public.memories m
      INNER JOIN public.user_graph_memberships ugm
        ON ugm.graph_id = m.graph_id
      WHERE m.id = memory_id
        AND ugm.profile_id = subject_user_id
    )
  );

DROP POLICY IF EXISTS "Memory authors can remove subject tags" ON public.memory_subjects;
CREATE POLICY "Memory authors can remove subject tags"
  ON public.memory_subjects
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM public.memories m
      WHERE m.id = memory_id
        AND m.author_id = auth.uid()
    )
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
  _subject_user_ids UUID[]
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  current_user_id UUID := auth.uid();
  new_memory_id UUID;
  unique_subject_ids UUID[];
  invalid_subject_count INTEGER;
  node_graph_id UUID;
BEGIN
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'You must be signed in to create a memory.';
  END IF;

  IF _title IS NULL OR btrim(_title) = '' THEN
    RAISE EXCEPTION 'Title is required.';
  END IF;

  IF _subject_user_ids IS NULL OR array_length(_subject_user_ids, 1) IS NULL THEN
    RAISE EXCEPTION 'At least one tagged subject is required.';
  END IF;

  IF NOT public.is_graph_member(_graph_id) THEN
    RAISE EXCEPTION 'You are not a member of this tree.';
  END IF;

  IF _node_id IS NOT NULL THEN
    SELECT n.graph_id
    INTO node_graph_id
    FROM public.nodes n
    WHERE n.id = _node_id
    LIMIT 1;

    IF node_graph_id IS NULL OR node_graph_id <> _graph_id THEN
      RAISE EXCEPTION 'Selected family member does not belong to this tree.';
    END IF;
  END IF;

  SELECT array_agg(DISTINCT subject_id)
  INTO unique_subject_ids
  FROM unnest(_subject_user_ids) AS subject_id
  WHERE subject_id IS NOT NULL;

  IF unique_subject_ids IS NULL OR array_length(unique_subject_ids, 1) IS NULL THEN
    RAISE EXCEPTION 'At least one tagged subject is required.';
  END IF;

  SELECT count(*)
  INTO invalid_subject_count
  FROM unnest(unique_subject_ids) AS subject_id
  WHERE NOT EXISTS (
    SELECT 1
    FROM public.user_graph_memberships ugm
    WHERE ugm.graph_id = _graph_id
      AND ugm.profile_id = subject_id
  );

  IF invalid_subject_count > 0 THEN
    RAISE EXCEPTION 'All tagged people must belong to the selected tree.';
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

  INSERT INTO public.memory_subjects (
    memory_id,
    subject_user_id,
    tagged_by
  )
  SELECT
    new_memory_id,
    subject_id,
    current_user_id
  FROM unnest(unique_subject_ids) AS subject_id;

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
  UUID[]
) TO authenticated;

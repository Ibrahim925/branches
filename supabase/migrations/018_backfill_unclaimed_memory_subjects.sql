-- Backfill node-based memory subjects for existing memories on unclaimed nodes.

INSERT INTO public.memory_subjects (memory_id, subject_node_id, tagged_by)
SELECT m.id, m.node_id, m.author_id
FROM public.memories m
INNER JOIN public.nodes n ON n.id = m.node_id
WHERE m.node_id IS NOT NULL
  AND n.claimed_by IS NULL
ON CONFLICT DO NOTHING;

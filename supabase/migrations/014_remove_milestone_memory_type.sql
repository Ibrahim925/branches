-- Remove milestone as a supported memory type.

UPDATE public.memories
SET type = 'story'
WHERE type = 'milestone';

ALTER TABLE public.memories
DROP CONSTRAINT IF EXISTS memories_type_check;

ALTER TABLE public.memories
ADD CONSTRAINT memories_type_check
CHECK (type IN ('story', 'photo', 'document'));

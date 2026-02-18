-- Add typing state and image message support for chats.

ALTER TABLE public.messages
  ALTER COLUMN content DROP NOT NULL;

ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS image_url TEXT,
  ADD COLUMN IF NOT EXISTS image_type TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'messages_content_or_image_check'
      AND conrelid = 'public.messages'::regclass
  ) THEN
    ALTER TABLE public.messages
      ADD CONSTRAINT messages_content_or_image_check
      CHECK (content IS NOT NULL OR image_url IS NOT NULL);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.conversation_typing (
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (conversation_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_conversation_typing_active
  ON public.conversation_typing(conversation_id, updated_at DESC);

ALTER TABLE public.conversation_typing ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Participants can view typing state" ON public.conversation_typing;
CREATE POLICY "Participants can view typing state"
  ON public.conversation_typing FOR SELECT
  TO authenticated
  USING (public.is_conversation_participant(conversation_id, auth.uid()));

DROP POLICY IF EXISTS "Participants can set own typing state" ON public.conversation_typing;
CREATE POLICY "Participants can set own typing state"
  ON public.conversation_typing FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND public.is_conversation_participant(conversation_id, auth.uid())
  );

DROP POLICY IF EXISTS "Participants can update own typing state" ON public.conversation_typing;
CREATE POLICY "Participants can update own typing state"
  ON public.conversation_typing FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Participants can clear own typing state" ON public.conversation_typing;
CREATE POLICY "Participants can clear own typing state"
  ON public.conversation_typing FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.can_access_graph_storage_object(_object_name TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  parsed_graph_id UUID;
BEGIN
  BEGIN
    parsed_graph_id := split_part(_object_name, '/', 1)::UUID;
  EXCEPTION WHEN others THEN
    RETURN FALSE;
  END;

  RETURN public.is_graph_member(parsed_graph_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public;

REVOKE ALL ON FUNCTION public.can_access_graph_storage_object(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_access_graph_storage_object(TEXT) TO authenticated;

INSERT INTO storage.buckets (id, name, public)
VALUES ('chat-media', 'chat-media', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Graph members can upload chat media" ON storage.objects;
CREATE POLICY "Graph members can upload chat media"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'chat-media'
    AND public.can_access_graph_storage_object(name)
  );

DROP POLICY IF EXISTS "Graph members can read chat media" ON storage.objects;
CREATE POLICY "Graph members can read chat media"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'chat-media'
    AND public.can_access_graph_storage_object(name)
  );

DROP POLICY IF EXISTS "Graph members can delete chat media" ON storage.objects;
CREATE POLICY "Graph members can delete chat media"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'chat-media'
    AND public.can_access_graph_storage_object(name)
  );

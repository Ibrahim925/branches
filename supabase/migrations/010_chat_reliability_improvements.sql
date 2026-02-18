-- Keep chat ordering fresh and ensure tree chats stay in sync with graph members.

CREATE OR REPLACE FUNCTION public.touch_conversation_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.conversations
  SET updated_at = NOW()
  WHERE id = NEW.conversation_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS tr_messages_touch_conversation ON public.messages;

CREATE TRIGGER tr_messages_touch_conversation
  AFTER INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.touch_conversation_updated_at();

CREATE OR REPLACE FUNCTION public.add_member_to_tree_chats()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.conversation_participants (conversation_id, user_id)
  SELECT c.id, NEW.profile_id
  FROM public.conversations c
  WHERE c.graph_id = NEW.graph_id
    AND c.type = 'tree'
  ON CONFLICT (conversation_id, user_id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS tr_membership_add_tree_chat_participant ON public.user_graph_memberships;

CREATE TRIGGER tr_membership_add_tree_chat_participant
  AFTER INSERT ON public.user_graph_memberships
  FOR EACH ROW EXECUTE FUNCTION public.add_member_to_tree_chats();

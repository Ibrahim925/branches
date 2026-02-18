-- Add tree/node invite link support with public previews and secure acceptance.

ALTER TABLE public.invites
ADD COLUMN IF NOT EXISTS node_id UUID REFERENCES public.nodes(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_invites_node_id ON public.invites(node_id);

CREATE OR REPLACE FUNCTION public.validate_invite_node_target()
RETURNS TRIGGER AS $$
DECLARE
  target_graph_id UUID;
  target_claimed_by UUID;
BEGIN
  IF NEW.node_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT graph_id, claimed_by
  INTO target_graph_id, target_claimed_by
  FROM public.nodes
  WHERE id = NEW.node_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invite target node does not exist.';
  END IF;

  IF target_graph_id <> NEW.graph_id THEN
    RAISE EXCEPTION 'Invite target node must belong to the same family tree.';
  END IF;

  IF target_claimed_by IS NOT NULL THEN
    RAISE EXCEPTION 'Only unclaimed family members can receive claim invites.';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_invites_validate_node_target ON public.invites;

CREATE TRIGGER tr_invites_validate_node_target
  BEFORE INSERT OR UPDATE OF graph_id, node_id ON public.invites
  FOR EACH ROW EXECUTE FUNCTION public.validate_invite_node_target();

DROP POLICY IF EXISTS "Anyone can view invite by token" ON public.invites;

CREATE POLICY "Graph members can view invites"
  ON public.invites FOR SELECT
  TO authenticated
  USING (public.is_graph_member(graph_id));

CREATE OR REPLACE FUNCTION public.get_invite_preview(_token TEXT)
RETURNS TABLE (
  invite_id UUID,
  graph_id UUID,
  graph_name TEXT,
  role TEXT,
  status TEXT,
  expires_at TIMESTAMPTZ,
  is_expired BOOLEAN,
  invite_claimed_by UUID,
  node_id UUID,
  node_first_name TEXT,
  node_last_name TEXT,
  node_claimed_by UUID
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    i.id,
    i.graph_id,
    g.name,
    i.role,
    i.status,
    i.expires_at,
    i.expires_at <= NOW(),
    i.claimed_by,
    i.node_id,
    n.first_name,
    n.last_name,
    n.claimed_by
  FROM public.invites i
  INNER JOIN public.graphs g ON g.id = i.graph_id
  LEFT JOIN public.nodes n ON n.id = i.node_id
  WHERE i.token = _token
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION public.get_invite_preview(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_invite_preview(TEXT) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.accept_invite(_token TEXT)
RETURNS TABLE (
  graph_id UUID,
  node_id UUID
) AS $$
DECLARE
  current_user_id UUID := auth.uid();
  invite_row public.invites%ROWTYPE;
  node_row public.nodes%ROWTYPE;
BEGIN
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'You must be signed in to accept this invite.';
  END IF;

  SELECT *
  INTO invite_row
  FROM public.invites
  WHERE token = _token
  LIMIT 1
  FOR UPDATE;

  IF invite_row.id IS NULL THEN
    RAISE EXCEPTION 'Invite not found.';
  END IF;

  IF invite_row.status = 'accepted' AND invite_row.claimed_by = current_user_id THEN
    RETURN QUERY SELECT invite_row.graph_id, invite_row.node_id;
    RETURN;
  END IF;

  IF invite_row.status <> 'pending' THEN
    RAISE EXCEPTION 'This invite is no longer available.';
  END IF;

  IF invite_row.expires_at <= NOW() THEN
    UPDATE public.invites
    SET status = 'expired'
    WHERE id = invite_row.id;

    RAISE EXCEPTION 'This invite has expired.';
  END IF;

  INSERT INTO public.user_graph_memberships (profile_id, graph_id, role)
  VALUES (current_user_id, invite_row.graph_id, invite_row.role)
  ON CONFLICT (profile_id, graph_id) DO NOTHING;

  IF invite_row.node_id IS NOT NULL THEN
    SELECT *
    INTO node_row
    FROM public.nodes
    WHERE id = invite_row.node_id
    FOR UPDATE;

    IF node_row.id IS NULL OR node_row.graph_id <> invite_row.graph_id THEN
      RAISE EXCEPTION 'This invite points to a missing family member.';
    END IF;

    IF node_row.claimed_by IS NOT NULL AND node_row.claimed_by <> current_user_id THEN
      RAISE EXCEPTION 'This family member has already been claimed.';
    END IF;

    IF node_row.claimed_by IS NULL THEN
      UPDATE public.nodes
      SET claimed_by = current_user_id, updated_at = NOW()
      WHERE id = node_row.id;
    END IF;
  END IF;

  UPDATE public.invites
  SET status = 'accepted',
      claimed_by = current_user_id
  WHERE id = invite_row.id;

  RETURN QUERY SELECT invite_row.graph_id, invite_row.node_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION public.accept_invite(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.accept_invite(TEXT) TO authenticated;

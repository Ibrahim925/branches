-- Fix PL/pgSQL variable/column ambiguity inside accept_invite().

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
  ON CONFLICT ON CONSTRAINT user_graph_memberships_profile_id_graph_id_key DO NOTHING;

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

-- Attach node memories to claimed users, support explicit unclaim,
-- and auto-unclaim when membership is removed from a tree.

CREATE OR REPLACE FUNCTION public.sync_claimed_node_memory_subjects(
  _graph_id UUID,
  _node_id UUID,
  _user_id UUID,
  _attach BOOLEAN
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF _attach THEN
    INSERT INTO public.memory_subjects (
      memory_id,
      subject_user_id,
      tagged_by
    )
    SELECT
      ms.memory_id,
      _user_id,
      _user_id
    FROM public.memory_subjects ms
    INNER JOIN public.memories m ON m.id = ms.memory_id
    WHERE ms.subject_node_id = _node_id
      AND m.graph_id = _graph_id
      AND NOT EXISTS (
        SELECT 1
        FROM public.memory_subjects existing
        WHERE existing.memory_id = ms.memory_id
          AND existing.subject_user_id = _user_id
      );
  ELSE
    DELETE FROM public.memory_subjects mus
    WHERE mus.subject_user_id = _user_id
      AND EXISTS (
        SELECT 1
        FROM public.memories m
        INNER JOIN public.memory_subjects msn
          ON msn.memory_id = m.id
        WHERE m.id = mus.memory_id
          AND m.graph_id = _graph_id
          AND msn.subject_node_id = _node_id
      );
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.sync_claimed_node_memory_subjects(UUID, UUID, UUID, BOOLEAN) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.sync_claimed_node_memory_subjects(UUID, UUID, UUID, BOOLEAN) TO authenticated;

CREATE OR REPLACE FUNCTION public.handle_node_claimed_by_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP <> 'UPDATE' OR OLD.claimed_by IS NOT DISTINCT FROM NEW.claimed_by THEN
    RETURN NEW;
  END IF;

  IF OLD.claimed_by IS NOT NULL THEN
    PERFORM public.sync_claimed_node_memory_subjects(
      NEW.graph_id,
      NEW.id,
      OLD.claimed_by,
      FALSE
    );
  END IF;

  IF NEW.claimed_by IS NOT NULL THEN
    PERFORM public.sync_claimed_node_memory_subjects(
      NEW.graph_id,
      NEW.id,
      NEW.claimed_by,
      TRUE
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_nodes_claimed_by_memory_subject_sync ON public.nodes;
CREATE TRIGGER trg_nodes_claimed_by_memory_subject_sync
  AFTER UPDATE OF claimed_by ON public.nodes
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_node_claimed_by_change();

CREATE OR REPLACE FUNCTION public.unclaim_tree_node(
  _graph_id UUID,
  _node_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id UUID := auth.uid();
  target_node public.nodes%ROWTYPE;
BEGIN
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'You must be signed in to unclaim a profile.';
  END IF;

  SELECT *
  INTO target_node
  FROM public.nodes
  WHERE id = _node_id
    AND graph_id = _graph_id
  FOR UPDATE;

  IF target_node.id IS NULL THEN
    RAISE EXCEPTION 'This family member could not be found in this tree.';
  END IF;

  IF target_node.claimed_by IS NULL THEN
    RETURN target_node.id;
  END IF;

  IF target_node.claimed_by <> current_user_id THEN
    RAISE EXCEPTION 'You can only unclaim your own profile.';
  END IF;

  UPDATE public.nodes
  SET claimed_by = NULL,
      updated_at = NOW()
  WHERE id = target_node.id;

  RETURN target_node.id;
END;
$$;

REVOKE ALL ON FUNCTION public.unclaim_tree_node(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.unclaim_tree_node(UUID, UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.unclaim_nodes_when_membership_removed()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.nodes
  SET claimed_by = NULL,
      updated_at = NOW()
  WHERE graph_id = OLD.graph_id
    AND claimed_by = OLD.profile_id;

  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_unclaim_nodes_on_membership_delete ON public.user_graph_memberships;
CREATE TRIGGER trg_unclaim_nodes_on_membership_delete
  AFTER DELETE ON public.user_graph_memberships
  FOR EACH ROW
  EXECUTE FUNCTION public.unclaim_nodes_when_membership_removed();

CREATE OR REPLACE FUNCTION public.accept_invite(_token TEXT)
RETURNS TABLE (
  graph_id UUID,
  node_id UUID
) AS $$
DECLARE
  current_user_id UUID := auth.uid();
  invite_row public.invites%ROWTYPE;
  node_row public.nodes%ROWTYPE;
  existing_claimed_node_id UUID;
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
    SELECT id
    INTO existing_claimed_node_id
    FROM public.nodes
    WHERE graph_id = invite_row.graph_id
      AND claimed_by = current_user_id
    LIMIT 1;

    IF existing_claimed_node_id IS NOT NULL AND existing_claimed_node_id <> invite_row.node_id THEN
      RAISE EXCEPTION 'You already have a claimed profile in this tree.';
    END IF;

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

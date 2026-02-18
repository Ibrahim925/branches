-- Allow any tree member without an existing claimed node in that tree
-- to claim an unclaimed node directly from tree view.

CREATE OR REPLACE FUNCTION public.claim_tree_node(
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
  existing_claimed_node_id UUID;
  target_node public.nodes%ROWTYPE;
BEGIN
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'You must be signed in to claim a profile.';
  END IF;

  IF NOT public.is_graph_member(_graph_id) THEN
    RAISE EXCEPTION 'You must be a member of this tree to claim a profile.';
  END IF;

  SELECT id
  INTO existing_claimed_node_id
  FROM public.nodes
  WHERE graph_id = _graph_id
    AND claimed_by = current_user_id
  LIMIT 1;

  IF existing_claimed_node_id IS NOT NULL THEN
    IF existing_claimed_node_id = _node_id THEN
      RETURN _node_id;
    END IF;
    RAISE EXCEPTION 'You already have a claimed profile in this tree.';
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

  IF target_node.claimed_by IS NOT NULL AND target_node.claimed_by <> current_user_id THEN
    RAISE EXCEPTION 'This family member has already been claimed.';
  END IF;

  IF target_node.claimed_by IS NULL THEN
    UPDATE public.nodes
    SET claimed_by = current_user_id,
        updated_at = NOW()
    WHERE id = target_node.id;
  END IF;

  RETURN target_node.id;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_tree_node(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_tree_node(UUID, UUID) TO authenticated;

-- Prevent multiple pending claim invites for the same unclaimed member.

WITH duplicate_pending_claims AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY graph_id, node_id
      ORDER BY created_at DESC, id DESC
    ) AS row_num
  FROM public.invites
  WHERE node_id IS NOT NULL
    AND status = 'pending'
)
UPDATE public.invites
SET status = 'expired'
WHERE id IN (
  SELECT id
  FROM duplicate_pending_claims
  WHERE row_num > 1
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_invites_unique_pending_claim_per_node
ON public.invites (graph_id, node_id)
WHERE node_id IS NOT NULL
  AND status = 'pending';

-- Migration to prevent circular edges (A -> B and B -> A)

-- 1. Prevent self-loops
ALTER TABLE public.edges
ADD CONSTRAINT check_no_self_loop
CHECK (source_id != target_id);

-- 2. Function to check for inverse edges
CREATE OR REPLACE FUNCTION public.check_for_inverse_edge()
RETURNS TRIGGER AS $$
BEGIN
    -- Check if target -> source already exists in the same graph
    IF EXISTS (
        SELECT 1
        FROM public.edges
        WHERE source_id = NEW.target_id
          AND target_id = NEW.source_id
          AND graph_id = NEW.graph_id
    ) THEN
        RAISE EXCEPTION 'Circular connection detected: an edge already exists in the opposite direction.';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Trigger for INSERT and UPDATE
CREATE TRIGGER tr_prevent_circular_edges
  BEFORE INSERT OR UPDATE ON public.edges
  FOR EACH ROW EXECUTE FUNCTION public.check_for_inverse_edge();

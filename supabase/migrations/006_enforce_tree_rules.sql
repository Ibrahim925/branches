-- Migration to enforce family tree rules: max 2 parents, max 1 spouse

-- 1. Function and trigger for max 2 parents
CREATE OR REPLACE FUNCTION public.check_max_parents()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.type = 'parent_child' THEN
        -- Target can have at most 2 parents
        IF (
            SELECT COUNT(*)
            FROM public.edges
            WHERE target_id = NEW.target_id
              AND type = 'parent_child'
              AND graph_id = NEW.graph_id
              AND id != NEW.id -- Exclude self if updating
        ) >= 2 THEN
            RAISE EXCEPTION 'A person cannot have more than 2 parents.';
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER tr_enforce_max_parents
  BEFORE INSERT OR UPDATE ON public.edges
  FOR EACH ROW EXECUTE FUNCTION public.check_max_parents();

-- 2. Function and trigger for max 1 spouse
CREATE OR REPLACE FUNCTION public.check_max_spouse()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.type = 'partnership' THEN
        -- Check if source or target already has a partnership edge
        IF EXISTS (
            SELECT 1
            FROM public.edges
            WHERE (source_id = NEW.source_id OR target_id = NEW.source_id)
              AND type = 'partnership'
              AND graph_id = NEW.graph_id
              AND id != NEW.id
        ) THEN
            RAISE EXCEPTION 'A person can only have one spouse/partner.';
        END IF;

        IF EXISTS (
            SELECT 1
            FROM public.edges
            WHERE (source_id = NEW.target_id OR target_id = NEW.target_id)
              AND type = 'partnership'
              AND graph_id = NEW.graph_id
              AND id != NEW.id
        ) THEN
            RAISE EXCEPTION 'A person can only have one spouse/partner.';
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER tr_enforce_max_spouse
  BEFORE INSERT OR UPDATE ON public.edges
  FOR EACH ROW EXECUTE FUNCTION public.check_max_spouse();

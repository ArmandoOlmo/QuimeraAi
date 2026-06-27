ALTER TABLE IF EXISTS public.assistant_actions
  DROP CONSTRAINT IF EXISTS assistant_actions_status_check;

ALTER TABLE IF EXISTS public.assistant_actions
  ADD CONSTRAINT assistant_actions_status_check
  CHECK (status IN ('planned', 'previewed', 'applied', 'failed', 'cancelled', 'rolled_back'));

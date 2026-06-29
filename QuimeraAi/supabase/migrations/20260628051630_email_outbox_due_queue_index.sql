-- Keep the global email outbox cron on an index-backed path when no project
-- filter is supplied.
CREATE INDEX IF NOT EXISTS email_outbox_due_queue_idx
  ON public.email_outbox (status, scheduled_at, created_at)
  WHERE status = 'queued';

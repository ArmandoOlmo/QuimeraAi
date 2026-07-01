-- Allow Agency client payment links to reflect failed or past-due Stripe
-- subscription states instead of collapsing every non-cancelled webhook into
-- "completed".

alter table public.agency_client_payment_links
  drop constraint if exists agency_client_payment_links_status_check;

alter table public.agency_client_payment_links
  add constraint agency_client_payment_links_status_check check (
    status in ('pending', 'completed', 'past_due', 'failed', 'cancelled', 'expired')
  );

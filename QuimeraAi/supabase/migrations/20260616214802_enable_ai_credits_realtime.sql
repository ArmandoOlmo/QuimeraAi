do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'subscriptions'
    ) then
      alter publication supabase_realtime add table public.subscriptions;
    end if;

    if not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'ai_credits_transactions'
    ) then
      alter publication supabase_realtime add table public.ai_credits_transactions;
    end if;
  end if;
end $$;

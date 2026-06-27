do $$
declare
  manage_policy record;
begin
  for manage_policy in
    select *
    from (values
      ('custom_components', 'Tenant members can manage their components'),
      ('deployment_logs', 'Deployment logs isolated by tenant'),
      ('files', 'Tenant members can manage their files'),
      ('lead_activities', 'Tenant members can manage lead activities'),
      ('lead_tasks', 'Tenant members can manage lead tasks'),
      ('leads', 'Tenant members can manage leads'),
      ('library_leads', 'Tenant members can manage library leads'),
      ('posts', 'Tenant members can manage their posts')
    ) as policies(table_name, policy_name)
  loop
    if to_regclass(format('public.%I', manage_policy.table_name)) is not null then
      execute format('drop policy if exists %I on public.%I', manage_policy.policy_name, manage_policy.table_name);
      execute format(
        'create policy %I on public.%I for all to authenticated using (tenant_id in (select public.get_auth_user_tenants()))',
        manage_policy.policy_name,
        manage_policy.table_name
      );
    end if;
  end loop;

  if to_regclass('public.custom_components') is not null then
    drop policy if exists "Tenant members can view their components" on public.custom_components;
    create policy "Tenant members can view their components"
      on public.custom_components
      for select
      to authenticated
      using (tenant_id in (select public.get_auth_user_tenants()));
  end if;

  if to_regclass('public.posts') is not null then
    drop policy if exists "Tenant members can view all their posts" on public.posts;
    create policy "Tenant members can view all their posts"
      on public.posts
      for select
      to authenticated
      using (tenant_id in (select public.get_auth_user_tenants()));
  end if;

  if to_regclass('public.tenant_members') is not null then
    drop policy if exists "Tenant members readable by members" on public.tenant_members;
    create policy "Tenant members readable by members"
      on public.tenant_members
      for select
      to authenticated
      using (
        user_id = auth.uid()
        or tenant_id in (select public.get_auth_user_tenants())
      );
  end if;
end $$;

revoke execute on function public.get_auth_user_tenants() from anon;
grant execute on function public.get_auth_user_tenants() to authenticated, service_role;

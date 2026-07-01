-- Normalize platform-owner role aliases for RLS policies.
-- Owner and Super Admin keep platform-wide privileges whether the role is stored
-- as `superadmin`, `super_admin`, `super-admin`, or `super admin`.

create or replace function public.quimera_is_platform_owner()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.users u
    where u.id = auth.uid()
      and translate(lower(coalesce(u.role, 'user')), ' _-', '') in ('owner', 'superadmin')
  );
$$;

revoke all on function public.quimera_is_platform_owner() from public;
revoke execute on function public.quimera_is_platform_owner() from anon;
grant execute on function public.quimera_is_platform_owner() to authenticated, service_role;

-- Restrict Agency Engine SECURITY DEFINER helpers to authenticated server paths.
-- Public/anon routes do not use these helpers; Agency RLS policies that call them
-- are scoped to authenticated roles.

revoke all on function public.quimera_is_platform_owner() from public;
revoke all on function public.quimera_can_manage_agency(uuid) from public;
revoke all on function public.quimera_can_manage_agency(text) from public;
revoke all on function public.quimera_can_view_agency_relationship(uuid, uuid) from public;
revoke all on function public.quimera_can_view_agency_relationship(text, text) from public;

revoke execute on function public.quimera_is_platform_owner() from anon;
revoke execute on function public.quimera_can_manage_agency(uuid) from anon;
revoke execute on function public.quimera_can_manage_agency(text) from anon;
revoke execute on function public.quimera_can_view_agency_relationship(uuid, uuid) from anon;
revoke execute on function public.quimera_can_view_agency_relationship(text, text) from anon;

grant execute on function public.quimera_is_platform_owner() to authenticated, service_role;
grant execute on function public.quimera_can_manage_agency(uuid) to authenticated, service_role;
grant execute on function public.quimera_can_manage_agency(text) to authenticated, service_role;
grant execute on function public.quimera_can_view_agency_relationship(uuid, uuid) to authenticated, service_role;
grant execute on function public.quimera_can_view_agency_relationship(text, text) to authenticated, service_role;

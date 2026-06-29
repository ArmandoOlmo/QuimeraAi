alter table public.projects
  add column if not exists deleted_at timestamptz,
  add column if not exists deleted_by text,
  add column if not exists is_deleted boolean not null default false;

update public.projects
set
  deleted_at = case
    when data->>'deletedAt' ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}T'
      then (data->>'deletedAt')::timestamptz
    else deleted_at
  end,
  deleted_by = coalesce(nullif(data->>'deletedBy', ''), deleted_by),
  is_deleted = case
    when data ? 'isDeleted' then coalesce(nullif(data->>'isDeleted', '')::boolean, true)
    when data ? 'deletedAt' then true
    else coalesce(is_deleted, false)
  end
where data ? 'deletedAt'
   or data ? 'deletedBy'
   or data ? 'isDeleted';

create index if not exists projects_user_personal_active_last_updated_idx
  on public.projects (user_id, last_updated desc)
  where tenant_id is null and is_deleted = false;

create index if not exists projects_user_personal_deleted_at_idx
  on public.projects (user_id, deleted_at desc)
  where tenant_id is null and is_deleted = true;

create index if not exists projects_tenant_active_last_updated_idx
  on public.projects (tenant_id, last_updated desc)
  where tenant_id is not null and is_deleted = false;

create index if not exists projects_tenant_deleted_at_idx
  on public.projects (tenant_id, deleted_at desc)
  where tenant_id is not null and is_deleted = true;

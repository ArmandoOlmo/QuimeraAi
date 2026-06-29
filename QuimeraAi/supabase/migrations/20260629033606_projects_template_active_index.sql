create index if not exists projects_template_active_last_updated_idx
  on public.projects (status, last_updated desc)
  where status = 'Template' and is_deleted = false;

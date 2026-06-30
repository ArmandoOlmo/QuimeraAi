-- Persist per-post author/date visibility controls for the /cms editor.
alter table public.posts
  add column if not exists show_author boolean not null default true,
  add column if not exists show_date boolean not null default true;

-- Make CMS post saves idempotent at the database level per tenant/project/slug.
-- Project scope is currently stored as a `project:<uuid>` tag on public.posts.

create or replace function public.quimera_post_project_tag(p_tags text[])
returns text
language sql
immutable
parallel safe
set search_path = public, pg_temp
as $$
  select tag
  from unnest(coalesce(p_tags, '{}'::text[])) as tag
  where tag like 'project:%'
  order by tag
  limit 1
$$;

with tagged_posts as (
  select
    p.id,
    p.tenant_id,
    public.quimera_post_project_tag(p.tags) as project_tag,
    lower(btrim(p.slug)) as normalized_slug,
    p.show_author,
    p.show_date,
    length(coalesce(p.content, '')) as content_length,
    p.updated_at,
    p.created_at
  from public.posts p
  where p.slug is not null
    and btrim(p.slug) <> ''
    and public.quimera_post_project_tag(p.tags) is not null
),
ranked_posts as (
  select
    tagged_posts.*,
    row_number() over (
      partition by tenant_id, project_tag, normalized_slug
      order by content_length desc, updated_at desc nulls last, created_at desc nulls last, id desc
    ) as duplicate_rank,
    bool_and(show_author) over (
      partition by tenant_id, project_tag, normalized_slug
    ) as merged_show_author,
    bool_and(show_date) over (
      partition by tenant_id, project_tag, normalized_slug
    ) as merged_show_date,
    max(updated_at) over (
      partition by tenant_id, project_tag, normalized_slug
    ) as merged_updated_at
  from tagged_posts
),
survivors as (
  select *
  from ranked_posts
  where duplicate_rank = 1
),
updated_survivors as (
  update public.posts p
  set
    show_author = survivors.merged_show_author,
    show_date = survivors.merged_show_date,
    updated_at = coalesce(survivors.merged_updated_at, p.updated_at)
  from survivors
  where p.id = survivors.id
    and (
      p.show_author is distinct from survivors.merged_show_author
      or p.show_date is distinct from survivors.merged_show_date
      or p.updated_at is distinct from coalesce(survivors.merged_updated_at, p.updated_at)
    )
  returning p.id
)
delete from public.posts p
using ranked_posts
where p.id = ranked_posts.id
  and ranked_posts.duplicate_rank > 1;

create unique index if not exists posts_tenant_project_slug_unique_idx
on public.posts (
  tenant_id,
  public.quimera_post_project_tag(tags),
  lower(btrim(slug))
)
where slug is not null
  and btrim(slug) <> ''
  and public.quimera_post_project_tag(tags) is not null;

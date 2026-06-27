-- Production readiness hardening for Supabase security advisor findings.
--
-- These statements only pin function search paths. They do not change table
-- shape, data, RLS policies, grants, triggers, or function bodies.

alter function public.set_realty_updated_at()
  set search_path = public, pg_temp;

alter function private.normalize_realty_crm_status(text)
  set search_path = private, public, pg_temp;

alter function public.set_social_chat_updated_at()
  set search_path = public, pg_temp;

alter function public.is_project_chat_member(uuid)
  set search_path = public, pg_temp;

alter function private.default_realty_lead_tags(jsonb, text, text, text)
  set search_path = private, public, pg_temp;

alter function public.is_project_chatbot_engine_member(uuid)
  set search_path = public, pg_temp;

alter function public.quimera_normalize_plan_id(text)
  set search_path = public, pg_temp;

alter function public.quimera_canonical_plan_limits(text)
  set search_path = public, pg_temp;

alter function public.quimera_sanitize_plan_limits(jsonb, text)
  set search_path = public, pg_temp;

alter function public.quimera_plan_limits_are_finite(jsonb)
  set search_path = public, pg_temp;

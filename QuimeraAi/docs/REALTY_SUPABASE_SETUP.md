# Quimera Realty Suite Supabase Setup

## Environment

Frontend must use the existing Supabase client in `supabase.ts`.

Required variables:

```env
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

Do not expose a service role key in the frontend.

## Migration

Apply:

```bash
supabase db push
```

Migrations:

```text
supabase/migrations/20260616000000_realty_suite_foundation.sql
supabase/migrations/20260616001000_realty_suite_storage_rls_hardening.sql
```

The foundation migration aligns the existing `public.properties` table without dropping legacy columns and adds the Realty tables. The hardening migration makes `user_id`, `project_id`, and `tenant_id` text for Realty data, matching the app's Firebase-style compatibility layer over Supabase Auth, moves the RLS helper to the private schema, recreates RLS/storage policies, adds required indexes, and creates the storage buckets.

If the Supabase CLI is not available, apply both SQL files in order from the Supabase SQL editor or the deployment pipeline used for database migrations.

## Storage

Buckets are created by the migration:

```text
property-media
property-documents
```

Both buckets are private. Public media reads are allowed only when the file is linked in `property_media` to a property where:

```text
status = active
public_enabled = true
```

Recommended storage path convention:

```text
<user_id>/<property_id>/<filename>
```

The Realty hook uploads property media to `property-media` using that path shape, stores the returned `storage_path` in `property_media`, and removes obsolete storage objects when property images are replaced or a property is deleted. The `property-documents` bucket remains private and owner-only.

## RLS Behavior

- Authenticated owners, project owners, tenant owners/members, and app admins can manage Realty records through `private.can_manage_realty_record`.
- Public visitors can read only `properties` where `status = 'active'` and `public_enabled = true`.
- Public visitors can read `property_media` only when the media row is attached to a public property.
- Public visitors can insert `property_leads` only for a public property and only when the lead row references that property's owner.
- `property_documents` and `property_ai_generations` have no public access.

## Runtime Tables

Dashboard properties use:

```text
properties
property_media
property_leads
property_ai_generations
```

Public listings read only active public properties and their linked media.

Public lead forms insert into `property_leads` and attempt a best-effort sync into the app CRM `leads` table when CRM public insert policies allow it.

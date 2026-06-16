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

Migration:

```text
supabase/migrations/20260616000000_realty_suite_foundation.sql
```

The migration aligns the existing `public.properties` table without dropping legacy columns, adds the Realty tables, enables RLS, grants Data API access for `anon` and `authenticated`, and creates storage policies.

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

`property-documents` remains owner-only by default.

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

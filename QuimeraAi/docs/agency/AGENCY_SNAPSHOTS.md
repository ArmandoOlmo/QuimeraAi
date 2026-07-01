# Agency Snapshots

Agency snapshots are reusable templates for project, workflow, content, or full client-stack setup.

## Tables

- `agency_snapshots`: snapshot metadata, industry, version, visibility, source project, tags, and status.
- `agency_snapshot_versions`: immutable `payload`, included modules, readiness, legacy-compatible `data`, and checksums.
- `agency_snapshot_applications`: audit trail for applying a snapshot to a client tenant or project, including first-class `preview`, `applied_changes`, `error`, and `completed_at` fields.

## Rules

- Snapshot data is agency-owned and RLS-protected by `quimera_can_manage_agency`.
- Client tenants do not read raw snapshot payloads.
- Applying a snapshot should create an `agency_snapshot_applications` row with an `idempotency_key`.
- Snapshot Center must run a `preview before apply` flow. The preview is stored in the application `preview` column and mirrored in metadata for compatibility. It shows changed fields, readiness blockers, included modules, and draft-safety policy before mutating the target project.
- Snapshot application must preserve draft/no-auto-publish behavior until a client approval or explicit agency action publishes runtime content.
- Runtime safety is explicit: applied projects are stamped with `noAutoPublish`, `noRuntimeActivated`, `requiresClientApproval`, `status = Draft`, and cleared published runtime fields.

## Canonical Service And API Boundary

`services/agency/agencySnapshotService.ts` is the canonical service adapter for Agency snapshots.

It owns:

- Creating `agency_snapshots` and immutable `agency_snapshot_versions` from existing projects.
- Building a sanitized snapshot payload without publish/runtime/payment state.
- Previewing target project changes before apply.
- Applying a snapshot to a client or agency project in draft mode.
- Writing `agency_snapshot_applications` with `idempotency_key`, `preview`, `applied_changes`, and compatibility metadata.
- Writing `agency_activity.type = snapshot_applied`.

Browser mutation flows must go through Vercel Node routes:

- `POST /api/agency/snapshots/create`
- `POST /api/agency/snapshots/apply-preview`
- `POST /api/agency/snapshots/apply`

Those routes require a Supabase user bearer token, validate Service Access for `agency-project-transfer` with `canManageProjects`, and execute the canonical service with the server-side Supabase admin client. The create route returns snapshot/version metadata and a payload summary, not the full version payload.

Snapshot version rows store the service payload in `agency_snapshot_versions.payload` and keep `data` populated for compatibility with older readers. Application rows store preview and applied-change details in first-class columns and mirror the summary in metadata. Clients still cannot read raw snapshot payloads through RLS.

## Dashboard Entry

`components/dashboard/agency/AgencySnapshotCenter.tsx` is rendered from `/agency/projects`. It lets agency operators create snapshots from visible agency projects, list canonical snapshot rows, preview target project changes, and apply snapshots only after a valid preview. It uses the same `agency-project-transfer` Service Access module and `canManageProjects` permission as project transfer.

The UI does not query snapshot tables directly. Reads still use `agencySnapshotService.listSnapshots` under RLS, while create/preview/apply use `/api/agency/snapshots/*` so table names, idempotency, draft-safety metadata, and server-side access validation stay centralized.

## Status Model

- Snapshots: `draft`, `active`, `archived`.
- Applications: `pending`, `previewed`, `applying`, `applied`, `failed`, `cancelled`.

Snapshot Center uses these tables as the source of truth and does not overload `projects.data` as the only template registry.

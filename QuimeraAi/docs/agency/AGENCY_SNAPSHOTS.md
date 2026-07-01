# Agency Snapshots

Agency snapshots are reusable templates for project, workflow, content, or full client-stack setup.

## Tables

- `agency_snapshots`: snapshot metadata, visibility, source project, tags, and status.
- `agency_snapshot_versions`: immutable version payloads and checksums.
- `agency_snapshot_applications`: audit trail for applying a snapshot to a client tenant or project.

## Rules

- Snapshot data is agency-owned and RLS-protected by `quimera_can_manage_agency`.
- Client tenants do not read raw snapshot payloads.
- Applying a snapshot should create an `agency_snapshot_applications` row with an `idempotency_key`.
- Snapshot Center must run a `preview before apply` flow. The preview is stored in application metadata and shows changed fields, readiness blockers, included modules, and draft-safety policy before mutating the target project.
- Snapshot application must preserve draft/no-auto-publish behavior until a client approval or explicit agency action publishes runtime content.
- Runtime safety is explicit: applied projects are stamped with `noAutoPublish`, `noRuntimeActivated`, `requiresClientApproval`, `status = Draft`, and cleared published runtime fields.

## Canonical Service

`services/agency/agencySnapshotService.ts` is the canonical browser/service adapter for Agency snapshots.

It owns:

- Creating `agency_snapshots` and immutable `agency_snapshot_versions` from existing projects.
- Building a sanitized snapshot payload without publish/runtime/payment state.
- Previewing target project changes before apply.
- Applying a snapshot to a client or agency project in draft mode.
- Writing `agency_snapshot_applications` with `idempotency_key` and preview metadata.
- Writing `agency_activity.type = snapshot_applied`.

Snapshot version rows store the service payload in `agency_snapshot_versions.data`. Application rows store preview and applied-change details in `agency_snapshot_applications.metadata` because the current table intentionally keeps operational details in JSON metadata rather than exposing raw payload columns to clients.

## Dashboard Entry

`components/dashboard/agency/AgencySnapshotCenter.tsx` is rendered from `/agency/projects`. It lets agency operators create snapshots from visible agency projects, list canonical snapshot rows, preview target project changes, and apply snapshots only after a valid preview. It uses the same `agency-project-transfer` Service Access module and `canManageProjects` permission as project transfer.

The UI does not query snapshot tables directly; it calls `agencySnapshotService` so table names, idempotency, draft-safety metadata, and future API hardening stay centralized.

## Status Model

- Snapshots: `draft`, `active`, `archived`.
- Applications: `pending`, `applied`, `failed`, `cancelled`.

Snapshot Center uses these tables as the source of truth and does not overload `projects.data` as the only template registry.

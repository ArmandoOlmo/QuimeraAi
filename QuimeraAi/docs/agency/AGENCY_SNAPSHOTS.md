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

## Status Model

- Snapshots: `draft`, `active`, `archived`.
- Applications: `pending`, `applied`, `failed`, `cancelled`.

Future UI should use these tables as the source for Snapshot Center and should not overload `projects.data` as the only template registry.

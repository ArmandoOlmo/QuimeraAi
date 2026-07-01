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
- Snapshot application must preserve draft/no-auto-publish behavior until a client approval or explicit agency action publishes runtime content.

## Status Model

- Snapshots: `draft`, `active`, `archived`.
- Applications: `pending`, `applied`, `failed`, `cancelled`.

Future UI should use these tables as the source for Snapshot Center and should not overload `projects.data` as the only template registry.

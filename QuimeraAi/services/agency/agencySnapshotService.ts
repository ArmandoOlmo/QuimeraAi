import { supabase } from '../../supabase';

type JsonRecord = Record<string, any>;
type SupabaseClientLike = {
    from: (table: string) => any;
    auth?: {
        getUser?: () => Promise<{ data?: { user?: { id?: string | null } | null } | null }>;
    };
};

export type AgencySnapshotType =
    | 'project_template'
    | 'client_stack'
    | 'workflow'
    | 'content_pack'
    | 'full_agency_template'
    | 'other';

export type AgencySnapshotStatus = 'draft' | 'active' | 'archived';
export type AgencySnapshotApplicationStatus = 'pending' | 'applied' | 'failed' | 'cancelled';

export interface AgencySnapshotProjectRow {
    id: string;
    tenant_id?: string | null;
    tenantId?: string | null;
    user_id?: string | null;
    userId?: string | null;
    name?: string | null;
    pages?: unknown;
    data?: unknown;
    theme?: unknown;
    brand_identity?: unknown;
    brandIdentity?: unknown;
    component_order?: unknown;
    componentOrder?: unknown;
    section_visibility?: unknown;
    sectionVisibility?: unknown;
    menus?: unknown;
    ai_assistant_config?: unknown;
    aiAssistantConfig?: unknown;
    seo_config?: unknown;
    seoConfig?: unknown;
    crm_config?: unknown;
    crmConfig?: unknown;
}

export interface AgencySnapshotPayload {
    schemaVersion: 1;
    source: 'agency_snapshot_service';
    capturedAt: string;
    sourceProject: {
        id: string;
        tenantId: string | null;
        name: string;
    };
    project: {
        pages: unknown[];
        data: JsonRecord;
        theme: JsonRecord;
        brandIdentity: JsonRecord;
        componentOrder: unknown[];
        sectionVisibility: JsonRecord;
        menus: unknown[];
        aiAssistantConfig: JsonRecord;
        seoConfig: JsonRecord;
        crmConfig: JsonRecord;
    };
    businessBlueprint: JsonRecord | null;
    agencyOperatingSystem: JsonRecord | null;
    includedModules: string[];
    readiness: {
        isReady: boolean;
        blockers: string[];
        warnings: string[];
    };
    draftSafety: {
        status: 'needs_review';
        noAutoPublish: true;
        noRuntimeActivated: true;
        noCheckoutSessionCreated: true;
        noEmailSent: true;
        requiresClientApproval: true;
    };
}

export interface AgencySnapshotRow {
    id: string;
    agency_tenant_id: string;
    name: string;
    description?: string | null;
    snapshot_type?: AgencySnapshotType | string | null;
    visibility?: string | null;
    status?: AgencySnapshotStatus | string | null;
    source_project_id?: string | null;
    tags?: unknown;
    metadata?: unknown;
}

export interface AgencySnapshotVersionRow {
    id: string;
    snapshot_id: string;
    version: number;
    label?: string | null;
    data?: unknown;
    checksum?: string | null;
    metadata?: unknown;
}

export interface AgencySnapshotApplicationPreview {
    schemaVersion: 1;
    source: 'agency_snapshot_service';
    previewedAt: string;
    agencyTenantId: string;
    clientTenantId: string | null;
    targetProjectId: string;
    snapshotId: string;
    snapshotVersionId: string | null;
    snapshotVersion: number | null;
    idempotencyKey: string;
    snapshotName: string;
    targetProjectName: string;
    includedModules: string[];
    changes: Array<{
        field: string;
        action: 'replace' | 'clear' | 'set';
        beforeSummary: string;
        afterSummary: string;
    }>;
    readiness: {
        isReady: boolean;
        blockers: string[];
        warnings: string[];
    };
    draftSafety: AgencySnapshotPayload['draftSafety'] & {
        targetStatus: 'Draft';
        clearsPublishedRuntime: true;
    };
    targetProjectUpdate: JsonRecord;
}

export interface CreateAgencySnapshotFromProjectInput {
    agencyTenantId: string;
    sourceProjectId: string;
    name: string;
    description?: string | null;
    snapshotType?: AgencySnapshotType;
    status?: AgencySnapshotStatus;
    tags?: string[];
    createdBy?: string | null;
    versionLabel?: string | null;
}

export interface ApplyAgencySnapshotInput {
    agencyTenantId: string;
    snapshotId: string;
    snapshotVersionId?: string | null;
    clientTenantId?: string | null;
    targetProjectId: string;
    appliedBy?: string | null;
    idempotencyKey?: string | null;
}

export interface AgencySnapshotApplyResult {
    status: 'preview' | 'applied' | 'duplicate' | 'failed';
    applicationId?: string;
    preview: AgencySnapshotApplicationPreview;
    error?: string;
}

const PROJECT_SNAPSHOT_SELECT = [
    'id',
    'tenant_id',
    'user_id',
    'name',
    'pages',
    'data',
    'theme',
    'brand_identity',
    'component_order',
    'section_visibility',
    'menus',
    'ai_assistant_config',
    'seo_config',
    'crm_config',
].join(',');

function asRecord(value: unknown): JsonRecord {
    return value && typeof value === 'object' && !Array.isArray(value) ? value as JsonRecord : {};
}

function asArray(value: unknown): unknown[] {
    return Array.isArray(value) ? value : [];
}

function uniqueStrings(...values: unknown[]): string[] {
    const result = new Set<string>();
    values.flatMap(value => Array.isArray(value) ? value : [value]).forEach(value => {
        const text = String(value || '').trim();
        if (text) result.add(text);
    });
    return Array.from(result).sort();
}

function cloneJson<T>(value: unknown, fallback: T): T {
    if (value === undefined || value === null) return fallback;
    try {
        return JSON.parse(JSON.stringify(value)) as T;
    } catch {
        return fallback;
    }
}

function stripSnapshotUnsafeData(data: JsonRecord): JsonRecord {
    const copy = cloneJson<JsonRecord>(data, {});
    delete copy.versionHistory;
    delete copy.blueprintSnapshots;
    delete copy.publishedData;
    delete copy.publishedAt;
    delete copy.checkoutSession;
    delete copy.checkoutSessionId;
    delete copy.stripeCheckoutSessionId;
    delete copy.stripePaymentIntentId;
    return copy;
}

function summarizeValue(value: unknown): string {
    if (Array.isArray(value)) return `${value.length} items`;
    if (value && typeof value === 'object') return `${Object.keys(value as JsonRecord).length} keys`;
    if (value === null || value === undefined || value === '') return 'empty';
    return String(value).slice(0, 64);
}

function stableJson(value: unknown): string {
    if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
    if (value && typeof value === 'object') {
        return `{${Object.keys(value as JsonRecord).sort().map(key => `${JSON.stringify(key)}:${stableJson((value as JsonRecord)[key])}`).join(',')}}`;
    }
    return JSON.stringify(value);
}

export function buildAgencySnapshotChecksum(value: unknown): string {
    const text = stableJson(value);
    let hash = 5381;
    for (let index = 0; index < text.length; index += 1) {
        hash = ((hash << 5) + hash) + text.charCodeAt(index);
        hash >>>= 0;
    }
    return `agency_snapshot_${hash.toString(16).padStart(8, '0')}`;
}

function readBusinessBlueprint(data: JsonRecord): JsonRecord | null {
    const blueprint = asRecord(data.businessBlueprint);
    return Object.keys(blueprint).length > 0 ? cloneJson<JsonRecord>(blueprint, {}) : null;
}

function readAgencyOperatingSystem(data: JsonRecord, businessBlueprint: JsonRecord | null): JsonRecord | null {
    const direct = asRecord(data.agencyOperatingSystem);
    const fromBlueprint = asRecord(businessBlueprint?.agencyOperatingSystem);
    const result = Object.keys(direct).length > 0 ? direct : fromBlueprint;
    return Object.keys(result).length > 0 ? cloneJson<JsonRecord>(result, {}) : null;
}

function inferIncludedModules(data: JsonRecord, businessBlueprint: JsonRecord | null, agencyOperatingSystem: JsonRecord | null): string[] {
    return uniqueStrings(
        agencyOperatingSystem?.generatedModuleIds,
        agencyOperatingSystem?.enabledClient360ModuleIds,
        agencyOperatingSystem?.foundationModuleIds,
        agencyOperatingSystem?.client360ModuleIds,
        asRecord(businessBlueprint?.metadata).generatedModuleIds,
        asRecord(data.moduleActivations).enabledModules,
    );
}

function buildSnapshotReadiness(payload: Pick<AgencySnapshotPayload, 'project' | 'businessBlueprint' | 'includedModules'>) {
    const blockers: string[] = [];
    const warnings: string[] = [];

    if (!payload.project.pages.length) warnings.push('snapshot_has_no_pages');
    if (!payload.businessBlueprint) warnings.push('snapshot_has_no_business_blueprint');
    if (!payload.includedModules.length) warnings.push('snapshot_has_no_module_manifest');

    return {
        isReady: blockers.length === 0,
        blockers,
        warnings,
    };
}

export function buildAgencySnapshotPayload(
    project: AgencySnapshotProjectRow,
    capturedAt = new Date().toISOString(),
): AgencySnapshotPayload {
    const data = stripSnapshotUnsafeData(asRecord(project.data));
    const businessBlueprint = readBusinessBlueprint(data);
    const agencyOperatingSystem = readAgencyOperatingSystem(data, businessBlueprint);
    const includedModules = inferIncludedModules(data, businessBlueprint, agencyOperatingSystem);
    const payloadBase = {
        project: {
            pages: cloneJson<unknown[]>(project.pages, []),
            data,
            theme: cloneJson<JsonRecord>(project.theme, {}),
            brandIdentity: cloneJson<JsonRecord>(project.brand_identity ?? project.brandIdentity, {}),
            componentOrder: cloneJson<unknown[]>(project.component_order ?? project.componentOrder, []),
            sectionVisibility: cloneJson<JsonRecord>(project.section_visibility ?? project.sectionVisibility, {}),
            menus: cloneJson<unknown[]>(project.menus, []),
            aiAssistantConfig: cloneJson<JsonRecord>(project.ai_assistant_config ?? project.aiAssistantConfig, {}),
            seoConfig: cloneJson<JsonRecord>(project.seo_config ?? project.seoConfig, {}),
            crmConfig: cloneJson<JsonRecord>(project.crm_config ?? project.crmConfig, {}),
        },
        businessBlueprint,
        agencyOperatingSystem,
        includedModules,
    };

    return {
        schemaVersion: 1,
        source: 'agency_snapshot_service',
        capturedAt,
        sourceProject: {
            id: project.id,
            tenantId: project.tenant_id ?? project.tenantId ?? null,
            name: project.name || 'Untitled project',
        },
        ...payloadBase,
        readiness: buildSnapshotReadiness(payloadBase),
        draftSafety: {
            status: 'needs_review',
            noAutoPublish: true,
            noRuntimeActivated: true,
            noCheckoutSessionCreated: true,
            noEmailSent: true,
            requiresClientApproval: true,
        },
    };
}

export function readAgencySnapshotVersionPayload(version: AgencySnapshotVersionRow): AgencySnapshotPayload {
    const data = asRecord(version.data);
    const payload = asRecord(data.payload);
    const candidate = payload.schemaVersion === 1 ? payload : data;
    if (candidate.schemaVersion !== 1 || candidate.source !== 'agency_snapshot_service') {
        throw new Error('Invalid agency snapshot version payload');
    }
    return candidate as AgencySnapshotPayload;
}

export function buildAgencySnapshotApplicationIdempotencyKey(input: {
    agencyTenantId: string;
    snapshotId: string;
    snapshotVersionId?: string | null;
    targetProjectId: string;
    clientTenantId?: string | null;
}): string {
    return [
        'agency-snapshot',
        input.agencyTenantId,
        input.snapshotId,
        input.snapshotVersionId || 'latest',
        input.clientTenantId || 'no-client',
        input.targetProjectId,
    ].join(':');
}

function buildVersionHistoryEntry(input: {
    snapshot: AgencySnapshotRow;
    version: AgencySnapshotVersionRow;
    payload: AgencySnapshotPayload;
    targetProjectId: string;
    clientTenantId: string | null;
    agencyTenantId: string;
    appliedAt: string;
}) {
    return {
        id: `agency_snapshot_${input.version.id}`,
        projectId: input.targetProjectId,
        tenantId: input.clientTenantId,
        createdAt: input.appliedAt,
        createdBy: 'agency_snapshot_service',
        source: 'agency_snapshot',
        scope: 'project',
        changeType: 'snapshot_application',
        title: `Agency snapshot: ${input.snapshot.name}`,
        description: 'Applied as a draft-safe Agency Snapshot. Runtime remains unpublished until approval.',
        metadata: {
            agencyTenantId: input.agencyTenantId,
            snapshotId: input.snapshot.id,
            snapshotVersionId: input.version.id,
            snapshotVersion: input.version.version,
            sourceProjectId: input.payload.sourceProject.id,
            noAutoPublish: true,
            noRuntimeActivated: true,
        },
        snapshotData: input.payload.project.data,
    };
}

export function buildAgencySnapshotTargetProjectUpdate(input: {
    snapshot: AgencySnapshotRow;
    version: AgencySnapshotVersionRow;
    payload: AgencySnapshotPayload;
    targetProject: AgencySnapshotProjectRow;
    clientTenantId: string | null;
    agencyTenantId: string;
    appliedAt?: string;
}): JsonRecord {
    const appliedAt = input.appliedAt || new Date().toISOString();
    const currentData = asRecord(input.targetProject.data);
    const snapshotData = cloneJson<JsonRecord>(input.payload.project.data, {});
    const businessBlueprint = input.payload.businessBlueprint
        ? {
            ...cloneJson<JsonRecord>(input.payload.businessBlueprint, {}),
            projectId: input.targetProject.id,
            tenantId: input.clientTenantId ?? input.targetProject.tenant_id ?? input.targetProject.tenantId ?? null,
            status: 'needs_review',
            generatedBy: 'agency_snapshot_service',
            agencySnapshot: {
                agencyTenantId: input.agencyTenantId,
                snapshotId: input.snapshot.id,
                snapshotVersionId: input.version.id,
                appliedAt,
                noAutoPublish: true,
                noRuntimeActivated: true,
            },
            ...(input.payload.agencyOperatingSystem ? {
                agencyOperatingSystem: {
                    ...cloneJson<JsonRecord>(input.payload.agencyOperatingSystem, {}),
                    status: 'needs_review',
                    updatedAt: appliedAt,
                    draftOnly: true,
                    noAutoPublish: true,
                    noRuntimeActivated: true,
                    serviceAccessRequired: true,
                },
            } : {}),
        }
        : undefined;
    const agencyOperatingSystem = input.payload.agencyOperatingSystem
        ? {
            ...cloneJson<JsonRecord>(input.payload.agencyOperatingSystem, {}),
            status: 'needs_review',
            updatedAt: appliedAt,
            draftOnly: true,
            noAutoPublish: true,
            noRuntimeActivated: true,
            serviceAccessRequired: true,
        }
        : undefined;
    const history = asRecord(currentData.versionHistory);
    const previousSnapshots = asArray(history.blueprintSnapshots);
    const versionHistoryEntry = buildVersionHistoryEntry({
        snapshot: input.snapshot,
        version: input.version,
        payload: input.payload,
        targetProjectId: input.targetProject.id,
        clientTenantId: input.clientTenantId,
        agencyTenantId: input.agencyTenantId,
        appliedAt,
    });

    const nextData = {
        ...snapshotData,
        ...(businessBlueprint ? { businessBlueprint } : {}),
        ...(agencyOperatingSystem ? { agencyOperatingSystem } : {}),
        agencySnapshotApplication: {
            agencyTenantId: input.agencyTenantId,
            snapshotId: input.snapshot.id,
            snapshotVersionId: input.version.id,
            snapshotVersion: input.version.version,
            sourceProjectId: input.payload.sourceProject.id,
            appliedAt,
            noAutoPublish: true,
            noRuntimeActivated: true,
            requiresClientApproval: true,
        },
        versionHistory: {
            ...history,
            blueprintSnapshots: [
                versionHistoryEntry,
                ...previousSnapshots.filter(item => asRecord(item).id !== versionHistoryEntry.id),
            ].slice(0, 50),
            lastSnapshotAt: appliedAt,
        },
    };

    return {
        pages: cloneJson<unknown[]>(input.payload.project.pages, []),
        data: nextData,
        theme: cloneJson<JsonRecord>(input.payload.project.theme, {}),
        brand_identity: cloneJson<JsonRecord>(input.payload.project.brandIdentity, {}),
        component_order: cloneJson<unknown[]>(input.payload.project.componentOrder, []),
        section_visibility: cloneJson<JsonRecord>(input.payload.project.sectionVisibility, {}),
        menus: cloneJson<unknown[]>(input.payload.project.menus, []),
        ai_assistant_config: cloneJson<JsonRecord>(input.payload.project.aiAssistantConfig, {}),
        seo_config: cloneJson<JsonRecord>(input.payload.project.seoConfig, {}),
        crm_config: cloneJson<JsonRecord>(input.payload.project.crmConfig, {}),
        status: 'Draft',
        published_data: null,
        published_at: null,
        last_updated: appliedAt,
    };
}

export function buildAgencySnapshotApplicationPreview(input: {
    agencyTenantId: string;
    snapshot: AgencySnapshotRow;
    version: AgencySnapshotVersionRow;
    payload: AgencySnapshotPayload;
    targetProject: AgencySnapshotProjectRow;
    clientTenantId?: string | null;
    idempotencyKey?: string | null;
    previewedAt?: string;
}): AgencySnapshotApplicationPreview {
    const previewedAt = input.previewedAt || new Date().toISOString();
    const clientTenantId = input.clientTenantId ?? input.targetProject.tenant_id ?? input.targetProject.tenantId ?? null;
    const idempotencyKey = input.idempotencyKey || buildAgencySnapshotApplicationIdempotencyKey({
        agencyTenantId: input.agencyTenantId,
        snapshotId: input.snapshot.id,
        snapshotVersionId: input.version.id,
        targetProjectId: input.targetProject.id,
        clientTenantId,
    });
    const targetProjectUpdate = buildAgencySnapshotTargetProjectUpdate({
        agencyTenantId: input.agencyTenantId,
        snapshot: input.snapshot,
        version: input.version,
        payload: input.payload,
        targetProject: input.targetProject,
        clientTenantId,
        appliedAt: previewedAt,
    });
    const readiness = {
        isReady: input.payload.readiness.isReady && input.snapshot.status !== 'archived',
        blockers: [
            ...input.payload.readiness.blockers,
            ...(input.snapshot.status === 'archived' ? ['snapshot_archived'] : []),
        ],
        warnings: [
            ...input.payload.readiness.warnings,
            ...(input.snapshot.status !== 'active' ? ['snapshot_not_active'] : []),
        ],
    };
    const fields = [
        ['pages', input.targetProject.pages, targetProjectUpdate.pages],
        ['data', input.targetProject.data, targetProjectUpdate.data],
        ['theme', input.targetProject.theme, targetProjectUpdate.theme],
        ['brand_identity', input.targetProject.brand_identity ?? input.targetProject.brandIdentity, targetProjectUpdate.brand_identity],
        ['component_order', input.targetProject.component_order ?? input.targetProject.componentOrder, targetProjectUpdate.component_order],
        ['section_visibility', input.targetProject.section_visibility ?? input.targetProject.sectionVisibility, targetProjectUpdate.section_visibility],
        ['menus', input.targetProject.menus, targetProjectUpdate.menus],
        ['ai_assistant_config', input.targetProject.ai_assistant_config ?? input.targetProject.aiAssistantConfig, targetProjectUpdate.ai_assistant_config],
        ['seo_config', input.targetProject.seo_config ?? input.targetProject.seoConfig, targetProjectUpdate.seo_config],
        ['crm_config', input.targetProject.crm_config ?? input.targetProject.crmConfig, targetProjectUpdate.crm_config],
        ['published_runtime', 'existing runtime', null],
        ['status', 'current', 'Draft'],
    ] as const;

    return {
        schemaVersion: 1,
        source: 'agency_snapshot_service',
        previewedAt,
        agencyTenantId: input.agencyTenantId,
        clientTenantId,
        targetProjectId: input.targetProject.id,
        snapshotId: input.snapshot.id,
        snapshotVersionId: input.version.id,
        snapshotVersion: input.version.version,
        idempotencyKey,
        snapshotName: input.snapshot.name,
        targetProjectName: input.targetProject.name || 'Untitled project',
        includedModules: input.payload.includedModules,
        changes: fields.map(([field, before, after]) => ({
            field,
            action: after === null ? 'clear' : field === 'status' ? 'set' : 'replace',
            beforeSummary: summarizeValue(before),
            afterSummary: summarizeValue(after),
        })),
        readiness,
        draftSafety: {
            ...input.payload.draftSafety,
            targetStatus: 'Draft',
            clearsPublishedRuntime: true,
        },
        targetProjectUpdate,
    };
}

export function buildAgencySnapshotApplicationInsert(input: {
    preview: AgencySnapshotApplicationPreview;
    appliedBy?: string | null;
    status?: AgencySnapshotApplicationStatus;
}) {
    return {
        agency_tenant_id: input.preview.agencyTenantId,
        snapshot_id: input.preview.snapshotId,
        snapshot_version_id: input.preview.snapshotVersionId,
        client_tenant_id: input.preview.clientTenantId,
        source_project_id: null,
        target_project_id: input.preview.targetProjectId,
        status: input.status || 'pending',
        idempotency_key: input.preview.idempotencyKey,
        applied_by: input.appliedBy || null,
        metadata: {
            source: 'agency_snapshot_service',
            preview: {
                schemaVersion: input.preview.schemaVersion,
                includedModules: input.preview.includedModules,
                changes: input.preview.changes,
                readiness: input.preview.readiness,
                draftSafety: input.preview.draftSafety,
            },
            noAutoPublish: true,
            noRuntimeActivated: true,
            requiresClientApproval: true,
        },
    };
}

function isUniqueConstraintViolation(error: unknown): boolean {
    const err = error as { code?: string | null; message?: string | null } | null;
    return err?.code === '23505' || /duplicate|unique/i.test(err?.message || '');
}

export class AgencySnapshotService {
    constructor(private readonly client: SupabaseClientLike = supabase as unknown as SupabaseClientLike) {}

    async createSnapshotFromProject(input: CreateAgencySnapshotFromProjectInput) {
        const createdBy = input.createdBy ?? await this.getCurrentUserId();
        const { data: project, error: projectError } = await this.client
            .from('projects')
            .select(PROJECT_SNAPSHOT_SELECT)
            .eq('id', input.sourceProjectId)
            .single();

        if (projectError) throw projectError;
        if (!project) throw new Error('Source project not found');

        await this.assertProjectInAgencyScope(input.agencyTenantId, project);

        const payload = buildAgencySnapshotPayload(project);
        const checksum = buildAgencySnapshotChecksum(payload);
        const { data: snapshot, error: snapshotError } = await this.client
            .from('agency_snapshots')
            .insert({
                agency_tenant_id: input.agencyTenantId,
                name: input.name,
                description: input.description || null,
                snapshot_type: input.snapshotType || 'project_template',
                status: input.status || 'draft',
                source_project_id: project.id,
                tags: input.tags || [],
                metadata: {
                    source: 'agency_snapshot_service',
                    includedModules: payload.includedModules,
                    readiness: payload.readiness,
                    checksum,
                },
                created_by: createdBy,
                updated_by: createdBy,
            })
            .select('id,agency_tenant_id,name,description,snapshot_type,status,source_project_id,metadata')
            .single();

        if (snapshotError) throw snapshotError;

        const { data: version, error: versionError } = await this.client
            .from('agency_snapshot_versions')
            .insert({
                snapshot_id: snapshot.id,
                version: 1,
                label: input.versionLabel || 'Initial snapshot',
                data: payload,
                checksum,
                metadata: {
                    source: 'agency_snapshot_service',
                    includedModules: payload.includedModules,
                    readiness: payload.readiness,
                    sourceProjectId: project.id,
                },
                created_by: createdBy,
            })
            .select('id,snapshot_id,version,label,data,checksum,metadata')
            .single();

        if (versionError) throw versionError;

        return {
            snapshot,
            version,
            payload,
            checksum,
        };
    }

    async previewSnapshotApplication(input: ApplyAgencySnapshotInput): Promise<AgencySnapshotApplicationPreview> {
        const [snapshot, version, targetProject] = await Promise.all([
            this.fetchSnapshot(input.agencyTenantId, input.snapshotId),
            this.fetchSnapshotVersion(input.snapshotId, input.snapshotVersionId),
            this.fetchProject(input.targetProjectId),
        ]);
        const clientTenantId = input.clientTenantId ?? targetProject.tenant_id ?? targetProject.tenantId ?? null;
        if (clientTenantId) await this.assertClientInAgencyScope(input.agencyTenantId, clientTenantId);
        const payload = readAgencySnapshotVersionPayload(version);

        return buildAgencySnapshotApplicationPreview({
            agencyTenantId: input.agencyTenantId,
            snapshot,
            version,
            payload,
            targetProject,
            clientTenantId,
            idempotencyKey: input.idempotencyKey,
        });
    }

    async applySnapshot(input: ApplyAgencySnapshotInput): Promise<AgencySnapshotApplyResult> {
        const appliedBy = input.appliedBy ?? await this.getCurrentUserId();
        const preview = await this.previewSnapshotApplication(input);
        if (!preview.readiness.isReady) {
            return {
                status: 'failed',
                preview,
                error: preview.readiness.blockers.join(', ') || 'Snapshot is not ready to apply',
            };
        }

        const insertRow = buildAgencySnapshotApplicationInsert({ preview, appliedBy, status: 'pending' });
        const { data: application, error: applicationError } = await this.client
            .from('agency_snapshot_applications')
            .insert(insertRow)
            .select('id,status')
            .single();

        if (applicationError) {
            if (isUniqueConstraintViolation(applicationError)) {
                const duplicate = await this.fetchApplicationByIdempotencyKey(input.agencyTenantId, preview.idempotencyKey);
                return {
                    status: 'duplicate',
                    applicationId: duplicate?.id,
                    preview,
                };
            }
            throw applicationError;
        }

        const { error: updateError } = await this.client
            .from('projects')
            .update(preview.targetProjectUpdate)
            .eq('id', input.targetProjectId);

        if (updateError) {
            await this.markApplicationFailed(application.id, updateError.message || 'Project update failed');
            return {
                status: 'failed',
                applicationId: application.id,
                preview,
                error: updateError.message || 'Project update failed',
            };
        }

        const appliedAt = new Date().toISOString();
        const { error: applicationUpdateError } = await this.client
            .from('agency_snapshot_applications')
            .update({
                status: 'applied',
                applied_at: appliedAt,
                metadata: {
                    ...insertRow.metadata,
                    appliedAt,
                    appliedChanges: preview.changes,
                },
                updated_at: appliedAt,
            })
            .eq('id', application.id);

        if (applicationUpdateError) throw applicationUpdateError;

        await this.logSnapshotActivity({
            agencyTenantId: input.agencyTenantId,
            clientTenantId: preview.clientTenantId,
            targetProjectId: input.targetProjectId,
            applicationId: application.id,
            snapshotId: input.snapshotId,
            snapshotVersionId: preview.snapshotVersionId,
            appliedBy,
            includedModules: preview.includedModules,
        });

        return {
            status: 'applied',
            applicationId: application.id,
            preview,
        };
    }

    private async getCurrentUserId(): Promise<string | null> {
        if (!this.client.auth?.getUser) return null;
        const { data } = await this.client.auth.getUser();
        return data?.user?.id || null;
    }

    private async fetchSnapshot(agencyTenantId: string, snapshotId: string): Promise<AgencySnapshotRow> {
        const { data, error } = await this.client
            .from('agency_snapshots')
            .select('id,agency_tenant_id,name,description,snapshot_type,status,source_project_id,metadata')
            .eq('id', snapshotId)
            .eq('agency_tenant_id', agencyTenantId)
            .single();
        if (error) throw error;
        if (!data) throw new Error('Agency snapshot not found');
        return data;
    }

    private async fetchSnapshotVersion(snapshotId: string, snapshotVersionId?: string | null): Promise<AgencySnapshotVersionRow> {
        let query = this.client
            .from('agency_snapshot_versions')
            .select('id,snapshot_id,version,label,data,checksum,metadata')
            .eq('snapshot_id', snapshotId);

        if (snapshotVersionId) {
            query = query.eq('id', snapshotVersionId);
        } else {
            query = query.order('version', { ascending: false }).limit(1);
        }

        const { data, error } = await query.single();
        if (error) throw error;
        if (!data) throw new Error('Agency snapshot version not found');
        return data;
    }

    private async fetchProject(projectId: string): Promise<AgencySnapshotProjectRow> {
        const { data, error } = await this.client
            .from('projects')
            .select(PROJECT_SNAPSHOT_SELECT)
            .eq('id', projectId)
            .single();
        if (error) throw error;
        if (!data) throw new Error('Project not found');
        return data;
    }

    private async assertProjectInAgencyScope(agencyTenantId: string, project: AgencySnapshotProjectRow) {
        const tenantId = project.tenant_id ?? project.tenantId ?? null;
        if (!tenantId || tenantId === agencyTenantId) return;
        await this.assertClientInAgencyScope(agencyTenantId, tenantId);
    }

    private async assertClientInAgencyScope(agencyTenantId: string, clientTenantId: string) {
        const { data, error } = await this.client
            .from('agency_clients')
            .select('client_tenant_id')
            .eq('agency_tenant_id', agencyTenantId)
            .eq('client_tenant_id', clientTenantId)
            .maybeSingle();
        if (error) throw error;
        if (!data) throw new Error('Client tenant is not linked to this agency');
    }

    private async fetchApplicationByIdempotencyKey(agencyTenantId: string, idempotencyKey: string): Promise<{ id?: string } | null> {
        const { data, error } = await this.client
            .from('agency_snapshot_applications')
            .select('id,status')
            .eq('agency_tenant_id', agencyTenantId)
            .eq('idempotency_key', idempotencyKey)
            .maybeSingle();
        if (error) throw error;
        return data || null;
    }

    private async markApplicationFailed(applicationId: string, message: string) {
        const failedAt = new Date().toISOString();
        await this.client
            .from('agency_snapshot_applications')
            .update({
                status: 'failed',
                error_message: message,
                updated_at: failedAt,
            })
            .eq('id', applicationId);
    }

    private async logSnapshotActivity(input: {
        agencyTenantId: string;
        clientTenantId: string | null;
        targetProjectId: string;
        applicationId: string;
        snapshotId: string;
        snapshotVersionId: string | null;
        appliedBy: string | null;
        includedModules: string[];
    }) {
        const { error } = await this.client
            .from('agency_activity')
            .insert({
                agency_tenant_id: input.agencyTenantId,
                client_tenant_id: input.clientTenantId,
                project_id: input.targetProjectId,
                type: 'snapshot_applied',
                title: 'Agency Snapshot aplicado',
                description: 'Snapshot aplicado en modo borrador; runtime publico no activado.',
                metadata: {
                    source: 'agency_snapshot_service',
                    applicationId: input.applicationId,
                    snapshotId: input.snapshotId,
                    snapshotVersionId: input.snapshotVersionId,
                    includedModules: input.includedModules,
                    noAutoPublish: true,
                    noRuntimeActivated: true,
                    requiresClientApproval: true,
                },
                created_by: input.appliedBy,
            });
        if (error) {
            console.warn('[AgencySnapshotService] Error logging snapshot activity:', error);
        }
    }
}

export const agencySnapshotService = new AgencySnapshotService();

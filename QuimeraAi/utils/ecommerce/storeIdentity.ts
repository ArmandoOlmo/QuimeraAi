import type { BusinessBlueprint } from '../../types/businessBlueprint';
import type { Project } from '../../types/project';

export interface EcommerceStoreIdentityInput {
    projectId?: string | null;
    storeId?: string | null;
    publicStoreId?: string | null;
    project?: Partial<Project> | null;
    publicStore?: Record<string, unknown> | null;
    businessBlueprint?: BusinessBlueprint | null;
}

export interface EcommerceStoreIdentity {
    projectId: string | null;
    engineStoreId: string | null;
    storeId: string | null;
    publicStoreId: string | null;
    storefrontStoreId: string | null;
    source: 'project-backed-engine' | 'explicit-store' | 'public-store' | 'unresolved';
}

const isRecord = (value: unknown): value is Record<string, unknown> => (
    Boolean(value) && typeof value === 'object' && !Array.isArray(value)
);

const asString = (value: unknown): string | null => (
    typeof value === 'string' && value.trim() ? value.trim() : null
);

const fromPublicStoreData = (publicStore?: Record<string, unknown> | null): string | null => {
    const data = isRecord(publicStore?.data) ? publicStore.data : {};
    return asString(publicStore?.project_id)
        || asString(publicStore?.projectId)
        || asString(data.projectId)
        || asString(data.project_id)
        || asString(data.sourceProjectId);
};

export function resolveProjectBackedStoreIdentity(input: EcommerceStoreIdentityInput = {}): EcommerceStoreIdentity {
    const publicStoreProjectId = fromPublicStoreData(input.publicStore);
    const projectId = asString(input.projectId)
        || asString(input.project?.id)
        || asString(input.businessBlueprint?.projectId)
        || publicStoreProjectId;
    const explicitStoreId = asString(input.storeId);
    const publicStoreId = asString(input.publicStoreId) || asString(input.publicStore?.id);

    if (projectId) {
        return {
            projectId,
            engineStoreId: projectId,
            storeId: projectId,
            publicStoreId,
            storefrontStoreId: publicStoreId || projectId,
            source: 'project-backed-engine',
        };
    }

    if (explicitStoreId) {
        return {
            projectId: null,
            engineStoreId: explicitStoreId,
            storeId: explicitStoreId,
            publicStoreId,
            storefrontStoreId: publicStoreId || explicitStoreId,
            source: 'explicit-store',
        };
    }

    if (publicStoreId) {
        return {
            projectId: null,
            engineStoreId: null,
            storeId: null,
            publicStoreId,
            storefrontStoreId: publicStoreId,
            source: 'public-store',
        };
    }

    return {
        projectId: null,
        engineStoreId: null,
        storeId: null,
        publicStoreId: null,
        storefrontStoreId: null,
        source: 'unresolved',
    };
}

export function getStoreIdentityQueryIds(identityOrStoreId?: EcommerceStoreIdentity | string | null, projectId?: string | null): string[] {
    const ids = new Set<string>();

    if (typeof identityOrStoreId === 'string') {
        const value = asString(identityOrStoreId);
        if (value) ids.add(value);
    } else if (identityOrStoreId) {
        [
            identityOrStoreId.projectId,
            identityOrStoreId.engineStoreId,
            identityOrStoreId.storeId,
            identityOrStoreId.publicStoreId,
            identityOrStoreId.storefrontStoreId,
        ].forEach(value => {
            if (value) ids.add(value);
        });
    }

    const projectValue = asString(projectId);
    if (projectValue) ids.add(projectValue);

    return Array.from(ids);
}

export function getStorefrontReferenceId(identity: EcommerceStoreIdentity): string | null {
    return identity.publicStoreId || identity.storefrontStoreId || identity.storeId;
}

export function buildStoreIdentityOrFilter(ids: string[]): string {
    const safeIds = Array.from(new Set(ids.map(id => id.trim()).filter(Boolean)));
    return safeIds
        .flatMap(id => {
            const filters = [
                `store_id.eq.${id}`,
                `public_store_id.eq.${id}`,
            ];
            if (/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
                filters.push(`project_id.eq.${id}`);
            }
            return filters;
        })
        .join(',');
}

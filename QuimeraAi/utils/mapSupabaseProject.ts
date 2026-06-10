import { Project } from '../types';

type SupabaseProjectRow = Record<string, any>;

/** Resolve menus from the dedicated column or the legacy data JSONB field. */
export function resolveProjectMenus(row: SupabaseProjectRow): any[] {
    if (Array.isArray(row.menus) && row.menus.length > 0) {
        return row.menus;
    }
    const dataPayload = row.data;
    if (dataPayload && Array.isArray(dataPayload.menus) && dataPayload.menus.length > 0) {
        return dataPayload.menus;
    }
    return [];
}

/**
 * Merges a Supabase `projects` row into a single Project object.
 * Top-level columns (menus, theme, pages, …) take precedence over the same keys
 * stored inside the `data` JSONB blob so CMS menus are never lost on load.
 */
export function mapSupabaseRowToProject(row: SupabaseProjectRow): Project {
    const dataPayload =
        row.data && typeof row.data === 'object' && !Array.isArray(row.data)
            ? row.data
            : {};

    const pageData =
        dataPayload.data && typeof dataPayload.data === 'object' && !Array.isArray(dataPayload.data)
            ? dataPayload.data
            : dataPayload;

    return {
        ...dataPayload,
        data: pageData,
        id: row.id,
        name: row.name ?? dataPayload.name,
        status: row.status ?? dataPayload.status,
        userId: row.user_id ?? dataPayload.userId,
        tenantId: row.tenant_id ?? dataPayload.tenantId,
        lastUpdated: row.last_updated ?? dataPayload.lastUpdated,
        thumbnailUrl: row.thumbnail_url ?? dataPayload.thumbnailUrl,
        theme: row.theme ?? dataPayload.theme,
        brandIdentity: row.brand_identity ?? dataPayload.brandIdentity,
        componentOrder: row.component_order ?? dataPayload.componentOrder,
        sectionVisibility: row.section_visibility ?? dataPayload.sectionVisibility,
        pages: row.pages ?? dataPayload.pages,
        menus: resolveProjectMenus(row),
        categories:
            (Array.isArray(row.categories) && row.categories.length > 0
                ? row.categories
                : dataPayload.categories) ?? undefined,
        aiAssistantConfig: row.ai_assistant_config ?? dataPayload.aiAssistantConfig,
        seoConfig: row.seo_config ?? dataPayload.seoConfig,
        crmConfig: row.crm_config ?? dataPayload.crmConfig,
    } as Project;
}

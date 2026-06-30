import { randomUUID } from 'node:crypto';
import { getSupabaseAdmin } from './_lib/supabaseAdmin.js';
import { assertTenantAccess, authenticateMcpRequest, MCP_SCOPES, requireAnyScope, requireScope, } from './_lib/mcpAuth.js';
import { enforceMcpRateLimit } from './_lib/mcpRateLimit.js';
import { GENERATOR_PRESETS, generateContent, generateImage, } from './_lib/aiGateway.js';
const JSON_HEADERS = {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};
function send(res, status, body) {
    res.writeHead(status, JSON_HEADERS);
    res.end(JSON.stringify(body));
}
async function readJson(req) {
    if (req.body && typeof req.body === 'object')
        return req.body;
    const chunks = [];
    for await (const chunk of req) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    const raw = Buffer.concat(chunks).toString('utf8');
    return raw ? JSON.parse(raw) : {};
}
function ok(id, result) {
    return { jsonrpc: '2.0', id: id ?? null, result };
}
function fail(id, error) {
    const status = error?.status || 500;
    const code = status === 401 ? -32001 : status === 403 ? -32003 : status === 400 ? -32602 : -32603;
    return {
        jsonrpc: '2.0',
        id: id ?? null,
        error: {
            code,
            message: error?.message || 'Internal server error',
            data: {
                status,
                appCode: error?.code,
                details: error?.details,
                requiredScope: error?.requiredScope,
            },
        },
    };
}
function textResult(value) {
    return {
        content: [
            {
                type: 'text',
                text: typeof value === 'string' ? value : JSON.stringify(value, null, 2),
            },
        ],
    };
}
function commonGenerationInput(args, auth, sourceTool) {
    return {
        tenantId: assertTenantAccess(auth, args.tenantId),
        projectId: args.projectId || auth.projectId,
        agentId: args.agentId || auth.agentId,
        purpose: args.purpose || sourceTool,
        brief: args.brief || args.prompt || '',
        language: args.language || 'es',
        brandContext: args.brandContext,
        targetAudience: args.targetAudience,
        modelPreset: args.modelPreset,
        saveTo: args.saveTo,
        section: args.section,
        pageId: args.pageId,
        contentType: args.contentType,
        referenceImages: args.referenceImages,
        imageOptions: args.imageOptions,
        metadata: {
            ...(args.metadata || {}),
            sourceTool,
        },
    };
}
async function getProjectForTenant(projectId, tenantId) {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .maybeSingle();
    if (error)
        throw error;
    if (!data)
        throw Object.assign(new Error('Project not found.'), { status: 404 });
    if (data.tenant_id !== tenantId) {
        throw Object.assign(new Error('Project does not belong to this tenant.'), { status: 403 });
    }
    return data;
}
function setDeepValue(target, path, value) {
    const parts = path.split('.').map((part) => part.trim()).filter(Boolean);
    if (parts.length === 0)
        return;
    let cursor = target;
    for (let index = 0; index < parts.length - 1; index += 1) {
        const part = parts[index];
        if (!cursor[part] || typeof cursor[part] !== 'object')
            cursor[part] = {};
        cursor = cursor[part];
    }
    cursor[parts[parts.length - 1]] = value;
}
function mergeSectionData(base, section, content, replace = false) {
    const next = { ...(base || {}) };
    if (replace || typeof next[section] !== 'object' || Array.isArray(next[section])) {
        next[section] = content;
    }
    else {
        next[section] = { ...next[section], ...content };
    }
    return next;
}
async function updateProjectData(projectId, updates) {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
        .from('projects')
        .update({ ...updates, last_updated: new Date().toISOString() })
        .eq('id', projectId)
        .select('id, last_updated')
        .single();
    if (error)
        throw error;
    return data;
}
const MCP_BLUEPRINT_SNAPSHOT_LIMIT = 50;
function cloneJson(value, fallback) {
    if (value === undefined || value === null)
        return fallback;
    try {
        return JSON.parse(JSON.stringify(value));
    }
    catch {
        return fallback;
    }
}
function getProjectDataVersionHistory(projectData) {
    const history = projectData.versionHistory && typeof projectData.versionHistory === 'object' && !Array.isArray(projectData.versionHistory)
        ? projectData.versionHistory
        : {};
    const snapshots = Array.isArray(history.blueprintSnapshots)
        ? history.blueprintSnapshots.filter(Boolean)
        : [];
    return {
        ...history,
        blueprintSnapshots: snapshots,
    };
}
function stripVersionHistoryFromProjectData(projectData) {
    const copy = cloneJson(projectData, {});
    delete copy.versionHistory;
    delete copy.blueprintSnapshots;
    return copy;
}
function createAiApplySnapshotData(project, auth, tenantId, actionType, target = {}) {
    const projectData = project.data && typeof project.data === 'object' && !Array.isArray(project.data)
        ? project.data
        : {};
    const businessBlueprint = projectData.businessBlueprint && typeof projectData.businessBlueprint === 'object'
        ? projectData.businessBlueprint
        : null;
    const scope = target.sectionId ? 'section' : 'project';
    const targetLabel = target.sectionId ? `section ${target.sectionId}` : scope;
    const now = new Date().toISOString();
    const snapshot = {
        id: `snapshot_${randomUUID()}`,
        projectId: project.id,
        tenantId,
        ...(typeof businessBlueprint?.blueprintVersion === 'string' ? { blueprintVersion: businessBlueprint.blueprintVersion } : {}),
        createdAt: now,
        createdBy: auth.userId || auth.agentId || null,
        source: 'ai_action',
        scope,
        changeType: 'before_regeneration',
        ...(target.sectionId ? { sectionId: target.sectionId } : {}),
        title: `AI action before regeneration: ${targetLabel}`,
        description: target.sectionId
            ? `Captured section ${target.sectionId} before MCP AI changes.`
            : 'Captured the project before MCP AI changes.',
        label: `AI action before regeneration: ${targetLabel}`,
        summary: target.sectionId
            ? `Captured section ${target.sectionId} before MCP AI changes.`
            : 'Captured the project before MCP AI changes.',
        metadata: {
            tenantId,
            userId: auth.userId || null,
            createdBy: auth.userId || auth.agentId || null,
            actionType,
            module: 'mcp',
            pageId: target.pageId,
            source: 'mcp-api',
            apiKeyId: auth.apiKeyId,
            agentId: auth.agentId,
        },
        snapshotData: stripVersionHistoryFromProjectData(projectData),
        ...(businessBlueprint ? { businessBlueprint } : {}),
    };
    const history = getProjectDataVersionHistory(projectData);
    return {
        ...projectData,
        versionHistory: {
            ...history,
            blueprintSnapshots: [
                snapshot,
                ...history.blueprintSnapshots.filter((item) => item?.id !== snapshot.id),
            ].slice(0, MCP_BLUEPRINT_SNAPSHOT_LIMIT),
            lastSnapshotAt: snapshot.createdAt,
        },
    };
}
function limitNumber(value, fallback = 50, max = 100) {
    const parsed = Number(value || fallback);
    if (!Number.isFinite(parsed) || parsed <= 0)
        return fallback;
    return Math.min(parsed, max);
}
function slugify(value) {
    return value
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 80) || `item-${Date.now()}`;
}
function pick(input, allowed) {
    const output = {};
    for (const key of allowed) {
        if (input[key] !== undefined)
            output[key] = input[key];
    }
    return output;
}
function normalizeTemplateArgs(args) {
    const container = args.template || args.payload || args.project || {};
    const merged = { ...container, ...args };
    const wrappedData = merged.data;
    if (wrappedData &&
        typeof wrappedData === 'object' &&
        !Array.isArray(wrappedData) &&
        (wrappedData.data || wrappedData.componentOrder || wrappedData.component_order || wrappedData.brandIdentity || wrappedData.brand_identity)) {
        return {
            ...merged,
            pages: merged.pages ?? wrappedData.pages,
            data: wrappedData.data ?? merged.data,
            theme: merged.theme ?? wrappedData.theme,
            brandIdentity: merged.brandIdentity ?? merged.brand_identity ?? wrappedData.brandIdentity ?? wrappedData.brand_identity,
            componentOrder: merged.componentOrder ?? merged.component_order ?? wrappedData.componentOrder ?? wrappedData.component_order,
            sectionVisibility: merged.sectionVisibility ?? merged.section_visibility ?? wrappedData.sectionVisibility ?? wrappedData.section_visibility,
            menus: merged.menus ?? wrappedData.menus,
            aiAssistantConfig: merged.aiAssistantConfig ?? merged.ai_assistant_config ?? wrappedData.aiAssistantConfig ?? wrappedData.ai_assistant_config,
            seoConfig: merged.seoConfig ?? merged.seo_config ?? wrappedData.seoConfig ?? wrappedData.seo_config,
            crmConfig: merged.crmConfig ?? merged.crm_config ?? wrappedData.crmConfig ?? wrappedData.crm_config,
        };
    }
    return merged;
}
function summarizeTemplateContent(template) {
    const componentOrder = template.component_order || template.componentOrder || [];
    const sectionVisibility = template.section_visibility || template.sectionVisibility || {};
    const pages = Array.isArray(template.pages) ? template.pages : [];
    const rawData = template.data && typeof template.data === 'object' && !Array.isArray(template.data) ? template.data : {};
    const data = rawData.data && typeof rawData.data === 'object' && !Array.isArray(rawData.data) ? rawData.data : rawData;
    const dataKeys = Object.keys(data).filter((key) => !['isDeleted', 'lastUpdated', 'name', 'status', 'theme', 'pages', 'menus', 'brandIdentity', 'componentOrder', 'sectionVisibility', 'thumbnailUrl', 'createdAt'].includes(key));
    const visibleSections = Array.isArray(componentOrder)
        ? componentOrder.filter((section) => sectionVisibility?.[section] !== false)
        : [];
    const pageSectionCount = pages.reduce((count, page) => {
        const sections = Array.isArray(page?.sections) ? page.sections.length : 0;
        const sectionData = page?.sectionData && typeof page.sectionData === 'object'
            ? Object.keys(page.sectionData).length
            : 0;
        return count + Math.max(sections, sectionData);
    }, 0);
    const hasRenderableContent = dataKeys.length >= 3 || pageSectionCount >= 3;
    return {
        sectionCount: Array.isArray(componentOrder) ? componentOrder.length : 0,
        visibleSectionCount: visibleSections.length,
        dataKeyCount: dataKeys.length,
        pageCount: pages.length,
        pageSectionCount,
        hasRenderableContent,
        warnings: [
            ...(!hasRenderableContent ? ['Template has no renderable section content. Send data/componentOrder or pages[].sectionData.'] : []),
        ],
    };
}
function assertTemplateHasContent(template) {
    const summary = summarizeTemplateContent(template);
    if (!summary.hasRenderableContent) {
        throw Object.assign(new Error('Template content is required. Provide PageData in data with componentOrder, use sourceProjectId, or provide pages with sectionData.'), { status: 400, details: summary });
    }
}
/** Admin UI spreads `projects.data` as the full project snapshot (see TemplateManagement). */
function buildAdminTemplateDataColumn(fields) {
    const now = new Date().toISOString();
    return {
        name: fields.name,
        status: 'Template',
        thumbnailUrl: fields.thumbnailUrl ?? '',
        lastUpdated: now,
        createdAt: now,
        data: fields.pageData,
        theme: fields.theme || {},
        brandIdentity: fields.brandIdentity || {},
        componentOrder: fields.componentOrder || [],
        sectionVisibility: fields.sectionVisibility || {},
        pages: fields.pages || [],
        menus: fields.menus || [],
        ...(fields.description !== undefined ? { description: fields.description } : {}),
        ...(fields.category !== undefined ? { category: fields.category } : {}),
        ...(fields.tags !== undefined ? { tags: fields.tags } : {}),
        ...(fields.industries !== undefined ? { industries: fields.industries } : {}),
    };
}
function extractPageDataFromTemplateInput(pageDataInput, sourceProject) {
    if (pageDataInput && typeof pageDataInput === 'object' && !Array.isArray(pageDataInput)) {
        if (pageDataInput.data && typeof pageDataInput.data === 'object' && !Array.isArray(pageDataInput.data)) {
            return pageDataInput.data;
        }
        if (pageDataInput.hero || pageDataInput.header || pageDataInput.services) {
            return pageDataInput;
        }
    }
    const sourceData = sourceProject.data;
    if (sourceData?.data && typeof sourceData.data === 'object')
        return sourceData.data;
    if (sourceData?.hero || sourceData?.header)
        return sourceData;
    return pageDataInput || {};
}
/** Read/write PageData inside projects.data (Admin snapshot uses nested `data.data`). */
function getProjectDataWriteContext(project) {
    const snapshot = project.data && typeof project.data === 'object' ? { ...project.data } : {};
    const pageData = { ...extractPageDataFromTemplateInput(undefined, project) };
    const usesNestedPageData = Boolean(snapshot.data &&
        typeof snapshot.data === 'object' &&
        !Array.isArray(snapshot.data) &&
        (snapshot.componentOrder ||
            snapshot.component_order ||
            snapshot.status === 'Template' ||
            snapshot.data.hero ||
            snapshot.data.header));
    return {
        pageData,
        updateSection(section, updater) {
            pageData[section] = updater({ ...(pageData[section] || {}) });
        },
        buildDataColumn() {
            const now = new Date().toISOString();
            if (usesNestedPageData) {
                return { ...snapshot, data: pageData, lastUpdated: now };
            }
            const metaKeys = new Set([
                'name',
                'status',
                'thumbnailUrl',
                'theme',
                'brandIdentity',
                'componentOrder',
                'component_order',
                'sectionVisibility',
                'section_visibility',
                'pages',
                'menus',
                'seoConfig',
                'seo_config',
                'crmConfig',
                'crm_config',
                'aiAssistantConfig',
                'ai_assistant_config',
                'lastUpdated',
                'createdAt',
                'id',
                'userId',
                'tenantId',
                'description',
                'category',
                'tags',
                'industries',
                'faviconUrl',
            ]);
            const preserved = {};
            for (const [key, value] of Object.entries(snapshot)) {
                if (metaKeys.has(key))
                    preserved[key] = value;
            }
            return { ...preserved, ...pageData, lastUpdated: now };
        },
    };
}
async function getLeadForTenant(leadId, tenantId) {
    const { data, error } = await getSupabaseAdmin()
        .from('leads')
        .select('*')
        .eq('id', leadId)
        .eq('tenant_id', tenantId)
        .maybeSingle();
    if (error)
        throw error;
    if (!data)
        throw Object.assign(new Error('Lead not found.'), { status: 404 });
    return data;
}
async function logMcpToolCall(auth, toolName, startTime, success, result, error) {
    try {
        await getSupabaseAdmin().from('api_logs').insert({
            user_id: auth.userId || null,
            project_id: result?.projectId || result?.project?.id || auth.projectId || null,
            model: result?.usage?.model || null,
            feature: `mcp:${toolName}`,
            success,
            error: error?.message || null,
            prompt_tokens: result?.usage?.promptTokens || 0,
            completion_tokens: result?.usage?.completionTokens || 0,
            total_tokens: result?.usage?.totalTokens || 0,
            latency_ms: Date.now() - startTime,
            endpoint: 'mcp/tools/call',
            metadata: {
                tenant_id: auth.tenantId,
                api_key_id: auth.apiKeyId,
                tool: toolName,
                trace_id: result?.traceId || randomUUID(),
                credits_used: result?.creditsUsed || 0,
                status: success ? 'success' : 'failed',
            },
        });
    }
    catch {
        // Logging must never break the MCP response.
    }
}
const toolHandlers = {
    list_templates: async (args, auth) => {
        requireAnyScope(auth, ['templates:read', 'projects:read', 'ai:apply_to_project']);
        assertTenantAccess(auth, args.tenantId);
        const { data, error } = await getSupabaseAdmin()
            .from('projects')
            .select('id, name, thumbnail_url, status, category, tags, description, industries, component_order, section_visibility, data, pages, last_updated')
            .eq('status', 'Template')
            .eq('is_archived', false)
            .order('last_updated', { ascending: false })
            .limit(Math.min(Number(args.limit || 50), 100));
        if (error)
            throw error;
        return {
            templates: (data || []).map((template) => {
                const { component_order, section_visibility, data: templateData, pages, ...metadata } = template;
                return {
                    ...metadata,
                    contentSummary: summarizeTemplateContent({
                        component_order,
                        section_visibility,
                        data: templateData,
                        pages,
                    }),
                };
            }),
        };
    },
    get_template: async (args, auth) => {
        requireAnyScope(auth, ['templates:read', 'templates:write', 'projects:read']);
        const tenantId = assertTenantAccess(auth, args.tenantId);
        if (!args.templateId)
            throw Object.assign(new Error('templateId is required.'), { status: 400 });
        const { data: template, error } = await getSupabaseAdmin()
            .from('projects')
            .select('*')
            .eq('id', args.templateId)
            .eq('tenant_id', tenantId)
            .eq('status', 'Template')
            .maybeSingle();
        if (error)
            throw error;
        if (!template)
            throw Object.assign(new Error('Template not found.'), { status: 404 });
        return { template, contentSummary: summarizeTemplateContent(template) };
    },
    create_template: async (args, auth) => {
        requireScope(auth, 'templates:write');
        const tenantId = assertTenantAccess(auth, args.tenantId);
        const normalizedArgs = normalizeTemplateArgs(args);
        if (!normalizedArgs.name)
            throw Object.assign(new Error('name is required.'), { status: 400 });
        const sourceProject = normalizedArgs.sourceProjectId
            ? await getProjectForTenant(String(normalizedArgs.sourceProjectId), tenantId)
            : {};
        const pageData = extractPageDataFromTemplateInput(normalizedArgs.data, sourceProject);
        const pages = normalizedArgs.pages || sourceProject.pages || [];
        const theme = normalizedArgs.theme || sourceProject.theme || {};
        const brandIdentity = normalizedArgs.brandIdentity || normalizedArgs.brand_identity || sourceProject.brand_identity || {};
        const componentOrder = normalizedArgs.componentOrder || normalizedArgs.component_order || sourceProject.component_order || [];
        const sectionVisibility = normalizedArgs.sectionVisibility ||
            normalizedArgs.section_visibility ||
            sourceProject.section_visibility ||
            {};
        const templateName = String(normalizedArgs.name);
        const insertPayload = {
            tenant_id: tenantId,
            user_id: auth.userId || null,
            name: templateName,
            description: normalizedArgs.description || sourceProject.description || null,
            category: normalizedArgs.category || sourceProject.category || null,
            tags: Array.isArray(normalizedArgs.tags) ? normalizedArgs.tags : sourceProject.tags || [],
            industries: Array.isArray(normalizedArgs.industries) ? normalizedArgs.industries : sourceProject.industries || [],
            thumbnail_url: normalizedArgs.thumbnailUrl ?? normalizedArgs.thumbnail_url ?? sourceProject.thumbnail_url ?? '',
            favicon_url: normalizedArgs.faviconUrl ?? normalizedArgs.favicon_url ?? sourceProject.favicon_url ?? null,
            status: 'Template',
            pages,
            data: buildAdminTemplateDataColumn({
                name: templateName,
                pageData,
                theme,
                brandIdentity,
                componentOrder,
                sectionVisibility,
                pages,
                menus: normalizedArgs.menus || sourceProject.menus || [],
                thumbnailUrl: normalizedArgs.thumbnailUrl ?? normalizedArgs.thumbnail_url ?? sourceProject.thumbnail_url ?? '',
                description: normalizedArgs.description || sourceProject.description || undefined,
                category: normalizedArgs.category || sourceProject.category || undefined,
                tags: Array.isArray(normalizedArgs.tags) ? normalizedArgs.tags : sourceProject.tags,
                industries: Array.isArray(normalizedArgs.industries) ? normalizedArgs.industries : sourceProject.industries,
            }),
            theme,
            brand_identity: brandIdentity,
            component_order: componentOrder,
            section_visibility: sectionVisibility,
            source_template_id: normalizedArgs.sourceTemplateId || normalizedArgs.source_template_id || sourceProject.source_template_id || null,
            menus: normalizedArgs.menus || sourceProject.menus || [],
            ai_assistant_config: normalizedArgs.aiAssistantConfig || normalizedArgs.ai_assistant_config || sourceProject.ai_assistant_config || {},
            seo_config: normalizedArgs.seoConfig || normalizedArgs.seo_config || sourceProject.seo_config || {},
            crm_config: {
                ...(sourceProject.crm_config || {}),
                ...(normalizedArgs.crmConfig || normalizedArgs.crm_config || {}),
                createdByMcp: true,
                createdByAgent: auth.agentId || null,
                createdFromProjectId: normalizedArgs.sourceProjectId || null,
            },
            is_archived: false,
            created_at: new Date().toISOString(),
            last_updated: new Date().toISOString(),
        };
        assertTemplateHasContent(insertPayload);
        const { data: template, error } = await getSupabaseAdmin()
            .from('projects')
            .insert(insertPayload)
            .select('id, tenant_id, name, status, category, tags, industries, description, thumbnail_url, component_order, section_visibility, data, pages, last_updated')
            .single();
        if (error)
            throw error;
        const { component_order, section_visibility, data: templateData, pages: returnedPages, ...metadata } = template;
        return {
            status: 'success',
            template: metadata,
            contentSummary: summarizeTemplateContent({ component_order, section_visibility, data: templateData, pages: returnedPages }),
        };
    },
    update_template: async (args, auth) => {
        requireScope(auth, 'templates:write');
        const tenantId = assertTenantAccess(auth, args.tenantId);
        const normalizedArgs = normalizeTemplateArgs(args);
        if (!normalizedArgs.templateId)
            throw Object.assign(new Error('templateId is required.'), { status: 400 });
        const { data: existing, error: existingError } = await getSupabaseAdmin()
            .from('projects')
            .select('*')
            .eq('id', normalizedArgs.templateId)
            .eq('tenant_id', tenantId)
            .eq('status', 'Template')
            .maybeSingle();
        if (existingError)
            throw existingError;
        if (!existing)
            throw Object.assign(new Error('Template not found.'), { status: 404 });
        const pageData = normalizedArgs.data !== undefined
            ? extractPageDataFromTemplateInput(normalizedArgs.data, existing)
            : extractPageDataFromTemplateInput(undefined, existing);
        const pages = normalizedArgs.pages ?? existing.pages ?? [];
        const theme = normalizedArgs.theme ?? existing.theme ?? {};
        const brandIdentity = normalizedArgs.brandIdentity ?? normalizedArgs.brand_identity ?? existing.brand_identity ?? {};
        const componentOrder = normalizedArgs.componentOrder ?? normalizedArgs.component_order ?? existing.component_order ?? [];
        const sectionVisibility = normalizedArgs.sectionVisibility ??
            normalizedArgs.section_visibility ??
            existing.section_visibility ??
            {};
        const templateName = normalizedArgs.name ?? existing.name;
        const updates = {
            ...pick(normalizedArgs, ['name', 'description', 'category', 'tags', 'industries']),
            pages,
            theme,
            brand_identity: brandIdentity,
            component_order: componentOrder,
            section_visibility: sectionVisibility,
            ...(normalizedArgs.menus !== undefined ? { menus: normalizedArgs.menus } : {}),
            data: buildAdminTemplateDataColumn({
                name: String(templateName),
                pageData,
                theme,
                brandIdentity,
                componentOrder,
                sectionVisibility,
                pages,
                menus: normalizedArgs.menus ?? existing.menus ?? [],
                thumbnailUrl: normalizedArgs.thumbnailUrl ?? normalizedArgs.thumbnail_url ?? existing.thumbnail_url ?? '',
                description: normalizedArgs.description ?? existing.description ?? undefined,
                category: normalizedArgs.category ?? existing.category ?? undefined,
                tags: normalizedArgs.tags ?? existing.tags,
                industries: normalizedArgs.industries ?? existing.industries,
            }),
            ...(normalizedArgs.thumbnailUrl !== undefined ? { thumbnail_url: normalizedArgs.thumbnailUrl } : {}),
            ...(normalizedArgs.thumbnail_url !== undefined ? { thumbnail_url: normalizedArgs.thumbnail_url } : {}),
            ...(normalizedArgs.faviconUrl !== undefined ? { favicon_url: normalizedArgs.faviconUrl } : {}),
            ...(normalizedArgs.favicon_url !== undefined ? { favicon_url: normalizedArgs.favicon_url } : {}),
            ...(normalizedArgs.aiAssistantConfig !== undefined ? { ai_assistant_config: normalizedArgs.aiAssistantConfig } : {}),
            ...(normalizedArgs.ai_assistant_config !== undefined ? { ai_assistant_config: normalizedArgs.ai_assistant_config } : {}),
            ...(normalizedArgs.seoConfig !== undefined ? { seo_config: normalizedArgs.seoConfig } : {}),
            ...(normalizedArgs.seo_config !== undefined ? { seo_config: normalizedArgs.seo_config } : {}),
            ...(normalizedArgs.crmConfig !== undefined ? { crm_config: normalizedArgs.crmConfig } : {}),
            ...(normalizedArgs.crm_config !== undefined ? { crm_config: normalizedArgs.crm_config } : {}),
            status: 'Template',
            last_updated: new Date().toISOString(),
        };
        assertTemplateHasContent(updates);
        const { data: template, error } = await getSupabaseAdmin()
            .from('projects')
            .update(updates)
            .eq('id', normalizedArgs.templateId)
            .eq('tenant_id', tenantId)
            .eq('status', 'Template')
            .select('id, tenant_id, name, status, category, tags, industries, description, thumbnail_url, component_order, section_visibility, data, pages, last_updated')
            .single();
        if (error)
            throw error;
        const { component_order, section_visibility, data: templateData, pages: returnedPages, ...metadata } = template;
        return {
            status: 'success',
            template: metadata,
            contentSummary: summarizeTemplateContent({ component_order, section_visibility, data: templateData, pages: returnedPages }),
        };
    },
    archive_template: async (args, auth) => {
        requireScope(auth, 'templates:write');
        const tenantId = assertTenantAccess(auth, args.tenantId);
        if (!args.templateId)
            throw Object.assign(new Error('templateId is required.'), { status: 400 });
        const { data: template, error } = await getSupabaseAdmin()
            .from('projects')
            .update({ is_archived: true, last_updated: new Date().toISOString() })
            .eq('id', args.templateId)
            .eq('tenant_id', tenantId)
            .eq('status', 'Template')
            .select('id, name, status, is_archived, last_updated')
            .single();
        if (error)
            throw error;
        return { status: 'success', template };
    },
    create_project_from_template: async (args, auth) => {
        requireAnyScope(auth, ['projects:write', 'ai:apply_to_project']);
        const tenantId = assertTenantAccess(auth, args.tenantId);
        if (!args.templateId)
            throw Object.assign(new Error('templateId is required.'), { status: 400 });
        const { data: template, error } = await getSupabaseAdmin()
            .from('projects')
            .select('*')
            .eq('id', args.templateId)
            .eq('status', 'Template')
            .maybeSingle();
        if (error)
            throw error;
        if (!template)
            throw Object.assign(new Error('Template not found.'), { status: 404 });
        const insertPayload = {
            tenant_id: tenantId,
            user_id: auth.userId || null,
            name: args.name || `${template.name || 'Template'} Copy`,
            thumbnail_url: template.thumbnail_url || '',
            favicon_url: template.favicon_url || null,
            status: 'Draft',
            pages: template.pages || [],
            data: template.data || {},
            theme: template.theme || {},
            brand_identity: template.brand_identity || {},
            component_order: template.component_order || [],
            section_visibility: template.section_visibility || {},
            source_template_id: template.id,
            menus: template.menus || [],
            ai_assistant_config: template.ai_assistant_config || {},
            seo_config: template.seo_config || {},
            crm_config: template.crm_config || {},
            is_archived: false,
            created_at: new Date().toISOString(),
            last_updated: new Date().toISOString(),
        };
        const { data: project, error: insertError } = await getSupabaseAdmin()
            .from('projects')
            .insert(insertPayload)
            .select('id, name, tenant_id, source_template_id, status, last_updated')
            .single();
        if (insertError)
            throw insertError;
        return { status: 'success', project };
    },
    create_project: async (args, auth) => {
        requireScope(auth, 'projects:write');
        const tenantId = assertTenantAccess(auth, args.tenantId);
        if (!args.name)
            throw Object.assign(new Error('name is required.'), { status: 400 });
        const insertPayload = {
            tenant_id: tenantId,
            user_id: auth.userId || null,
            name: String(args.name),
            description: args.description || null,
            category: args.category || null,
            tags: Array.isArray(args.tags) ? args.tags : [],
            industries: Array.isArray(args.industries) ? args.industries : [],
            thumbnail_url: args.thumbnailUrl ?? args.thumbnail_url ?? '',
            favicon_url: args.faviconUrl ?? args.favicon_url ?? null,
            status: args.status || 'Draft',
            pages: args.pages || [],
            data: args.data || {},
            theme: args.theme || {},
            brand_identity: args.brandIdentity || args.brand_identity || {},
            component_order: args.componentOrder || args.component_order || [],
            section_visibility: args.sectionVisibility || args.section_visibility || {},
            source_template_id: args.sourceTemplateId || args.source_template_id || null,
            menus: args.menus || [],
            ai_assistant_config: args.aiAssistantConfig || args.ai_assistant_config || {},
            seo_config: args.seoConfig || args.seo_config || {},
            crm_config: {
                ...(args.crmConfig || args.crm_config || {}),
                createdByMcp: true,
                createdByAgent: auth.agentId || null,
            },
            is_archived: false,
            created_at: new Date().toISOString(),
            last_updated: new Date().toISOString(),
        };
        const { data: project, error } = await getSupabaseAdmin()
            .from('projects')
            .insert(insertPayload)
            .select('id, tenant_id, name, status, source_template_id, last_updated')
            .single();
        if (error)
            throw error;
        return { status: 'success', project };
    },
    list_projects: async (args, auth) => {
        requireScope(auth, 'projects:read');
        const tenantId = assertTenantAccess(auth, args.tenantId);
        const { data, error } = await getSupabaseAdmin()
            .from('projects')
            .select('id, name, status, thumbnail_url, source_template_id, category, tags, last_updated, created_at')
            .eq('tenant_id', tenantId)
            .eq('is_archived', false)
            .order('last_updated', { ascending: false })
            .limit(limitNumber(args.limit, 50, 100));
        if (error)
            throw error;
        return { projects: data || [] };
    },
    get_project: async (args, auth) => {
        requireScope(auth, 'projects:read');
        const tenantId = assertTenantAccess(auth, args.tenantId);
        if (!args.projectId)
            throw Object.assign(new Error('projectId is required.'), { status: 400 });
        return { project: await getProjectForTenant(args.projectId, tenantId) };
    },
    update_project_page: async (args, auth) => {
        requireScope(auth, 'projects:write');
        const tenantId = assertTenantAccess(auth, args.tenantId);
        if (!args.projectId)
            throw Object.assign(new Error('projectId is required.'), { status: 400 });
        const project = await getProjectForTenant(args.projectId, tenantId);
        const pages = Array.isArray(project.pages) ? [...project.pages] : [];
        const page = args.page || args.updates;
        if (!page || typeof page !== 'object')
            throw Object.assign(new Error('page or updates is required.'), { status: 400 });
        const pageId = args.pageId || page.id || randomUUID();
        const nextPage = { ...page, id: pageId, updatedAt: new Date().toISOString() };
        const index = pages.findIndex((item) => item.id === pageId || (page.slug && item.slug === page.slug));
        if (index >= 0)
            pages[index] = args.replace ? nextPage : { ...pages[index], ...nextPage };
        else
            pages.push({ showInNavigation: true, isHomePage: pages.length === 0, ...nextPage });
        await updateProjectData(args.projectId, { pages });
        return { status: 'success', projectId: args.projectId, pageId };
    },
    update_project_sections: async (args, auth) => {
        requireScope(auth, 'projects:write');
        const tenantId = assertTenantAccess(auth, args.tenantId);
        if (!args.projectId)
            throw Object.assign(new Error('projectId is required.'), { status: 400 });
        const project = await getProjectForTenant(args.projectId, tenantId);
        const sections = args.sections || {};
        if (!sections || typeof sections !== 'object')
            throw Object.assign(new Error('sections is required.'), { status: 400 });
        if (args.pageId) {
            const pages = Array.isArray(project.pages) ? [...project.pages] : [];
            const pageIndex = pages.findIndex((page) => page.id === args.pageId);
            if (pageIndex === -1)
                throw Object.assign(new Error('Page not found.'), { status: 404 });
            pages[pageIndex] = {
                ...pages[pageIndex],
                sectionData: args.replace
                    ? sections
                    : { ...(pages[pageIndex].sectionData || {}), ...sections },
                updatedAt: new Date().toISOString(),
            };
            await updateProjectData(args.projectId, { pages });
            return { status: 'success', projectId: args.projectId, pageId: args.pageId };
        }
        const writeContext = getProjectDataWriteContext(project);
        if (args.replace) {
            for (const [section, content] of Object.entries(sections)) {
                writeContext.pageData[section] = content;
            }
        }
        else {
            for (const [section, content] of Object.entries(sections)) {
                writeContext.updateSection(section, (sectionState) => typeof content === 'object' && content !== null && !Array.isArray(content)
                    ? { ...sectionState, ...content }
                    : content);
            }
        }
        await updateProjectData(args.projectId, { data: writeContext.buildDataColumn() });
        return { status: 'success', projectId: args.projectId };
    },
    validate_project: async (args, auth) => {
        requireScope(auth, 'projects:read');
        const tenantId = assertTenantAccess(auth, args.tenantId);
        if (!args.projectId)
            throw Object.assign(new Error('projectId is required.'), { status: 400 });
        const project = await getProjectForTenant(args.projectId, tenantId);
        const pages = Array.isArray(project.pages) ? project.pages : [];
        const warnings = [];
        if (pages.length === 0)
            warnings.push('Project has no pages.');
        if (!pages.some((page) => page.isHomePage || page.slug === '/'))
            warnings.push('Project has no home page.');
        if (!project.seo_config && !pages.some((page) => page.seo))
            warnings.push('Project has no SEO metadata.');
        if (!project.ai_assistant_config)
            warnings.push('Project has no chatbot configuration.');
        return { status: warnings.length ? 'warning' : 'valid', warnings, pageCount: pages.length };
    },
    publish_project_preview: async (args, auth) => {
        requireScope(auth, 'projects:write');
        const tenantId = assertTenantAccess(auth, args.tenantId);
        if (!args.projectId)
            throw Object.assign(new Error('projectId is required.'), { status: 400 });
        const project = await getProjectForTenant(args.projectId, tenantId);
        await updateProjectData(args.projectId, {
            status: args.status || 'Preview',
            crm_config: {
                ...(project.crm_config || {}),
                previewPublishedAt: new Date().toISOString(),
                previewPublishedByAgent: auth.agentId,
            },
        });
        return { status: 'success', projectId: args.projectId };
    },
    list_leads: async (args, auth) => {
        requireScope(auth, 'leads:read');
        const tenantId = assertTenantAccess(auth, args.tenantId);
        let query = getSupabaseAdmin()
            .from('leads')
            .select('*')
            .eq('tenant_id', tenantId)
            .order('created_at', { ascending: false })
            .limit(limitNumber(args.limit, 50, 100));
        if (args.projectId)
            query = query.eq('project_id', args.projectId);
        if (args.status)
            query = query.eq('status', args.status);
        const { data, error } = await query;
        if (error)
            throw error;
        return { leads: data || [] };
    },
    create_lead: async (args, auth) => {
        requireScope(auth, 'leads:write');
        const tenantId = assertTenantAccess(auth, args.tenantId);
        const projectId = args.projectId || auth.projectId;
        if (!projectId)
            throw Object.assign(new Error('projectId is required.'), { status: 400 });
        await getProjectForTenant(projectId, tenantId);
        const payload = {
            tenant_id: tenantId,
            project_id: String(projectId),
            status: args.status || 'new',
            source: args.source || 'mcp',
            ...pick(args, ['name', 'email', 'phone', 'company', 'value', 'tags', 'notes', 'custom_data']),
        };
        const { data, error } = await getSupabaseAdmin().from('leads').insert(payload).select('*').single();
        if (error)
            throw error;
        return { status: 'success', lead: data };
    },
    update_lead: async (args, auth) => {
        requireScope(auth, 'leads:write');
        const tenantId = assertTenantAccess(auth, args.tenantId);
        if (!args.leadId)
            throw Object.assign(new Error('leadId is required.'), { status: 400 });
        await getLeadForTenant(args.leadId, tenantId);
        const updates = {
            ...pick(args, ['name', 'email', 'phone', 'company', 'status', 'source', 'value', 'tags', 'notes', 'custom_data', 'last_contact_date']),
            ...(args.updates || {}),
            updated_at: new Date().toISOString(),
        };
        const { data, error } = await getSupabaseAdmin()
            .from('leads')
            .update(updates)
            .eq('id', args.leadId)
            .eq('tenant_id', tenantId)
            .select('*')
            .single();
        if (error)
            throw error;
        return { status: 'success', lead: data };
    },
    delete_lead: async (args, auth) => {
        requireScope(auth, 'leads:write');
        const tenantId = assertTenantAccess(auth, args.tenantId);
        if (!args.leadId)
            throw Object.assign(new Error('leadId is required.'), { status: 400 });
        await getLeadForTenant(args.leadId, tenantId);
        const { error } = await getSupabaseAdmin().from('leads').delete().eq('id', args.leadId).eq('tenant_id', tenantId);
        if (error)
            throw error;
        return { status: 'success', leadId: args.leadId };
    },
    add_lead_activity: async (args, auth) => {
        requireScope(auth, 'leads:write');
        const tenantId = assertTenantAccess(auth, args.tenantId);
        if (!args.leadId)
            throw Object.assign(new Error('leadId is required.'), { status: 400 });
        const lead = await getLeadForTenant(args.leadId, tenantId);
        const { data, error } = await getSupabaseAdmin()
            .from('lead_activities')
            .insert({
            tenant_id: tenantId,
            lead_id: args.leadId,
            project_id: lead.project_id,
            type: args.type || 'note',
            description: args.description || args.notes || '',
        })
            .select('*')
            .single();
        if (error)
            throw error;
        return { status: 'success', activity: data };
    },
    create_lead_task: async (args, auth) => {
        requireScope(auth, 'leads:write');
        const tenantId = assertTenantAccess(auth, args.tenantId);
        if (!args.leadId || !args.title)
            throw Object.assign(new Error('leadId and title are required.'), { status: 400 });
        const lead = await getLeadForTenant(args.leadId, tenantId);
        const { data, error } = await getSupabaseAdmin()
            .from('lead_tasks')
            .insert({
            tenant_id: tenantId,
            lead_id: args.leadId,
            project_id: lead.project_id,
            title: args.title,
            description: args.description || null,
            due_date: args.dueDate || args.due_date || null,
            status: args.status || 'pending',
        })
            .select('*')
            .single();
        if (error)
            throw error;
        return { status: 'success', task: data };
    },
    list_articles: async (args, auth) => {
        requireScope(auth, 'cms:read');
        assertTenantAccess(auth, args.tenantId);
        let query = getSupabaseAdmin()
            .from('app_articles')
            .select('*')
            .order('updated_at', { ascending: false })
            .limit(limitNumber(args.limit, 50, 100));
        if (args.status)
            query = query.eq('status', args.status);
        if (args.language)
            query = query.eq('language', args.language);
        const { data, error } = await query;
        if (error)
            throw error;
        return { articles: data || [] };
    },
    create_article: async (args, auth) => {
        requireScope(auth, 'cms:write');
        assertTenantAccess(auth, args.tenantId);
        if (!args.title || !args.content)
            throw Object.assign(new Error('title and content are required.'), { status: 400 });
        const slug = args.slug || slugify(args.title);
        const { data, error } = await getSupabaseAdmin()
            .from('app_articles')
            .insert({
            id: args.id || `${slug}-${Date.now()}`,
            slug,
            title: args.title,
            excerpt: args.excerpt || null,
            content: args.content,
            category: args.category || null,
            tags: args.tags || [],
            image_url: args.imageUrl || args.image_url || null,
            author: args.author || auth.keyName || 'MCP Agent',
            status: args.status || 'draft',
            featured: args.featured === true,
            priority: args.priority || 0,
            language: args.language || 'es',
            read_time: args.readTime || args.read_time || 1,
            published_at: args.status === 'published' ? new Date().toISOString() : null,
        })
            .select('*')
            .single();
        if (error)
            throw error;
        return { status: 'success', article: data };
    },
    update_article: async (args, auth) => {
        requireScope(auth, 'cms:write');
        assertTenantAccess(auth, args.tenantId);
        if (!args.articleId && !args.slug)
            throw Object.assign(new Error('articleId or slug is required.'), { status: 400 });
        const updates = {
            ...pick(args, ['title', 'excerpt', 'content', 'category', 'tags', 'status', 'featured', 'priority', 'language']),
            ...(args.imageUrl ? { image_url: args.imageUrl } : {}),
            ...(args.updates || {}),
            updated_at: new Date().toISOString(),
        };
        let query = getSupabaseAdmin().from('app_articles').update(updates);
        query = args.articleId ? query.eq('id', args.articleId) : query.eq('slug', args.slug);
        const { data, error } = await query.select('*').single();
        if (error)
            throw error;
        return { status: 'success', article: data };
    },
    publish_article: async (args, auth) => {
        requireScope(auth, 'cms:write');
        return toolHandlers.update_article({
            ...args,
            updates: { status: 'published', published_at: new Date().toISOString() },
        }, auth);
    },
    update_navigation: async (args, auth) => {
        requireScope(auth, 'cms:write');
        assertTenantAccess(auth, args.tenantId);
        if (!Array.isArray(args.links))
            throw Object.assign(new Error('links array is required.'), { status: 400 });
        const { data, error } = await getSupabaseAdmin()
            .from('app_navigation')
            .upsert({ id: args.navigationId || 'main', links: args.links, updated_at: new Date().toISOString() })
            .select('*')
            .single();
        if (error)
            throw error;
        return { status: 'success', navigation: data };
    },
    update_seo_metadata: async (args, auth) => {
        requireScope(auth, 'cms:write');
        const tenantId = assertTenantAccess(auth, args.tenantId);
        if (!args.projectId || !args.seo)
            throw Object.assign(new Error('projectId and seo are required.'), { status: 400 });
        const project = await getProjectForTenant(args.projectId, tenantId);
        if (args.pageId) {
            const pages = Array.isArray(project.pages) ? [...project.pages] : [];
            const pageIndex = pages.findIndex((page) => page.id === args.pageId);
            if (pageIndex === -1)
                throw Object.assign(new Error('Page not found.'), { status: 404 });
            pages[pageIndex] = { ...pages[pageIndex], seo: args.seo, updatedAt: new Date().toISOString() };
            await updateProjectData(args.projectId, { pages });
        }
        else {
            await updateProjectData(args.projectId, { seo_config: { ...(project.seo_config || {}), ...args.seo } });
        }
        return { status: 'success', projectId: args.projectId, pageId: args.pageId || null };
    },
    list_products: async (args, auth) => {
        requireScope(auth, 'commerce:read');
        const tenantId = assertTenantAccess(auth, args.tenantId);
        if (!args.projectId)
            throw Object.assign(new Error('projectId is required.'), { status: 400 });
        await getProjectForTenant(args.projectId, tenantId);
        let query = getSupabaseAdmin()
            .from('store_products')
            .select('*')
            .eq('project_id', args.projectId)
            .order('updated_at', { ascending: false })
            .limit(limitNumber(args.limit, 50, 100));
        if (args.status)
            query = query.eq('status', args.status);
        const { data, error } = await query;
        if (error)
            throw error;
        return { products: data || [] };
    },
    create_product: async (args, auth) => {
        requireScope(auth, 'commerce:write');
        const tenantId = assertTenantAccess(auth, args.tenantId);
        if (!args.projectId || !args.name)
            throw Object.assign(new Error('projectId and name are required.'), { status: 400 });
        await getProjectForTenant(args.projectId, tenantId);
        const { data, error } = await getSupabaseAdmin()
            .from('store_products')
            .insert({
            project_id: args.projectId,
            name: args.name,
            slug: args.slug || slugify(args.name),
            description: args.description || null,
            short_description: args.shortDescription || args.short_description || null,
            price: args.price || 0,
            compare_at_price: args.compareAtPrice || args.compare_at_price || null,
            currency: args.currency || 'USD',
            sku: args.sku || null,
            quantity: args.quantity || 0,
            images: args.images || [],
            tags: args.tags || [],
            status: args.status || 'draft',
            is_featured: args.isFeatured === true || args.is_featured === true,
            variants: args.variants || [],
            options: args.options || [],
        })
            .select('*')
            .single();
        if (error)
            throw error;
        return { status: 'success', product: data };
    },
    update_product: async (args, auth) => {
        requireScope(auth, 'commerce:write');
        const tenantId = assertTenantAccess(auth, args.tenantId);
        if (!args.projectId || !args.productId)
            throw Object.assign(new Error('projectId and productId are required.'), { status: 400 });
        await getProjectForTenant(args.projectId, tenantId);
        const updates = {
            ...pick(args, ['name', 'slug', 'description', 'price', 'currency', 'sku', 'quantity', 'images', 'tags', 'status', 'variants', 'options']),
            ...(args.shortDescription ? { short_description: args.shortDescription } : {}),
            ...(args.compareAtPrice ? { compare_at_price: args.compareAtPrice } : {}),
            ...(args.isFeatured !== undefined ? { is_featured: args.isFeatured === true } : {}),
            ...(args.updates || {}),
            updated_at: new Date().toISOString(),
        };
        const { data, error } = await getSupabaseAdmin()
            .from('store_products')
            .update(updates)
            .eq('id', args.productId)
            .eq('project_id', args.projectId)
            .select('*')
            .single();
        if (error)
            throw error;
        return { status: 'success', product: data };
    },
    list_orders: async (args, auth) => {
        requireScope(auth, 'commerce:read');
        const tenantId = assertTenantAccess(auth, args.tenantId);
        if (!args.projectId)
            throw Object.assign(new Error('projectId is required.'), { status: 400 });
        await getProjectForTenant(args.projectId, tenantId);
        let query = getSupabaseAdmin()
            .from('store_orders')
            .select('*')
            .eq('project_id', args.projectId)
            .order('created_at', { ascending: false })
            .limit(limitNumber(args.limit, 50, 100));
        if (args.status)
            query = query.eq('status', args.status);
        const { data, error } = await query;
        if (error)
            throw error;
        return { orders: data || [] };
    },
    update_order_status: async (args, auth) => {
        requireScope(auth, 'commerce:write');
        const tenantId = assertTenantAccess(auth, args.tenantId);
        if (!args.projectId || !args.orderId)
            throw Object.assign(new Error('projectId and orderId are required.'), { status: 400 });
        await getProjectForTenant(args.projectId, tenantId);
        const updates = {
            ...(args.status ? { status: args.status } : {}),
            ...(args.paymentStatus ? { payment_status: args.paymentStatus } : {}),
            ...(args.fulfillmentStatus ? { fulfillment_status: args.fulfillmentStatus } : {}),
            ...(args.trackingNumber ? { tracking_number: args.trackingNumber } : {}),
            ...(args.trackingUrl ? { tracking_url: args.trackingUrl } : {}),
            ...(args.carrier ? { carrier: args.carrier } : {}),
            updated_at: new Date().toISOString(),
        };
        const { data, error } = await getSupabaseAdmin()
            .from('store_orders')
            .update(updates)
            .eq('id', args.orderId)
            .eq('project_id', args.projectId)
            .select('*')
            .single();
        if (error)
            throw error;
        return { status: 'success', order: data };
    },
    create_discount: async (args, auth) => {
        requireScope(auth, 'commerce:write');
        const tenantId = assertTenantAccess(auth, args.tenantId);
        if (!args.projectId)
            throw Object.assign(new Error('projectId is required.'), { status: 400 });
        await getProjectForTenant(args.projectId, tenantId);
        const code = (args.code || `MCP${Date.now().toString().slice(-6)}`).toUpperCase();
        const { data, error } = await getSupabaseAdmin()
            .from('store_discounts')
            .insert({
            project_id: args.projectId,
            code,
            type: args.type || 'percentage',
            value: args.value || 10,
            minimum_purchase: args.minimumPurchase || args.minimum_purchase || 0,
            max_uses: args.maxUses || args.max_uses || null,
            used_count: 0,
            starts_at: args.startsAt || args.starts_at || new Date().toISOString(),
            ends_at: args.endsAt || args.ends_at || null,
            is_active: args.isActive !== false,
        })
            .select('*')
            .single();
        if (error)
            throw error;
        return { status: 'success', discount: data };
    },
    list_appointments: async (args, auth) => {
        requireScope(auth, 'appointments:read');
        const tenantId = assertTenantAccess(auth, args.tenantId);
        if (!args.projectId)
            throw Object.assign(new Error('projectId is required.'), { status: 400 });
        await getProjectForTenant(args.projectId, tenantId);
        let query = getSupabaseAdmin()
            .from('project_appointments')
            .select('*')
            .eq('tenant_id', tenantId)
            .eq('project_id', args.projectId)
            .order('start_date', { ascending: true })
            .limit(limitNumber(args.limit, 50, 100));
        if (args.status)
            query = query.eq('status', args.status);
        const { data, error } = await query;
        if (error)
            throw error;
        return { appointments: data || [] };
    },
    create_appointment: async (args, auth) => {
        requireScope(auth, 'appointments:write');
        const tenantId = assertTenantAccess(auth, args.tenantId);
        if (!args.projectId || !args.title || !args.startDate || !args.endDate) {
            throw Object.assign(new Error('projectId, title, startDate, and endDate are required.'), { status: 400 });
        }
        await getProjectForTenant(args.projectId, tenantId);
        const { data, error } = await getSupabaseAdmin()
            .from('project_appointments')
            .insert({
            tenant_id: tenantId,
            project_id: args.projectId,
            title: args.title,
            description: args.description || null,
            type: args.type || 'consultation',
            status: args.status || 'scheduled',
            priority: args.priority || 'medium',
            start_date: args.startDate,
            end_date: args.endDate,
            timezone: args.timezone || 'UTC',
            participants: args.participants || [],
            location: args.location || { type: 'virtual' },
            linked_lead_ids: args.linkedLeadIds || args.linked_lead_ids || [],
            tags: args.tags || [],
            created_by: auth.userId || null,
        })
            .select('*')
            .single();
        if (error)
            throw error;
        return { status: 'success', appointment: data };
    },
    update_appointment: async (args, auth) => {
        requireScope(auth, 'appointments:write');
        const tenantId = assertTenantAccess(auth, args.tenantId);
        if (!args.appointmentId)
            throw Object.assign(new Error('appointmentId is required.'), { status: 400 });
        const updates = {
            ...pick(args, ['title', 'description', 'type', 'status', 'priority', 'timezone', 'participants', 'location', 'tags', 'outcome']),
            ...(args.startDate ? { start_date: args.startDate } : {}),
            ...(args.endDate ? { end_date: args.endDate } : {}),
            ...(args.linkedLeadIds ? { linked_lead_ids: args.linkedLeadIds } : {}),
            ...(args.updates || {}),
            updated_at: new Date().toISOString(),
            updated_by: auth.userId || null,
        };
        const { data, error } = await getSupabaseAdmin()
            .from('project_appointments')
            .update(updates)
            .eq('id', args.appointmentId)
            .eq('tenant_id', tenantId)
            .select('*')
            .single();
        if (error)
            throw error;
        return { status: 'success', appointment: data };
    },
    delete_appointment: async (args, auth) => {
        requireScope(auth, 'appointments:write');
        const tenantId = assertTenantAccess(auth, args.tenantId);
        if (!args.appointmentId)
            throw Object.assign(new Error('appointmentId is required.'), { status: 400 });
        const { error } = await getSupabaseAdmin()
            .from('project_appointments')
            .delete()
            .eq('id', args.appointmentId)
            .eq('tenant_id', tenantId);
        if (error)
            throw error;
        return { status: 'success', appointmentId: args.appointmentId };
    },
    block_appointment_date: async (args, auth) => {
        requireScope(auth, 'appointments:write');
        const tenantId = assertTenantAccess(auth, args.tenantId);
        if (!args.projectId || !args.date)
            throw Object.assign(new Error('projectId and date are required.'), { status: 400 });
        await getProjectForTenant(args.projectId, tenantId);
        const { data, error } = await getSupabaseAdmin()
            .from('blocked_dates')
            .insert({ project_id: args.projectId, date: args.date, reason: args.reason || 'Blocked by MCP agent' })
            .select('*')
            .single();
        if (error)
            throw error;
        return { status: 'success', blockedDate: data };
    },
    list_domains: async (args, auth) => {
        requireScope(auth, 'domains:read');
        const tenantId = assertTenantAccess(auth, args.tenantId);
        let query = getSupabaseAdmin().from('custom_domains').select('*').limit(limitNumber(args.limit, 50, 100));
        if (args.projectId) {
            await getProjectForTenant(args.projectId, tenantId);
            query = query.eq('project_id', args.projectId);
        }
        else {
            const { data: projects, error: projectsError } = await getSupabaseAdmin()
                .from('projects')
                .select('id')
                .eq('tenant_id', tenantId);
            if (projectsError)
                throw projectsError;
            query = query.in('project_id', (projects || []).map((project) => project.id));
        }
        const { data, error } = await query;
        if (error)
            throw error;
        return { domains: data || [] };
    },
    get_domain_status: async (args, auth) => {
        requireScope(auth, 'domains:read');
        const tenantId = assertTenantAccess(auth, args.tenantId);
        if (!args.domain && !args.domainId)
            throw Object.assign(new Error('domain or domainId is required.'), { status: 400 });
        let query = getSupabaseAdmin().from('custom_domains').select('*');
        query = args.domainId ? query.eq('id', args.domainId) : query.or(`domain_name.eq.${args.domain},domain.eq.${args.domain}`);
        const { data, error } = await query.maybeSingle();
        if (error)
            throw error;
        if (!data)
            throw Object.assign(new Error('Domain not found.'), { status: 404 });
        if (data.project_id)
            await getProjectForTenant(data.project_id, tenantId);
        return { domain: data };
    },
    list_deployment_logs: async (args, auth) => {
        requireScope(auth, 'domains:read');
        const tenantId = assertTenantAccess(auth, args.tenantId);
        let query = getSupabaseAdmin()
            .from('deployment_logs')
            .select('*')
            .eq('tenant_id', tenantId)
            .order('created_at', { ascending: false })
            .limit(limitNumber(args.limit, 50, 100));
        if (args.projectId)
            query = query.eq('project_id', args.projectId);
        const { data, error } = await query;
        if (error)
            throw error;
        return { logs: data || [] };
    },
    get_tenant_summary: async (args, auth) => {
        requireScope(auth, 'reports:read');
        const tenantId = assertTenantAccess(auth, args.tenantId);
        const supabase = getSupabaseAdmin();
        const [projects, leads, logs] = await Promise.all([
            supabase.from('projects').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId).eq('is_archived', false),
            supabase.from('leads').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId),
            supabase.from('api_logs').select('id', { count: 'exact', head: true }).filter('metadata->>tenant_id', 'eq', tenantId),
        ]);
        if (projects.error)
            throw projects.error;
        if (leads.error)
            throw leads.error;
        if (logs.error)
            throw logs.error;
        return {
            tenantId,
            projects: projects.count || 0,
            leads: leads.count || 0,
            mcpCalls: logs.count || 0,
        };
    },
    get_project_summary: async (args, auth) => {
        requireScope(auth, 'reports:read');
        const tenantId = assertTenantAccess(auth, args.tenantId);
        if (!args.projectId)
            throw Object.assign(new Error('projectId is required.'), { status: 400 });
        const project = await getProjectForTenant(args.projectId, tenantId);
        const supabase = getSupabaseAdmin();
        const [leads, products, orders, appointments] = await Promise.all([
            supabase.from('leads').select('id', { count: 'exact', head: true }).eq('project_id', args.projectId),
            supabase.from('store_products').select('id', { count: 'exact', head: true }).eq('project_id', args.projectId),
            supabase.from('store_orders').select('id', { count: 'exact', head: true }).eq('project_id', args.projectId),
            supabase.from('project_appointments').select('id', { count: 'exact', head: true }).eq('project_id', args.projectId),
        ]);
        for (const result of [leads, products, orders, appointments])
            if (result.error)
                throw result.error;
        return {
            project: { id: project.id, name: project.name, status: project.status, lastUpdated: project.last_updated },
            counts: {
                leads: leads.count || 0,
                products: products.count || 0,
                orders: orders.count || 0,
                appointments: appointments.count || 0,
            },
        };
    },
    ai_list_generators: async () => ({
        generators: GENERATOR_PRESETS,
        scopes: MCP_SCOPES,
    }),
    ai_generate_content: async (args, auth) => {
        requireScope(auth, 'ai:generate_content');
        const input = commonGenerationInput(args, auth, 'ai_generate_content');
        if (!input.brief)
            throw Object.assign(new Error('brief is required.'), { status: 400 });
        return generateContent(getSupabaseAdmin(), auth, input, 'content');
    },
    ai_generate_page_json: async (args, auth) => {
        requireScope(auth, 'ai:generate_content');
        const input = commonGenerationInput(args, auth, 'ai_generate_page_json');
        if (!input.brief)
            throw Object.assign(new Error('brief is required.'), { status: 400 });
        input.modelPreset = input.modelPreset || 'structured-json';
        return generateContent(getSupabaseAdmin(), auth, input, 'page-json');
    },
    ai_generate_image_prompt: async (args, auth) => {
        requireScope(auth, 'ai:generate_content');
        const input = commonGenerationInput(args, auth, 'ai_generate_image_prompt');
        if (!input.brief)
            throw Object.assign(new Error('brief or prompt is required.'), { status: 400 });
        return generateContent(getSupabaseAdmin(), auth, input, 'prompt');
    },
    ai_analyze_visual_reference: async (args, auth) => {
        requireScope(auth, 'ai:generate_content');
        const input = commonGenerationInput(args, auth, 'ai_analyze_visual_reference');
        if (!input.referenceImages?.length) {
            throw Object.assign(new Error('referenceImages is required.'), { status: 400 });
        }
        input.modelPreset = input.modelPreset || 'visual-reference';
        return generateContent(getSupabaseAdmin(), auth, input, 'visual-analysis');
    },
    ai_generate_image: async (args, auth) => {
        requireScope(auth, 'ai:generate_image');
        const input = commonGenerationInput(args, auth, 'ai_generate_image');
        if (!input.brief)
            throw Object.assign(new Error('brief or prompt is required.'), { status: 400 });
        return generateImage(getSupabaseAdmin(), auth, input);
    },
    ai_generate_project_assets: async (args, auth) => {
        requireScope(auth, 'ai:generate_batch');
        const tenantId = assertTenantAccess(auth, args.tenantId);
        const projectId = args.projectId || auth.projectId;
        if (!projectId)
            throw Object.assign(new Error('projectId is required.'), { status: 400 });
        await getProjectForTenant(projectId, tenantId);
        const requests = Array.isArray(args.assets) ? args.assets : [];
        if (requests.length === 0)
            throw Object.assign(new Error('assets array is required.'), { status: 400 });
        if (requests.length > 12)
            throw Object.assign(new Error('Maximum 12 assets per batch.'), { status: 400 });
        const results = [];
        const failedItems = [];
        for (const asset of requests) {
            try {
                const result = await generateImage(getSupabaseAdmin(), auth, commonGenerationInput({
                    ...args,
                    ...asset,
                    tenantId,
                    projectId,
                    saveTo: asset.saveTo || args.saveTo || 'project',
                    purpose: asset.purpose || `${asset.section || 'project'} asset`,
                    brief: asset.brief || asset.prompt || args.brief,
                    imageOptions: { ...(args.imageOptions || {}), ...(asset.imageOptions || {}) },
                    metadata: { ...(args.metadata || {}), batch: true },
                }, auth, 'ai_generate_project_assets'));
                results.push({ request: asset, result });
            }
            catch (error) {
                failedItems.push({ request: asset, error: error.message });
            }
        }
        return {
            status: failedItems.length ? 'partial' : 'success',
            results,
            failedItems,
        };
    },
    ai_apply_generated_content: async (args, auth) => {
        requireScope(auth, 'ai:apply_to_project');
        const tenantId = assertTenantAccess(auth, args.tenantId);
        const projectId = args.projectId || auth.projectId;
        if (!projectId)
            throw Object.assign(new Error('projectId is required.'), { status: 400 });
        if (!args.section && !args.pageId) {
            throw Object.assign(new Error('section or pageId is required.'), { status: 400 });
        }
        const project = await getProjectForTenant(projectId, tenantId);
        const content = args.content?.structured || args.content?.content || args.content;
        if (content === undefined)
            throw Object.assign(new Error('content is required.'), { status: 400 });
        const versionedData = createAiApplySnapshotData(project, auth, tenantId, 'ai_apply_generated_content', {
            sectionId: args.section,
            pageId: args.pageId,
        });
        if (args.pageId) {
            const pages = Array.isArray(project.pages) ? [...project.pages] : [];
            const pageIndex = pages.findIndex((page) => page.id === args.pageId);
            if (pageIndex === -1)
                throw Object.assign(new Error('Page not found.'), { status: 404 });
            if (args.section) {
                pages[pageIndex] = {
                    ...pages[pageIndex],
                    sectionData: mergeSectionData(pages[pageIndex].sectionData, args.section, content, args.replace === true),
                    updatedAt: new Date().toISOString(),
                };
            }
            else {
                pages[pageIndex] = { ...pages[pageIndex], ...content, updatedAt: new Date().toISOString() };
            }
            await updateProjectData(projectId, {
                data: versionedData,
                pages,
            });
            return { status: 'success', projectId, pageId: args.pageId, section: args.section };
        }
        const writeContext = getProjectDataWriteContext(project);
        if (args.replace === true) {
            writeContext.pageData[args.section] = content;
        }
        else {
            writeContext.updateSection(args.section, (sectionState) => ({ ...sectionState, ...content }));
        }
        await updateProjectData(projectId, {
            data: {
                ...writeContext.buildDataColumn(),
                versionHistory: versionedData.versionHistory,
            },
        });
        return { status: 'success', projectId, section: args.section };
    },
    ai_apply_generated_images: async (args, auth) => {
        requireScope(auth, 'ai:apply_to_project');
        const tenantId = assertTenantAccess(auth, args.tenantId);
        const projectId = args.projectId || auth.projectId;
        if (!projectId)
            throw Object.assign(new Error('projectId is required.'), { status: 400 });
        const replacements = Array.isArray(args.replacements) ? args.replacements : [];
        if (replacements.length === 0) {
            throw Object.assign(new Error('replacements array is required.'), { status: 400 });
        }
        const project = await getProjectForTenant(projectId, tenantId);
        const pages = Array.isArray(project.pages) ? [...project.pages] : [];
        const writeContext = getProjectDataWriteContext(project);
        const updatedAssetIds = [];
        const versionedData = createAiApplySnapshotData(project, auth, tenantId, 'ai_apply_generated_images', {
            sectionId: replacements[0]?.section,
            pageId: args.pageId || replacements[0]?.pageId,
        });
        for (const replacement of replacements) {
            if (!replacement.url || !replacement.section || !replacement.path) {
                throw Object.assign(new Error('Each replacement requires section, path, and url.'), { status: 400 });
            }
            const pageId = replacement.pageId || args.pageId;
            if (pageId) {
                const pageIndex = pages.findIndex((page) => page.id === pageId);
                if (pageIndex === -1)
                    throw Object.assign(new Error(`Page not found: ${pageId}`), { status: 404 });
                const sectionData = { ...(pages[pageIndex].sectionData || {}) };
                const section = { ...(sectionData[replacement.section] || {}) };
                setDeepValue(section, replacement.path, replacement.url);
                sectionData[replacement.section] = section;
                pages[pageIndex] = { ...pages[pageIndex], sectionData, updatedAt: new Date().toISOString() };
            }
            else {
                writeContext.updateSection(replacement.section, (sectionState) => {
                    const next = { ...sectionState };
                    setDeepValue(next, replacement.path, replacement.url);
                    return next;
                });
            }
            if (replacement.assetId)
                updatedAssetIds.push(replacement.assetId);
        }
        await updateProjectData(projectId, {
            data: {
                ...writeContext.buildDataColumn(),
                versionHistory: versionedData.versionHistory,
            },
            ...(pages.length ? { pages } : {}),
        });
        return { status: 'success', projectId, updatedAssetIds };
    },
    ai_generate_full_project: async (args, auth) => {
        requireScope(auth, 'ai:generate_batch');
        requireScope(auth, 'ai:apply_to_project');
        const tenantId = assertTenantAccess(auth, args.tenantId);
        const projectId = args.projectId || auth.projectId;
        if (!projectId)
            throw Object.assign(new Error('projectId is required.'), { status: 400 });
        await getProjectForTenant(projectId, tenantId);
        const jobId = randomUUID();
        await getSupabaseAdmin().from('mcp_generation_jobs').insert({
            id: jobId,
            tenant_id: tenantId,
            project_id: projectId,
            agent_id: args.agentId || auth.agentId,
            status: 'pending',
            progress: 0,
            input: args,
            output: { progress: 0, steps: ['queued'] },
            metadata: {
                sourceTool: 'ai_generate_full_project',
                apiKeyId: auth.apiKeyId,
                keyName: auth.keyName,
                userId: auth.userId,
                scopes: auth.scopes,
                agentId: auth.agentId,
            },
        });
        return { status: 'accepted', jobId, projectId, message: 'Generation job queued. Use get_generation_job to check progress.' };
    },
    get_generation_job: async (args, auth) => {
        const tenantId = assertTenantAccess(auth, args.tenantId);
        if (!args.jobId)
            throw Object.assign(new Error('jobId is required.'), { status: 400 });
        const { data, error } = await getSupabaseAdmin()
            .from('mcp_generation_jobs')
            .select('*')
            .eq('id', args.jobId)
            .eq('tenant_id', tenantId)
            .maybeSingle();
        if (error)
            throw error;
        if (!data)
            throw Object.assign(new Error('Generation job not found.'), { status: 404 });
        return data;
    },
};
const tools = [
    {
        name: 'list_templates',
        description: 'List available Quimera website templates with metadata and contentSummary so agents can confirm templates are not empty.',
        inputSchema: {
            type: 'object',
            properties: {
                tenantId: { type: 'string' },
                limit: { type: 'number' },
            },
        },
    },
    {
        name: 'get_template',
        description: 'Get the full reusable template payload, including pages, PageData, theme, component order, visibility, SEO and AI config.',
        inputSchema: {
            type: 'object',
            required: ['tenantId', 'templateId'],
            properties: {
                tenantId: { type: 'string' },
                templateId: { type: 'string' },
            },
        },
    },
    {
        name: 'create_template',
        description: 'Create a reusable Quimera template with real renderable content. Requires PageData/componentOrder, pages[].sectionData, or sourceProjectId; empty templates are rejected.',
        inputSchema: {
            type: 'object',
            required: ['tenantId', 'name'],
            properties: {
                tenantId: { type: 'string' },
                name: { type: 'string' },
                template: { type: 'object', description: 'Optional full template payload. The MCP will normalize data/theme/componentOrder from this object.' },
                payload: { type: 'object', description: 'Alias for template.' },
                sourceProjectId: { type: 'string' },
                description: { type: 'string' },
                category: { type: 'string' },
                tags: { type: 'array', items: { type: 'string' } },
                industries: { type: 'array', items: { type: 'string' } },
                thumbnailUrl: { type: 'string' },
                pages: { type: 'array', items: { type: 'object' } },
                data: { type: 'object' },
                theme: { type: 'object' },
                brandIdentity: { type: 'object' },
                componentOrder: { type: 'array', items: { type: 'string' } },
                sectionVisibility: { type: 'object' },
                menus: { type: 'array', items: { type: 'object' } },
                aiAssistantConfig: { type: 'object' },
                seoConfig: { type: 'object' },
                crmConfig: { type: 'object' },
            },
        },
    },
    {
        name: 'update_template',
        description: 'Update an existing reusable Quimera template and its full page/section/theme/config payload. Content updates that would make the template empty are rejected.',
        inputSchema: {
            type: 'object',
            required: ['tenantId', 'templateId'],
            properties: {
                tenantId: { type: 'string' },
                templateId: { type: 'string' },
                template: { type: 'object', description: 'Optional full template payload. The MCP will normalize data/theme/componentOrder from this object.' },
                payload: { type: 'object', description: 'Alias for template.' },
                name: { type: 'string' },
                description: { type: 'string' },
                category: { type: 'string' },
                tags: { type: 'array', items: { type: 'string' } },
                industries: { type: 'array', items: { type: 'string' } },
                thumbnailUrl: { type: 'string' },
                pages: { type: 'array', items: { type: 'object' } },
                data: { type: 'object' },
                theme: { type: 'object' },
                brandIdentity: { type: 'object' },
                componentOrder: { type: 'array', items: { type: 'string' } },
                sectionVisibility: { type: 'object' },
                menus: { type: 'array', items: { type: 'object' } },
                aiAssistantConfig: { type: 'object' },
                seoConfig: { type: 'object' },
                crmConfig: { type: 'object' },
            },
        },
    },
    {
        name: 'archive_template',
        description: 'Archive a template without deleting data permanently.',
        inputSchema: { type: 'object', required: ['tenantId', 'templateId'], properties: { tenantId: { type: 'string' }, templateId: { type: 'string' } } },
    },
    {
        name: 'create_project_from_template',
        description: 'Create a draft project for the current tenant by copying a Template project.',
        inputSchema: {
            type: 'object',
            required: ['tenantId', 'templateId'],
            properties: {
                tenantId: { type: 'string' },
                templateId: { type: 'string' },
                name: { type: 'string' },
            },
        },
    },
    {
        name: 'create_project',
        description: 'Create a draft project from scratch with pages, section data, theme, SEO, CRM, chatbot, and navigation config.',
        inputSchema: {
            type: 'object',
            required: ['tenantId', 'name'],
            properties: {
                tenantId: { type: 'string' },
                name: { type: 'string' },
                description: { type: 'string' },
                category: { type: 'string' },
                tags: { type: 'array', items: { type: 'string' } },
                industries: { type: 'array', items: { type: 'string' } },
                thumbnailUrl: { type: 'string' },
                status: { type: 'string' },
                pages: { type: 'array', items: { type: 'object' } },
                data: { type: 'object' },
                theme: { type: 'object' },
                brandIdentity: { type: 'object' },
                componentOrder: { type: 'array', items: { type: 'string' } },
                sectionVisibility: { type: 'object' },
                sourceTemplateId: { type: 'string' },
                menus: { type: 'array', items: { type: 'object' } },
                aiAssistantConfig: { type: 'object' },
                seoConfig: { type: 'object' },
                crmConfig: { type: 'object' },
            },
        },
    },
    {
        name: 'list_projects',
        description: 'List active projects for the tenant.',
        inputSchema: { type: 'object', required: ['tenantId'], properties: { tenantId: { type: 'string' }, limit: { type: 'number' } } },
    },
    {
        name: 'get_project',
        description: 'Get a full project by id, scoped to the tenant.',
        inputSchema: { type: 'object', required: ['tenantId', 'projectId'], properties: { tenantId: { type: 'string' }, projectId: { type: 'string' } } },
    },
    {
        name: 'update_project_page',
        description: 'Create or update a page inside a project.',
        inputSchema: { type: 'object', required: ['tenantId', 'projectId'], properties: { tenantId: { type: 'string' }, projectId: { type: 'string' }, pageId: { type: 'string' }, page: { type: 'object' }, updates: { type: 'object' }, replace: { type: 'boolean' } } },
    },
    {
        name: 'update_project_sections',
        description: 'Update legacy project data sections or page sectionData.',
        inputSchema: { type: 'object', required: ['tenantId', 'projectId', 'sections'], properties: { tenantId: { type: 'string' }, projectId: { type: 'string' }, pageId: { type: 'string' }, sections: { type: 'object' }, replace: { type: 'boolean' } } },
    },
    {
        name: 'validate_project',
        description: 'Validate pages, SEO, chatbot config, and basic project readiness.',
        inputSchema: { type: 'object', required: ['tenantId', 'projectId'], properties: { tenantId: { type: 'string' }, projectId: { type: 'string' } } },
    },
    {
        name: 'publish_project_preview',
        description: 'Mark a project as preview-ready without doing final production publish.',
        inputSchema: { type: 'object', required: ['tenantId', 'projectId'], properties: { tenantId: { type: 'string' }, projectId: { type: 'string' }, status: { type: 'string' } } },
    },
    {
        name: 'list_leads',
        description: 'List CRM leads for a tenant or project.',
        inputSchema: { type: 'object', required: ['tenantId'], properties: { tenantId: { type: 'string' }, projectId: { type: 'string' }, status: { type: 'string' }, limit: { type: 'number' } } },
    },
    {
        name: 'create_lead',
        description: 'Create a CRM lead for a project.',
        inputSchema: { type: 'object', required: ['tenantId', 'projectId'], properties: { tenantId: { type: 'string' }, projectId: { type: 'string' }, name: { type: 'string' }, email: { type: 'string' }, phone: { type: 'string' }, company: { type: 'string' }, status: { type: 'string' }, source: { type: 'string' }, value: { type: 'number' }, tags: { type: 'array', items: { type: 'string' } }, notes: { type: 'string' }, custom_data: { type: 'object' } } },
    },
    {
        name: 'update_lead',
        description: 'Update a CRM lead.',
        inputSchema: { type: 'object', required: ['tenantId', 'leadId'], properties: { tenantId: { type: 'string' }, leadId: { type: 'string' }, updates: { type: 'object' } } },
    },
    {
        name: 'delete_lead',
        description: 'Delete a CRM lead.',
        inputSchema: { type: 'object', required: ['tenantId', 'leadId'], properties: { tenantId: { type: 'string' }, leadId: { type: 'string' } } },
    },
    {
        name: 'add_lead_activity',
        description: 'Add an activity/note to a lead.',
        inputSchema: { type: 'object', required: ['tenantId', 'leadId'], properties: { tenantId: { type: 'string' }, leadId: { type: 'string' }, type: { type: 'string' }, description: { type: 'string' } } },
    },
    {
        name: 'create_lead_task',
        description: 'Create a follow-up task for a lead.',
        inputSchema: { type: 'object', required: ['tenantId', 'leadId', 'title'], properties: { tenantId: { type: 'string' }, leadId: { type: 'string' }, title: { type: 'string' }, description: { type: 'string' }, dueDate: { type: 'string' }, status: { type: 'string' } } },
    },
    {
        name: 'list_articles',
        description: 'List app/CMS articles.',
        inputSchema: { type: 'object', required: ['tenantId'], properties: { tenantId: { type: 'string' }, status: { type: 'string' }, language: { type: 'string' }, limit: { type: 'number' } } },
    },
    {
        name: 'create_article',
        description: 'Create a CMS article.',
        inputSchema: { type: 'object', required: ['tenantId', 'title', 'content'], properties: { tenantId: { type: 'string' }, title: { type: 'string' }, content: { type: 'string' }, slug: { type: 'string' }, excerpt: { type: 'string' }, category: { type: 'string' }, tags: { type: 'array' }, status: { type: 'string' }, language: { type: 'string' }, imageUrl: { type: 'string' } } },
    },
    {
        name: 'update_article',
        description: 'Update a CMS article by id or slug.',
        inputSchema: { type: 'object', required: ['tenantId'], properties: { tenantId: { type: 'string' }, articleId: { type: 'string' }, slug: { type: 'string' }, updates: { type: 'object' } } },
    },
    {
        name: 'publish_article',
        description: 'Publish a CMS article by id or slug.',
        inputSchema: { type: 'object', required: ['tenantId'], properties: { tenantId: { type: 'string' }, articleId: { type: 'string' }, slug: { type: 'string' } } },
    },
    {
        name: 'update_navigation',
        description: 'Update global app navigation links.',
        inputSchema: { type: 'object', required: ['tenantId', 'links'], properties: { tenantId: { type: 'string' }, navigationId: { type: 'string' }, links: { type: 'array', items: { type: 'object' } } } },
    },
    {
        name: 'update_seo_metadata',
        description: 'Update project or page SEO metadata.',
        inputSchema: { type: 'object', required: ['tenantId', 'projectId', 'seo'], properties: { tenantId: { type: 'string' }, projectId: { type: 'string' }, pageId: { type: 'string' }, seo: { type: 'object' } } },
    },
    {
        name: 'list_products',
        description: 'List ecommerce products for a project.',
        inputSchema: { type: 'object', required: ['tenantId', 'projectId'], properties: { tenantId: { type: 'string' }, projectId: { type: 'string' }, status: { type: 'string' }, limit: { type: 'number' } } },
    },
    {
        name: 'create_product',
        description: 'Create an ecommerce product.',
        inputSchema: { type: 'object', required: ['tenantId', 'projectId', 'name'], properties: { tenantId: { type: 'string' }, projectId: { type: 'string' }, name: { type: 'string' }, slug: { type: 'string' }, description: { type: 'string' }, price: { type: 'number' }, images: { type: 'array' }, tags: { type: 'array' }, status: { type: 'string' } } },
    },
    {
        name: 'update_product',
        description: 'Update an ecommerce product.',
        inputSchema: { type: 'object', required: ['tenantId', 'projectId', 'productId'], properties: { tenantId: { type: 'string' }, projectId: { type: 'string' }, productId: { type: 'string' }, updates: { type: 'object' } } },
    },
    {
        name: 'list_orders',
        description: 'List ecommerce orders for a project.',
        inputSchema: { type: 'object', required: ['tenantId', 'projectId'], properties: { tenantId: { type: 'string' }, projectId: { type: 'string' }, status: { type: 'string' }, limit: { type: 'number' } } },
    },
    {
        name: 'update_order_status',
        description: 'Update order, payment, fulfillment, or tracking status.',
        inputSchema: { type: 'object', required: ['tenantId', 'projectId', 'orderId'], properties: { tenantId: { type: 'string' }, projectId: { type: 'string' }, orderId: { type: 'string' }, status: { type: 'string' }, paymentStatus: { type: 'string' }, fulfillmentStatus: { type: 'string' }, trackingNumber: { type: 'string' }, trackingUrl: { type: 'string' }, carrier: { type: 'string' } } },
    },
    {
        name: 'create_discount',
        description: 'Create an ecommerce discount code.',
        inputSchema: { type: 'object', required: ['tenantId', 'projectId'], properties: { tenantId: { type: 'string' }, projectId: { type: 'string' }, code: { type: 'string' }, type: { type: 'string' }, value: { type: 'number' }, minimumPurchase: { type: 'number' }, maxUses: { type: 'number' }, startsAt: { type: 'string' }, endsAt: { type: 'string' } } },
    },
    {
        name: 'list_appointments',
        description: 'List project appointments.',
        inputSchema: { type: 'object', required: ['tenantId', 'projectId'], properties: { tenantId: { type: 'string' }, projectId: { type: 'string' }, status: { type: 'string' }, limit: { type: 'number' } } },
    },
    {
        name: 'create_appointment',
        description: 'Create a project appointment.',
        inputSchema: { type: 'object', required: ['tenantId', 'projectId', 'title', 'startDate', 'endDate'], properties: { tenantId: { type: 'string' }, projectId: { type: 'string' }, title: { type: 'string' }, startDate: { type: 'string' }, endDate: { type: 'string' }, description: { type: 'string' }, participants: { type: 'array' }, location: { type: 'object' }, linkedLeadIds: { type: 'array' } } },
    },
    {
        name: 'update_appointment',
        description: 'Update a project appointment.',
        inputSchema: { type: 'object', required: ['tenantId', 'appointmentId'], properties: { tenantId: { type: 'string' }, appointmentId: { type: 'string' }, updates: { type: 'object' } } },
    },
    {
        name: 'delete_appointment',
        description: 'Delete a project appointment.',
        inputSchema: { type: 'object', required: ['tenantId', 'appointmentId'], properties: { tenantId: { type: 'string' }, appointmentId: { type: 'string' } } },
    },
    {
        name: 'block_appointment_date',
        description: 'Block a date for project appointments.',
        inputSchema: { type: 'object', required: ['tenantId', 'projectId', 'date'], properties: { tenantId: { type: 'string' }, projectId: { type: 'string' }, date: { type: 'string' }, reason: { type: 'string' } } },
    },
    {
        name: 'list_domains',
        description: 'List custom domains for a tenant or project.',
        inputSchema: { type: 'object', required: ['tenantId'], properties: { tenantId: { type: 'string' }, projectId: { type: 'string' }, limit: { type: 'number' } } },
    },
    {
        name: 'get_domain_status',
        description: 'Get domain DNS/SSL/deployment status.',
        inputSchema: { type: 'object', required: ['tenantId'], properties: { tenantId: { type: 'string' }, domain: { type: 'string' }, domainId: { type: 'string' } } },
    },
    {
        name: 'list_deployment_logs',
        description: 'List Vercel/domain deployment logs.',
        inputSchema: { type: 'object', required: ['tenantId'], properties: { tenantId: { type: 'string' }, projectId: { type: 'string' }, limit: { type: 'number' } } },
    },
    {
        name: 'get_tenant_summary',
        description: 'Get basic operational summary for a tenant.',
        inputSchema: { type: 'object', required: ['tenantId'], properties: { tenantId: { type: 'string' } } },
    },
    {
        name: 'get_project_summary',
        description: 'Get basic operational summary for a project.',
        inputSchema: { type: 'object', required: ['tenantId', 'projectId'], properties: { tenantId: { type: 'string' }, projectId: { type: 'string' } } },
    },
    {
        name: 'ai_list_generators',
        description: 'List available Quimera AI generator presets, models, estimated credits, and capabilities.',
        inputSchema: { type: 'object', properties: {} },
    },
    {
        name: 'ai_generate_content',
        description: 'Generate structured content for a section, page, article, product, email, or chatbot.',
        inputSchema: {
            type: 'object',
            required: ['tenantId', 'brief'],
            properties: {
                tenantId: { type: 'string' },
                projectId: { type: 'string' },
                purpose: { type: 'string' },
                brief: { type: 'string' },
                language: { type: 'string' },
                brandContext: { type: ['object', 'string'] },
                targetAudience: { type: 'string' },
                contentType: { type: 'string' },
                section: { type: 'string' },
                modelPreset: { type: 'string' },
            },
        },
    },
    {
        name: 'ai_generate_page_json',
        description: 'Generate Quimera-compatible page JSON with sectionData, SEO, component order, and warnings.',
        inputSchema: {
            type: 'object',
            required: ['tenantId', 'brief'],
            properties: {
                tenantId: { type: 'string' },
                projectId: { type: 'string' },
                brief: { type: 'string' },
                language: { type: 'string' },
                brandContext: { type: ['object', 'string'] },
                targetAudience: { type: 'string' },
                modelPreset: { type: 'string' },
            },
        },
    },
    {
        name: 'ai_generate_image',
        description: 'Generate an image, upload it to Supabase Storage, and register it in media/project/admin libraries.',
        inputSchema: {
            type: 'object',
            required: ['tenantId', 'brief'],
            properties: {
                tenantId: { type: 'string' },
                projectId: { type: 'string' },
                purpose: { type: 'string' },
                brief: { type: 'string' },
                section: { type: 'string' },
                brandContext: { type: ['object', 'string'] },
                targetAudience: { type: 'string' },
                modelPreset: { type: 'string' },
                saveTo: { enum: ['project', 'media', 'admin', 'none'] },
                referenceImages: { type: 'array', items: { type: 'string' } },
                imageOptions: { type: 'object' },
            },
        },
    },
    {
        name: 'ai_generate_image_prompt',
        description: 'Enhance a draft image/content prompt using Quimera brand and project context.',
        inputSchema: {
            type: 'object',
            required: ['tenantId', 'brief'],
            properties: {
                tenantId: { type: 'string' },
                projectId: { type: 'string' },
                purpose: { type: 'string' },
                brief: { type: 'string' },
                brandContext: { type: ['object', 'string'] },
                modelPreset: { type: 'string' },
            },
        },
    },
    {
        name: 'ai_generate_project_assets',
        description: 'Generate a batch of project images and return URLs plus asset ids. Partial failures are isolated.',
        inputSchema: {
            type: 'object',
            required: ['tenantId', 'projectId', 'assets'],
            properties: {
                tenantId: { type: 'string' },
                projectId: { type: 'string' },
                brief: { type: 'string' },
                brandContext: { type: ['object', 'string'] },
                saveTo: { enum: ['project', 'media', 'admin', 'none'] },
                assets: { type: 'array', items: { type: 'object' } },
            },
        },
    },
    {
        name: 'ai_analyze_visual_reference',
        description: 'Analyze visual reference images and return style, palette, constraints, and prompt hints.',
        inputSchema: {
            type: 'object',
            required: ['tenantId', 'referenceImages'],
            properties: {
                tenantId: { type: 'string' },
                projectId: { type: 'string' },
                brief: { type: 'string' },
                brandContext: { type: ['object', 'string'] },
                referenceImages: { type: 'array', items: { type: 'string' } },
            },
        },
    },
    {
        name: 'ai_apply_generated_content',
        description: 'Apply generated content to a project legacy section or multi-page section.',
        inputSchema: {
            type: 'object',
            required: ['tenantId', 'projectId', 'content'],
            properties: {
                tenantId: { type: 'string' },
                projectId: { type: 'string' },
                pageId: { type: 'string' },
                section: { type: 'string' },
                content: {},
                replace: { type: 'boolean' },
            },
        },
    },
    {
        name: 'ai_apply_generated_images',
        description: 'Replace image URL fields in project sections using generated image URLs.',
        inputSchema: {
            type: 'object',
            required: ['tenantId', 'projectId', 'replacements'],
            properties: {
                tenantId: { type: 'string' },
                projectId: { type: 'string' },
                pageId: { type: 'string' },
                replacements: { type: 'array', items: { type: 'object' } },
            },
        },
    },
    {
        name: 'ai_generate_full_project',
        description: 'Create a generation job that produces page JSON and optional assets for a complete project flow.',
        inputSchema: {
            type: 'object',
            required: ['tenantId', 'projectId', 'brief'],
            properties: {
                tenantId: { type: 'string' },
                projectId: { type: 'string' },
                brief: { type: 'string' },
                language: { type: 'string' },
                brandContext: { type: ['object', 'string'] },
                targetAudience: { type: 'string' },
                assets: { type: 'array', items: { type: 'object' } },
            },
        },
    },
    {
        name: 'get_generation_job',
        description: 'Get the current status and output for a Quimera MCP generation job.',
        inputSchema: {
            type: 'object',
            required: ['tenantId', 'jobId'],
            properties: {
                tenantId: { type: 'string' },
                jobId: { type: 'string' },
            },
        },
    },
];
async function handleRpc(message, auth) {
    if (message.method === 'initialize') {
        return ok(message.id, {
            protocolVersion: '2025-06-18',
            capabilities: {
                tools: {},
                resources: {},
            },
            serverInfo: {
                name: 'quimera-mcp',
                version: '0.1.0',
            },
        });
    }
    if (message.method === 'notifications/initialized') {
        return null;
    }
    if (!auth) {
        throw Object.assign(new Error('Authentication required.'), { status: 401 });
    }
    if (message.method === 'tools/list') {
        return ok(message.id, { tools });
    }
    if (message.method === 'tools/call') {
        const name = message.params?.name;
        const args = message.params?.arguments || {};
        const handler = toolHandlers[name];
        if (!handler)
            throw Object.assign(new Error(`Unknown tool: ${name}`), { status: 400 });
        const startTime = Date.now();
        try {
            await enforceMcpRateLimit(getSupabaseAdmin(), auth, name);
            const result = await handler(args, auth);
            await logMcpToolCall(auth, name, startTime, true, result);
            return ok(message.id, textResult(result));
        }
        catch (error) {
            await logMcpToolCall(auth, name, startTime, false, undefined, error);
            throw error;
        }
    }
    if (message.method === 'resources/list') {
        return ok(message.id, {
            resources: [
                { uri: `quimera://tenant/${auth.tenantId}`, name: 'Current tenant' },
                ...(auth.projectId ? [{ uri: `quimera://project/${auth.projectId}`, name: 'API key project' }] : []),
                { uri: 'quimera://docs/schema', name: 'Quimera MCP schema' },
            ],
        });
    }
    throw Object.assign(new Error(`Unsupported method: ${message.method}`), { status: 400 });
}
export default async function handler(req, res) {
    if (req.method === 'OPTIONS') {
        res.writeHead(204, JSON_HEADERS);
        res.end();
        return;
    }
    if (req.method === 'GET') {
        send(res, 200, {
            name: 'quimera-mcp',
            version: '0.1.0',
            transport: 'streamable-http',
            endpoint: '/api/mcp',
            tools: tools.map((tool) => tool.name),
        });
        return;
    }
    if (req.method !== 'POST') {
        send(res, 405, { error: 'Method not allowed' });
        return;
    }
    let messages;
    try {
        messages = await readJson(req);
    }
    catch (error) {
        send(res, 400, fail(null, Object.assign(new Error('Invalid JSON body.'), { status: 400, details: error.message })));
        return;
    }
    const supabase = getSupabaseAdmin();
    let auth = null;
    try {
        auth = await authenticateMcpRequest(req, supabase);
    }
    catch (error) {
        const list = Array.isArray(messages) ? messages : [messages];
        const id = list.find((message) => message.id !== undefined)?.id ?? null;
        send(res, error.status || 401, fail(id, error));
        return;
    }
    const list = Array.isArray(messages) ? messages : [messages];
    const responses = [];
    for (const message of list) {
        try {
            const response = await handleRpc(message, auth);
            if (response)
                responses.push(response);
        }
        catch (error) {
            responses.push(fail(message.id, error));
        }
    }
    const hasError = responses.some((response) => response.error);
    send(res, hasError ? 207 : 200, Array.isArray(messages) ? responses : responses[0]);
}
//# sourceMappingURL=mcp.js.map
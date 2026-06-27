import type {
    AssistantMemoryContextManifest,
    GlobalAssistantMemory,
    GlobalAssistantScope,
} from '../../types/globalAssistant';
import type { PlatformServiceId } from '../../types/serviceAvailability';
import { isSpanishLocale } from './globalAssistantModuleGuide';

const MAX_MEMORY_ITEMS = 6;
const MAX_TEXT_LENGTH = 220;

const scopeLabels: Record<GlobalAssistantScope, { es: string; en: string }> = {
    user: { es: 'Usuario', en: 'User' },
    tenant: { es: 'Workspace', en: 'Workspace' },
    project: { es: 'Proyecto', en: 'Project' },
    module: { es: 'Modulo', en: 'Module' },
    session: { es: 'Sesion', en: 'Session' },
    task: { es: 'Tarea', en: 'Task' },
    admin: { es: 'Admin', en: 'Admin' },
    system: { es: 'Sistema', en: 'System' },
};

const serviceLabels: Record<PlatformServiceId, { es: string; en: string }> = {
    agency: { es: 'Agency', en: 'Agency' },
    cms: { es: 'CMS', en: 'CMS' },
    crm: { es: 'Leads / CRM', en: 'Leads / CRM' },
    ecommerce: { es: 'Ecommerce', en: 'Ecommerce' },
    chatbot: { es: 'ChatCore', en: 'ChatCore' },
    emailMarketing: { es: 'Email Marketing', en: 'Email Marketing' },
    aiFeatures: { es: 'AI Studio / Media AI', en: 'AI Studio / Media AI' },
    analytics: { es: 'Analiticas', en: 'Analytics' },
    appointments: { es: 'Citas', en: 'Appointments' },
    bioPage: { es: 'Pagina bio', en: 'Bio Page' },
    domains: { es: 'Dominios', en: 'Domains' },
    templates: { es: 'Templates', en: 'Templates' },
    finance: { es: 'Finance', en: 'Finance' },
    realEstate: { es: 'Realty', en: 'Realty' },
    restaurants: { es: 'Restaurants', en: 'Restaurants' },
};

const trimText = (value: string, maxLength = MAX_TEXT_LENGTH): string => {
    const normalized = value.replace(/\s+/g, ' ').trim();
    if (normalized.length <= maxLength) return normalized;
    return `${normalized.slice(0, maxLength - 3).trim()}...`;
};

const presenceLabel = (value: string | null | undefined, activeLabel: string, emptyLabel: string): string =>
    value ? activeLabel : emptyLabel;

const formatServices = (services: PlatformServiceId[] | undefined, spanish: boolean): string => {
    const labels = Array.from(new Set(services || []))
        .map(service => serviceLabels[service]?.[spanish ? 'es' : 'en'] || service)
        .sort((a, b) => a.localeCompare(b));
    if (labels.length === 0) {
        return spanish
            ? 'Servicios disponibles: ninguno cargado todavia.'
            : 'Available services: none loaded yet.';
    }
    return spanish
        ? `Servicios disponibles: ${labels.join(', ')}.`
        : `Available services: ${labels.join(', ')}.`;
};

const formatScopeLabel = (memory: GlobalAssistantMemory, spanish: boolean): string => {
    const label = scopeLabels[memory.scope]?.[spanish ? 'es' : 'en'] || memory.scope;
    if (memory.scope === 'module' && memory.module) return `${label}: ${memory.module}`;
    return label;
};

export const buildGuideOnlyMemoryPromptContext = (
    memories: GlobalAssistantMemory[],
    manifest: AssistantMemoryContextManifest,
    locale?: string | null,
): string => {
    const spanish = isSpanishLocale(locale);
    const heading = spanish
        ? 'CONTEXTO PARA GUIAR AL USUARIO:'
        : 'CONTEXT TO GUIDE THE USER:';
    const guardrail = spanish
        ? 'Reglas: responde corto y claro. Guia al usuario y abre el lugar correcto cuando corresponda. No digas que creaste, generaste, editaste o cambiaste algo desde el chat.'
        : 'Rules: answer briefly and clearly. Guide the user and open the right place when appropriate. Do not claim that you created, generated, edited, or changed anything from chat.';
    const serviceGuardrail = spanish
        ? 'Si un servicio no esta en la lista disponible, di que no esta disponible ahora y no lo ofrezcas.'
        : 'If a service is not in the available list, say it is not available now and do not offer it.';
    const scopeLine = spanish
        ? `Contexto activo: ${presenceLabel(manifest.userId, 'usuario identificado', 'sin usuario')}, ${presenceLabel(manifest.tenantId, 'workspace activo', 'sin workspace')}, ${presenceLabel(manifest.projectId, 'proyecto activo', 'sin proyecto')}, modulo ${manifest.activeModule || 'general'}.`
        : `Active context: ${presenceLabel(manifest.userId, 'signed-in user', 'no user')}, ${presenceLabel(manifest.tenantId, 'active workspace', 'no workspace')}, ${presenceLabel(manifest.projectId, 'active project', 'no project')}, module ${manifest.activeModule || 'general'}.`;
    const routeLine = spanish
        ? `Pagina actual: ${manifest.activeRoute || 'sin ruta'}; superficie: ${manifest.currentSurface || 'app'}.`
        : `Current page: ${manifest.activeRoute || 'no route'}; surface: ${manifest.currentSurface || 'app'}.`;
    const servicesLine = formatServices(manifest.activeServices, spanish);

    const lines = memories.slice(0, MAX_MEMORY_ITEMS).map(memory => {
        const scope = formatScopeLabel(memory, spanish);
        const title = trimText(memory.title || scope, 80);
        const summary = trimText(memory.summary || '');
        return summary ? `- ${scope}: ${title}. ${summary}` : `- ${scope}: ${title}.`;
    });
    const memoryLines = lines.length > 0
        ? lines
        : [spanish ? '- No hay memoria previa relevante para esta solicitud.' : '- No relevant prior memory is available for this request.'];

    return [heading, guardrail, serviceGuardrail, scopeLine, routeLine, servicesLine, ...memoryLines].join('\n');
};

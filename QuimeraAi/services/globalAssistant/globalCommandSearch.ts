import type { Project } from '../../types/project';
import type { AdminView, View } from '../../types/ui';
import type { PlatformServiceId } from '../../types/serviceAvailability';
import type { AssistantModuleTarget } from '../../types/globalAssistant';

export type GlobalCommandType =
    | 'assistant_request'
    | 'navigation'
    | 'project'
    | 'module'
    | 'action'
    | 'admin';

export interface GlobalCommandItem {
    id: string;
    type: GlobalCommandType;
    label: string;
    labelKey?: string;
    labelParams?: Record<string, string | number | boolean | null | undefined>;
    description?: string;
    descriptionKey?: string;
    descriptionParams?: Record<string, string | number | boolean | null | undefined>;
    keywords: string[];
    view?: View;
    adminView?: AdminView;
    projectId?: string;
    prompt?: string;
    promptKey?: string;
    promptParams?: Record<string, string | number | boolean | null | undefined>;
    serviceId?: PlatformServiceId;
    assistantModule?: AssistantModuleTarget;
    requiresAdmin?: boolean;
    requiresProject?: boolean;
    isActiveProject?: boolean;
    disabledReason?: string;
}

export interface BuildGlobalCommandItemsInput {
    query?: string;
    projects?: Project[];
    activeProjectId?: string | null;
    canAccessService?: (serviceId: PlatformServiceId) => boolean;
    canAccessAdmin?: boolean;
    includeAssistantRequest?: boolean;
    maxProjects?: number;
    maxItems?: number;
}

const normalize = (value: string): string =>
    value
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, ' ')
        .trim();

const includesToken = (haystack: string, token: string): boolean => haystack.includes(token);

const readString = (value: unknown): string => {
    if (typeof value === 'string') return value;
    if (typeof value === 'number' || typeof value === 'boolean') return String(value);
    return '';
};

const isProjectRecord = (project: unknown): project is Project =>
    !!project && typeof project === 'object' && !!readString((project as Project).id);

const readKeywords = (keywords: unknown): string[] =>
    Array.isArray(keywords)
        ? keywords.map(readString).filter(Boolean)
        : [];

const scoreItem = (item: GlobalCommandItem, query: string): number => {
    const normalizedQuery = normalize(query);
    if (!normalizedQuery) return item.type === 'assistant_request' ? -1 : 0;

    const label = normalize(item.label);
    const description = normalize(item.description || '');
    const keywords = normalize(readKeywords(item.keywords).join(' '));
    const haystack = `${label} ${description} ${keywords}`;
    const tokens = normalizedQuery.split(/\s+/).filter(Boolean);
    if (tokens.length === 0) return 0;

    let score = 0;
    if (label === normalizedQuery) score += 100;
    if (label.startsWith(normalizedQuery)) score += 60;
    if (label.includes(normalizedQuery)) score += 35;
    if (keywords.includes(normalizedQuery)) score += 25;
    if (description.includes(normalizedQuery)) score += 10;
    score += tokens.filter(token => includesToken(haystack, token)).length * 8;
    return score;
};

const shouldInclude = (item: GlobalCommandItem, query: string): boolean => {
    if (item.disabledReason) return false;
    if (!query.trim()) return true;
    return scoreItem(item, query) > 0;
};

const commandI18nKey = (id: string, field: 'label' | 'description' | 'prompt'): string =>
    `globalCommandPalette.commands.${id.replace(/:/g, '.')}.${field}`;

const moduleCommand = (
    id: string,
    label: string,
    view: View,
    options: Partial<GlobalCommandItem> = {},
): GlobalCommandItem => ({
    id,
    type: options.type || 'module',
    label,
    labelKey: options.labelKey || commandI18nKey(id, 'label'),
    descriptionKey: options.description ? options.descriptionKey || commandI18nKey(id, 'description') : options.descriptionKey,
    view,
    keywords: options.keywords || [label, view],
    ...options,
});

const actionCommand = (
    id: string,
    label: string,
    description: string,
    prompt: string,
    options: Partial<GlobalCommandItem> = {},
): GlobalCommandItem => ({
    id,
    type: 'action',
    label,
    labelKey: options.labelKey || commandI18nKey(id, 'label'),
    description,
    descriptionKey: options.descriptionKey || commandI18nKey(id, 'description'),
    prompt,
    promptKey: options.promptKey || commandI18nKey(id, 'prompt'),
    keywords: options.keywords || [label],
    ...options,
});

const ACTION_COMMANDS: GlobalCommandItem[] = [
    actionCommand(
        'action:create-website',
        'AI Studio',
        'Use AI Studio for website, business, content, and project guidance.',
        'AI Studio',
        { assistantModule: 'aiStudio', serviceId: 'aiFeatures', keywords: ['create website', 'new website', 'ai studio', 'business', 'landing page', 'crear sitio', 'crear web'] },
    ),
    actionCommand(
        'action:edit-website',
        'Website Builder',
        'Use Website Builder for page sections, copy, images, and layout guidance.',
        'Website Builder',
        { assistantModule: 'website', requiresProject: true, keywords: ['edit website', 'hero', 'section', 'copy', 'page', 'editar web', 'seccion'] },
    ),
    actionCommand(
        'action:generate-image',
        'Images',
        'Use Images for image questions, prompts, sizes, styles, and drafts.',
        'Images',
        { assistantModule: 'media', serviceId: 'aiFeatures', keywords: ['image', 'hero image', 'asset', 'media', 'photo', 'imagen', 'foto'] },
    ),
    actionCommand(
        'action:create-video',
        'Videos',
        'Use Videos for video questions, prompts, scenes, formats, and drafts.',
        'Videos',
        { assistantModule: 'media', serviceId: 'aiFeatures', keywords: ['video', 'media', 'reel', 'ad', 'anuncio'] },
    ),
    actionCommand(
        'action:create-email',
        'Email',
        'Use Email for campaigns, copy, audiences, and review.',
        'Email',
        { assistantModule: 'emailMarketing', serviceId: 'emailMarketing', requiresProject: true, keywords: ['email', 'campaign', 'audience', 'automation', 'correo', 'campana'] },
    ),
    actionCommand(
        'action:create-product',
        'Ecommerce',
        'Use Ecommerce for products, orders, inventory, discounts, and store settings.',
        'Ecommerce',
        { assistantModule: 'ecommerce', serviceId: 'ecommerce', requiresProject: true, keywords: ['product', 'ecommerce', 'store', 'price', 'inventory', 'producto', 'tienda'] },
    ),
    actionCommand(
        'action:create-appointment',
        'Appointments',
        'Use Appointments for calendar, services, availability, and bookings.',
        'Appointments',
        { assistantModule: 'appointments', serviceId: 'appointments', requiresProject: true, keywords: ['appointment', 'booking', 'calendar', 'cita', 'reserva'] },
    ),
    actionCommand(
        'action:review-leads',
        'Leads',
        'Use Leads for contacts, status, follow-up, and lead management.',
        'Leads',
        { assistantModule: 'crm', serviceId: 'crm', requiresProject: true, keywords: ['leads', 'crm', 'follow up', 'prospects', 'clientes potenciales'] },
    ),
    actionCommand(
        'action:create-bio-page',
        'Bio Page',
        'Use Bio Page for links, blocks, lead capture, bookings, and public actions.',
        'Bio Page',
        { assistantModule: 'bioPage', serviceId: 'bioPage', requiresProject: true, keywords: ['bio page', 'link in bio', 'creator page', 'pagina bio'] },
    ),
    actionCommand(
        'action:train-chatcore',
        'ChatCore',
        'Use ChatCore for assistant knowledge, training, tests, and visitor chat setup.',
        'ChatCore',
        { assistantModule: 'chatbot', serviceId: 'chatbot', requiresProject: true, keywords: ['chatcore', 'chatbot', 'knowledge', 'train', 'entrenar', 'conocimiento'] },
    ),
    actionCommand(
        'action:analyze-project',
        'Analytics',
        'Use Analytics for project status, readiness, reports, blockers, and next steps.',
        'Analytics',
        { assistantModule: 'analytics', serviceId: 'analytics', requiresProject: true, keywords: ['analytics', 'report', 'readiness', 'blockers', 'analiticas', 'reporte'] },
    ),
    actionCommand(
        'action:use-cms',
        'CMS',
        'Use CMS for project content, pages, posts, and drafts.',
        'CMS',
        { assistantModule: 'website', serviceId: 'cms', requiresProject: true, keywords: ['cms', 'content', 'pages', 'posts', 'contenido', 'articulos', 'borradores'] },
    ),
    actionCommand(
        'action:use-blog-hub',
        'Blog Hub',
        'Use Blog Hub for articles, ideas, categories, and publishing review.',
        'Blog Hub',
        { assistantModule: 'website', serviceId: 'cms', requiresProject: true, keywords: ['blog hub', 'blog', 'article', 'post', 'articulo', 'publicacion', 'ideas'] },
    ),
    actionCommand(
        'action:use-navigation',
        'Navigation',
        'Use Navigation for menus, links, and site structure.',
        'Navigation',
        { assistantModule: 'website', requiresProject: true, keywords: ['navigation', 'menu', 'navbar', 'links', 'navegacion', 'enlaces'] },
    ),
    actionCommand(
        'action:use-domains',
        'Domains',
        'Use Domains for connection, publishing, and domain review.',
        'Domains',
        { assistantModule: 'settings', serviceId: 'domains', requiresProject: true, keywords: ['domain', 'domains', 'custom domain', 'dominio', 'dominios', 'publicar'] },
    ),
    actionCommand(
        'action:use-seo',
        'SEO',
        'Use SEO for search titles, descriptions, and indexing review.',
        'SEO',
        { assistantModule: 'website', requiresProject: true, keywords: ['seo', 'metadata', 'search', 'title', 'description', 'metadatos', 'busqueda'] },
    ),
    actionCommand(
        'action:use-templates',
        'Templates',
        'Use Templates for template selection and library review.',
        'Templates',
        { assistantModule: 'project', serviceId: 'templates', keywords: ['templates', 'template', 'library', 'plantillas', 'biblioteca'] },
    ),
    actionCommand(
        'action:use-finance',
        'Finance',
        'Use Finance for invoices, revenue, expenses, and financial status.',
        'Finance',
        { assistantModule: 'finance', serviceId: 'finance', requiresProject: true, keywords: ['finance', 'invoice', 'expense', 'revenue', 'finanzas', 'factura', 'gasto'] },
    ),
    actionCommand(
        'action:use-restaurants',
        'Restaurants',
        'Use Restaurants for menus, reservations, services, and settings.',
        'Restaurants',
        { assistantModule: 'restaurants', serviceId: 'restaurants', requiresProject: true, keywords: ['restaurants', 'restaurant', 'menu', 'reservations', 'restaurante', 'reservas'] },
    ),
    actionCommand(
        'action:use-realty',
        'Realty',
        'Use Realty for listings, showings, properties, and real estate follow-up.',
        'Realty',
        { assistantModule: 'realEstate', serviceId: 'realEstate', requiresProject: true, keywords: ['realty', 'real estate', 'listing', 'showing', 'propiedad', 'inmobiliaria'] },
    ),
    actionCommand(
        'action:use-owner-mode',
        'Owner Mode',
        'Use Owner Mode for platform status, service controls, and admin review.',
        'Owner Mode',
        { assistantModule: 'admin', requiresAdmin: true, keywords: ['owner mode', 'super admin', 'admin', 'platform status', 'service controls', 'modo owner'] },
    ),
];

const MODULE_COMMANDS: GlobalCommandItem[] = [
    moduleCommand('nav:dashboard', 'Dashboard', 'dashboard', { type: 'navigation', keywords: ['home', 'dashboard', 'inicio'] }),
    moduleCommand('nav:websites', 'Websites', 'websites', { keywords: ['websites', 'projects', 'sites', 'sitios', 'webs', 'proyectos'] }),
    moduleCommand('nav:editor', 'Website Builder', 'editor', { requiresProject: true, keywords: ['editor', 'website builder', 'page builder', 'constructor web', 'editar sitio'] }),
    moduleCommand('nav:assets', 'Media AI', 'assets', { serviceId: 'aiFeatures', keywords: ['assets', 'media', 'images', 'ai images', 'medios', 'imagenes'] }),
    moduleCommand('nav:cms', 'CMS', 'cms', { serviceId: 'cms', keywords: ['cms', 'blog', 'content', 'contenido', 'articulos'] }),
    moduleCommand('nav:navigation', 'Navigation', 'navigation', { keywords: ['navigation', 'menu', 'navbar', 'navegacion'] }),
    moduleCommand('nav:chatcore', 'ChatCore', 'ai-assistant', { serviceId: 'chatbot', keywords: ['chatcore', 'chatbot', 'ai assistant', 'asistente ia'] }),
    moduleCommand('nav:leads', 'CRM / Leads', 'leads', { serviceId: 'crm', keywords: ['crm', 'leads', 'prospects', 'clientes potenciales', 'contactos'] }),
    moduleCommand('nav:appointments', 'Appointments', 'appointments', { serviceId: 'appointments', keywords: ['appointments', 'calendar', 'bookings', 'citas', 'calendario', 'reservas'] }),
    moduleCommand('nav:domains', 'Domains', 'domains', { serviceId: 'domains', keywords: ['domains', 'custom domain', 'publish', 'dominios', 'publicar'] }),
    moduleCommand('nav:seo', 'SEO', 'seo', { keywords: ['seo', 'metadata', 'search', 'busqueda', 'metadatos'] }),
    moduleCommand('nav:finance', 'Finance', 'finance', { serviceId: 'finance', keywords: ['finance', 'invoices', 'accounting', 'finanzas', 'facturas', 'contabilidad'] }),
    moduleCommand('nav:ecommerce', 'Ecommerce', 'ecommerce', { serviceId: 'ecommerce', keywords: ['ecommerce', 'products', 'orders', 'store', 'tienda', 'productos', 'ordenes'] }),
    moduleCommand('nav:restaurants', 'Restaurants', 'restaurants', { serviceId: 'restaurants', keywords: ['restaurants', 'menu', 'reservations', 'restaurantes', 'reservas'] }),
    moduleCommand('nav:email', 'Email Marketing', 'email', { serviceId: 'emailMarketing', keywords: ['email', 'campaigns', 'audiences', 'correo', 'campanas', 'audiencias'] }),
    moduleCommand('nav:biopage', 'Bio Page', 'biopage', { serviceId: 'bioPage', keywords: ['bio page', 'link in bio', 'pagina bio'] }),
    moduleCommand('nav:real-estate', 'Realty', 'real-estate', { serviceId: 'realEstate', keywords: ['real estate', 'realty', 'listings', 'inmobiliaria', 'propiedades'] }),
    moduleCommand('nav:templates', 'Templates', 'templates', { serviceId: 'templates', keywords: ['templates', 'library', 'plantillas', 'biblioteca'] }),
    moduleCommand('nav:agency', 'Agency', 'agency', { serviceId: 'agency', keywords: ['agency', 'agencia', 'white label', 'clientes agencia', 'planes agencia', 'facturacion agencia'] }),
    moduleCommand('nav:settings', 'Settings', 'settings', { type: 'navigation', keywords: ['settings', 'workspace', 'team', 'configuracion', 'equipo'] }),
    moduleCommand('admin:superadmin', 'Super Admin', 'superadmin', {
        type: 'admin',
        requiresAdmin: true,
        adminView: 'main',
        keywords: ['super admin', 'admin', 'owner mode', 'administrador'],
    }),
    moduleCommand('admin:global-assistant', 'Global Assistant settings', 'superadmin', {
        type: 'admin',
        requiresAdmin: true,
        adminView: 'global-assistant',
        keywords: ['global assistant', 'assistant settings', 'prompts', 'asistente global', 'configuracion'],
    }),
    moduleCommand('admin:service-availability', 'Service availability', 'superadmin', {
        type: 'admin',
        requiresAdmin: true,
        adminView: 'service-availability',
        keywords: ['service availability', 'feature flags', 'services', 'servicios', 'disponibilidad'],
    }),
];

const resolveDisabledReason = (
    item: GlobalCommandItem,
    input: BuildGlobalCommandItemsInput,
): string | undefined => {
    if (item.requiresAdmin && !input.canAccessAdmin) return 'admin_required';
    if (item.serviceId && input.canAccessService && !input.canAccessService(item.serviceId)) return 'service_unavailable';
    if (item.requiresProject && !input.activeProjectId) return 'project_required';
    return item.disabledReason;
};

const projectToCommand = (project: Project, activeProjectId?: string | null): GlobalCommandItem => {
    const projectRecord = project as Project & Record<string, unknown>;
    const projectId = readString(project.id);
    const projectName = readString(project.name);
    const projectStatus = readString(project.status);

    return {
        id: `project:${projectId}`,
        type: 'project',
        label: projectName || 'Untitled project',
        labelKey: projectName ? undefined : 'globalCommandPalette.untitledProject',
        description: projectId === activeProjectId
            ? 'Active project'
            : `Open project${projectStatus ? ` - ${projectStatus}` : ''}`,
        descriptionKey: projectId === activeProjectId
            ? 'globalCommandPalette.activeProject'
            : 'globalCommandPalette.openProject',
        descriptionParams: {
            status: projectStatus ? ` - ${projectStatus}` : '',
        },
        projectId,
        isActiveProject: projectId === activeProjectId,
        keywords: [
            projectName,
            projectStatus,
            typeof projectRecord.industry === 'string' ? projectRecord.industry : '',
            typeof projectRecord.subdomain === 'string' ? projectRecord.subdomain : '',
            typeof projectRecord.slug === 'string' ? projectRecord.slug : '',
            'project',
            'website',
        ].filter(Boolean),
    };
};

export function buildGlobalCommandItems(input: BuildGlobalCommandItemsInput = {}): GlobalCommandItem[] {
    const query = input.query || '';
    const trimmedQuery = query.trim();
    const items: GlobalCommandItem[] = [];

    if (input.includeAssistantRequest !== false && trimmedQuery) {
        items.push({
            id: 'assistant:request',
            type: 'assistant_request',
            label: `Ask Quimera: ${trimmedQuery}`,
            labelKey: 'globalCommandPalette.askLabel',
            labelParams: { query: trimmedQuery },
            description: 'Send this request to the Global Assistant Operating Layer.',
            descriptionKey: 'globalCommandPalette.askDescription',
            prompt: trimmedQuery,
            keywords: ['assistant', 'ask', 'command', trimmedQuery],
        });
    }

    const sourceProjects = Array.isArray(input.projects) ? input.projects : [];
    const projects = [...sourceProjects]
        .filter(isProjectRecord)
        .filter(project => readString(project.status) !== 'Template' && !(project as any).deletedAt)
        .sort((left, right) => {
            if (left.id === input.activeProjectId) return -1;
            if (right.id === input.activeProjectId) return 1;
            return readString(left.name).localeCompare(readString(right.name));
        })
        .slice(0, input.maxProjects ?? 8)
        .map(project => projectToCommand(project, input.activeProjectId));

    items.push(...projects, ...MODULE_COMMANDS, ...ACTION_COMMANDS);

    return items
        .map(item => ({ ...item, disabledReason: resolveDisabledReason(item, input) }))
        .filter(item => shouldInclude(item, query))
        .sort((left, right) => {
            const leftScore = scoreItem(left, query);
            const rightScore = scoreItem(right, query);
            if (rightScore !== leftScore) return rightScore - leftScore;
            if (left.type === 'assistant_request') return -1;
            if (right.type === 'assistant_request') return 1;
            if (left.type === 'project' && right.type !== 'project') return -1;
            if (right.type === 'project' && left.type !== 'project') return 1;
            if (left.type === 'project' && right.type === 'project') {
                if (left.isActiveProject && !right.isActiveProject) return -1;
                if (right.isActiveProject && !left.isActiveProject) return 1;
            }
            return left.label.localeCompare(right.label);
        })
        .slice(0, input.maxItems ?? 12);
}

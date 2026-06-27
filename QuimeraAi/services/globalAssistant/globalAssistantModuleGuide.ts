import type { AssistantModuleTarget } from '../../types/globalAssistant';
import type { MediaGeneratorLaunchOptions } from '../../utils/mediaGeneratorLaunch';

export type GlobalAssistantGuideTarget =
    | 'aiStudio'
    | 'businessBlueprint'
    | 'media'
    | 'image'
    | 'video'
    | 'leads'
    | 'email'
    | 'storefront'
    | 'ecommerce'
    | 'cms'
    | 'navigation'
    | 'domains'
    | 'seo'
    | 'templates'
    | 'blogHub'
    | 'chatcore'
    | 'appointments'
    | 'bioPage'
    | 'analytics'
    | 'ownerMode'
    | 'agency'
    | 'websiteBuilder'
    | 'finance'
    | 'restaurants'
    | 'realEstate'
    | 'projects'
    | 'settings'
    | 'designSystem';

export interface ResolveDirectModuleGuideInput {
    request: string;
    activeModule?: AssistantModuleTarget | string | null;
    activeRoute?: string | null;
    activeRouteModule?: AssistantModuleTarget | string | null;
    quickActionId?: string | null;
    locale?: string | null;
}

export interface DirectModuleGuideDecision {
    target: GlobalAssistantGuideTarget;
    message: string;
    preparedPrompt: boolean;
    prompt: string;
    options: MediaGeneratorLaunchOptions;
}

export interface ComponentHelpGuideResponse {
    targetId: string;
    message: string;
}

export interface GuideOnlyActionResponse {
    message: string;
}

export interface AssistantProjectOption {
    id: string;
    name?: unknown;
}

export interface ProjectMentionResolution {
    status: 'none' | 'matched' | 'ambiguous' | 'not_found';
    projectId?: string;
    projectName?: string;
    message?: string;
    matchedProjects?: Array<{ id: string; name: string }>;
}

export const isSpanishLocale = (locale?: string | null) => (locale || '').toLowerCase().startsWith('es');

export const normalizeAssistantGuideText = (value: string): string =>
    value
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, ' ')
        .trim();

const includesTerm = (text: string, terms: string[]): boolean =>
    terms.some(term => text.includes(term));

const containsNormalizedPhrase = (text: string, phrase: string): boolean =>
    Boolean(text && phrase && ` ${text} `.includes(` ${phrase} `));

const userTextLooksSpanish = (value: string): boolean => {
    const text = normalizeAssistantGuideText(value);
    const words = text.split(' ').filter(Boolean);
    return words.includes('si') || includesTerm(text, [
        'quiero',
        'necesito',
        'puedes',
        'podrias',
        'imagen',
        'foto',
        'casa',
        'abrir',
        'abre',
        'revisar',
        'crear',
        'generar',
        'sitio',
        'pagina',
        'web',
        'cita',
        'citas',
        'correo',
        'leads',
        'tienda',
        'proyecto',
        'ajustes',
        'equipo',
        'diseno',
        'diseño',
        'gracias',
    ]);
};

export const shouldAnswerInSpanish = (value: string, locale?: string | null): boolean =>
    userTextLooksSpanish(value) || isSpanishLocale(locale);

const PROJECT_SCOPED_GUIDE_TARGETS = new Set<GlobalAssistantGuideTarget>([
    'businessBlueprint',
    'media',
    'image',
    'video',
    'leads',
    'email',
    'storefront',
    'ecommerce',
    'cms',
    'navigation',
    'domains',
    'seo',
    'blogHub',
    'chatcore',
    'appointments',
    'bioPage',
    'analytics',
    'websiteBuilder',
    'finance',
    'restaurants',
    'realEstate',
]);

export const isProjectScopedGuideTarget = (target: GlobalAssistantGuideTarget): boolean =>
    PROJECT_SCOPED_GUIDE_TARGETS.has(target);

export const resolveGuideTargetAssistantModule = (
    target?: GlobalAssistantGuideTarget | string | null,
): AssistantModuleTarget | null => {
    if (!target) return null;
    const moduleMap: Record<string, AssistantModuleTarget> = {
        aiStudio: 'aiStudio',
        businessBlueprint: 'businessBlueprint',
        media: 'media',
        image: 'media',
        video: 'media',
        leads: 'crm',
        email: 'emailMarketing',
        storefront: 'storefront',
        ecommerce: 'ecommerce',
        cms: 'website',
        navigation: 'website',
        domains: 'settings',
        seo: 'website',
        templates: 'project',
        blogHub: 'website',
        chatcore: 'chatbot',
        appointments: 'appointments',
        bioPage: 'bioPage',
        analytics: 'analytics',
        ownerMode: 'admin',
        agency: 'agency',
        websiteBuilder: 'website',
        finance: 'finance',
        restaurants: 'restaurants',
        realEstate: 'realEstate',
        projects: 'project',
        project_required: 'project',
        project_resolution: 'project',
        settings: 'settings',
        designSystem: 'designSystem',
    };
    return moduleMap[target] || null;
};

const formatGuideTargetName = (target: GlobalAssistantGuideTarget): string => {
    const names: Record<GlobalAssistantGuideTarget, string> = {
        aiStudio: 'AI Studio',
        businessBlueprint: 'BusinessBlueprint',
        media: 'Media AI',
        image: 'Images',
        video: 'Videos',
        leads: 'Leads',
        email: 'Email',
        storefront: 'Storefront',
        ecommerce: 'Ecommerce',
        cms: 'CMS',
        navigation: 'Navigation',
        domains: 'Domains',
        seo: 'SEO',
        templates: 'Templates',
        blogHub: 'Blog Hub',
        chatcore: 'ChatCore',
        appointments: 'Appointments',
        bioPage: 'Bio Page',
        analytics: 'Analytics',
        ownerMode: 'Owner Mode',
        agency: 'Agency',
        websiteBuilder: 'Website Builder',
        finance: 'Finance',
        restaurants: 'Restaurants',
        realEstate: 'Realty',
        projects: 'Websites',
        settings: 'Settings',
        designSystem: 'Design',
    };
    return names[target];
};

export const formatMissingProjectGuideMessage = (
    target: GlobalAssistantGuideTarget,
    request: string,
    locale?: string | null,
): string => {
    const targetName = formatGuideTargetName(target);
    return shouldAnswerInSpanish(request, locale)
        ? `Primero elige un proyecto en Websites. Después usa ${targetName} para continuar con esa área.`
        : `Choose a project in Websites first. Then use ${targetName} to continue in that area.`;
};

const hasMediaCreationIntent = (text: string): boolean =>
    includesTerm(text, [
        'quiero',
        'necesito',
        'busco',
        'me gustaria',
        'crear',
        'crea',
        'generar',
        'genera',
        'hacer',
        'haz',
        'create',
        'generate',
        'make',
    ]);

export const isImageCreationRequest = (value: string): boolean => {
    const text = normalizeAssistantGuideText(value);
    const asksForImage = includesTerm(text, ['imagen', 'image', 'foto', 'photo']);
    const asksForVideo = includesTerm(text, ['video', 'reel', 'short']);
    const hasCreateIntent = hasMediaCreationIntent(text);

    return asksForImage && !asksForVideo && hasCreateIntent;
};

export const isVideoCreationRequest = (value: string): boolean => {
    const text = normalizeAssistantGuideText(value);
    const asksForVideo = includesTerm(text, ['video', 'reel', 'short']);
    const hasCreateIntent = hasMediaCreationIntent(text);

    return asksForVideo && hasCreateIntent;
};

const resolveMediaOpenTarget = (request: string, activeModule?: unknown): 'media' | 'image' | 'video' | null => {
    const text = normalizeAssistantGuideText(request);
    if (!text) return null;

    const mediaModuleTerms = ['media ai', 'media', 'assets', 'asset', 'biblioteca de medios', 'recursos'];
    const imageTerms = ['imagenes', 'imagen', 'images', 'image', 'foto', 'photo'];
    const videoTerms = ['videos', 'video', 'reel', 'short'];
    const openTerms = [
        'abre',
        'abrir',
        'open',
        'usa',
        'usar',
        'use',
        've a',
        'go to',
        'revisa',
        'review',
        'componente',
        'modulo',
        'module',
        'area',
    ];

    const hasOpenIntent = includesTerm(text, openTerms);
    const hasMediaModule = includesTerm(text, mediaModuleTerms);
    const hasImage = includesTerm(text, imageTerms);
    const hasVideo = includesTerm(text, videoTerms);

    if (hasMediaModule && (hasOpenIntent || activeModule === 'media')) return 'media';
    if (hasVideo && (hasOpenIntent || activeModule === 'media')) return 'video';
    if (hasImage && (hasOpenIntent || activeModule === 'media')) return 'image';
    if (activeModule === 'media') return 'media';

    return null;
};

export const isComponentHelpQuestion = (value: string): boolean => {
    const text = normalizeAssistantGuideText(value);
    if (!text) return false;
    return includesTerm(text, [
        'como funciona',
        'como funciona esta pantalla',
        'como se usa',
        'que hace',
        'para que sirve',
        'que puedo hacer',
        'que hago',
        'que hago aqui',
        'que puedo hacer aqui',
        'donde estoy',
        'esta pantalla',
        'ayudame aqui',
        'ayudame con esta pantalla',
        'ayuda',
        'help',
        'how does it work',
        'how does this work',
        'how it works',
        'how do i use',
        'what does it do',
        'what can i do',
        'what can i do here',
        'where am i',
        'this screen',
        'help me here',
        'help me with this screen',
        'explica',
        'explain',
    ]);
};

const isGuideOnlyActionRequest = (value: string): boolean => {
    const text = normalizeAssistantGuideText(value);
    if (!text || isComponentHelpQuestion(text)) return false;

    return includesTerm(text, [
        'necesito hacer',
        'quiero hacer',
        'hacer una edicion',
        'hacer una edición',
        'hacer un cambio',
        'editar',
        'edicion',
        'edición',
        'modificar',
        'actualizar',
        'cambiar',
        'ajustar',
        'crear',
        'generar',
        'borrar',
        'eliminar',
        'publicar',
        'enviar',
        'programar',
        'agendar',
        'entrenar',
        'sincronizar',
        'i need to edit',
        'i want to edit',
        'make an edit',
        'make a change',
        'edit',
        'update',
        'change',
        'create',
        'generate',
        'delete',
        'publish',
        'send',
        'schedule',
        'train',
        'sync',
    ]);
};

export const resolveGuideOnlyActionResponse = (
    input: ResolveDirectModuleGuideInput,
): GuideOnlyActionResponse | null => {
    if (!isGuideOnlyActionRequest(input.request)) return null;

    const spanish = shouldAnswerInSpanish(input.request, input.locale);
    return {
        message: spanish
            ? 'Dime en qué área quieres trabajar y te doy los pasos: Website Builder, Ecommerce, Email, Leads, Citas, Bio Page, ChatCore o Media AI.'
            : 'Tell me which area you want to use and I will give you the steps: Website Builder, Ecommerce, Email, Leads, Appointments, Bio Page, ChatCore, or Media AI.',
    };
};

export const resolveGuideOnlyFallbackResponse = (
    input: Pick<ResolveDirectModuleGuideInput, 'request' | 'locale'>,
): GuideOnlyActionResponse => {
    const spanish = shouldAnswerInSpanish(input.request, input.locale);
    return {
        message: spanish
            ? 'Dime qué área quieres usar y te explico los pasos para hacerlo desde esa pantalla.'
            : 'Tell me which area you want to use and I will explain the steps from that screen.',
    };
};

const readProjectName = (project: AssistantProjectOption): string => {
    if (typeof project.name === 'string') return project.name.trim();
    if (project.name && typeof project.name === 'object') {
        const record = project.name as Record<string, unknown>;
        for (const key of ['es', 'en', 'default', 'name', 'title']) {
            if (typeof record[key] === 'string' && record[key].trim()) return record[key].trim();
        }
    }
    return '';
};

const formatProjectResolutionMessage = (
    kind: 'ambiguous' | 'not_found',
    request: string,
    locale: string | null | undefined,
    value: string,
    names: string[] = [],
): string => {
    const spanish = shouldAnswerInSpanish(request, locale);
    if (kind === 'ambiguous') {
        const list = names.slice(0, 4).join(', ');
        return spanish
            ? `Encontré varios proyectos para "${value}": ${list}. ¿Cuál quieres abrir?`
            : `I found several projects for "${value}": ${list}. Which one should I open?`;
    }

    return spanish
        ? `No encontré el proyecto "${value}". Revisa el nombre o abre Websites para elegirlo.`
        : `I could not find the project "${value}". Check the name or open Websites to choose it.`;
};

const cleanProjectPhraseDisplay = (value: string): string | null => {
    const cleaned = value
        .replace(/[?.!,;:]+$/g, '')
        .replace(/\s+/g, ' ')
        .trim();
    return cleaned || null;
};

const extractExplicitProjectPhrase = (request: string): string | null => {
    const match = request.match(/\b(?:proyecto|project|workspace|tenant)\s+(.+)$/i);
    if (!match?.[1]) return null;
    return cleanProjectPhraseDisplay(match[1]);
};

const extractLooseProjectPhrase = (request: string): string | null => {
    const matches = [...request.matchAll(/\b(?:de|del|para|for|en|in)\s+([a-z0-9][a-z0-9 ]*)$/gi)];
    const value = matches[matches.length - 1]?.[1]?.trim();
    if (!value) return null;
    return cleanProjectPhraseDisplay(value.replace(/\b(?:el|la|los|las|un|una|a|an)\s+/gi, ''));
};

export const resolveProjectMentionFromRequest = (input: {
    request: string;
    projects: AssistantProjectOption[];
    activeProjectId?: string | null;
    locale?: string | null;
}): ProjectMentionResolution => {
    const request = input.request || '';
    const text = normalizeAssistantGuideText(request);
    if (!text || input.projects.length === 0) return { status: 'none' };

    const namedProjects = input.projects
        .map(project => {
            const name = readProjectName(project);
            return {
                id: project.id,
                name,
                normalizedName: normalizeAssistantGuideText(name),
            };
        })
        .filter(project => project.id && project.name && project.normalizedName.length >= 2);

    if (namedProjects.length === 0) return { status: 'none' };

    const exactMatches = namedProjects.filter(project => containsNormalizedPhrase(text, project.normalizedName));
    if (exactMatches.length > 0) {
        const maxLength = Math.max(...exactMatches.map(project => project.normalizedName.length));
        const longestMatches = exactMatches.filter(project => project.normalizedName.length === maxLength);
        if (longestMatches.length === 1) {
            return {
                status: 'matched',
                projectId: longestMatches[0].id,
                projectName: longestMatches[0].name,
                matchedProjects: longestMatches.map(({ id, name }) => ({ id, name })),
            };
        }

        return {
            status: 'ambiguous',
            message: formatProjectResolutionMessage('ambiguous', request, input.locale, longestMatches[0].name, longestMatches.map(project => project.name)),
            matchedProjects: longestMatches.map(({ id, name }) => ({ id, name })),
        };
    }

    const explicitPhrase = extractExplicitProjectPhrase(request);
    const loosePhrase = explicitPhrase || extractLooseProjectPhrase(request);
    if (!loosePhrase) return { status: 'none' };

    const normalizedPhrase = normalizeAssistantGuideText(loosePhrase);
    if (normalizedPhrase.length < 2) return { status: 'none' };

    const phraseMatches = namedProjects.filter(project =>
        containsNormalizedPhrase(project.normalizedName, normalizedPhrase)
        || containsNormalizedPhrase(normalizedPhrase, project.normalizedName)
        || project.normalizedName.startsWith(normalizedPhrase),
    );

    if (phraseMatches.length === 1) {
        return {
            status: 'matched',
            projectId: phraseMatches[0].id,
            projectName: phraseMatches[0].name,
            matchedProjects: phraseMatches.map(({ id, name }) => ({ id, name })),
        };
    }

    if (phraseMatches.length > 1) {
        return {
            status: 'ambiguous',
            message: formatProjectResolutionMessage('ambiguous', request, input.locale, loosePhrase, phraseMatches.map(project => project.name)),
            matchedProjects: phraseMatches.map(({ id, name }) => ({ id, name })),
        };
    }

    if (explicitPhrase) {
        return {
            status: 'not_found',
            message: formatProjectResolutionMessage('not_found', request, input.locale, explicitPhrase),
        };
    }

    return { status: 'none' };
};

export const looksLikePlainCreativeBrief = (value: string): boolean => {
    const text = normalizeAssistantGuideText(value);
    if (!text || isComponentHelpQuestion(text)) return false;
    if (text.length < 4) return false;
    if (value.includes('?') || text.includes('pregunta')) return false;
    return !includesTerm(text, [
        'abre',
        'abrir',
        'open',
        've a',
        'go to',
        'revisa',
        'review',
        'analiza',
        'analyze',
        'explica',
        'explain',
    ]);
};

export const isLeadReviewRequest = (value: string, activeModule?: unknown): boolean => {
    const text = normalizeAssistantGuideText(value);
    const asksForLeads = includesTerm(text, ['lead', 'leads', 'crm', 'prospecto', 'cliente potencial']);
    const hasOpenIntent = includesTerm(text, ['abrir', 'abre', 'open', 'ver', 'revisar', 'review', 'componente']);
    return asksForLeads && (hasOpenIntent || activeModule === 'crm');
};

export const extractImagePrompt = (value: string): string => {
    let next = value.replace(/\s+/g, ' ').trim();
    const replacements = [
        /^\s*(generate image|create image|generar imagen|crear imagen)\s*[:,-]?\s*/i,
        /^\s*(quiero|necesito|busco|me gustaria|puedes|podrias|please|can you)\s+/i,
        /^\s*(crear|crea|generar|genera|hacer|haz|create|generate|make)\s+/i,
        /^\s*(una|un|a|an)?\s*(imagen|foto|image|photo)\s*(de|sobre|para|of|for)?\s*/i,
    ];

    for (let pass = 0; pass < 2; pass += 1) {
        replacements.forEach(pattern => {
            next = next.replace(pattern, '').trim();
        });
    }

    return next.length >= 4 ? next : value.trim();
};

export const extractVideoPrompt = (value: string): string => {
    let next = value.replace(/\s+/g, ' ').trim();
    const replacements = [
        /^\s*(generate video|create video|generar video|crear video|hacer video|haz video)\s*[:,-]?\s*/i,
        /^\s*(quiero|necesito|busco|me gustaria|puedes|podrias|please|can you)\s+/i,
        /^\s*(crear|crea|generar|genera|hacer|haz|create|generate|make)\s+/i,
        /^\s*(un|una|a|an)?\s*(video|reel|short)\s*(de|sobre|para|of|for)?\s*/i,
    ];

    for (let pass = 0; pass < 2; pass += 1) {
        replacements.forEach(pattern => {
            next = next.replace(pattern, '').trim();
        });
    }

    return next.length >= 4 ? next : value.trim();
};

export const parseImageLaunchOptions = (value: string): MediaGeneratorLaunchOptions => {
    const text = normalizeAssistantGuideText(value);
    const options: MediaGeneratorLaunchOptions = {};

    if (includesTerm(text, ['21 9', 'ultrawide', 'ultra wide', 'panoramica', 'panoramico'])) {
        options.aspectRatio = '21:9';
    } else if (includesTerm(text, ['16 9', 'horizontal', 'landscape', 'wide', 'ancha'])) {
        options.aspectRatio = '16:9';
    } else if (includesTerm(text, ['9 16', 'vertical', 'story', 'reel'])) {
        options.aspectRatio = '9:16';
    } else if (includesTerm(text, ['3 4', 'portrait', 'retrato'])) {
        options.aspectRatio = '3:4';
    } else if (includesTerm(text, ['4 3', 'standard', 'clasica', 'clasico'])) {
        options.aspectRatio = '4:3';
    } else if (includesTerm(text, ['1 1', 'cuadrada', 'cuadrado', 'square'])) {
        options.aspectRatio = '1:1';
    }

    if (includesTerm(text, ['4k', '2160', 'alta resolucion', 'high resolution', 'mejor calidad'])) {
        options.resolution = '4K';
    } else if (includesTerm(text, ['1080', 'full hd', '2k', 'balanceada', 'balanced'])) {
        options.resolution = '2K';
    } else if (includesTerm(text, ['720', '1k', 'rapida', 'rapido', 'fast'])) {
        options.resolution = '1K';
    }

    if (includesTerm(text, ['fotorealista', 'foto realista', 'realista', 'photorealistic'])) {
        options.style = 'Photorealistic';
    } else if (includesTerm(text, ['cinematica', 'cinematic', 'cine', 'cinemática'])) {
        options.style = 'Cinematic';
    } else if (includesTerm(text, ['anime'])) {
        options.style = 'Anime';
    } else if (includesTerm(text, ['digital art', 'arte digital'])) {
        options.style = 'Digital Art';
    } else if (includesTerm(text, ['oil painting', 'oleo', 'óleo', 'pintura al oleo', 'pintura al óleo'])) {
        options.style = 'Oil Painting';
    } else if (includesTerm(text, ['watercolor', 'acuarela'])) {
        options.style = 'Watercolor';
    } else if (includesTerm(text, ['cyberpunk', 'neon futurista'])) {
        options.style = 'Cyberpunk';
    } else if (includesTerm(text, ['3d', 'render'])) {
        options.style = '3D Render';
    } else if (includesTerm(text, ['minimalista', 'minimalist'])) {
        options.style = 'Minimalist';
    }

    return options;
};

export const parseVideoLaunchOptions = (value: string): MediaGeneratorLaunchOptions => {
    const text = normalizeAssistantGuideText(value);
    const options: MediaGeneratorLaunchOptions = {};

    if (includesTerm(text, ['21 9', 'ultrawide', 'ultra wide', 'panoramica', 'panoramico'])) {
        options.aspectRatio = '21:9';
    } else if (includesTerm(text, ['16 9', 'horizontal', 'landscape', 'wide', 'ancho', 'ancha'])) {
        options.aspectRatio = '16:9';
    } else if (includesTerm(text, ['9 16', 'vertical', 'story', 'reel', 'tiktok'])) {
        options.aspectRatio = '9:16';
    } else if (includesTerm(text, ['3 4', 'portrait', 'retrato'])) {
        options.aspectRatio = '3:4';
    } else if (includesTerm(text, ['4 3', 'standard', 'clasica', 'clasico'])) {
        options.aspectRatio = '4:3';
    } else if (includesTerm(text, ['1 1', 'cuadrado', 'cuadrada', 'square'])) {
        options.aspectRatio = '1:1';
    }

    if (includesTerm(text, ['4k', '2160'])) {
        options.resolution = '4k';
    } else if (includesTerm(text, ['1080', 'full hd'])) {
        options.resolution = '1080p';
    } else if (includesTerm(text, ['720', 'hd'])) {
        options.resolution = '720p';
    }

    return options;
};

export const isWebsiteCreationLaunchRequest = (request: string, activeModule?: unknown): boolean => {
    const text = normalizeAssistantGuideText(request);
    if (!text) return false;

    const hasWebsiteTarget = includesTerm(text, [
        'website',
        'sitio web',
        'pagina web',
        'landing',
        'web para',
        'web por',
        'site',
    ]);
    const hasCreateIntent = includesTerm(text, [
        'necesito',
        'quiero',
        'crear',
        'crea',
        'generar',
        'genera',
        'hacer',
        'haz',
        'create',
        'build',
        'make',
        'new',
        'nuevo',
        'nueva',
    ]);
    const hasEditIntent = includesTerm(text, [
        'editar',
        'edita',
        'modificar',
        'modifica',
        'actualizar',
        'actualiza',
        'seccion',
        'section',
        'hero',
        'footer',
        'copy',
    ]);

    return activeModule === 'aiStudio' || (hasWebsiteTarget && hasCreateIntent && !hasEditIntent);
};

const isAiStudioOpenOnlyRequest = (request: string): boolean => {
    const text = normalizeAssistantGuideText(request);
    if (!text) return false;

    const opensAiStudio = includesTerm(text, [
        'abre ai studio',
        'abrir ai studio',
        'open ai studio',
        'abre el ai studio',
        'abre web design studio',
        'abrir web design studio',
        'open web design studio',
        'abre el estudio',
        'abrir el estudio',
    ]);
    const createsSomething = includesTerm(text, [
        'crear',
        'crea',
        'generar',
        'genera',
        'create',
        'build',
        'make',
        'website',
        'sitio',
        'pagina',
        'landing',
    ]);

    return opensAiStudio && !createsSomething;
};

const isWebsiteBuilderOpenRequest = (request: string): boolean => {
    const text = normalizeAssistantGuideText(request);
    if (!text) return false;
    const hasWebsiteBuilderTarget = includesTerm(text, [
        'website builder',
        'web builder',
        'builder de website',
        'constructor web',
        'editor web',
        'editor del website',
        'editor de website',
        'editor del sitio',
        'editor de sitio',
    ]);
    const hasWebsiteEditTarget = includesTerm(text, [
        'website',
        'web',
        'sitio',
        'sitio web',
        'pagina',
        'pagina web',
        'page',
        'landing',
    ]) && includesTerm(text, [
        'edicion',
        'edición',
        'editar',
        'edita',
        'modificar',
        'modifica',
        'actualizar',
        'actualiza',
        'cambio',
        'cambiar',
        'ajustar',
        'ajuste',
    ]);
    const hasOpenIntent = includesTerm(text, [
        'abre',
        'abrir',
        'open',
        'usa',
        'usar',
        'use',
        've a',
        'go to',
        'revisa',
        'review',
        'componente',
        'modulo',
        'module',
        'area',
        'necesito',
        'quiero',
        'hacer',
        'edicion',
        'edición',
        'editar',
        'edita',
        'modificar',
        'actualizar',
    ]);

    return (hasWebsiteBuilderTarget || hasWebsiteEditTarget) && hasOpenIntent;
};

const isWebsiteActiveEditRequest = (request: string, activeModule?: unknown): boolean => {
    if (activeModule !== 'website') return false;
    const text = normalizeAssistantGuideText(request);
    if (!text) return false;
    return includesTerm(text, [
        'editar',
        'edita',
        'edicion',
        'edición',
        'modificar',
        'modifica',
        'actualizar',
        'actualiza',
        'cambiar',
        'cambio',
        'ajustar',
        'ajuste',
        'hero',
        'seccion',
        'section',
        'bloque',
        'block',
    ]);
};

const resolveNamedModuleOpenTarget = (request: string): GlobalAssistantGuideTarget | null => {
    const text = normalizeAssistantGuideText(request);
    if (!text || isComponentHelpQuestion(request)) return null;

    const hasIntent = includesTerm(text, [
        'abre',
        'abrir',
        'open',
        'usa',
        'usar',
        'use',
        've a',
        'go to',
        'revisa',
        'review',
        'quiero',
        'necesito',
        'crear',
        'crea',
        'editar',
        'edita',
        'modificar',
        'actualizar',
        'publicar',
        'conectar',
        'donde',
        'dónde',
        'configuro',
        'configurar',
        'configura',
        'connect',
        'create',
        'edit',
        'update',
        'publish',
        'where',
        'manage',
    ]);
    if (!hasIntent) return null;

    const moduleTerms: Array<{ target: GlobalAssistantGuideTarget; terms: string[] }> = [
        { target: 'ownerMode', terms: ['owner mode', 'modo owner', 'super admin', 'superadmin', 'admin global', 'platform errors', 'errores plataforma'] },
        { target: 'businessBlueprint', terms: ['businessblueprint', 'business blueprint', 'business map', 'mapa de negocio', 'plan del negocio', 'plan de negocio'] },
        { target: 'websiteBuilder', terms: ['website builder', 'builder de website', 'editor web', 'editor del website', 'editor de website', 'editor del sitio', 'editor de sitio'] },
        { target: 'storefront', terms: ['storefront', 'storefront builder', 'store builder', 'tienda publica', 'escaparate'] },
        { target: 'cms', terms: ['cms', 'content management', 'gestor de contenido'] },
        { target: 'blogHub', terms: ['blog hub', 'blog', 'articulo', 'articulos', 'article', 'articles', 'post', 'posts'] },
        { target: 'navigation', terms: ['navigation', 'navegacion', 'navegación', 'navbar', 'menu del website', 'menu del sitio', 'menu web'] },
        { target: 'domains', terms: ['domains', 'domain', 'dominio', 'dominios', 'custom domain'] },
        { target: 'seo', terms: ['seo', 'meta title', 'meta description', 'metadatos', 'search engine', 'busqueda organica', 'búsqueda orgánica'] },
        { target: 'templates', terms: ['templates', 'template', 'plantilla', 'plantillas', 'biblioteca de plantillas'] },
        { target: 'ecommerce', terms: ['ecommerce', 'tienda', 'productos', 'producto', 'orders', 'ordenes', 'inventario', 'inventory'] },
        { target: 'email', terms: ['email marketing', 'email', 'correo', 'campana', 'campaña', 'campaign', 'newsletter'] },
        { target: 'appointments', terms: ['appointments', 'appointment', 'citas', 'cita', 'agenda', 'booking', 'reservas'] },
        { target: 'restaurants', terms: ['restaurants', 'restaurante', 'restaurantes', 'menu restaurante', 'menú restaurante'] },
        { target: 'realEstate', terms: ['realty', 'real estate', 'bienes raices', 'bienes raíces', 'propiedad', 'propiedades', 'listing', 'listings'] },
        { target: 'bioPage', terms: ['bio page', 'biopage', 'bio link', 'link in bio', 'link de bio'] },
        { target: 'chatcore', terms: ['chatcore', 'chat core', 'chatbot', 'conocimiento del chat', 'visitor chat'] },
        { target: 'leads', terms: ['leads', 'lead', 'crm', 'prospectos', 'prospecto', 'clientes potenciales'] },
        { target: 'finance', terms: ['finance', 'finanzas', 'facturas', 'factura', 'invoice', 'invoices', 'gastos', 'gasto'] },
        { target: 'agency', terms: ['agency', 'agencia', 'white label', 'clientes agencia', 'agency clients', 'planes agencia', 'facturacion agencia', 'facturación agencia'] },
        { target: 'analytics', terms: ['analytics', 'analiticas', 'analíticas', 'metricas', 'métricas', 'reportes', 'reporte'] },
        { target: 'settings', terms: ['settings', 'ajustes', 'configuracion', 'configuración', 'workspace', 'team', 'equipo', 'cuenta'] },
        { target: 'designSystem', terms: ['design system', 'tokens de diseno', 'tokens de diseño', 'design tokens', 'colores globales', 'tipografias globales', 'tipografías globales'] },
        { target: 'projects', terms: ['websites', 'proyectos', 'proyecto', 'projects', 'project list'] },
    ];

    return moduleTerms.find(({ terms }) => includesTerm(text, terms))?.target || null;
};

type GuideCopy = { es: string; en: string };

const formatStepGuide = (intro: string, steps: string[]): string =>
    [intro, ...steps.map((step, index) => `${index + 1}. ${step}`)].join('\n');

const buildModuleGuideCopy = (
    target: GlobalAssistantGuideTarget,
    preparedPrompt = false,
): GuideCopy => {
    const imagePromptStepEs = preparedPrompt
        ? 'Revisa el prompt en el campo principal. Si quieres algo más específico, añade lugar, sujeto, ambiente y uso.'
        : 'Escribe el prompt principal. Ejemplo: "casa moderna en Puerto Rico, luz natural, estilo realista".';
    const imagePromptStepEn = preparedPrompt
        ? 'Review the prompt in the main field. To make it stronger, add place, subject, mood, and use case.'
        : 'Write the main prompt. Example: "modern house in Puerto Rico, natural light, realistic style".';
    const videoPromptStepEs = preparedPrompt
        ? 'Revisa el prompt en el campo principal y aclara la escena, movimiento y duración que necesitas.'
        : 'Escribe el prompt del video con escena, movimiento y resultado. Ejemplo: "recorrido vertical de una tienda nueva con luz cálida".';
    const videoPromptStepEn = preparedPrompt
        ? 'Review the prompt in the main field and clarify the scene, movement, and duration you need.'
        : 'Write the video prompt with scene, movement, and result. Example: "vertical walkthrough of a new store with warm light".';

    const copy: Record<GlobalAssistantGuideTarget, GuideCopy> = {
        aiStudio: {
            es: formatStepGuide('AI Studio sirve para convertir una idea en un website o contenido inicial.', [
                preparedPrompt ? 'Revisa la idea en el campo principal y completa lo que falte.' : 'Escribe qué quieres crear, para quién es y qué estilo debe tener.',
                'Revisa las preguntas del Studio sobre negocio, secciones, tono e imágenes.',
                'Ajusta el resultado antes de generar: idioma, tipo de sitio, estilo visual y objetivo.',
                'Cuando esté claro, presiona Enviar dentro de AI Studio.',
            ]),
            en: formatStepGuide('AI Studio helps turn an idea into a website or starter content.', [
                preparedPrompt ? 'Review the idea in the main field and complete anything missing.' : 'Write what you want to create, who it is for, and the style you want.',
                'Review the Studio questions about business, sections, tone, and images.',
                'Adjust the result before generating: language, site type, visual style, and goal.',
                'When it is clear, press Send inside AI Studio.',
            ]),
        },
        image: {
            es: formatStepGuide('Imágenes sirve para preparar una imagen antes de generarla.', [
                imagePromptStepEs,
                'Elige aspect ratio: 1:1 para posts, 9:16 para stories/reels, 16:9 para banners o 3:4 para retratos.',
                'Elige resolución: 1K rápido, 2K balanceado o 4K para más detalle.',
                'Elige estilo: realista, cinematográfico, 3D, minimalista, acuarela, óleo u otro estilo visual.',
                'Revisa el preview de opciones y toca Generar cuando todo esté listo.',
            ]),
            en: formatStepGuide('Images helps prepare an image before generating it.', [
                imagePromptStepEn,
                'Choose aspect ratio: 1:1 for posts, 9:16 for stories/reels, 16:9 for banners, or 3:4 for portraits.',
                'Choose resolution: 1K for speed, 2K balanced, or 4K for more detail.',
                'Choose style: realistic, cinematic, 3D, minimalist, watercolor, oil painting, or another visual style.',
                'Review the options preview and press Generate when everything is ready.',
            ]),
        },
        video: {
            es: formatStepGuide('Videos sirve para preparar un video antes de generarlo.', [
                videoPromptStepEs,
                'Elige aspect ratio: 9:16 para redes, 16:9 para web o 1:1 para posts cuadrados.',
                'Ajusta resolución, duración, movimiento de cámara y ritmo.',
                'Si tienes imagen de referencia, úsala para mantener producto, persona o ambiente.',
                'Revisa las opciones y toca Generar cuando esté listo.',
            ]),
            en: formatStepGuide('Videos helps prepare a video before generating it.', [
                videoPromptStepEn,
                'Choose aspect ratio: 9:16 for social, 16:9 for web, or 1:1 for square posts.',
                'Adjust resolution, duration, camera movement, and pacing.',
                'If you have a reference image, use it to keep the product, person, or mood consistent.',
                'Review the options and press Generate when ready.',
            ]),
        },
        media: {
            es: formatStepGuide('Media AI organiza imágenes, videos y assets del proyecto.', [
                'Elige Imágenes si necesitas crear o preparar una imagen.',
                'Elige Videos si necesitas escenas, reels o clips.',
                'Revisa biblioteca, archivos generados y filtros para encontrar assets existentes.',
                'Usa el resultado dentro del website, tienda, email o Bio Page.',
            ]),
            en: formatStepGuide('Media AI organizes project images, videos, and assets.', [
                'Choose Images if you need to create or prepare an image.',
                'Choose Videos if you need scenes, reels, or clips.',
                'Review the library, generated files, and filters to find existing assets.',
                'Use the result in the website, store, email, or Bio Page.',
            ]),
        },
        leads: {
            es: formatStepGuide('Leads sirve para revisar contactos y dar seguimiento.', [
                'Usa búsqueda o filtros para encontrar el lead por nombre, estado o fuente.',
                'Abre la ficha para ver datos, notas, historial y próxima acción.',
                'Cambia el estado solo cuando confirmes el progreso real.',
                'Usa notas o etiquetas para dejar claro qué falta hacer.',
            ]),
            en: formatStepGuide('Leads helps review contacts and follow up.', [
                'Use search or filters to find a lead by name, status, or source.',
                'Open the record to review details, notes, history, and next action.',
                'Change the status only when the real progress is confirmed.',
                'Use notes or tags to make the next step clear.',
            ]),
        },
        email: {
            es: formatStepGuide('Email sirve para preparar campañas y revisar envíos antes de mandarlos.', [
                'Elige campañas, audiencias o templates según lo que quieras trabajar.',
                'Edita asunto, contenido, botones, imágenes y destinatarios.',
                'Revisa preview, enlaces y audiencia antes de enviar.',
                'Usa enviar o programar solo cuando todo esté confirmado.',
            ]),
            en: formatStepGuide('Email helps prepare campaigns and review sends before sending.', [
                'Choose campaigns, audiences, or templates based on what you want to work on.',
                'Edit subject, content, buttons, images, and recipients.',
                'Review preview, links, and audience before sending.',
                'Use send or schedule only when everything is confirmed.',
            ]),
        },
        businessBlueprint: {
            es: formatStepGuide('BusinessBlueprint muestra el plan del negocio y cómo se conectan los módulos.', [
                'Revisa nombre, oferta, audiencia, tono, servicios y objetivos.',
                'Verifica qué módulos dependen de ese plan: website, tienda, email, ChatCore y Bio Page.',
                'Corrige datos incompletos antes de generar o publicar contenido.',
                'Usa esta área como la fuente principal del proyecto.',
            ]),
            en: formatStepGuide('BusinessBlueprint shows the business plan and how modules connect.', [
                'Review name, offer, audience, tone, services, and goals.',
                'Check which modules depend on that plan: website, store, email, ChatCore, and Bio Page.',
                'Fix incomplete details before generating or publishing content.',
                'Use this area as the project source of truth.',
            ]),
        },
        storefront: {
            es: formatStepGuide('Storefront sirve para revisar la tienda pública y cómo se ve la venta.', [
                'Revisa secciones visibles, portada, productos destacados y mensajes de venta.',
                'Ajusta estilos, imágenes, categorías y bloques de tienda.',
                'Verifica productos, precios, inventario y botones antes de publicar.',
                'Usa preview para confirmar que el cliente entiende qué comprar.',
            ]),
            en: formatStepGuide('Storefront helps review the public store and the sales experience.', [
                'Review visible sections, hero, featured products, and sales messaging.',
                'Adjust styles, images, categories, and store blocks.',
                'Check products, prices, inventory, and buttons before publishing.',
                'Use preview to confirm customers understand what to buy.',
            ]),
        },
        ecommerce: {
            es: formatStepGuide('Ecommerce sirve para manejar productos, órdenes, inventario y ajustes de tienda.', [
                'Entra a productos para revisar nombre, precio, fotos, categorías e inventario.',
                'Entra a órdenes para ver estado, pago, cliente y envío.',
                'Usa descuentos y ajustes para promociones, impuestos, pagos y configuración.',
                'Revisa todo antes de publicar cambios en la tienda.',
            ]),
            en: formatStepGuide('Ecommerce helps manage products, orders, inventory, and store settings.', [
                'Open products to review name, price, photos, categories, and inventory.',
                'Open orders to review status, payment, customer, and shipping.',
                'Use discounts and settings for promos, taxes, payments, and configuration.',
                'Review everything before publishing store changes.',
            ]),
        },
        cms: {
            es: formatStepGuide('CMS sirve para crear y organizar contenido del proyecto.', [
                'Revisa artículos, páginas, categorías y borradores.',
                'Edita título, contenido, imagen, estado y fecha.',
                'Usa preview para confirmar que el contenido se lee bien.',
                'Publica solo cuando el contenido esté revisado.',
            ]),
            en: formatStepGuide('CMS helps create and organize project content.', [
                'Review articles, pages, categories, and drafts.',
                'Edit title, content, image, status, and date.',
                'Use preview to confirm the content reads well.',
                'Publish only after the content is reviewed.',
            ]),
        },
        navigation: {
            es: formatStepGuide('Navigation sirve para organizar páginas, enlaces y menús del sitio.', [
                'Revisa las páginas que aparecen en el menú.',
                'Ordena enlaces según la prioridad del usuario.',
                'Edita nombres, URLs y visibilidad.',
                'Confirma que cada enlace lleve al lugar correcto.',
            ]),
            en: formatStepGuide('Navigation helps organize site pages, links, and menus.', [
                'Review the pages shown in the menu.',
                'Order links by user priority.',
                'Edit names, URLs, and visibility.',
                'Confirm every link goes to the right place.',
            ]),
        },
        domains: {
            es: formatStepGuide('Domains sirve para conectar y revisar dominios.', [
                'Elige el proyecto o dominio que quieres revisar.',
                'Verifica estado de conexión, DNS, SSL y publicación.',
                'Sigue las instrucciones de conexión si falta configurar algo.',
                'Prueba el dominio antes de compartirlo.',
            ]),
            en: formatStepGuide('Domains helps connect and review domains.', [
                'Choose the project or domain you want to review.',
                'Check connection status, DNS, SSL, and publishing.',
                'Follow the connection instructions if something is missing.',
                'Test the domain before sharing it.',
            ]),
        },
        seo: {
            es: formatStepGuide('SEO sirve para mejorar cómo aparece el sitio en buscadores.', [
                'Revisa título, descripción, imagen social y palabras clave.',
                'Ajusta cada página importante, no solo la portada.',
                'Confirma que el texto sea claro para humanos y buscadores.',
                'Guarda y vuelve a revisar el preview de búsqueda.',
            ]),
            en: formatStepGuide('SEO helps improve how the site appears in search.', [
                'Review title, description, social image, and keywords.',
                'Adjust each important page, not only the homepage.',
                'Confirm the text is clear for people and search engines.',
                'Save and review the search preview again.',
            ]),
        },
        templates: {
            es: formatStepGuide('Templates sirve para elegir o revisar plantillas de sitio.', [
                'Filtra por industria, estilo o tipo de página.',
                'Abre la plantilla para revisar estructura, secciones e imágenes.',
                'Elige una que se parezca al resultado que quieres.',
                'Aplica la plantilla solo después de revisar cómo cambia el proyecto.',
            ]),
            en: formatStepGuide('Templates helps choose or review website templates.', [
                'Filter by industry, style, or page type.',
                'Open the template to review structure, sections, and images.',
                'Choose one close to the result you want.',
                'Apply the template only after reviewing how it changes the project.',
            ]),
        },
        blogHub: {
            es: formatStepGuide('Blog sirve para revisar artículos, categorías e ideas de contenido.', [
                'Elige artículo, borrador o categoría.',
                'Revisa título, contenido, imagen, SEO y estado.',
                'Organiza publicaciones por tema o fecha.',
                'Publica cuando el contenido esté listo.',
            ]),
            en: formatStepGuide('Blog helps review articles, categories, and content ideas.', [
                'Choose an article, draft, or category.',
                'Review title, content, image, SEO, and status.',
                'Organize posts by topic or date.',
                'Publish when the content is ready.',
            ]),
        },
        chatcore: {
            es: formatStepGuide('ChatCore sirve para entrenar y probar el chat del proyecto.', [
                'Revisa fuentes de conocimiento, preguntas frecuentes y respuestas.',
                'Añade o corrige información del negocio antes de probar.',
                'Usa el simulador para verificar cómo contesta.',
                'Publica o conecta canales solo cuando las respuestas estén correctas.',
            ]),
            en: formatStepGuide('ChatCore helps train and test the project chat.', [
                'Review knowledge sources, FAQs, and answers.',
                'Add or correct business information before testing.',
                'Use the simulator to verify how it responds.',
                'Publish or connect channels only when answers are correct.',
            ]),
        },
        appointments: {
            es: formatStepGuide('Citas sirve para manejar agenda, servicios y disponibilidad.', [
                'Revisa calendario, lista de citas y servicios.',
                'Configura horarios, duración, disponibilidad y bloqueos.',
                'Abre una cita para ver cliente, notas y estado.',
                'Confirma cambios antes de enviar recordatorios o mover citas.',
            ]),
            en: formatStepGuide('Appointments helps manage calendar, services, and availability.', [
                'Review calendar, appointment list, and services.',
                'Configure hours, duration, availability, and blocked dates.',
                'Open an appointment to see customer, notes, and status.',
                'Confirm changes before sending reminders or moving appointments.',
            ]),
        },
        bioPage: {
            es: formatStepGuide('Bio Page sirve para manejar enlaces, bloques y acciones públicas.', [
                'Revisa enlaces, bloques, orden, imagen y estilo.',
                'Edita botones, formularios, captura de leads y reservas.',
                'Usa preview móvil para confirmar que todo se entiende rápido.',
                'Publica cuando los enlaces y acciones estén correctos.',
            ]),
            en: formatStepGuide('Bio Page helps manage links, blocks, and public actions.', [
                'Review links, blocks, order, image, and style.',
                'Edit buttons, forms, lead capture, and bookings.',
                'Use mobile preview to confirm everything is easy to understand.',
                'Publish when links and actions are correct.',
            ]),
        },
        analytics: {
            es: formatStepGuide('Analytics sirve para revisar resultados y señales del proyecto.', [
                'Elige el rango de fechas o módulo que quieres revisar.',
                'Mira visitas, conversiones, leads, ventas o actividad según el proyecto.',
                'Compara tendencias antes de decidir cambios.',
                'Usa los próximos pasos para saber qué área revisar después.',
            ]),
            en: formatStepGuide('Analytics helps review project results and signals.', [
                'Choose the date range or module you want to review.',
                'Check visits, conversions, leads, sales, or activity based on the project.',
                'Compare trends before deciding changes.',
                'Use next steps to know which area to review next.',
            ]),
        },
        ownerMode: {
            es: formatStepGuide('Owner Mode sirve para revisar plataforma, errores y controles admin.', [
                'Revisa estado de servicios, logs, usuarios, tenants y permisos.',
                'Usa filtros para encontrar el problema o área específica.',
                'Cambia configuraciones solo si entiendes el impacto.',
                'Confirma permisos y deja registro de cualquier acción importante.',
            ]),
            en: formatStepGuide('Owner Mode helps review platform status, errors, and admin controls.', [
                'Review services, logs, users, tenants, and permissions.',
                'Use filters to find the specific problem or area.',
                'Change settings only if you understand the impact.',
                'Confirm permissions and keep a record of important actions.',
            ]),
        },
        agency: {
            es: formatStepGuide('Agencia sirve para configurar clientes, marca, planes y facturación de agencia.', [
                'Usa Clientes para revisar cada workspace o cliente asignado.',
                'Usa White Label para marca, portal, navegación y apariencia.',
                'Usa Reports para revisar actividad, resultados y entregables.',
                'Usa Planes o Billing para precios, servicios y pagos.',
                'Para miembros y permisos del workspace, usa Workspace o Settings.',
            ]),
            en: formatStepGuide('Agency helps configure agency clients, branding, plans, and billing.', [
                'Use Clients to review each assigned workspace or client.',
                'Use White Label for brand, portal, navigation, and appearance.',
                'Use Reports to review activity, results, and deliverables.',
                'Use Plans or Billing for pricing, services, and payments.',
                'For workspace members and permissions, use Workspace or Settings.',
            ]),
        },
        websiteBuilder: {
            es: formatStepGuide('Website Builder sirve para editar el sitio visualmente.', [
                'Elige la página o sección que quieres cambiar.',
                'Usa el panel de controles para texto, imágenes, colores, espaciado y visibilidad.',
                'Revisa preview en desktop y móvil antes de guardar.',
                'Publica solo cuando el cambio se vea correcto.',
            ]),
            en: formatStepGuide('Website Builder helps edit the site visually.', [
                'Choose the page or section you want to change.',
                'Use the controls panel for text, images, colors, spacing, and visibility.',
                'Review desktop and mobile preview before saving.',
                'Publish only when the change looks correct.',
            ]),
        },
        finance: {
            es: formatStepGuide('Finance sirve para revisar facturas, ingresos, gastos y estado financiero.', [
                'Elige facturas, reportes, transacciones o resumen.',
                'Usa filtros por fecha, cliente, estado o categoría.',
                'Abre un registro para revisar monto, notas y relación con el proyecto.',
                'Exporta o corrige datos solo después de verificar la información.',
            ]),
            en: formatStepGuide('Finance helps review invoices, revenue, expenses, and financial status.', [
                'Choose invoices, reports, transactions, or summary.',
                'Use filters by date, customer, status, or category.',
                'Open a record to review amount, notes, and project relation.',
                'Export or correct data only after verifying the information.',
            ]),
        },
        restaurants: {
            es: formatStepGuide('Restaurants sirve para manejar menú, reservas y ajustes del restaurante.', [
                'Revisa menú, platos, precios, fotos y disponibilidad.',
                'Configura reservas, horarios, capacidad y mensajes al cliente.',
                'Usa preview para confirmar que el menú público se entiende.',
                'Guarda o publica cuando la información esté correcta.',
            ]),
            en: formatStepGuide('Restaurants helps manage menu, reservations, and restaurant settings.', [
                'Review menu, dishes, prices, photos, and availability.',
                'Configure reservations, hours, capacity, and customer messages.',
                'Use preview to confirm the public menu is easy to understand.',
                'Save or publish when the information is correct.',
            ]),
        },
        realEstate: {
            es: formatStepGuide('Realty sirve para manejar propiedades, listados, visitas y seguimiento.', [
                'Revisa propiedades, fotos, precio, estado y ubicación.',
                'Abre un listado para editar detalles, leads o visitas.',
                'Usa filtros para separar ventas, alquileres, activos y borradores.',
                'Publica o comparte solo cuando la información esté verificada.',
            ]),
            en: formatStepGuide('Realty helps manage properties, listings, showings, and follow-up.', [
                'Review properties, photos, price, status, and location.',
                'Open a listing to edit details, leads, or showings.',
                'Use filters to separate sales, rentals, active items, and drafts.',
                'Publish or share only when the information is verified.',
            ]),
        },
        projects: {
            es: formatStepGuide('Websites sirve para elegir, abrir o cambiar el proyecto activo.', [
                'Busca el proyecto por nombre o estado.',
                'Abre el proyecto correcto antes de trabajar en módulos como Website Builder, Ecommerce o Email.',
                'Revisa si está publicado, en borrador o necesita cambios.',
                'Usa el menú del proyecto para editar, duplicar o administrar opciones.',
            ]),
            en: formatStepGuide('Websites helps choose, open, or switch the active project.', [
                'Search for the project by name or status.',
                'Open the right project before working in modules like Website Builder, Ecommerce, or Email.',
                'Check whether it is published, draft, or needs changes.',
                'Use the project menu to edit, duplicate, or manage options.',
            ]),
        },
        settings: {
            es: formatStepGuide('Settings sirve para workspace, equipo, cuenta y preferencias.', [
                'Elige si quieres revisar workspace, miembros, permisos, cuenta o branding.',
                'Abre la sección correcta y revisa los datos actuales.',
                'Cambia roles o preferencias solo si tienes permiso.',
                'Guarda después de confirmar que afecta al workspace correcto.',
            ]),
            en: formatStepGuide('Settings helps manage workspace, team, account, and preferences.', [
                'Choose whether to review workspace, members, permissions, account, or branding.',
                'Open the right section and review current details.',
                'Change roles or preferences only if you have permission.',
                'Save after confirming it affects the right workspace.',
            ]),
        },
        designSystem: {
            es: formatStepGuide('Diseño sirve para revisar colores, tipografías y tokens visuales.', [
                'Revisa colores, fuentes, tamaños, bordes y espaciado.',
                'Cambia tokens globales solo si quieres afectar varias pantallas.',
                'Usa preview para confirmar consistencia visual.',
                'Guarda cuando el estilo esté alineado a la marca.',
            ]),
            en: formatStepGuide('Design helps review colors, typography, and visual tokens.', [
                'Review colors, fonts, sizes, borders, and spacing.',
                'Change global tokens only if you want to affect multiple screens.',
                'Use preview to confirm visual consistency.',
                'Save when the style matches the brand.',
            ]),
        },
    };

    return copy[target];
};

const formatDirectModuleMessage = (
    target: GlobalAssistantGuideTarget,
    request: string,
    locale?: string | null,
    preparedPrompt = false,
): string => {
    const spanish = shouldAnswerInSpanish(request, locale);
    const copy = buildModuleGuideCopy(target, preparedPrompt);
    return spanish ? copy.es : copy.en;
};

export const resolveDirectModuleGuideDecision = (
    input: ResolveDirectModuleGuideInput,
): DirectModuleGuideDecision | null => {
    const request = input.request || '';
    const quickActionId = input.quickActionId || null;
    const activeModule = input.activeModule || null;
    const isHelpQuestion = isComponentHelpQuestion(request);

    const quickTarget: Record<string, GlobalAssistantGuideTarget> = {
        create_website: 'aiStudio',
        open_business_blueprint: 'businessBlueprint',
        open_website_builder: 'websiteBuilder',
        open_storefront_builder: 'storefront',
        open_storefront: 'storefront',
        generate_hero_image: 'image',
        create_video: 'video',
        review_leads: 'leads',
        create_email: 'email',
        open_ecommerce: 'ecommerce',
        open_cms: 'cms',
        open_domains: 'domains',
        open_navigation: 'navigation',
        open_seo: 'seo',
        open_templates: 'templates',
        open_blog: 'blogHub',
        open_finance: 'finance',
        open_restaurants: 'restaurants',
        open_realty: 'realEstate',
        train_chatcore: 'chatcore',
        create_appointment: 'appointments',
        improve_bio_page: 'bioPage',
        analyze_project: 'analytics',
        review_platform_errors: 'ownerMode',
        open_agency: 'agency',
        open_projects: 'projects',
        open_settings: 'settings',
        open_design_system: 'designSystem',
    };

    const moduleTarget: Partial<Record<AssistantModuleTarget | string, GlobalAssistantGuideTarget>> = {
        aiStudio: 'aiStudio',
        businessBlueprint: 'businessBlueprint',
        storefront: 'storefront',
        media: 'media',
        crm: 'leads',
        emailMarketing: 'email',
        ecommerce: 'ecommerce',
        chatbot: 'chatcore',
        appointments: 'appointments',
        bioPage: 'bioPage',
        analytics: 'analytics',
        admin: 'ownerMode',
        finance: 'finance',
        agency: 'agency',
        restaurants: 'restaurants',
        realEstate: 'realEstate',
        website: 'websiteBuilder',
        project: 'projects',
        settings: 'settings',
        tenant: 'settings',
        user: 'settings',
        designSystem: 'designSystem',
    };

    let target = quickActionId && !isHelpQuestion ? quickTarget[quickActionId] : null;
    if (!target && isAiStudioOpenOnlyRequest(request)) {
        target = 'aiStudio';
    }
    if (!target && (isWebsiteBuilderOpenRequest(request) || isWebsiteActiveEditRequest(request, activeModule))) {
        target = 'websiteBuilder';
    }
    if (!target && isWebsiteCreationLaunchRequest(request, activeModule)) {
        target = 'aiStudio';
    }
    if (!target && isImageCreationRequest(request)) {
        target = 'image';
    }
    if (!target && isVideoCreationRequest(request)) {
        target = 'video';
    }
    if (!target) {
        target = resolveMediaOpenTarget(request, activeModule);
    }
    if (!target && isLeadReviewRequest(request, activeModule)) {
        target = 'leads';
    }
    if (!target) {
        target = resolveNamedModuleOpenTarget(request);
    }
    if (!target) return null;

    if (target === 'image' || target === 'video') {
        const isVideo = target === 'video';
        const prompt = isVideo ? extractVideoPrompt(request) : extractImagePrompt(request);
        const hasMediaCreationRequest = isVideo ? isVideoCreationRequest(request) : isImageCreationRequest(request);
        const preparedPrompt = Boolean(prompt.trim()) && (hasMediaCreationRequest || looksLikePlainCreativeBrief(request));
        const options = isVideo ? parseVideoLaunchOptions(request) : parseImageLaunchOptions(request);

        return {
            target,
            message: formatDirectModuleMessage(target, request, input.locale, preparedPrompt),
            preparedPrompt,
            prompt: preparedPrompt ? prompt : '',
            options,
        };
    }

    const preparedPrompt = target === 'aiStudio' && Boolean(request.trim()) && !isAiStudioOpenOnlyRequest(request);

    return {
        target,
        message: formatDirectModuleMessage(target, request, input.locale, preparedPrompt),
        preparedPrompt,
        prompt: preparedPrompt ? request.trim() : '',
        options: {},
    };
};

const getComponentHelpTargetId = (
    request: string,
    input: Pick<ResolveDirectModuleGuideInput, 'activeModule' | 'activeRoute' | 'activeRouteModule' | 'quickActionId'>,
): string | null => {
    if (input.quickActionId) return input.quickActionId;

    const activeRoute = normalizeAssistantGuideText(input.activeRoute || '');
    if (activeRoute.includes('ai studio')) return 'create_website';
    if (activeRoute.includes('editor')) return 'open_website_builder';
    if (activeRoute.includes('websites')) return 'open_projects';
    if (activeRoute.includes('templates')) return 'open_templates';
    if (activeRoute.includes('cms')) return 'open_cms';
    if (activeRoute.includes('navigation')) return 'open_navigation';
    if (activeRoute.includes('domains')) return 'open_domains';
    if (activeRoute.includes('seo')) return 'open_seo';
    if (activeRoute.includes('blog hub')) return 'open_blog';
    if (activeRoute.includes('agency')) return 'open_agency';
    if (activeRoute.includes('ecommerce')) return 'open_ecommerce';
    if (activeRoute.includes('email')) return 'create_email';
    if (activeRoute.includes('appointments')) return 'create_appointment';
    if (activeRoute.includes('restaurants') || activeRoute.includes('menu')) return 'open_restaurants';
    if (activeRoute.includes('real estate') || activeRoute.includes('realty')) return 'open_realty';
    if (activeRoute.includes('biopage')) return 'improve_bio_page';
    if (activeRoute.includes('ai assistant')) return 'train_chatcore';
    if (activeRoute.includes('leads')) return 'review_leads';
    if (activeRoute.includes('finance')) return 'open_finance';
    if (activeRoute.includes('analytics')) return 'analyze_project';
    if (activeRoute.includes('assets')) {
        return includesTerm(normalizeAssistantGuideText(request), ['video', 'reel', 'short'])
            ? 'create_video'
            : 'generate_hero_image';
    }
    if (activeRoute.includes('settings')) return 'open_settings';
    if (activeRoute.includes('admin')) return 'review_platform_errors';
    if (activeRoute === 'dashboard' || activeRoute.includes('dashboard')) {
        return 'open_dashboard';
    }

    const activeModule = input.activeModule || input.activeRouteModule;
    if (typeof activeModule !== 'string') return null;

    if (activeModule === 'media') {
        return includesTerm(normalizeAssistantGuideText(request), ['video', 'reel', 'short'])
            ? 'create_video'
            : 'generate_hero_image';
    }

    const moduleTargets: Partial<Record<AssistantModuleTarget | string, string>> = {
        aiStudio: 'create_website',
        businessBlueprint: 'open_business_blueprint',
        storefront: 'open_storefront',
        website: 'open_website_builder',
        crm: 'review_leads',
        emailMarketing: 'create_email',
        ecommerce: 'open_ecommerce',
        chatbot: 'train_chatcore',
        appointments: 'create_appointment',
        bioPage: 'improve_bio_page',
        analytics: 'analyze_project',
        finance: 'open_finance',
        agency: 'open_agency',
        restaurants: 'open_restaurants',
        realEstate: 'open_realty',
        admin: 'review_platform_errors',
        project: 'open_projects',
        settings: 'open_settings',
        tenant: 'open_settings',
        user: 'open_settings',
        designSystem: 'open_design_system',
    };

    return moduleTargets[activeModule] || null;
};

export const resolveComponentHelpGuideResponse = (
    input: ResolveDirectModuleGuideInput,
): ComponentHelpGuideResponse | null => {
    const request = input.request || '';
    if (!isComponentHelpQuestion(request)) return null;

    const targetId = getComponentHelpTargetId(request, input);
    if (!targetId) return null;

    const helpTargetMap: Record<string, GlobalAssistantGuideTarget> = {
        create_website: 'aiStudio',
        open_website_builder: 'websiteBuilder',
        generate_hero_image: 'image',
        create_video: 'video',
        review_leads: 'leads',
        create_email: 'email',
        open_ecommerce: 'ecommerce',
        open_business_blueprint: 'businessBlueprint',
        open_cms: 'cms',
        open_domains: 'domains',
        open_navigation: 'navigation',
        open_seo: 'seo',
        open_templates: 'templates',
        open_blog: 'blogHub',
        open_storefront: 'storefront',
        train_chatcore: 'chatcore',
        create_appointment: 'appointments',
        improve_bio_page: 'bioPage',
        analyze_project: 'analytics',
        open_finance: 'finance',
        open_agency: 'agency',
        open_restaurants: 'restaurants',
        open_realty: 'realEstate',
        review_platform_errors: 'ownerMode',
        open_projects: 'projects',
        open_settings: 'settings',
        open_design_system: 'designSystem',
    };
    const mappedTarget = helpTargetMap[targetId];
    if (mappedTarget) {
        const targetCopy = buildModuleGuideCopy(mappedTarget, false);
        return {
            targetId,
            message: shouldAnswerInSpanish(request, input.locale) ? targetCopy.es : targetCopy.en,
        };
    }

    const copy: Record<string, GuideCopy> = {
        open_dashboard: {
            es: formatStepGuide('Dashboard es el punto principal para pedir ayuda y entrar a cualquier área.', [
                'Usa el input central para escribir lo que quieres hacer o preguntar.',
                'Usa los iconos como contexto: Imágenes, Videos, Leads, Email, Citas, Ecommerce, ChatCore, Bio Page y otros módulos activos.',
                'Revisa proyectos recientes para elegir el proyecto correcto antes de trabajar.',
                'Pregunta “cómo funciona” en cualquier pantalla para recibir pasos de esa área.',
            ]),
            en: formatStepGuide('Dashboard is the main place to ask for help and enter any area.', [
                'Use the central input to write what you want to do or ask.',
                'Use the icons as context: Images, Videos, Leads, Email, Appointments, Ecommerce, ChatCore, Bio Page, and other active modules.',
                'Review recent projects to choose the right project before working.',
                'Ask “how does this work” on any screen to get steps for that area.',
            ]),
        },
        open_agency: {
            es: formatStepGuide('Agency sirve para revisar clientes, reportes, facturación y servicios de agencia.', [
                'Elige el cliente o workspace que quieres revisar.',
                'Usa reportes para ver actividad, resultados y tareas pendientes.',
                'Revisa facturación, planes y servicios asignados.',
                'Confirma el cliente correcto antes de hacer cambios.',
            ]),
            en: formatStepGuide('Agency helps review clients, reports, billing, and agency services.', [
                'Choose the client or workspace you want to review.',
                'Use reports to see activity, results, and pending tasks.',
                'Review billing, plans, and assigned services.',
                'Confirm the right client before making changes.',
            ]),
        },
    };

    const targetCopy = copy[targetId];
    if (!targetCopy) return null;

    return {
        targetId,
        message: shouldAnswerInSpanish(request, input.locale) ? targetCopy.es : targetCopy.en,
    };
};

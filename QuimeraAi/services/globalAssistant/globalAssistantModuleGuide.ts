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
    | 'chatcore'
    | 'appointments'
    | 'bioPage'
    | 'analytics'
    | 'ownerMode'
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
            ? 'No hice cambios. Dime en qué área quieres hacerlo y la abro: Website Builder, Ecommerce, Email, Leads, Citas, Bio Page, ChatCore o Media AI.'
            : 'I did not make changes. Tell me where you want to do it and I will open it: Website Builder, Ecommerce, Email, Leads, Appointments, Bio Page, ChatCore, or Media AI.',
    };
};

export const resolveGuideOnlyFallbackResponse = (
    input: Pick<ResolveDirectModuleGuideInput, 'request' | 'locale'>,
): GuideOnlyActionResponse => {
    const spanish = shouldAnswerInSpanish(input.request, input.locale);
    return {
        message: spanish
            ? 'No hice cambios. Puedo abrir el área correcta y explicarte qué hacer allí. Dime qué área quieres usar.'
            : 'I did not make changes. I can open the right area and explain what to do there. Tell me which area you want to use.',
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

    if (includesTerm(text, ['16 9', 'horizontal', 'landscape', 'wide', 'ancha'])) {
        options.aspectRatio = '16:9';
    } else if (includesTerm(text, ['9 16', 'vertical', 'story', 'reel'])) {
        options.aspectRatio = '9:16';
    } else if (includesTerm(text, ['1 1', 'cuadrada', 'cuadrado', 'square'])) {
        options.aspectRatio = '1:1';
    }

    if (includesTerm(text, ['4k', 'alta resolucion', 'high resolution', 'mejor calidad'])) {
        options.resolution = '4K';
    } else if (includesTerm(text, ['1k', 'rapida', 'rapido', 'fast'])) {
        options.resolution = '1K';
    } else if (includesTerm(text, ['2k', 'balanceada', 'balanced'])) {
        options.resolution = '2K';
    }

    if (includesTerm(text, ['fotorealista', 'foto realista', 'realista', 'photorealistic'])) {
        options.style = 'Photorealistic';
    } else if (includesTerm(text, ['cinematica', 'cinematic', 'cine'])) {
        options.style = 'Cinematic';
    } else if (includesTerm(text, ['anime'])) {
        options.style = 'Anime';
    } else if (includesTerm(text, ['digital art', 'arte digital'])) {
        options.style = 'Digital Art';
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

    if (includesTerm(text, ['16 9', 'horizontal', 'landscape', 'wide', 'ancho', 'ancha'])) {
        options.aspectRatio = '16:9';
    } else if (includesTerm(text, ['9 16', 'vertical', 'story', 'reel', 'tiktok'])) {
        options.aspectRatio = '9:16';
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
    ]);

    return hasWebsiteBuilderTarget && hasOpenIntent;
};

const formatDirectModuleMessage = (
    target: GlobalAssistantGuideTarget,
    request: string,
    locale?: string | null,
    preparedPrompt = false,
): string => {
    const spanish = shouldAnswerInSpanish(request, locale);
    const messages: Record<GlobalAssistantGuideTarget, { es: string; en: string }> = {
        aiStudio: {
            es: preparedPrompt
                ? 'Abrí AI Studio. Dejé tu idea en el campo. Presiona Enviar cuando quieras empezar.'
                : 'Abrí AI Studio. Escribe la idea y sigue los pasos del Studio.',
            en: preparedPrompt
                ? 'I opened AI Studio. I left your idea in the field. Press Send when you want to start.'
                : 'I opened AI Studio. Write the idea and follow the Studio steps.',
        },
        image: {
            es: preparedPrompt
                ? 'Abrí Imágenes y dejé el prompt escrito. Revisa las opciones y toca Generar.'
                : 'Abrí Imágenes. Escribe el prompt, revisa las opciones y toca Generar.',
            en: preparedPrompt
                ? 'I opened Images and filled in the prompt. Review the options and press Generate.'
                : 'I opened Images. Write the prompt, review the options, and press Generate.',
        },
        video: {
            es: preparedPrompt
                ? 'Abrí Videos y dejé el prompt escrito. Revisa las opciones y toca Generar.'
                : 'Abrí Videos. Escribe el prompt, revisa las opciones y toca Generar.',
            en: preparedPrompt
                ? 'I opened Videos and filled in the prompt. Review the options and press Generate.'
                : 'I opened Videos. Write the prompt, review the options, and press Generate.',
        },
        media: {
            es: 'Abrí Media AI. Elige Imágenes o Videos según lo que quieras preparar.',
            en: 'I opened Media AI. Choose Images or Videos based on what you want to prepare.',
        },
        leads: {
            es: 'Abrí Leads. Busca o filtra el lead que quieres revisar y abre su ficha.',
            en: 'I opened Leads. Search or filter the lead you want to review and open its record.',
        },
        email: {
            es: 'Abrí Email. Elige una campaña o prepara un borrador desde ahí.',
            en: 'I opened Email. Choose a campaign or prepare a draft from there.',
        },
        businessBlueprint: {
            es: 'Abrí el área de proyectos. Revisa el plan del negocio y sus módulos desde ahí.',
            en: 'I opened the project area. Review the business plan and connected modules from there.',
        },
        storefront: {
            es: 'Abrí Ecommerce. Revisa Storefront, productos y ajustes de tienda desde ahí.',
            en: 'I opened Ecommerce. Review Storefront, products, and store settings from there.',
        },
        ecommerce: {
            es: 'Abrí Ecommerce. Entra a productos, órdenes, inventario o ajustes según lo que necesites.',
            en: 'I opened Ecommerce. Go to products, orders, inventory, or settings based on what you need.',
        },
        chatcore: {
            es: 'Abrí ChatCore. Revisa conocimiento, pruebas o configuración del chat desde ahí.',
            en: 'I opened ChatCore. Review knowledge, tests, or chat settings from there.',
        },
        appointments: {
            es: 'Abrí Citas. Revisa agenda, servicios o disponibilidad desde ahí.',
            en: 'I opened Appointments. Review calendar, services, or availability from there.',
        },
        bioPage: {
            es: 'Abrí Bio Page. Elige el enlace o bloque que quieras editar.',
            en: 'I opened Bio Page. Choose the link or block you want to edit.',
        },
        analytics: {
            es: 'Abrí Analytics. Revisa métricas, señales y próximos pasos desde ahí.',
            en: 'I opened Analytics. Review metrics, signals, and next steps from there.',
        },
        ownerMode: {
            es: 'Abrí Owner Mode. Revisa estado, errores o controles admin desde ahí.',
            en: 'I opened Owner Mode. Review status, errors, or admin controls from there.',
        },
        websiteBuilder: {
            es: 'Abrí Website Builder. Elige la sección que quieres editar y haz el cambio desde ahí.',
            en: 'I opened Website Builder. Choose the section you want to edit and make the change from there.',
        },
        finance: {
            es: 'Abrí Finance. Revisa facturas, ingresos o gastos desde ahí.',
            en: 'I opened Finance. Review invoices, revenue, or expenses from there.',
        },
        restaurants: {
            es: 'Abrí Restaurants. Revisa menú, reservas o configuración desde ahí.',
            en: 'I opened Restaurants. Review menu, reservations, or settings from there.',
        },
        realEstate: {
            es: 'Abrí Realty. Revisa propiedades, listados o visitas desde ahí.',
            en: 'I opened Realty. Review properties, listings, or showings from there.',
        },
        projects: {
            es: 'Abrí Websites. Elige o cambia el proyecto que quieres usar.',
            en: 'I opened Websites. Choose or switch the project you want to use.',
        },
        settings: {
            es: 'Abrí Settings. Revisa workspace, equipo o cuenta desde ahí.',
            en: 'I opened Settings. Review workspace, team, or account from there.',
        },
        designSystem: {
            es: 'Abrí el área de diseño. Revisa colores, tipografías y tokens según tus permisos.',
            en: 'I opened the design area. Review colors, typography, and tokens based on your permissions.',
        },
    };

    return spanish ? messages[target].es : messages[target].en;
};

export const resolveDirectModuleGuideDecision = (
    input: ResolveDirectModuleGuideInput,
): DirectModuleGuideDecision | null => {
    const request = input.request || '';
    const quickActionId = input.quickActionId || null;
    const activeModule = input.activeModule || null;

    const quickTarget: Record<string, GlobalAssistantGuideTarget> = {
        create_website: 'aiStudio',
        open_business_blueprint: 'businessBlueprint',
        open_website_builder: 'websiteBuilder',
        open_storefront_builder: 'storefront',
        generate_hero_image: 'image',
        create_video: 'video',
        review_leads: 'leads',
        create_email: 'email',
        open_ecommerce: 'ecommerce',
        open_finance: 'finance',
        open_restaurants: 'restaurants',
        open_realty: 'realEstate',
        train_chatcore: 'chatcore',
        create_appointment: 'appointments',
        improve_bio_page: 'bioPage',
        analyze_project: 'analytics',
        review_platform_errors: 'ownerMode',
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
        restaurants: 'restaurants',
        realEstate: 'realEstate',
        website: 'websiteBuilder',
        project: 'projects',
        settings: 'settings',
        tenant: 'settings',
        user: 'settings',
        designSystem: 'designSystem',
    };

    let target = quickActionId ? quickTarget[quickActionId] : null;
    if (!target && isAiStudioOpenOnlyRequest(request)) {
        target = 'aiStudio';
    }
    if (!target && isWebsiteBuilderOpenRequest(request)) {
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
    if (!target && typeof activeModule === 'string') {
        target = moduleTarget[activeModule] || null;
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

    const copy: Record<string, { es: string; en: string }> = {
        open_dashboard: {
            es: 'Dashboard sirve para entrar a tus proyectos y abrir el módulo correcto. Dime qué quieres revisar y te llevo.',
            en: 'Dashboard helps you enter projects and open the right module. Tell me what you want to review and I will take you there.',
        },
        create_website: {
            es: 'AI Studio sirve para preparar sitios, contenido y estructura. Dime qué quieres hacer y te guío paso a paso.',
            en: 'AI Studio helps prepare websites, content, and structure. Tell me what you want to do and I will guide you step by step.',
        },
        open_website_builder: {
            es: 'Website Builder sirve para editar secciones, textos, imágenes y estilos del sitio. Elige una sección y haz el cambio ahí.',
            en: 'Website Builder helps edit site sections, copy, images, and styles. Choose a section and make the change there.',
        },
        generate_hero_image: {
            es: 'Imágenes sirve para preparar prompts, formato y estilo. Yo dejo todo listo; tú presionas Generar.',
            en: 'Images helps prepare prompts, format, and style. I set it up; you press Generate.',
        },
        create_video: {
            es: 'Videos sirve para preparar prompts, escenas y formato. Yo dejo todo listo; tú presionas Generar.',
            en: 'Videos helps prepare prompts, scenes, and format. I set it up; you press Generate.',
        },
        review_leads: {
            es: 'Leads sirve para ver contactos, estado y seguimiento. Dime qué lead o grupo quieres revisar.',
            en: 'Leads helps view contacts, status, and follow-up. Tell me which lead or group you want to review.',
        },
        create_email: {
            es: 'Email sirve para preparar campañas, textos, audiencias y revisar envíos antes de mandarlos.',
            en: 'Email helps prepare campaigns, copy, audiences, and review sends before sending.',
        },
        open_ecommerce: {
            es: 'Ecommerce sirve para productos, órdenes, inventario, descuentos y ajustes de tienda.',
            en: 'Ecommerce helps with products, orders, inventory, discounts, and store settings.',
        },
        open_business_blueprint: {
            es: 'BusinessBlueprint muestra el plan del negocio y cómo se conectan los módulos del proyecto.',
            en: 'BusinessBlueprint shows the business plan and how the project modules connect.',
        },
        open_cms: {
            es: 'CMS sirve para crear, revisar y organizar contenido del proyecto.',
            en: 'CMS helps create, review, and organize project content.',
        },
        open_domains: {
            es: 'Domains sirve para conectar y revisar dominios del proyecto.',
            en: 'Domains helps connect and review project domains.',
        },
        open_navigation: {
            es: 'Navigation sirve para organizar páginas, enlaces y menús del sitio.',
            en: 'Navigation helps organize site pages, links, and menus.',
        },
        open_seo: {
            es: 'SEO sirve para revisar títulos, descripciones y visibilidad del sitio.',
            en: 'SEO helps review titles, descriptions, and site visibility.',
        },
        open_templates: {
            es: 'Templates sirve para elegir o revisar plantillas de sitio.',
            en: 'Templates helps choose or review website templates.',
        },
        open_blog: {
            es: 'Blog sirve para revisar artículos, categorías y contenido publicado.',
            en: 'Blog helps review articles, categories, and published content.',
        },
        open_agency: {
            es: 'Agency sirve para revisar clientes, reportes, facturación y servicios de agencia.',
            en: 'Agency helps review clients, reports, billing, and agency services.',
        },
        open_storefront: {
            es: 'Storefront sirve para revisar la tienda pública, productos, secciones y ajustes de venta.',
            en: 'Storefront helps review the public store, products, sections, and selling settings.',
        },
        train_chatcore: {
            es: 'ChatCore sirve para entrenar y probar el chat del proyecto con su conocimiento.',
            en: 'ChatCore helps train and test the project chat with its knowledge.',
        },
        create_appointment: {
            es: 'Citas sirve para agenda, servicios, disponibilidad y reservas.',
            en: 'Appointments helps with calendar, services, availability, and bookings.',
        },
        improve_bio_page: {
            es: 'Bio Page sirve para enlaces, bloques, captura de leads y acciones públicas.',
            en: 'Bio Page helps with links, blocks, lead capture, and public actions.',
        },
        analyze_project: {
            es: 'Analytics sirve para revisar estado, resultados, señales y próximos pasos.',
            en: 'Analytics helps review status, results, signals, and next steps.',
        },
        open_finance: {
            es: 'Finance sirve para revisar facturas, ingresos, gastos y estado financiero del proyecto.',
            en: 'Finance helps review invoices, revenue, expenses, and project financial status.',
        },
        open_restaurants: {
            es: 'Restaurants sirve para menú, reservas, servicios y ajustes del restaurante.',
            en: 'Restaurants helps with menu, reservations, services, and restaurant settings.',
        },
        open_realty: {
            es: 'Realty sirve para propiedades, listados, visitas y seguimiento inmobiliario.',
            en: 'Realty helps with properties, listings, showings, and real estate follow-up.',
        },
        review_platform_errors: {
            es: 'Owner Mode sirve para revisar plataforma, errores y controles de admin, según tus permisos.',
            en: 'Owner Mode helps review platform status, errors, and admin controls, based on your permissions.',
        },
        open_projects: {
            es: 'Websites sirve para elegir, abrir o cambiar el proyecto activo.',
            en: 'Websites helps choose, open, or switch the active project.',
        },
        open_settings: {
            es: 'Settings sirve para workspace, equipo, cuenta y preferencias.',
            en: 'Settings helps with workspace, team, account, and preferences.',
        },
        open_design_system: {
            es: 'Diseño sirve para revisar colores, tipografías y tokens según tus permisos.',
            en: 'Design helps review colors, typography, and tokens based on your permissions.',
        },
    };

    const targetCopy = copy[targetId];
    if (!targetCopy) return null;

    return {
        targetId,
        message: shouldAnswerInSpanish(request, input.locale) ? targetCopy.es : targetCopy.en,
    };
};

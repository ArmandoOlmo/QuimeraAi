import { describe, expect, it } from 'vitest';
import {
    formatMissingProjectGuideMessage,
    isProjectScopedGuideTarget,
    parseImageLaunchOptions,
    parseVideoLaunchOptions,
    resolveComponentHelpGuideResponse,
    resolveDirectModuleGuideDecision,
    resolveGuideTargetAssistantModule,
    resolveGuideOnlyActionResponse,
    resolveGuideOnlyFallbackResponse,
    resolveProjectMentionFromRequest,
} from '../../services/globalAssistant/globalAssistantModuleGuide.ts';

const expectPracticalGuide = (message: string, terms: string[]) => {
    expect(message).toContain('1.');
    expect(message).toContain('2.');
    for (const term of terms) {
        expect(message).toContain(term);
    }
    expect(message).not.toMatch(/\b(Abrí|I opened|No hice cambios|I did not make changes|Yo no generaré|I will not generate)\b/);
};

describe('globalAssistantModuleGuide', () => {
    it('routes website creation to AI Studio with a useful step-by-step guide', () => {
        const decision = resolveDirectModuleGuideDecision({
            request: 'Necesito crear un website por una firma de arquitecto',
            locale: 'es',
        });

        expect(decision).toMatchObject({
            target: 'aiStudio',
            preparedPrompt: true,
            prompt: 'Necesito crear un website por una firma de arquitecto',
        });
        expectPracticalGuide(decision!.message, ['AI Studio', 'campo principal', 'Enviar']);
    });

    it('routes open-only AI Studio requests without injecting a prompt', () => {
        const decision = resolveDirectModuleGuideDecision({
            request: 'Abre AI Studio',
            locale: 'es',
        });

        expect(decision).toMatchObject({
            target: 'aiStudio',
            preparedPrompt: false,
            prompt: '',
        });
        expectPracticalGuide(decision!.message, ['AI Studio', 'Escribe qué quieres crear', 'Enviar']);
    });

    it('routes image requests to Images with prompt, options, and clear controls', () => {
        const decision = resolveDirectModuleGuideDecision({
            request: 'Quiero crear una imagen de una casa en Puerto Rico',
            locale: 'es',
        });

        expect(decision).toMatchObject({
            target: 'image',
            preparedPrompt: true,
            prompt: 'una casa en Puerto Rico',
        });
        expectPracticalGuide(decision!.message, ['Imágenes', 'aspect ratio', 'resolución', 'estilo', 'Generar']);
    });

    it('routes video requests to Videos with launch options and generation controls', () => {
        const decision = resolveDirectModuleGuideDecision({
            request: 'Crea un video vertical 9:16 de una tienda nueva',
            locale: 'es',
        });

        expect(decision).toMatchObject({
            target: 'video',
            preparedPrompt: true,
            options: {
                aspectRatio: '9:16',
            },
        });
        expectPracticalGuide(decision!.message, ['Videos', 'aspect ratio', 'resolución', 'Generar']);
    });

    it('extracts richer Media AI handoff options without auto-generating', () => {
        expect(parseImageLaunchOptions('Imagen portrait 3:4 1080p estilo óleo')).toMatchObject({
            aspectRatio: '3:4',
            resolution: '2K',
            style: 'Oil Painting',
        });

        expect(parseImageLaunchOptions('Crear imagen panorámica 21:9 cyberpunk 4K')).toMatchObject({
            aspectRatio: '21:9',
            resolution: '4K',
            style: 'Cyberpunk',
        });

        expect(parseVideoLaunchOptions('Video retrato 3:4 full HD para redes')).toMatchObject({
            aspectRatio: '3:4',
            resolution: '1080p',
        });

        const decision = resolveDirectModuleGuideDecision({
            request: 'Crear imagen portrait 3:4 1080p estilo óleo de una casa en Puerto Rico',
            locale: 'es',
        });

        expect(decision).toMatchObject({
            target: 'image',
            preparedPrompt: true,
            options: {
                aspectRatio: '3:4',
                resolution: '2K',
                style: 'Oil Painting',
            },
        });
        expectPracticalGuide(decision!.message, ['aspect ratio', 'resolución', 'estilo']);
    });

    it('treats selected dashboard icons as component context, not forced create commands', () => {
        const help = resolveComponentHelpGuideResponse({
            request: '¿Cómo funciona?',
            quickActionId: 'generate_hero_image',
            locale: 'es',
        });

        expect(help).toMatchObject({ targetId: 'generate_hero_image' });
        expectPracticalGuide(help!.message, ['Imágenes', 'aspect ratio', 'resolución', 'estilo']);

        expect(resolveDirectModuleGuideDecision({
            request: '¿Cómo funciona?',
            quickActionId: 'generate_hero_image',
            locale: 'es',
        })).toBeNull();

        const builder = resolveDirectModuleGuideDecision({
            request: 'I want to review this',
            quickActionId: 'open_website_builder',
            locale: 'en',
        });
        expect(builder).toMatchObject({ target: 'websiteBuilder' });
        expectPracticalGuide(builder!.message, ['Website Builder', 'controls panel', 'preview']);
    });

    it('routes module destinations with practical component guides', () => {
        const cases = [
            { request: 'Quiero revisar el componente de Leads', activeModule: 'crm', locale: 'es', target: 'leads', terms: ['Leads', 'búsqueda', 'filtros'] },
            { request: 'Open ecommerce', activeModule: 'ecommerce', locale: 'en', target: 'ecommerce', terms: ['Ecommerce', 'products', 'orders'] },
            { request: 'Revisa BusinessBlueprint', activeModule: 'businessBlueprint', locale: 'es', target: 'businessBlueprint', terms: ['BusinessBlueprint', 'módulos'] },
            { request: 'Abre Website Builder', activeModule: 'website', locale: 'es', target: 'websiteBuilder', terms: ['Website Builder', 'panel de controles'] },
            { request: 'Open storefront builder', activeModule: 'storefront', locale: 'en', target: 'storefront', terms: ['Storefront', 'products'] },
            { request: 'Abre Settings', activeModule: 'settings', locale: 'es', target: 'settings', terms: ['Settings', 'workspace'] },
            { request: 'Open design tokens', activeModule: 'designSystem', locale: 'en', target: 'designSystem', terms: ['Design', 'colors'] },
            { request: 'Abre Finance', activeModule: 'finance', locale: 'es', target: 'finance', terms: ['Finance', 'facturas'] },
            { request: '¿Dónde configuro la agencia?', activeModule: 'agency', locale: 'es', target: 'agency', terms: ['Agencia', 'White Label'] },
            { request: 'Open Restaurants', activeModule: 'restaurants', locale: 'en', target: 'restaurants', terms: ['Restaurants', 'menu'] },
            { request: 'Abre Realty', activeModule: 'realEstate', locale: 'es', target: 'realEstate', terms: ['Realty', 'propiedades'] },
            { request: 'Abre Websites', activeModule: 'project', locale: 'es', target: 'projects', terms: ['Websites', 'proyecto'] },
            { request: 'Open Owner Mode', activeModule: 'admin', locale: 'en', target: 'ownerMode', terms: ['Owner Mode', 'admin'] },
        ];

        for (const item of cases) {
            const decision = resolveDirectModuleGuideDecision(item);
            expect(decision).toMatchObject({ target: item.target });
            expectPracticalGuide(decision!.message, item.terms);
        }
    });

    it('routes supporting content, publishing, and configuration modules by name', () => {
        const cases = [
            { request: 'Abre CMS', locale: 'es', target: 'cms', terms: ['CMS', 'artículos'] },
            { request: 'Quiero crear un artículo para el blog', locale: 'es', target: 'blogHub', terms: ['Blog', 'artículo'] },
            { request: 'Open Navigation', locale: 'en', target: 'navigation', terms: ['Navigation', 'links'] },
            { request: 'Conectar dominio', locale: 'es', target: 'domains', terms: ['Domains', 'DNS'] },
            { request: 'Review SEO', locale: 'en', target: 'seo', terms: ['SEO', 'title'] },
            { request: 'Abre plantillas', locale: 'es', target: 'templates', terms: ['Templates', 'plantilla'] },
        ];

        for (const item of cases) {
            const decision = resolveDirectModuleGuideDecision(item);
            expect(decision).toMatchObject({ target: item.target });
            expectPracticalGuide(decision!.message, item.terms);
        }
    });

    it('routes command palette module selectors through quick action guide targets', () => {
        const cases = [
            { quickActionId: 'open_cms', target: 'cms', terms: ['CMS', 'articles'] },
            { quickActionId: 'open_blog', target: 'blogHub', terms: ['Blog', 'article'] },
            { quickActionId: 'open_domains', target: 'domains', terms: ['Domains', 'DNS'] },
            { quickActionId: 'open_seo', target: 'seo', terms: ['SEO', 'title'] },
            { quickActionId: 'open_templates', target: 'templates', terms: ['Templates', 'template'] },
            { quickActionId: 'open_finance', target: 'finance', terms: ['Finance', 'invoices'] },
            { quickActionId: 'open_restaurants', target: 'restaurants', terms: ['Restaurants', 'menu'] },
            { quickActionId: 'open_realty', target: 'realEstate', terms: ['Realty', 'properties'] },
        ];

        for (const item of cases) {
            const decision = resolveDirectModuleGuideDecision({
                request: item.quickActionId,
                quickActionId: item.quickActionId,
                locale: 'en',
            });
            expect(decision).toMatchObject({ target: item.target });
            expectPracticalGuide(decision!.message, item.terms);
        }
    });

    it('answers page-aware help questions from the current route or module', () => {
        const dashboard = resolveComponentHelpGuideResponse({
            request: '¿Qué hago aquí?',
            activeRoute: '/dashboard',
            locale: 'es',
        });
        expect(dashboard).toMatchObject({ targetId: 'open_dashboard' });
        expectPracticalGuide(dashboard!.message, ['Dashboard', 'input central', 'iconos']);

        const website = resolveComponentHelpGuideResponse({
            request: 'What can I do here?',
            activeRouteModule: 'website',
            locale: 'en',
        });
        expect(website).toMatchObject({ targetId: 'open_website_builder' });
        expectPracticalGuide(website!.message, ['Website Builder', 'controls panel']);

        const finance = resolveComponentHelpGuideResponse({
            request: 'Ayúdame con esta pantalla',
            activeModule: 'finance',
            locale: 'es',
        });
        expect(finance).toMatchObject({ targetId: 'open_finance' });
        expectPracticalGuide(finance!.message, ['Finance', 'facturas']);

        const agency = resolveComponentHelpGuideResponse({
            request: 'What can I do here?',
            activeRoute: '/agency/reports',
            locale: 'en',
        });
        expect(agency).toMatchObject({ targetId: 'open_agency' });
        expectPracticalGuide(agency!.message, ['Agency', 'Reports', 'billing']);
    });

    it('covers Restaurants and Realty contextual help', () => {
        const restaurants = resolveComponentHelpGuideResponse({
            request: 'How does this screen work?',
            activeModule: 'restaurants',
            locale: 'en',
        });
        expect(restaurants).toMatchObject({ targetId: 'open_restaurants' });
        expectPracticalGuide(restaurants!.message, ['Restaurants', 'menu', 'reservations']);

        const realty = resolveComponentHelpGuideResponse({
            request: '¿Qué puedo hacer aquí?',
            activeModule: 'realEstate',
            locale: 'es',
        });
        expect(realty).toMatchObject({ targetId: 'open_realty' });
        expectPracticalGuide(realty!.message, ['Realty', 'propiedades', 'listados']);
    });

    it('does not execute ambiguous edit/create requests from the global assistant', () => {
        expect(resolveGuideOnlyActionResponse({
            request: 'Necesito hacer una edición',
            locale: 'es',
        })).toEqual({
            message: 'Dime en qué área quieres trabajar y te doy los pasos: Website Builder, Ecommerce, Email, Leads, Citas, Bio Page, ChatCore o Media AI.',
        });

        expect(resolveGuideOnlyActionResponse({
            request: 'I need to edit something',
            locale: 'en',
        })).toEqual({
            message: 'Tell me which area you want to use and I will give you the steps: Website Builder, Ecommerce, Email, Leads, Appointments, Bio Page, ChatCore, or Media AI.',
        });

        expect(resolveGuideOnlyActionResponse({
            request: '¿Cómo funciona?',
            locale: 'es',
        })).toBeNull();
    });

    it('opens Website Builder for website edit requests with editing instructions, not chat execution', () => {
        const decision = resolveDirectModuleGuideDecision({
            request: 'Necesito editar el hero',
            activeModule: 'website',
            locale: 'es',
        });

        expect(decision).toMatchObject({
            target: 'websiteBuilder',
            preparedPrompt: false,
            prompt: '',
        });
        expectPracticalGuide(decision!.message, ['Website Builder', 'panel de controles', 'preview']);
    });

    it('falls back to conversational guide-only copy when the global request has no safe destination', () => {
        expect(resolveGuideOnlyFallbackResponse({
            request: 'Quiero revisar esto',
            locale: 'es',
        })).toEqual({
            message: 'Dime qué área quieres usar y te explico los pasos para hacerlo desde esa pantalla.',
        });

        expect(resolveGuideOnlyFallbackResponse({
            request: 'I need help with this',
            locale: 'en',
        })).toEqual({
            message: 'Tell me which area you want to use and I will explain the steps from that screen.',
        });
    });

    it('asks for a project before project-scoped module handoffs', () => {
        expect(isProjectScopedGuideTarget('ecommerce')).toBe(true);
        expect(isProjectScopedGuideTarget('image')).toBe(true);
        expect(isProjectScopedGuideTarget('cms')).toBe(true);
        expect(isProjectScopedGuideTarget('domains')).toBe(true);
        expect(isProjectScopedGuideTarget('seo')).toBe(true);
        expect(isProjectScopedGuideTarget('blogHub')).toBe(true);
        expect(isProjectScopedGuideTarget('templates')).toBe(false);
        expect(isProjectScopedGuideTarget('aiStudio')).toBe(false);
        expect(isProjectScopedGuideTarget('settings')).toBe(false);

        expect(formatMissingProjectGuideMessage('ecommerce', 'Abre Ecommerce', 'es')).toBe(
            'Primero elige un proyecto en Websites. Después usa Ecommerce para continuar con esa área.',
        );
        expect(formatMissingProjectGuideMessage('image', 'Open Images', 'en')).toBe(
            'Choose a project in Websites first. Then use Images to continue in that area.',
        );
    });

    it('maps guide targets to the operating-layer module memory segment', () => {
        expect(resolveGuideTargetAssistantModule('image')).toBe('media');
        expect(resolveGuideTargetAssistantModule('video')).toBe('media');
        expect(resolveGuideTargetAssistantModule('leads')).toBe('crm');
        expect(resolveGuideTargetAssistantModule('email')).toBe('emailMarketing');
        expect(resolveGuideTargetAssistantModule('chatcore')).toBe('chatbot');
        expect(resolveGuideTargetAssistantModule('websiteBuilder')).toBe('website');
        expect(resolveGuideTargetAssistantModule('cms')).toBe('website');
        expect(resolveGuideTargetAssistantModule('navigation')).toBe('website');
        expect(resolveGuideTargetAssistantModule('domains')).toBe('settings');
        expect(resolveGuideTargetAssistantModule('seo')).toBe('website');
        expect(resolveGuideTargetAssistantModule('templates')).toBe('project');
        expect(resolveGuideTargetAssistantModule('blogHub')).toBe('website');
        expect(resolveGuideTargetAssistantModule('project_required')).toBe('project');
        expect(resolveGuideTargetAssistantModule('unknown')).toBeNull();
    });

    it('matches a named project before direct module navigation', () => {
        expect(resolveProjectMentionFromRequest({
            request: 'Abre Ecommerce de Ganova',
            projects: [
                { id: 'p-1', name: 'VELÓZ' },
                { id: 'p-2', name: 'Ganova' },
            ],
            locale: 'es',
        })).toMatchObject({
            status: 'matched',
            projectId: 'p-2',
            projectName: 'Ganova',
        });

        expect(resolveProjectMentionFromRequest({
            request: 'Open Leads for Puerto Rico Studio',
            projects: [
                { id: 'p-1', name: 'Puerto Rico Studio' },
            ],
            locale: 'en',
        })).toMatchObject({
            status: 'matched',
            projectId: 'p-1',
            projectName: 'Puerto Rico Studio',
        });
    });

    it('does not guess when a project mention is ambiguous', () => {
        expect(resolveProjectMentionFromRequest({
            request: 'Abre Ecommerce de Gano',
            projects: [
                { id: 'p-1', name: 'Ganova' },
                { id: 'p-2', name: 'Ganova Test' },
            ],
            locale: 'es',
        })).toMatchObject({
            status: 'ambiguous',
            message: 'Encontré varios proyectos para "Gano": Ganova, Ganova Test. ¿Cuál quieres abrir?',
            matchedProjects: [
                { id: 'p-1', name: 'Ganova' },
                { id: 'p-2', name: 'Ganova Test' },
            ],
        });
    });

    it('only blocks for missing projects when the user explicitly says project', () => {
        expect(resolveProjectMentionFromRequest({
            request: 'Abre Leads del proyecto Ocean',
            projects: [
                { id: 'p-1', name: 'Ganova' },
            ],
            locale: 'es',
        })).toMatchObject({
            status: 'not_found',
            message: 'No encontré el proyecto "Ocean". Revisa el nombre o abre Websites para elegirlo.',
        });

        expect(resolveProjectMentionFromRequest({
            request: 'Quiero crear una imagen de una casa en Puerto Rico',
            projects: [
                { id: 'p-1', name: 'Ganova' },
            ],
            locale: 'es',
        })).toEqual({ status: 'none' });
    });
});

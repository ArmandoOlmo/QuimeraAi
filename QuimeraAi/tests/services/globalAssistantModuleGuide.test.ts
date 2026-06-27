import { describe, expect, it } from 'vitest';
import {
    resolveComponentHelpGuideResponse,
    resolveDirectModuleGuideDecision,
    resolveGuideOnlyActionResponse,
    resolveGuideOnlyFallbackResponse,
    resolveProjectMentionFromRequest,
} from '../../services/globalAssistant/globalAssistantModuleGuide.ts';

describe('globalAssistantModuleGuide', () => {
    it('opens AI Studio for clear new website requests and keeps the prompt ready', () => {
        const decision = resolveDirectModuleGuideDecision({
            request: 'Necesito crear un website por una firma de arquitecto',
            locale: 'es',
        });

        expect(decision).toMatchObject({
            target: 'aiStudio',
            preparedPrompt: true,
            prompt: 'Necesito crear un website por una firma de arquitecto',
            message: 'Abrí AI Studio. Tu idea quedó escrita ahí. Revísala y sigue los pasos del Studio.',
        });
    });

    it('opens AI Studio cleanly for open-only requests', () => {
        const decision = resolveDirectModuleGuideDecision({
            request: 'Abre AI Studio',
            locale: 'es',
        });

        expect(decision).toMatchObject({
            target: 'aiStudio',
            preparedPrompt: false,
            prompt: '',
            message: 'Abrí AI Studio. Escribe la idea y sigue los pasos del Studio.',
        });
    });

    it('routes image requests to Images with the extracted prompt and no auto-generation', () => {
        const decision = resolveDirectModuleGuideDecision({
            request: 'Quiero crear una imagen de una casa en Puerto Rico',
            locale: 'es',
        });

        expect(decision).toMatchObject({
            target: 'image',
            preparedPrompt: true,
            prompt: 'una casa en Puerto Rico',
            message: 'Abrí Imágenes y dejé el prompt escrito. Revisa las opciones y toca Generar.',
        });
    });

    it('routes video requests to Videos with launch options', () => {
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
    });

    it('opens Media AI, Images, and Videos by component name without auto-generation', () => {
        expect(resolveDirectModuleGuideDecision({
            request: 'Abre Media AI',
            activeModule: 'media',
            locale: 'es',
        })).toMatchObject({
            target: 'media',
            preparedPrompt: false,
            prompt: '',
            message: 'Abrí Media AI. Elige Imágenes o Videos según lo que quieras preparar.',
        });

        expect(resolveDirectModuleGuideDecision({
            request: 'Abre Imágenes',
            activeModule: 'media',
            locale: 'es',
        })).toMatchObject({
            target: 'image',
            preparedPrompt: false,
            prompt: '',
            message: 'Abrí Imágenes. Escribe el prompt, revisa las opciones y toca Generar.',
        });

        expect(resolveDirectModuleGuideDecision({
            request: 'Open Videos',
            activeModule: 'media',
            locale: 'en',
        })).toMatchObject({
            target: 'video',
            preparedPrompt: false,
            prompt: '',
            message: 'I opened Videos. Write the prompt, review the options, and press Generate.',
        });
    });

    it('treats selected dashboard icons as component context, not forced create commands', () => {
        expect(resolveComponentHelpGuideResponse({
            request: '¿Cómo funciona?',
            quickActionId: 'generate_hero_image',
            locale: 'es',
        })).toMatchObject({
            targetId: 'generate_hero_image',
            message: 'Imágenes sirve para preparar prompts, formato y estilo. Yo dejo todo listo; tú presionas Generar.',
        });

        expect(resolveDirectModuleGuideDecision({
            request: '¿Cómo funciona?',
            quickActionId: 'generate_hero_image',
            locale: 'es',
        })).toMatchObject({
            target: 'image',
            preparedPrompt: false,
            prompt: '',
        });
    });

    it('opens module destinations without claiming chat-side work', () => {
        expect(resolveDirectModuleGuideDecision({
            request: 'Quiero revisar el componente de Leads',
            activeModule: 'crm',
            locale: 'es',
        })).toMatchObject({
            target: 'leads',
            message: 'Abrí Leads. Busca o filtra el lead que quieres revisar y abre su ficha.',
        });

        expect(resolveDirectModuleGuideDecision({
            request: 'Open ecommerce',
            activeModule: 'ecommerce',
            locale: 'en',
        })).toMatchObject({
            target: 'ecommerce',
            message: 'I opened Ecommerce. Go to products, orders, inventory, or settings based on what you need.',
        });
    });

    it('covers the remaining operating-layer module destinations with guide-only copy', () => {
        expect(resolveDirectModuleGuideDecision({
            request: 'Revisa BusinessBlueprint',
            activeModule: 'businessBlueprint',
            locale: 'es',
        })).toMatchObject({
            target: 'businessBlueprint',
            message: 'Abrí el área de proyectos. Revisa el plan del negocio y sus módulos desde ahí.',
        });

        expect(resolveDirectModuleGuideDecision({
            request: 'Abre Website Builder',
            activeModule: 'website',
            locale: 'es',
        })).toMatchObject({
            target: 'websiteBuilder',
            message: 'Abrí Website Builder. Elige la sección que quieres editar y haz el cambio desde ahí.',
        });

        expect(resolveDirectModuleGuideDecision({
            request: 'Open storefront builder',
            activeModule: 'storefront',
            locale: 'en',
        })).toMatchObject({
            target: 'storefront',
            message: 'I opened Ecommerce. Review Storefront, products, and store settings from there.',
        });

        expect(resolveDirectModuleGuideDecision({
            request: 'Abre Settings',
            activeModule: 'settings',
            locale: 'es',
        })).toMatchObject({
            target: 'settings',
            message: 'Abrí Settings. Revisa workspace, equipo o cuenta desde ahí.',
        });

        expect(resolveDirectModuleGuideDecision({
            request: 'Open design tokens',
            activeModule: 'designSystem',
            locale: 'en',
        })).toMatchObject({
            target: 'designSystem',
            message: 'I opened the design area. Review colors, typography, and tokens based on your permissions.',
        });

        expect(resolveComponentHelpGuideResponse({
            request: '¿Para qué sirve?',
            activeModule: 'storefront',
            locale: 'es',
        })).toMatchObject({
            targetId: 'open_storefront',
            message: 'Storefront sirve para revisar la tienda pública, productos, secciones y ajustes de venta.',
        });
    });

    it('answers page-aware help questions from the current route or module', () => {
        expect(resolveComponentHelpGuideResponse({
            request: '¿Qué hago aquí?',
            activeRoute: '/dashboard',
            locale: 'es',
        })).toMatchObject({
            targetId: 'open_dashboard',
            message: 'Dashboard sirve para entrar a tus proyectos y abrir el módulo correcto. Dime qué quieres revisar y te llevo.',
        });

        expect(resolveComponentHelpGuideResponse({
            request: 'What can I do here?',
            activeRouteModule: 'website',
            locale: 'en',
        })).toMatchObject({
            targetId: 'open_website_builder',
            message: 'Website Builder helps edit site sections, copy, images, and styles. Choose a section and make the change there.',
        });

        expect(resolveComponentHelpGuideResponse({
            request: 'Ayúdame con esta pantalla',
            activeModule: 'finance',
            locale: 'es',
        })).toMatchObject({
            targetId: 'open_finance',
            message: 'Finance sirve para revisar facturas, ingresos, gastos y estado financiero del proyecto.',
        });
    });

    it('covers Restaurants and Realty contextual help', () => {
        expect(resolveComponentHelpGuideResponse({
            request: 'How does this screen work?',
            activeModule: 'restaurants',
            locale: 'en',
        })).toMatchObject({
            targetId: 'open_restaurants',
            message: 'Restaurants helps with menu, reservations, services, and restaurant settings.',
        });

        expect(resolveComponentHelpGuideResponse({
            request: '¿Qué puedo hacer aquí?',
            activeModule: 'realEstate',
            locale: 'es',
        })).toMatchObject({
            targetId: 'open_realty',
            message: 'Realty sirve para propiedades, listados, visitas y seguimiento inmobiliario.',
        });
    });

    it('does not execute ambiguous edit/create requests from the global assistant', () => {
        expect(resolveGuideOnlyActionResponse({
            request: 'Necesito hacer una edición',
            locale: 'es',
        })).toEqual({
            message: 'No hice cambios. Dime en qué área quieres hacerlo y la abro: Website Builder, Ecommerce, Email, Leads, Citas, Bio Page, ChatCore o Media AI.',
        });

        expect(resolveGuideOnlyActionResponse({
            request: 'I need to edit something',
            locale: 'en',
        })).toEqual({
            message: 'I did not make changes. Tell me where you want to do it and I will open it: Website Builder, Ecommerce, Email, Leads, Appointments, Bio Page, ChatCore, or Media AI.',
        });

        expect(resolveGuideOnlyActionResponse({
            request: '¿Cómo funciona?',
            locale: 'es',
        })).toBeNull();
    });

    it('opens Website Builder for website edit requests without editing from chat', () => {
        expect(resolveDirectModuleGuideDecision({
            request: 'Necesito editar el hero',
            activeModule: 'website',
            locale: 'es',
        })).toMatchObject({
            target: 'websiteBuilder',
            preparedPrompt: false,
            prompt: '',
            message: 'Abrí Website Builder. Elige la sección que quieres editar y haz el cambio desde ahí.',
        });
    });

    it('falls back to short guide-only copy when the global request has no safe destination', () => {
        expect(resolveGuideOnlyFallbackResponse({
            request: 'Quiero revisar esto',
            locale: 'es',
        })).toEqual({
            message: 'No hice cambios. Puedo abrir el área correcta y explicarte qué hacer allí. Dime qué área quieres usar.',
        });

        expect(resolveGuideOnlyFallbackResponse({
            request: 'I need help with this',
            locale: 'en',
        })).toEqual({
            message: 'I did not make changes. I can open the right area and explain what to do there. Tell me which area you want to use.',
        });
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

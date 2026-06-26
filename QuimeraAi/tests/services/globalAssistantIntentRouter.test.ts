import { describe, expect, it } from 'vitest';
import { resolveCurrentAssistantContext } from '../../services/globalAssistant/globalAssistantContextResolver.ts';
import { routeAssistantIntent } from '../../services/globalAssistant/globalAssistantIntentRouter.ts';

const context = resolveCurrentAssistantContext({
    userId: 'user-1',
    tenantId: 'tenant-1',
    role: 'owner',
    activeProject: {
        id: 'project-1',
        name: 'Casa Luna',
        status: 'Draft',
        tenantId: 'tenant-1',
        userId: 'user-1',
    },
    activeRoute: '/dashboard',
    snapshot: {
        availableProjects: [
            {
                id: 'project-1',
                name: 'Casa Luna',
                status: 'Draft',
                tenantId: 'tenant-1',
                userId: 'user-1',
            },
            {
                id: 'project-2',
                name: 'Ocean Clinic',
                status: 'Draft',
                tenantId: 'tenant-1',
                userId: 'user-1',
            },
        ],
    },
    activeServices: [
        'aiFeatures',
        'emailMarketing',
        'ecommerce',
        'crm',
        'appointments',
        'restaurants',
        'realEstate',
        'bioPage',
        'chatbot',
        'finance',
        'analytics',
    ] as any,
    featureFlags: [
        'websiteBuilder',
        'emailMarketing',
        'ecommerceEnabled',
        'chatbotEnabled',
        'realEstateModule',
    ],
});

describe('globalAssistantIntentRouter', () => {
    it('keeps ChatCore requests on the chatbot operating surface even when blueprint is mentioned', () => {
        const intent = routeAssistantIntent('Entrena ChatCore con el Business Blueprint del proyecto', context);

        expect(intent).toMatchObject({
            module: 'chatbot',
            intent: 'sync',
            actionCandidates: ['sync_chatbot_knowledge'],
        });
    });

    it('routes ChatCore test and deployment commands to Chatbot Engine actions', () => {
        expect(routeAssistantIntent('Prueba ChatCore con un cliente que pregunta por reservas', context)).toMatchObject({
            module: 'chatbot',
            intent: 'analyze',
            actionCandidates: ['test_chatbot'],
        });

        expect(routeAssistantIntent('Despliega ChatCore en la Bio Page', context)).toMatchObject({
            module: 'chatbot',
            intent: 'publish',
            actionCandidates: ['deploy_chatbot_to_surface'],
            safetyLevel: 'critical',
        });
    });

    it('keeps explicit AI Studio creation separate from ChatCore and module assistants', () => {
        const intent = routeAssistantIntent('Usa AI Studio para crear un sitio nuevo para una clinica', context);

        expect(intent).toMatchObject({
            module: 'aiStudio',
            intent: 'create',
            actionCandidates: ['create_project_from_prompt'],
        });
        expect(intent.requiresClarification).toBe(false);
    });

    it('does not treat generic campaigns as email unless email terms are present', () => {
        expect(routeAssistantIntent('Crea una campana para restaurante en Instagram', context)).toMatchObject({
            module: 'restaurants',
            actionCandidates: ['generate_restaurant_campaign'],
        });

        expect(routeAssistantIntent('Crea una campana de realty para social ads', context)).toMatchObject({
            module: 'realEstate',
            actionCandidates: ['generate_realty_campaign'],
        });

        expect(routeAssistantIntent('Crea una campana de email para reservas', context)).toMatchObject({
            module: 'emailMarketing',
            actionCandidates: ['create_email_campaign'],
        });

        expect(routeAssistantIntent('Genera copy de email para reservas VIP', context)).toMatchObject({
            module: 'emailMarketing',
            intent: 'generate_content',
            actionCandidates: ['generate_email_copy'],
        });
    });

    it('keeps restaurant reservations and realty showings out of generic Appointments', () => {
        expect(routeAssistantIntent('Crea un flujo de reserva para el restaurante', context)).toMatchObject({
            module: 'restaurants',
            actionCandidates: ['create_reservation_flow'],
        });

        expect(routeAssistantIntent('Actualiza este plato del menu como no disponible', context)).toMatchObject({
            module: 'restaurants',
            intent: 'edit',
            actionCandidates: ['update_menu'],
        });

        expect(routeAssistantIntent('Agenda una visita para esta propiedad de realty', context)).toMatchObject({
            module: 'realEstate',
            actionCandidates: ['create_showing_request_flow'],
        });

        expect(routeAssistantIntent('Actualiza este listing de realty con mejor descripcion', context)).toMatchObject({
            module: 'realEstate',
            intent: 'edit',
            actionCandidates: ['edit_listing'],
        });
    });

    it('routes Bio Page, Finance, and Ecommerce requests to their own module actions', () => {
        expect(routeAssistantIntent('Agrega un link de reserva a la Bio Page', context)).toMatchObject({
            module: 'bioPage',
            actionCandidates: ['add_bio_block'],
        });

        expect(routeAssistantIntent('Crea una factura nueva en finance para este cliente', context)).toMatchObject({
            module: 'finance',
            actionCandidates: ['create_finance_record'],
        });

        expect(routeAssistantIntent('Crea un producto nuevo en ecommerce', context)).toMatchObject({
            module: 'ecommerce',
            actionCandidates: ['create_product'],
        });

        expect(routeAssistantIntent('Genera product copy premium para este producto', context)).toMatchObject({
            module: 'ecommerce',
            intent: 'generate_content',
            actionCandidates: ['generate_product_copy'],
        });
    });

    it('routes Website Builder edits to structured website actions', () => {
        expect(routeAssistantIntent('Oculta la seccion hero del website', context)).toMatchObject({
            module: 'website',
            intent: 'edit',
            actionCandidates: ['toggle_section_visibility'],
        });

        expect(routeAssistantIntent('Reordena el orden de secciones del website', context)).toMatchObject({
            module: 'website',
            intent: 'edit',
            actionCandidates: ['reorder_sections'],
        });

        expect(routeAssistantIntent('Actualiza el texto del headline del website', context)).toMatchObject({
            module: 'website',
            intent: 'edit',
            actionCandidates: ['update_section_copy'],
        });

        expect(routeAssistantIntent('Actualiza la imagen del website con este asset', context)).toMatchObject({
            module: 'website',
            intent: 'edit',
            actionCandidates: ['update_section_image'],
        });
    });

    it('routes website publish and unpublish requests to critical website actions', () => {
        expect(routeAssistantIntent('Publica el website', context)).toMatchObject({
            module: 'website',
            intent: 'publish',
            actionCandidates: ['publish_website'],
            safetyLevel: 'critical',
        });

        expect(routeAssistantIntent('Despublica el website', context)).toMatchObject({
            module: 'website',
            intent: 'unpublish',
            actionCandidates: ['unpublish_website'],
            safetyLevel: 'critical',
        });
    });

    it('routes Media AI asset attachments without generating a new image', () => {
        expect(routeAssistantIntent('Adjunta este asset a la seccion hero', context)).toMatchObject({
            module: 'media',
            intent: 'edit',
            actionCandidates: ['attach_asset_to_section'],
        });
    });

    it('routes Storefront Builder requests to structured storefront actions', () => {
        expect(routeAssistantIntent('Edita el theme del storefront', context)).toMatchObject({
            module: 'storefront',
            intent: 'edit',
            actionCandidates: ['edit_storefront_theme'],
        });

        expect(routeAssistantIntent('Cambia product cards del storefront a editorial', context)).toMatchObject({
            module: 'storefront',
            intent: 'edit',
            actionCandidates: ['update_product_card_style'],
        });

        expect(routeAssistantIntent('Agrega una seccion sale countdown al storefront', context)).toMatchObject({
            module: 'storefront',
            intent: 'create',
            actionCandidates: ['add_storefront_section'],
        });
    });

    it('routes Owner Mode and Super Admin requests to specific admin actions', () => {
        expect(routeAssistantIntent('Revisa ai logs de gemini en admin', context)).toMatchObject({
            module: 'admin',
            actionCandidates: ['review_ai_logs'],
            safetyLevel: 'low',
        });

        expect(routeAssistantIntent('Revisa errores plataforma del admin', context)).toMatchObject({
            module: 'admin',
            actionCandidates: ['review_errors'],
            safetyLevel: 'low',
        });

        expect(routeAssistantIntent('Actualiza plan tenant tenant-1 a pro', context)).toMatchObject({
            module: 'admin',
            actionCandidates: ['update_plan'],
            safetyLevel: 'critical',
        });

        expect(routeAssistantIntent('Cambia service availability de emailMarketing a development', context)).toMatchObject({
            module: 'admin',
            actionCandidates: ['update_service_availability'],
            safetyLevel: 'critical',
        });

        expect(routeAssistantIntent('Activa feature flag realEstateModule para tenant tenant-1', context)).toMatchObject({
            module: 'admin',
            actionCandidates: ['update_feature_flag'],
            safetyLevel: 'critical',
        });

        expect(routeAssistantIntent('Actualiza ChatCore prompts globales', context)).toMatchObject({
            module: 'admin',
            actionCandidates: ['manage_global_prompts'],
            safetyLevel: 'critical',
        });
    });

    it('routes CRM search, summaries, lead updates, and follow-up tasks to CRM actions', () => {
        expect(routeAssistantIntent('Busca Maria en CRM', context)).toMatchObject({
            module: 'crm',
            intent: 'search',
            actionCandidates: ['search_leads'],
        });

        expect(routeAssistantIntent('Analiza los leads del CRM', context)).toMatchObject({
            module: 'crm',
            intent: 'analyze',
            actionCandidates: ['summarize_leads'],
        });

        expect(routeAssistantIntent('Actualiza este lead a qualified', context)).toMatchObject({
            module: 'crm',
            intent: 'edit',
            actionCandidates: ['update_lead'],
        });

        expect(routeAssistantIntent('Crea una tarea de seguimiento para este lead', context)).toMatchObject({
            module: 'crm',
            intent: 'create',
            actionCandidates: ['create_follow_up_task'],
        });

        expect(routeAssistantIntent('Crea un lead para Maria que quiere informacion de precios', context)).toMatchObject({
            module: 'crm',
            intent: 'create',
            actionCandidates: ['create_lead'],
        });
    });

    it('routes Appointments create, update, availability, and calendar requests explicitly', () => {
        expect(routeAssistantIntent('Crea una cita para Ana', context)).toMatchObject({
            module: 'appointments',
            intent: 'create',
            actionCandidates: ['create_appointment'],
        });

        expect(routeAssistantIntent('Actualiza esta cita a confirmed', context)).toMatchObject({
            module: 'appointments',
            intent: 'edit',
            actionCandidates: ['update_appointment'],
        });

        expect(routeAssistantIntent('Configura disponibilidad de appointments', context)).toMatchObject({
            module: 'appointments',
            intent: 'edit',
            actionCandidates: ['configure_availability'],
        });

        expect(routeAssistantIntent('Abre el calendario de citas', context)).toMatchObject({
            module: 'appointments',
            intent: 'open',
            actionCandidates: ['open_calendar'],
        });
    });

    it('routes analytics summaries, blockers, reports, and exports to explicit read actions', () => {
        expect(routeAssistantIntent('Revisa analytics del proyecto', context)).toMatchObject({
            module: 'analytics',
            intent: 'analyze',
            actionCandidates: ['summarize_analytics'],
        });

        expect(routeAssistantIntent('Identifica los bloqueos de readiness en analytics', context)).toMatchObject({
            module: 'analytics',
            intent: 'analyze',
            actionCandidates: ['identify_blockers'],
        });

        expect(routeAssistantIntent('Crea un reporte de analytics del proyecto', context)).toMatchObject({
            module: 'analytics',
            intent: 'report',
            actionCandidates: ['run_project_report'],
        });

        expect(routeAssistantIntent('Exporta el reporte de analytics en csv', context)).toMatchObject({
            module: 'analytics',
            intent: 'report',
            actionCandidates: ['export_report'],
        });
    });

    it('resolves project switch requests by available project name', () => {
        const intent = routeAssistantIntent('Cambia al proyecto Ocean Clinic', context);

        expect(intent).toMatchObject({
            module: 'project',
            intent: 'edit',
            actionCandidates: ['switch_project'],
            projectResolution: {
                projectId: 'project-2',
                requiresProjectSwitch: true,
                ambiguous: false,
            },
        });
    });

    it('resolves named project targets for module actions before opening modules', () => {
        expect(routeAssistantIntent('Abre ecommerce de Ocean Clinic', context)).toMatchObject({
            module: 'ecommerce',
            intent: 'open',
            actionCandidates: ['switch_project', 'open_orders'],
            projectResolution: {
                projectId: 'project-2',
                requiresProjectSwitch: true,
                ambiguous: false,
            },
        });

        expect(routeAssistantIntent('Crea una campana de email para Ocean Clinic', context)).toMatchObject({
            module: 'emailMarketing',
            actionCandidates: ['switch_project', 'create_email_campaign'],
            projectResolution: {
                projectId: 'project-2',
                requiresProjectSwitch: true,
                ambiguous: false,
            },
        });
    });

    it('routes project search and metadata edits to project actions only', () => {
        expect(routeAssistantIntent('Busca proyectos Casa', context)).toMatchObject({
            module: 'project',
            intent: 'search',
            actionCandidates: ['search_projects'],
        });

        expect(routeAssistantIntent('Cambia el nombre del proyecto a Casa Sol', context)).toMatchObject({
            module: 'project',
            intent: 'edit',
            actionCandidates: ['update_project_metadata'],
        });
    });

    it('routes Super Admin tenant search as a read-only admin action', () => {
        expect(routeAssistantIntent('Busca tenants Casa Luna en Super Admin', context)).toMatchObject({
            module: 'admin',
            intent: 'search',
            actionCandidates: ['search_tenants'],
            safetyLevel: 'low',
        });
    });

    it('routes finance invoice status changes to update_finance_record', () => {
        expect(routeAssistantIntent('Marca esta factura como pagada', context)).toMatchObject({
            module: 'finance',
            intent: 'edit',
            actionCandidates: ['update_finance_record'],
            safetyLevel: 'critical',
        });
    });

    it('routes Bio Page link edits and publish requests to executable Bio Page actions', () => {
        expect(routeAssistantIntent('Actualiza este link de Bio Page a casaluna.test/reservas', context)).toMatchObject({
            module: 'bioPage',
            intent: 'edit',
            actionCandidates: ['edit_bio_link'],
        });

        expect(routeAssistantIntent('Publica la Bio Page', context)).toMatchObject({
            module: 'bioPage',
            intent: 'publish',
            actionCandidates: ['publish_bio_page'],
            safetyLevel: 'critical',
        });
    });
});

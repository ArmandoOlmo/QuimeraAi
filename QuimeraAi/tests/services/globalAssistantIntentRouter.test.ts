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
        'agency',
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
    it('routes Operating Layer capability questions to the tool-aware project surface', () => {
        const intent = routeAssistantIntent('Que puedes hacer como Operating Layer y que herramientas tienes disponibles?', context);

        expect(intent).toMatchObject({
            module: 'project',
            intent: 'explain',
            actionCandidates: ['summarize_operating_layer_capabilities'],
            safetyLevel: 'low',
        });
        expect(intent.requiresClarification).toBe(false);
    });

    it('keeps ChatCore requests on the chatbot operating surface even when blueprint is mentioned', () => {
        const intent = routeAssistantIntent('Entrena ChatCore con el Business Blueprint del proyecto', context);

        expect(intent).toMatchObject({
            module: 'chatbot',
            intent: 'sync',
            actionCandidates: ['sync_chatbot_knowledge'],
        });
    });

    it('prioritizes ChatCore training over review wording in dashboard quick actions', () => {
        const intent = routeAssistantIntent(
            'Entrena ChatCore para el proyecto activo sincronizando conocimiento revisado del proyecto y manteniendo separada la memoria del chat visitante.',
            context,
        );

        expect(intent).toMatchObject({
            module: 'chatbot',
            intent: 'sync',
            actionCandidates: ['sync_chatbot_knowledge'],
        });
    });

    it('routes explicit BusinessBlueprint diagnostics to the BusinessBlueprint operating surface', () => {
        const intent = routeAssistantIntent('Revisa el Business Blueprint y readiness por modulo', context);

        expect(intent).toMatchObject({
            module: 'businessBlueprint',
            intent: 'analyze',
            actionCandidates: ['summarize_business_blueprint'],
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

    it('routes dashboard-style website creation through AI Studio while keeping website edits in Website Builder', () => {
        expect(routeAssistantIntent('Crea un website para un restaurante con menu y citas', context)).toMatchObject({
            module: 'aiStudio',
            intent: 'create',
            actionCandidates: ['create_project_from_prompt'],
        });

        expect(routeAssistantIntent('Crea una landing page para una clinica dental', context)).toMatchObject({
            module: 'aiStudio',
            intent: 'create',
            actionCandidates: ['create_project_from_prompt'],
        });

        expect(routeAssistantIntent('Agrega una seccion de testimonios al website', context)).toMatchObject({
            module: 'website',
            intent: 'create',
            actionCandidates: ['create_website_from_prompt'],
        });
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

    it('routes Agency Engine operating requests without requiring an active project', () => {
        const agencyContext = resolveCurrentAssistantContext({
            userId: 'user-1',
            tenantId: 'tenant-1',
            role: 'agency_owner',
            activeProject: null,
            activeRoute: '/agency',
            activeServices: ['agency'] as any,
            featureFlags: ['agencyModule'],
        });

        expect(routeAssistantIntent('Abre Agency Command Center', agencyContext)).toMatchObject({
            module: 'agency',
            intent: 'open',
            actionCandidates: ['open_agency_command_center'],
            requiresClarification: false,
        });

        expect(routeAssistantIntent('Busca clientes de agencia con plan growth', agencyContext)).toMatchObject({
            module: 'agency',
            intent: 'search',
            actionCandidates: ['search_agency_clients'],
            requiresClarification: false,
        });

        expect(routeAssistantIntent('Resume performance de la agencia y billing', agencyContext)).toMatchObject({
            module: 'agency',
            actionCandidates: ['summarize_agency_performance'],
            requiresClarification: false,
        });

        expect(routeAssistantIntent('Genera reporte mensual para mis clientes de agencia', agencyContext)).toMatchObject({
            module: 'agency',
            intent: 'report',
            actionCandidates: ['create_agency_report'],
            requiresClarification: false,
        });

        expect(routeAssistantIntent('Transfiere proyecto al cliente de agencia para revision', agencyContext)).toMatchObject({
            module: 'agency',
            actionCandidates: ['transfer_agency_project'],
            requiresClarification: false,
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

    it('routes explicit Media AI image and video work to specialized actions', () => {
        expect(routeAssistantIntent('Genera una imagen para el hero de Casa Luna', context)).toMatchObject({
            module: 'media',
            intent: 'generate_image',
            actionCandidates: ['generate_image'],
        });

        expect(routeAssistantIntent('Crea un video para redes sociales con una imagen de referencia', context)).toMatchObject({
            module: 'media',
            intent: 'generate_video',
            actionCandidates: ['generate_video'],
        });

        expect(routeAssistantIntent('Crea un borrador revisado de video en Media AI o un prompt de generacion de video para el proyecto activo.', context)).toMatchObject({
            module: 'media',
            intent: 'generate_video',
            actionCandidates: ['generate_video'],
        });

        expect(routeAssistantIntent('Crear video: para Instagram con mi producto', context)).toMatchObject({
            module: 'media',
            intent: 'generate_video',
            actionCandidates: ['generate_video'],
        });

        expect(routeAssistantIntent('Edita una imagen existente para la campaña', context)).toMatchObject({
            module: 'media',
            intent: 'edit',
            actionCandidates: ['edit_image'],
        });
    });

    it('does not switch projects when image prompts contain normal words that overlap project names', () => {
        const oceanContext = {
            ...context,
            project: {
                ...context.project,
                projectId: 'project-2',
                projectName: 'Ocean Clinic',
                sourceProject: {
                    id: 'project-2',
                    name: 'Ocean Clinic',
                    status: 'Draft',
                    tenantId: 'tenant-1',
                    userId: 'user-1',
                },
            },
        } as typeof context;

        const intent = routeAssistantIntent('Quiero crear una imagen de una casa en Puerto Rico', oceanContext);

        expect(intent).toMatchObject({
            module: 'media',
            intent: 'generate_image',
            actionCandidates: ['generate_image'],
            projectResolution: {
                projectId: 'project-2',
                requiresProjectSwitch: false,
                ambiguous: false,
            },
        });
    });

    it('routes generic Media AI asset creation to the draft asset action', () => {
        expect(routeAssistantIntent('Crea un asset visual para la campana de Casa Luna', context)).toMatchObject({
            module: 'media',
            intent: 'create',
            actionCandidates: ['create_asset_from_prompt'],
        });

        expect(routeAssistantIntent('Genera un asset de marca para redes sociales', context)).toMatchObject({
            module: 'media',
            intent: 'generate_content',
            actionCandidates: ['create_asset_from_prompt'],
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

    it('routes command-center module opens to safe navigation actions', () => {
        expect(routeAssistantIntent('Abre Media AI', context)).toMatchObject({
            module: 'media',
            intent: 'open',
            actionCandidates: ['open_media_library'],
            safetyLevel: 'low',
        });

        expect(routeAssistantIntent('Abre leads de Casa Luna', context)).toMatchObject({
            module: 'crm',
            intent: 'open',
            actionCandidates: ['open_leads_dashboard'],
        });

        expect(routeAssistantIntent('Abre Bio Page', context)).toMatchObject({
            module: 'bioPage',
            intent: 'open',
            actionCandidates: ['open_bio_page_builder'],
        });

        expect(routeAssistantIntent('Abre finance', context)).toMatchObject({
            module: 'finance',
            intent: 'open',
            actionCandidates: ['open_finance_dashboard'],
        });

        expect(routeAssistantIntent('Abre restaurantes', context)).toMatchObject({
            module: 'restaurants',
            intent: 'open',
            actionCandidates: ['open_restaurants_dashboard'],
        });

        expect(routeAssistantIntent('Abre realty', context)).toMatchObject({
            module: 'realEstate',
            intent: 'open',
            actionCandidates: ['open_realty_dashboard'],
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

        expect(routeAssistantIntent('Abre Bio Page de Ocean Clinic', context)).toMatchObject({
            module: 'bioPage',
            intent: 'open',
            actionCandidates: ['switch_project', 'open_bio_page_builder'],
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

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

        expect(routeAssistantIntent('Agenda una visita para esta propiedad de realty', context)).toMatchObject({
            module: 'realEstate',
            actionCandidates: ['create_showing_request_flow'],
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
});

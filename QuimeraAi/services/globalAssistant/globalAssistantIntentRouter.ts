import type {
    AssistantContextSnapshot,
    AssistantIntent,
    AssistantIntentCategory,
    AssistantModuleTarget,
    AssistantSafetyLevel,
} from '../../types/globalAssistant';
import { resolveProjectByNameOrId } from './globalAssistantProjectResolver';

const normalize = (value: string): string =>
    value
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, ' ')
        .trim();

const includesAny = (text: string, terms: string[]) => terms.some(term => text.includes(term));

const inferIntent = (text: string): AssistantIntentCategory => {
    if (includesAny(text, ['elimina', 'borrar', 'delete', 'remove', 'quita'])) return 'delete';
    if (includesAny(text, ['publica', 'publish'])) return 'publish';
    if (includesAny(text, ['despublica', 'unpublish'])) return 'unpublish';
    if (includesAny(text, ['exporta', 'export', 'descarga', 'download'])) return 'report';
    if (includesAny(text, ['abre', 'abrir', 'open', 've a', 'go to', 'muestra'])) return 'open';
    if (includesAny(text, ['busca', 'search', 'encuentra', 'find'])) return 'search';
    if (includesAny(text, ['reporte', 'report'])) return 'report';
    if (includesAny(text, ['analiza', 'review', 'revisa', 'identifica', 'identify'])) return 'analyze';
    if (includesAny(text, ['imagen', 'image', 'foto', 'hero image'])) return 'generate_image';
    if (includesAny(text, ['video'])) return 'generate_video';
    if (includesAny(text, ['sincroniza', 'sync', 'entrena', 'entrenar', 'train', 'training'])) return 'sync';
    if (includesAny(text, ['cita', 'appointment', 'agenda', 'reserva'])) return 'schedule';
    if (includesAny(text, ['crea', 'crear', 'create', 'nuevo', 'nueva', 'add', 'agrega'])) return 'create';
    if (includesAny(text, ['edita', 'editar', 'update', 'actualiza', 'modifica', 'cambia'])) return 'edit';
    if (includesAny(text, ['rollback', 'deshacer', 'undo'])) return 'rollback';
    if (includesAny(text, ['explica', 'explain', 'que es', 'what is'])) return 'explain';
    return 'explain';
};

const inferModule = (text: string, context: AssistantContextSnapshot): AssistantModuleTarget => {
    if (includesAny(text, ['admin', 'tenant', 'usuario', 'plan', 'feature flag', 'service availability', 'super admin'])) return 'admin';
    if (includesAny(text, ['ai studio', 'studio', 'website nuevo', 'sitio nuevo'])) return 'aiStudio';
    if (includesAny(text, ['chatcore', 'chatbot', 'knowledge', 'entrena', 'train bot'])) return 'chatbot';
    if (includesAny(text, ['business blueprint', 'blueprint'])) return 'businessBlueprint';
    if (includesAny(text, ['storefront', 'escaparate'])) return 'storefront';
    if (includesAny(text, ['ecommerce', 'producto', 'products', 'pedido', 'order', 'precio', 'inventario', 'discount'])) return 'ecommerce';
    if (includesAny(text, ['email', 'audiencia', 'audience', 'automation', 'automatizacion', 'automacion'])) return 'emailMarketing';
    if (includesAny(text, ['lead', 'crm', 'prospecto', 'follow up'])) return 'crm';
    if (includesAny(text, ['restaurant', 'restaurante', 'menu', 'dish', 'catering'])) return 'restaurants';
    if (includesAny(text, ['realty', 'real estate', 'propiedad', 'listing', 'open house'])) return 'realEstate';
    if (includesAny(text, ['bio page', 'biopage', 'link in bio'])) return 'bioPage';
    if (includesAny(text, ['cita', 'appointment', 'agenda', 'reserva', 'calendar'])) return 'appointments';
    if (includesAny(text, ['analytics', 'metricas', 'reporte', 'report'])) return 'analytics';
    if (includesAny(text, ['finance', 'finanzas', 'invoice', 'factura', 'gasto'])) return 'finance';
    if (includesAny(text, ['imagen', 'image', 'video', 'asset', 'media'])) return 'media';
    if (includesAny(text, ['website', 'web', 'pagina', 'hero', 'seccion', 'section', 'editor'])) return 'website';
    return context.activeModule || 'project';
};

const inferSafety = (intent: AssistantIntentCategory, module: AssistantModuleTarget, text: string): AssistantSafetyLevel => {
    if (
        intent === 'delete' ||
        intent === 'publish' ||
        intent === 'unpublish' ||
        module === 'admin' ||
        includesAny(text, ['send email', 'enviar email', 'envia email', 'precio', 'inventario', 'billing', 'plan'])
    ) {
        return 'critical';
    }
    if (['create', 'edit', 'schedule', 'sync', 'rollback'].includes(intent)) return 'high';
    if (['generate_image', 'generate_video', 'generate_content', 'report'].includes(intent)) return 'medium';
    return 'low';
};

const actionCandidatesFor = (intent: AssistantIntentCategory, module: AssistantModuleTarget, text = ''): string[] => {
    if (module === 'emailMarketing' && (intent === 'create' || intent === 'schedule')) {
        if (includesAny(text, ['audiencia', 'audience', 'segmento', 'segment'])) return ['create_audience'];
        if (includesAny(text, ['automation', 'automatizacion', 'automacion', 'workflow', 'flow'])) return ['create_email_automation'];
        return ['create_email_campaign'];
    }

    if (module === 'ecommerce') {
        if (intent === 'create') {
            if (includesAny(text, ['categoria', 'category', 'collection', 'coleccion'])) return ['create_category'];
            if (includesAny(text, ['descuento', 'discount', 'coupon', 'cupon'])) return ['create_discount'];
            return ['create_product'];
        }
        if (intent === 'edit') {
            if (includesAny(text, ['precio', 'price'])) return ['update_price'];
            if (includesAny(text, ['inventario', 'inventory', 'stock'])) return ['update_inventory'];
            return ['edit_product'];
        }
    }

    if (module === 'appointments' && intent === 'edit' && includesAny(text, ['availability', 'disponibilidad', 'horario'])) {
        return ['configure_availability'];
    }

    if (module === 'bioPage' && ['create', 'edit', 'schedule'].includes(intent)) {
        if (includesAny(text, ['block', 'bloque', 'section', 'seccion', 'link', 'cta'])) return ['add_bio_block'];
        return ['create_bio_page'];
    }

    if (module === 'restaurants' && ['create', 'schedule'].includes(intent)) {
        if (includesAny(text, ['catering', 'evento privado', 'private event', 'banquete'])) return ['create_catering_offer'];
        if (includesAny(text, ['campaign', 'campana', 'promo', 'marketing', 'instagram'])) return ['generate_restaurant_campaign'];
        if (includesAny(text, ['reserva', 'reservation', 'booking', 'flow', 'flujo'])) return ['create_reservation_flow'];
        return ['create_menu_item'];
    }

    if (module === 'realEstate' && ['create', 'schedule'].includes(intent)) {
        if (includesAny(text, ['open house', 'casa abierta'])) return ['create_open_house'];
        if (includesAny(text, ['campaign', 'campana', 'marketing', 'social', 'ads', 'anuncio'])) return ['generate_realty_campaign'];
        if (includesAny(text, ['showing', 'visita', 'tour'])) return ['create_showing_request_flow'];
        return ['create_listing'];
    }

    if (module === 'analytics') {
        if (intent === 'report') {
            if (includesAny(text, ['exporta', 'export', 'descarga', 'download', 'pdf', 'csv'])) return ['export_report'];
            return ['run_project_report'];
        }
        if (intent === 'analyze') {
            if (includesAny(text, ['blocker', 'bloqueo', 'bloqueos', 'faltan', 'falta', 'readiness', 'listo'])) return ['identify_blockers'];
            return ['summarize_analytics'];
        }
    }

    if (module === 'aiStudio' && intent === 'create') {
        return ['create_project_from_prompt'];
    }

    if (module === 'project' && ['open', 'edit'].includes(intent)) {
        if (includesAny(text, ['cambia proyecto', 'cambia al proyecto', 'cambiar proyecto', 'switch project', 'switch to project'])) {
            return ['switch_project'];
        }
        if (intent === 'open') return ['open_project', 'switch_project'];
    }

    const map: Partial<Record<AssistantModuleTarget, Partial<Record<AssistantIntentCategory, string[]>>>> = {
        website: {
            open: ['open_website_builder'],
            create: ['create_website_from_prompt'],
            edit: ['edit_website_section', 'update_section_copy'],
            publish: ['publish_website'],
            unpublish: ['unpublish_website'],
        },
        media: {
            generate_image: ['generate_image'],
            generate_video: ['generate_video'],
            edit: ['edit_image', 'attach_asset_to_section'],
        },
        ecommerce: {
            create: ['create_product', 'create_category'],
            edit: ['edit_product'],
            open: ['open_orders'],
        },
        emailMarketing: {
            create: ['create_email_campaign', 'create_audience', 'create_email_automation'],
            open: ['open_email_hub'],
            edit: ['generate_email_copy'],
        },
        appointments: {
            schedule: ['create_appointment'],
            create: ['create_appointment'],
            edit: ['update_appointment', 'configure_availability'],
            open: ['open_calendar'],
        },
        crm: {
            search: ['search_leads'],
            analyze: ['summarize_leads'],
            create: ['create_lead', 'create_follow_up_task'],
            edit: ['update_lead'],
        },
        chatbot: {
            open: ['open_chatbot_dashboard'],
            create: ['create_chatbot_knowledge'],
            sync: ['sync_chatbot_knowledge'],
            analyze: ['test_chatbot'],
        },
        admin: {
            search: ['search_tenants'],
            open: ['open_tenant'],
            edit: ['update_feature_flag', 'update_service_availability', 'manage_global_prompts'],
        },
        project: {
            open: ['open_project', 'switch_project'],
            search: ['search_projects'],
            create: ['create_project_from_prompt'],
            edit: ['update_project_metadata'],
        },
        analytics: {
            analyze: ['summarize_analytics', 'identify_blockers'],
            report: ['run_project_report', 'export_report'],
        },
        restaurants: {
            create: ['create_menu_item', 'create_catering_offer', 'generate_restaurant_campaign'],
            edit: ['update_menu', 'create_reservation_flow'],
        },
        realEstate: {
            create: ['create_listing', 'create_open_house', 'generate_realty_campaign'],
            edit: ['edit_listing', 'create_showing_request_flow'],
        },
        bioPage: {
            create: ['create_bio_page'],
            edit: ['edit_bio_link'],
            publish: ['publish_bio_page'],
        },
        finance: {
            create: ['create_finance_record'],
            edit: ['update_finance_record'],
        },
    };

    return map[module]?.[intent] || map[module]?.create || [];
};

export function routeAssistantIntent(request: string, context: AssistantContextSnapshot): AssistantIntent {
    const text = normalize(request);
    const intent = inferIntent(text);
    const module = inferModule(text, context);
    const safetyLevel = inferSafety(intent, module, text);
    const actionCandidates = actionCandidatesFor(intent, module, text);
    const requiresProject = !['admin', 'tenant', 'user'].includes(module);
    const missingProject = requiresProject && !context.project.projectId && !['project', 'aiStudio'].includes(module);
    const availableProjects = Array.isArray(context.snapshot?.availableProjects)
        ? context.snapshot.availableProjects as any[]
        : [];
    const projectResolution = module === 'project'
        ? resolveProjectByNameOrId(availableProjects, request)
        : {
            projectId: context.project.projectId,
            ambiguous: false,
            matches: [],
        };

    return {
        intent,
        module,
        confidence: actionCandidates.length > 0 ? 0.72 : 0.45,
        projectResolution: {
            projectId: projectResolution.projectId || context.project.projectId,
            requiresProjectSwitch: Boolean(projectResolution.projectId && projectResolution.projectId !== context.project.projectId),
            ambiguous: projectResolution.ambiguous,
        },
        actionCandidates,
        requiresClarification: missingProject || actionCandidates.length === 0 || projectResolution.ambiguous,
        clarifyingQuestion: projectResolution.ambiguous
            ? 'Which matching project should I use?'
            : missingProject
                ? 'Which project should I use for this request?'
                : actionCandidates.length === 0
                ? 'Which module or action should I target?'
                : undefined,
        safetyLevel,
        rationale: `Rule-based GA1 route: ${intent} -> ${module}.`,
    };
}

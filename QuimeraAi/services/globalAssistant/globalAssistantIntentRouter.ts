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

const isNewWebsiteCreationRequest = (text: string): boolean => {
    const hasCreationIntent = includesAny(text, [
        'crea',
        'crear',
        'create',
        'genera',
        'generar',
        'build',
        'construye',
        'haz',
        'hacer',
        'nuevo',
        'nueva',
        'new',
    ]);
    const hasWebsiteTarget = includesAny(text, [
        'website',
        'sitio web',
        'pagina web',
        'web para',
        'landing',
        'landing page',
        'site',
    ]);
    const isExistingWebsiteEdit = includesAny(text, [
        'seccion',
        'section',
        'bloque',
        'block',
        'hero',
        'footer',
        'headline',
        'copy',
        'texto',
        'editor',
        'editar',
        'edita',
        'edit',
        'actualiza',
        'modifica',
        'reordena',
        'oculta',
        'visibilidad',
    ]);
    const hasBusinessCreationTarget = includesAny(text, [
        'para un',
        'para una',
        'para mi',
        'for a',
        'for my',
        'negocio',
        'business',
        'restaurante',
        'clinica',
        'clinic',
        'realty',
        'tienda',
        'servicio',
        'empresa',
        'marca',
    ]);

    return hasCreationIntent && hasWebsiteTarget && hasBusinessCreationTarget && !isExistingWebsiteEdit;
};

const PROJECT_SCOPED_MODULES = new Set<AssistantModuleTarget>([
    'businessBlueprint',
    'website',
    'storefront',
    'ecommerce',
    'media',
    'appointments',
    'restaurants',
    'realEstate',
    'bioPage',
    'crm',
    'emailMarketing',
    'chatbot',
    'analytics',
    'finance',
]);

const inferIntent = (text: string): AssistantIntentCategory => {
    if (includesAny(text, ['elimina', 'borrar', 'delete', 'remove', 'quita'])) return 'delete';
    if (includesAny(text, ['despublica', 'unpublish'])) return 'unpublish';
    if (includesAny(text, ['despliega', 'desplegar', 'deploy'])) return 'publish';
    if (includesAny(text, ['publica', 'publish'])) return 'publish';
    if (includesAny(text, ['oculta', 'esconde', 'hide', 'mostrar', 'show', 'visibilidad', 'visible', 'invisible', 'reordena', 'reorder', 'orden de secciones', 'move section'])) return 'edit';
    if (includesAny(text, ['adjunta', 'adjuntar', 'attach', 'coloca', 'pon la imagen', 'poner imagen', 'usa este asset', 'usar este asset', 'replace image', 'reemplaza imagen', 'actualiza imagen', 'actualiza la imagen'])) return 'edit';
    if (includesAny(text, ['exporta', 'export', 'descarga', 'download'])) return 'report';
    if (includesAny(text, ['abre', 'abrir', 'open', 've a', 'go to', 'muestra'])) return 'open';
    if (includesAny(text, ['busca', 'search', 'encuentra', 'find'])) return 'search';
    if (includesAny(text, ['reporte', 'report'])) return 'report';
    if (includesAny(text, ['analiza', 'review', 'revisa', 'identifica', 'identify', 'prueba', 'testea', 'laboratorio'])) return 'analyze';
    if (includesAny(text, ['imagen', 'image', 'foto', 'hero image'])) return 'generate_image';
    if (includesAny(text, ['video'])) return 'generate_video';
    if (includesAny(text, ['sincroniza', 'sync', 'entrena', 'entrenar', 'train', 'training'])) return 'sync';
    if (includesAny(text, ['genera', 'generar', 'generate', 'copy', 'contenido'])) return 'generate_content';
    if (includesAny(text, ['edita', 'editar', 'update', 'actualiza', 'modifica', 'cambia', 'activa', 'activar', 'desactiva', 'desactivar', 'enable', 'disable', 'confirma', 'confirmar', 'cancela', 'cancelar', 'completa', 'completar', 'reprograma', 'reprogramar', 'marca', 'marcar', 'pagada', 'pagado', 'paid', 'vencida', 'vencido'])) return 'edit';
    if (includesAny(text, ['crea', 'crear', 'create', 'nuevo', 'nueva', 'add', 'agrega'])) return 'create';
    if (includesAny(text, ['configura', 'configurar', 'configure', 'availability', 'disponibilidad', 'horario'])) return 'edit';
    if (includesAny(text, ['cita', 'appointment', 'agenda', 'reserva'])) return 'schedule';
    if (includesAny(text, ['rollback', 'deshacer', 'undo'])) return 'rollback';
    if (includesAny(text, ['explica', 'explain', 'que es', 'what is'])) return 'explain';
    return 'explain';
};

const inferModule = (text: string, context: AssistantContextSnapshot): AssistantModuleTarget => {
    if (includesAny(text, [
        'admin',
        'tenant',
        'usuario',
        'plan',
        'feature flag',
        'service availability',
        'super admin',
        'ai log',
        'api log',
        'logs',
        'errores plataforma',
        'global prompt',
        'prompt global',
        'prompts globales',
        'chatbot prompts',
        'chatcore prompts',
    ])) return 'admin';
    if (includesAny(text, ['ai studio', 'studio', 'website nuevo', 'sitio nuevo']) || isNewWebsiteCreationRequest(text)) return 'aiStudio';
    if (includesAny(text, ['chatcore', 'chatbot', 'knowledge', 'entrena', 'train bot'])) return 'chatbot';
    if (includesAny(text, ['business blueprint', 'blueprint'])) return 'businessBlueprint';
    if (includesAny(text, ['storefront', 'escaparate'])) return 'storefront';
    if (includesAny(text, ['lead', 'crm', 'prospecto', 'follow up', 'follow-up', 'seguimiento', 'tarea de seguimiento'])) return 'crm';
    if (includesAny(text, ['ecommerce', 'producto', 'product', 'products', 'pedido', 'order', 'precio', 'inventario', 'discount'])) return 'ecommerce';
    if (includesAny(text, ['email', 'audiencia', 'audience', 'automation', 'automatizacion', 'automacion'])) return 'emailMarketing';
    if (includesAny(text, ['restaurant', 'restaurante', 'menu', 'dish', 'catering'])) return 'restaurants';
    if (includesAny(text, ['realty', 'real estate', 'propiedad', 'listing', 'open house'])) return 'realEstate';
    if (includesAny(text, ['bio page', 'biopage', 'bio link', 'biolink', 'link in bio', 'link de bio'])) return 'bioPage';
    if (includesAny(text, ['cita', 'appointment', 'agenda', 'reserva', 'calendar'])) return 'appointments';
    if (includesAny(text, ['analytics', 'metricas', 'reporte', 'report'])) return 'analytics';
    if (includesAny(text, ['finance', 'finanzas', 'invoice', 'factura', 'gasto'])) return 'finance';
    if (includesAny(text, ['website', 'web', 'pagina', 'editor']) && includesAny(text, ['adjunta', 'attach', 'asset', 'replace image', 'reemplaza imagen', 'actualiza imagen', 'actualiza la imagen'])) return 'website';
    if (includesAny(text, ['imagen', 'image', 'video', 'asset', 'media'])) return 'media';
    if (includesAny(text, ['website', 'web', 'pagina', 'hero', 'seccion', 'section', 'editor'])) return 'website';
    if (includesAny(text, ['proyecto', 'proyectos', 'project', 'projects'])) return 'project';
    return context.activeModule || 'project';
};

const inferSafety = (intent: AssistantIntentCategory, module: AssistantModuleTarget, text: string): AssistantSafetyLevel => {
    if (module === 'admin' && ['search', 'open', 'analyze', 'report', 'explain'].includes(intent)) return 'low';
    if (module === 'finance' && intent === 'edit') return 'critical';
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

    if (module === 'emailMarketing' && (intent === 'generate_content' || intent === 'edit')) {
        if (includesAny(text, ['copy', 'contenido', 'subject', 'asunto', 'newsletter', 'email', 'correo'])) return ['generate_email_copy'];
        return ['generate_email_copy'];
    }

    if (module === 'ecommerce') {
        if (intent === 'generate_content') {
            if (includesAny(text, ['copy', 'descripcion', 'description', 'contenido', 'product copy'])) return ['generate_product_copy'];
            return ['edit_product'];
        }
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

    if (module === 'storefront') {
        if (intent === 'open') return ['open_storefront_builder'];
        if (includesAny(text, ['theme', 'tema', 'colores', 'colors', 'paleta', 'palette'])) return ['edit_storefront_theme'];
        if (includesAny(text, ['product card', 'product cards', 'card style', 'tarjeta', 'tarjetas', 'cards'])) return ['update_product_card_style'];
        if (intent === 'create' || includesAny(text, ['section', 'seccion', 'bloque', 'block', 'add', 'agrega', 'anade', 'añade'])) return ['add_storefront_section'];
        if (intent === 'edit') return ['edit_storefront_theme', 'update_product_card_style'];
    }

    if (module === 'appointments') {
        if (includesAny(text, ['availability', 'disponibilidad', 'horario'])) return ['configure_availability'];
        if (intent === 'open') return ['open_calendar'];
        if (intent === 'edit') return ['update_appointment'];
        if (intent === 'create' || intent === 'schedule') return ['create_appointment'];
    }

    if (module === 'bioPage' && ['create', 'edit', 'schedule'].includes(intent)) {
        if (intent === 'edit') return ['edit_bio_link'];
        if (includesAny(text, ['block', 'bloque', 'section', 'seccion', 'link', 'bio link', 'biolink', 'cta'])) return ['add_bio_block'];
        return ['create_bio_page'];
    }

    if (module === 'restaurants' && ['create', 'schedule', 'edit'].includes(intent)) {
        if (intent === 'edit') {
            if (includesAny(text, ['reserva', 'reservation', 'booking', 'flow', 'flujo'])) return ['create_reservation_flow'];
            return ['update_menu'];
        }
        if (includesAny(text, ['catering', 'evento privado', 'private event', 'banquete'])) return ['create_catering_offer'];
        if (includesAny(text, ['campaign', 'campana', 'promo', 'marketing', 'instagram'])) return ['generate_restaurant_campaign'];
        if (includesAny(text, ['reserva', 'reservation', 'booking', 'flow', 'flujo'])) return ['create_reservation_flow'];
        return ['create_menu_item'];
    }

    if (module === 'realEstate' && ['create', 'schedule', 'edit'].includes(intent)) {
        if (intent === 'edit') {
            if (includesAny(text, ['showing', 'visita', 'tour', 'flow', 'flujo'])) return ['create_showing_request_flow'];
            return ['edit_listing'];
        }
        if (includesAny(text, ['open house', 'casa abierta'])) return ['create_open_house'];
        if (includesAny(text, ['campaign', 'campana', 'marketing', 'social', 'ads', 'anuncio'])) return ['generate_realty_campaign'];
        if (includesAny(text, ['showing', 'visita', 'tour'])) return ['create_showing_request_flow'];
        return ['create_listing'];
    }

    if (module === 'crm') {
        if (intent === 'search') return ['search_leads'];
        if (intent === 'analyze') return ['summarize_leads'];
        if (intent === 'create') {
            if (includesAny(text, ['follow up', 'follow-up', 'seguimiento', 'tarea', 'task'])) return ['create_follow_up_task'];
            return ['create_lead'];
        }
        if (intent === 'edit') return ['update_lead'];
    }

    if (module === 'chatbot') {
        if (intent === 'open') return ['open_chatbot_dashboard'];
        if (intent === 'publish' || includesAny(text, ['deploy', 'despliega', 'desplegar', 'superficie', 'surface', 'widget'])) return ['deploy_chatbot_to_surface'];
        if (intent === 'sync') return ['sync_chatbot_knowledge'];
        if (intent === 'analyze' || includesAny(text, ['prueba', 'test', 'testea', 'laboratorio'])) return ['test_chatbot'];
        if (intent === 'create') return ['create_chatbot_knowledge'];
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

    if (module === 'admin') {
        if (includesAny(text, ['ai log', 'api log', 'logs', 'registro', 'registros'])) return ['review_ai_logs'];
        if (includesAny(text, ['error', 'errores', 'fallo', 'fallos', 'failed', 'crash'])) return ['review_errors'];
        if (includesAny(text, ['plan', 'billing', 'suscripcion', 'subscription'])) return ['update_plan'];
        if (includesAny(text, ['service availability', 'disponibilidad', 'servicio', 'servicios', 'publico', 'public', 'development'])) return ['update_service_availability'];
        if (includesAny(text, ['feature flag', 'feature', 'flag'])) return ['update_feature_flag'];
        if (includesAny(text, ['prompt', 'prompts', 'global assistant', 'asistente global', 'chatbot prompts', 'chatcore prompts'])) return ['manage_global_prompts'];
        if (intent === 'search') return ['search_tenants'];
        if (intent === 'open') return ['open_tenant'];
    }

    if (module === 'aiStudio' && intent === 'create') {
        return ['create_project_from_prompt'];
    }

    if (module === 'website') {
        if (includesAny(text, ['reordena', 'reorder', 'orden de secciones', 'move section'])) return ['reorder_sections'];
        if (includesAny(text, ['oculta', 'esconde', 'hide', 'mostrar seccion', 'mostrar section', 'show section', 'visibilidad', 'visible', 'invisible'])) return ['toggle_section_visibility'];
        if (intent === 'edit') {
            if (includesAny(text, ['imagen', 'image', 'foto', 'asset', 'media', 'background', 'fondo'])) return ['update_section_image'];
            if (includesAny(text, ['copy', 'texto', 'headline', 'titulo', 'subtitulo', 'descripcion', 'description'])) return ['update_section_copy'];
            return ['edit_website_section', 'update_section_copy'];
        }
    }

    if (module === 'media' && intent === 'edit') {
        if (includesAny(text, ['adjunta', 'adjuntar', 'attach', 'coloca', 'pon', 'asset', 'seccion', 'section', 'hero', 'background', 'fondo'])) {
            return ['attach_asset_to_section'];
        }
        return ['edit_image', 'attach_asset_to_section'];
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
        storefront: {
            open: ['open_storefront_builder'],
            create: ['add_storefront_section'],
            edit: ['edit_storefront_theme', 'update_product_card_style'],
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
    const requiresProject = !['admin', 'tenant', 'user'].includes(module);
    const missingProject = requiresProject && !context.project.projectId && !['project', 'aiStudio'].includes(module);
    const availableProjects = Array.isArray(context.snapshot?.availableProjects)
        ? context.snapshot.availableProjects as any[]
        : [];
    const shouldResolveProjectFromRequest = module === 'project' || PROJECT_SCOPED_MODULES.has(module);
    const projectResolution = shouldResolveProjectFromRequest
        ? resolveProjectByNameOrId(availableProjects, request)
        : {
            projectId: context.project.projectId,
            ambiguous: false,
            matches: [],
        };
    const requiresProjectSwitch = Boolean(projectResolution.projectId && projectResolution.projectId !== context.project.projectId);
    const moduleActionCandidates = actionCandidatesFor(intent, module, text);
    const actionCandidates = requiresProjectSwitch && module !== 'project' && !moduleActionCandidates.includes('switch_project')
        ? ['switch_project', ...moduleActionCandidates]
        : moduleActionCandidates;

    return {
        intent,
        module,
        confidence: actionCandidates.length > 0 ? 0.72 : 0.45,
        projectResolution: {
            projectId: projectResolution.projectId || context.project.projectId,
            requiresProjectSwitch,
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

import { supabase } from '../../supabase';
import { loadPublicStorefrontCatalog } from '../../utils/ecommerce/publicStorefrontCatalog';
import { filterRenderableStorefrontProducts } from '../../utils/ecommerce/productDisplayGuards';
import type { BioPageData } from './bioPageTypes';

type SupabaseClient = typeof supabase;

export interface BioPageIntegrationReadiness {
    ecommerce: { enabled: boolean; productCount: number; warning?: string };
    appointments: { enabled: boolean; serviceCount: number; warning?: string };
    emailMarketing: { enabled: boolean; audienceCount: number; warning?: string };
    chatbot: { enabled: boolean; warning?: string };
}

export async function getBioPageIntegrationReadiness(
    page: BioPageData,
    client: SupabaseClient = supabase,
): Promise<BioPageIntegrationReadiness> {
    const [appointments, audiences, project] = await Promise.all([
        client
            .from('project_appointments')
            .select('id,status,service_type')
            .eq('project_id', page.projectId)
            .limit(25),
        client
            .from('email_audiences')
            .select('id,name')
            .eq('project_id', page.projectId)
            .limit(25),
        client
            .from('projects')
            .select('ai_assistant_config,data')
            .eq('id', page.projectId)
            .maybeSingle(),
    ]);

    let productCount = 0;
    try {
        const catalog = await loadPublicStorefrontCatalog(page.projectId);
        productCount = filterRenderableStorefrontProducts(catalog.products).length;
    } catch (error) {
        console.warn('[BioPageIntegrations] Ecommerce readiness unavailable:', error);
    }

    const appointmentCount = appointments.error ? 0 : (appointments.data || []).length;
    const audienceCount = audiences.error ? 0 : (audiences.data || []).length;
    const aiAssistant = project.data?.ai_assistant_config || project.data?.data?.aiAssistant || page.aiAssistant;

    return {
        ecommerce: {
            enabled: productCount > 0,
            productCount,
            warning: productCount ? undefined : 'No active Ecommerce products are available for public Bio Page display.',
        },
        appointments: {
            enabled: appointmentCount > 0,
            serviceCount: appointmentCount,
            warning: appointmentCount ? undefined : 'Appointments must be configured before the public booking block is active.',
        },
        emailMarketing: {
            enabled: audienceCount > 0,
            audienceCount,
            warning: audienceCount ? undefined : 'Select or create an Email Marketing audience before routing subscribers.',
        },
        chatbot: {
            enabled: Boolean(aiAssistant),
            warning: aiAssistant ? undefined : 'ChatCore needs an assistant configuration before public chat is enabled.',
        },
    };
}

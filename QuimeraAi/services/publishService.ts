/**
 * PublishService - Servicio Centralizado de Publicación
 * 
 * Este servicio maneja TODA la lógica de publicación de proyectos.
 * Garantiza que siempre se publique el proyecto COMPLETO.
 * 
 * Arquitectura:
 * - Draft: Supabase projects table (editable)
 * - Published: Supabase projects.published_data JSONB column (snapshot inmutable hasta próxima publicación)
 * - Domains: custom_domains table (mapeo dominio → proyecto)
 */

import { supabase } from '../supabase';
import { Project } from '../types/project';
import { componentStyles as defaultComponentStyles } from '../data/componentStyles';
import { resolveProjectName } from '../utils/resolveProjectName';
import { buildStoreIdentityOrFilter, getStoreIdentityQueryIds } from '../utils/ecommerce/storeIdentity';

// =============================================================================
// TYPES
// =============================================================================

export interface PublishResult {
    success: boolean;
    publishedAt: string;
    error?: string;
    stats?: {
        productsPublished: number;
        categoriesPublished: number;
        postsPublished: number;
    };
}

export interface PublishOptions {
    /** ID del usuario propietario */
    userId: string;
    /** ID del proyecto a publicar */
    projectId: string;
    /** ID del tenant (opcional, para multi-tenancy) */
    tenantId?: string | null;
    /** Si se deben publicar los datos de ecommerce */
    includeEcommerce?: boolean;
    /** Si se deben publicar los artículos del CMS */
    includeCMS?: boolean;
    /** 
     * Snapshot directo del proyecto (desde el editor).
     * Si se proporciona, se usa directamente en lugar de leer de Supabase.
     * Esto garantiza que se publique exactamente lo que está en el editor.
     */
    projectSnapshot?: Partial<Project>;
    /**
     * Si se debe guardar el snapshot a Supabase antes de publicar.
     * Solo aplica si projectSnapshot está presente.
     * Default: true
     */
    saveDraftFirst?: boolean;
}

// =============================================================================
// MAIN PUBLISH FUNCTION
// =============================================================================

/**
 * Publica un proyecto completo escribiendo el snapshot a projects.published_data
 * 
 * Esta es la ÚNICA función que debe publicar proyectos.
 * Escribe directamente a Supabase — no requiere Edge Functions ni Supabase.
 * 
 * @param options - Opciones de publicación
 * @returns Resultado de la publicación
 */
export async function publishProject(options: PublishOptions): Promise<PublishResult> {
    const {
        userId,
        projectId,
        tenantId = null,
        includeEcommerce = true,
        includeCMS = true,
        projectSnapshot,
        saveDraftFirst = true,
    } = options;

    const stats = {
        productsPublished: 0,
        categoriesPublished: 0,
        postsPublished: 0,
    };

    try {
        console.log(`📤 [PublishService] Publishing project ${projectId}...`);

        // =========================================================================
        // PASO 1: Obtener el proyecto (desde snapshot o Supabase)
        // =========================================================================
        let project: Project | null = null;

        if (projectSnapshot) {
            // USE SNAPSHOT DIRECTLY (from editor - single source of truth)
            console.log(`📸 [PublishService] Using snapshot from editor`);
            project = projectSnapshot as Project;
        } else {
            // FALLBACK: Read from Supabase
            console.log(`📂 [PublishService] Reading project from Supabase...`);
            const { data: projectData, error: fetchError } = await supabase
                .from('projects')
                .select('*')
                .eq('id', projectId)
                .single();

            if (fetchError || !projectData) {
                console.error(`❌ [PublishService] Failed to fetch project from Supabase:`, fetchError);
                throw new Error(`Project ${projectId} not found in Supabase.`);
            }

            // Map Supabase columns to Project type
            project = {
                id: projectData.id,
                name: projectData.name,
                data: projectData.data,
                theme: projectData.theme,
                brandIdentity: projectData.brand_identity,
                pages: projectData.pages,
                componentOrder: projectData.component_order,
                sectionVisibility: projectData.section_visibility,
                componentStatus: (projectData as any).component_status,
                componentStyles: (projectData as any).component_styles,
                menus: projectData.menus,
                seoConfig: projectData.seo_config,
                aiAssistantConfig: projectData.ai_assistant_config,
                designTokens: (projectData as any).design_tokens,
                responsiveStyles: (projectData as any).responsive_styles,
                abTests: (projectData as any).ab_tests,
                faviconUrl: projectData.favicon_url,
                thumbnailUrl: projectData.thumbnail_url,
                status: projectData.status as any,
            } as Project;
        }

        if (!project) {
            throw new Error(`Project ${projectId} not found.`);
        }

        // Save draft to Supabase if requested
        if (projectSnapshot && saveDraftFirst) {
            console.log(`💾 [PublishService] Saving draft to Supabase first...`);
            const fullDraftData = {
                ...(project as any),
                id: project.id || projectId,
                name: project.name,
                userId,
                tenantId: tenantId || null,
                data: project.data,
                theme: project.theme,
                brandIdentity: project.brandIdentity,
                pages: project.pages || [],
                componentOrder: project.componentOrder || [],
                sectionVisibility: project.sectionVisibility || {},
                menus: project.menus || [],
                seoConfig: project.seoConfig || null,
                aiAssistantConfig: project.aiAssistantConfig || null,
                faviconUrl: project.faviconUrl || null,
                thumbnailUrl: project.thumbnailUrl || null,
                lastUpdated: new Date().toISOString(),
            };
            const draftData: Record<string, any> = {
                last_updated: new Date().toISOString(),
                data: fullDraftData,
            };
            // Map project fields to Supabase columns
            if (projectSnapshot.name !== undefined) draftData.name = projectSnapshot.name;
            if (projectSnapshot.theme !== undefined) draftData.theme = projectSnapshot.theme;
            if (projectSnapshot.brandIdentity !== undefined) draftData.brand_identity = projectSnapshot.brandIdentity;
            if (projectSnapshot.pages !== undefined) draftData.pages = projectSnapshot.pages;
            if (projectSnapshot.componentOrder !== undefined) draftData.component_order = projectSnapshot.componentOrder;
            if (projectSnapshot.sectionVisibility !== undefined) draftData.section_visibility = projectSnapshot.sectionVisibility;
            if (projectSnapshot.menus !== undefined) draftData.menus = projectSnapshot.menus;
            if (projectSnapshot.seoConfig !== undefined) draftData.seo_config = projectSnapshot.seoConfig;
            if (projectSnapshot.aiAssistantConfig !== undefined) draftData.ai_assistant_config = projectSnapshot.aiAssistantConfig;

            const { error: saveError } = await supabase
                .from('projects')
                .update(draftData)
                .eq('id', projectId);

            if (saveError) {
                console.warn(`⚠️ [PublishService] Draft save warning (non-critical):`, saveError);
                // Don't fail the whole publish for a draft save error
            } else {
                console.log(`✅ [PublishService] Draft saved to Supabase`);
            }
        }

        console.log(`📋 [PublishService] Project ready: "${project.name}"`);

        // Debug: Log the hero data we're about to publish
        const heroHeadline = resolveProjectName(project.data?.hero?.headline);
        const heroImageUrl = project.data?.hero?.imageUrl;
        console.log(`🔍 [PublishService] Hero data to publish:`, {
            heroVariant: project.data?.hero?.heroVariant,
            headline: heroHeadline.substring(0, 30),
            hasBackgroundImage: !!project.data?.hero?.backgroundImage,
            imageUrl: typeof heroImageUrl === 'string' ? heroImageUrl.substring(0, 50) : '',
            primaryCtaLink: project.data?.hero?.primaryCtaLink,
            primaryCtaLinkType: project.data?.hero?.primaryCtaLinkType,
            secondaryCtaLink: project.data?.hero?.secondaryCtaLink,
            secondaryCtaLinkType: project.data?.hero?.secondaryCtaLinkType,
        });

        // =========================================================================
        // PASO 2: Crear el snapshot COMPLETO para published_data
        // =========================================================================
        const publishedAt = new Date().toISOString();

        const publishData = {
            // === IDENTIFICACIÓN ===
            id: project.id || projectId,
            name: project.name,
            userId: userId,
            tenantId: tenantId || null,

            // === CONTENIDO PRINCIPAL (PageData) ===
            data: project.data,

            // === HEADER/FOOTER (duplicados en raíz para StorefrontLayout) ===
            header: project.data?.header || null,
            footer: project.data?.footer || null,

            // === TEMA Y ESTILOS ===
            theme: project.theme,
            brandIdentity: project.brandIdentity,

            // === ARQUITECTURA MULTI-PÁGINA (CRÍTICO) ===
            pages: project.pages || [],

            // === CONFIGURACIÓN DE COMPONENTES ===
            componentOrder: project.componentOrder || [],
            sectionVisibility: project.sectionVisibility || {},
            componentStatus: project.componentStatus || null,
            // Use project componentStyles, or fallback to default componentStyles
            componentStyles: project.componentStyles || defaultComponentStyles,

            // === NAVEGACIÓN ===
            menus: project.menus || [],

            // === SEO ===
            seoConfig: project.seoConfig || null,

            // === AI ASSISTANT ===
            aiAssistantConfig: project.aiAssistantConfig || null,

            // === DESIGN TOKENS ===
            designTokens: project.designTokens || null,

            // === RESPONSIVE STYLES ===
            responsiveStyles: project.responsiveStyles || null,

            // === A/B TESTING ===
            abTests: project.abTests || null,

            // === METADATA DE PUBLICACIÓN ===
            publishedAt,
            updatedAt: publishedAt,
            sourceProjectId: projectId,

            // === FAVICON ===
            faviconUrl: project.faviconUrl || null,
            thumbnailUrl: project.thumbnailUrl || null,
        };

        // =========================================================================
        // PASO 3: Collect ecommerce & CMS data
        // =========================================================================

        // Prepare ecommerce data if needed
        let ecommerceData: { products: any[]; categories: any[] } | undefined;
        if (includeEcommerce) {
            ecommerceData = await collectEcommerceData(userId, projectId);
            stats.productsPublished = ecommerceData.products.length;
            stats.categoriesPublished = ecommerceData.categories.length;
        }

        // Prepare CMS data if needed
        let postsData: any[] | undefined;
        if (includeCMS) {
            postsData = await collectCMSData(userId, projectId, tenantId);
            stats.postsPublished = postsData?.length || 0;
        }

        // Include ecommerce & CMS data in the published snapshot
        if (ecommerceData) {
            (publishData as any).ecommerce = {
                products: ecommerceData.products,
                categories: ecommerceData.categories,
            };
        }
        if (postsData && postsData.length > 0) {
            (publishData as any).posts = postsData;
        }

        // =========================================================================
        // PASO 4: Write to Supabase projects.published_data
        // =========================================================================
        console.log(`🔐 [PublishService] Writing published_data to Supabase...`, {
            userId: publishData.userId,
            tenantId: publishData.tenantId,
            projectName: publishData.name,
        });

        const { error: publishError } = await supabase
            .from('projects')
            .update({
                published_data: publishData,
                published_at: publishedAt,
                status: 'Published',
            })
            .eq('id', projectId);

        if (publishError) {
            console.error(`❌ [PublishService] Supabase write error:`, publishError);
            throw new Error(`Publish failed: ${publishError.message}`);
        }

        console.log(`🎉 [PublishService] Project "${project.name}" published successfully!`);
        console.log(`   📦 Products: ${stats.productsPublished}`);
        console.log(`   📂 Categories: ${stats.categoriesPublished}`);
        console.log(`   📝 Posts: ${stats.postsPublished}`);

        return {
            success: true,
            publishedAt,
            stats,
        };

    } catch (error) {
        console.error(`❌ [PublishService] Error publishing project:`, error);
        return {
            success: false,
            publishedAt: '',
            error: error instanceof Error ? error.message : 'Unknown error',
            stats,
        };
    }
}

// =============================================================================
// ECOMMERCE DATA COLLECTION (from Supabase)
// =============================================================================

/**
 * Recopila los productos y categorías del ecommerce desde Supabase
 */
async function collectEcommerceData(
    userId: string,
    projectId: string
): Promise<{ products: any[]; categories: any[] }> {
    const products: any[] = [];
    const categories: any[] = [];

    try {
        const identityFilter = buildStoreIdentityOrFilter(getStoreIdentityQueryIds(projectId));
        // === PRODUCTOS ===
        const { data: productsData } = await supabase
            .from('store_products')
            .select('*')
            .or(identityFilter);

        if (productsData && productsData.length > 0) {
            console.log(`📦 [PublishService] Found ${productsData.length} products to publish`);
            for (const product of productsData) {
                const productPayload = { ...(product.data || {}), ...product };
                if (productPayload.status === 'active') {
                    products.push({ id: product.id, data: productPayload });
                }
            }
        }

        // === CATEGORÍAS ===
        const { data: categoriesData } = await supabase
            .from('store_categories')
            .select('*')
            .or(identityFilter);

        if (categoriesData && categoriesData.length > 0) {
            console.log(`📂 [PublishService] Found ${categoriesData.length} categories to publish`);
            for (const category of categoriesData) {
                categories.push({ id: category.id, data: { ...(category.data || {}), ...category } });
            }
        }

    } catch (error) {
        console.warn('[PublishService] Ecommerce data collection warning (non-critical):', error);
    }

    return { products, categories };
}

// =============================================================================
// CMS DATA COLLECTION (from Supabase)
// =============================================================================

/**
 * Recopila los artículos del CMS desde Supabase
 */
async function collectCMSData(
    userId: string,
    projectId: string,
    tenantId?: string | null
): Promise<any[]> {
    const posts: any[] = [];

    try {
        let query = supabase
            .from('posts')
            .select('*')
            .eq('status', 'published');

        // Filter by tenant if available
        if (tenantId) {
            query = query.eq('tenant_id', tenantId);
        }

        query = query.contains('tags', [`project:${projectId}`]);

        const { data: postsData } = await query;

        if (postsData && postsData.length > 0) {
            console.log(`📝 [PublishService] Found ${postsData.length} CMS posts to publish`);
            for (const post of postsData) {
                posts.push({ id: post.id, data: post });
            }
        }

    } catch (error) {
        console.warn('[PublishService] CMS data collection warning (non-critical):', error);
    }

    return posts;
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Verifica si un proyecto está publicado
 * Reads from Supabase projects.published_data
 */
export async function isProjectPublished(projectId: string): Promise<boolean> {
    try {
        const { data, error } = await supabase
            .from('projects')
            .select('published_at')
            .eq('id', projectId)
            .single();

        if (error || !data) return false;
        return data.published_at != null;
    } catch {
        return false;
    }
}

/**
 * Obtiene la fecha de última publicación de un proyecto
 */
export async function getLastPublishedDate(projectId: string): Promise<string | null> {
    try {
        const { data, error } = await supabase
            .from('projects')
            .select('published_at')
            .eq('id', projectId)
            .single();

        if (error || !data) return null;
        return data.published_at || null;
    } catch {
        return null;
    }
}

/**
 * Limpia los datos publicados de un proyecto (útil al eliminar proyectos)
 */
export async function unpublishProject(projectId: string): Promise<boolean> {
    try {
        const { error } = await supabase
            .from('projects')
            .update({
                published_data: null,
                published_at: null,
                status: 'Draft',
            })
            .eq('id', projectId);

        if (error) {
            console.error('[PublishService] Error unpublishing:', error);
            return false;
        }

        console.log(`🗑️ [PublishService] Project ${projectId} unpublished`);
        return true;
    } catch (error) {
        console.error('[PublishService] Error unpublishing:', error);
        return false;
    }
}

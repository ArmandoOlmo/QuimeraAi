/**
 * PublishService - Servicio Centralizado de Publicación
 * 
 * Este servicio maneja TODA la lógica de publicación de proyectos.
 * Garantiza que siempre se publique el proyecto COMPLETO a publicStores.
 * 
 * Arquitectura (como Shopify/Wix):
 * - Draft: users/{userId}/projects/{projectId} (editable)
 * - Published: publicStores/{projectId} (snapshot inmutable hasta próxima publicación)
 * - Domains: customDomains/{domainName} (solo mapeo, no datos)
 */

import { db, doc, setDoc, collection, getDocs, getDoc } from '../firebase';
import { Project } from '../types/project';
import { componentStyles as defaultComponentStyles } from '../data/componentStyles';

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
     * Si se proporciona, se usa directamente en lugar de leer de Firestore.
     * Esto garantiza que se publique exactamente lo que está en el editor.
     */
    projectSnapshot?: Partial<Project>;
    /**
     * Si se debe guardar el snapshot a Firestore antes de publicar.
     * Solo aplica si projectSnapshot está presente.
     * Default: true
     */
    saveDraftFirst?: boolean;
}

// =============================================================================
// MAIN PUBLISH FUNCTION
// =============================================================================

/**
 * Publica un proyecto completo a publicStores
 * 
 * Esta es la ÚNICA función que debe escribir a publicStores.
 * Garantiza que todos los datos del proyecto se publiquen correctamente.
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
        // PASO 1: Obtener el proyecto (desde snapshot o Firestore)
        // =========================================================================
        let project: Project | null = null;

        if (projectSnapshot) {
            // USE SNAPSHOT DIRECTLY (from editor - single source of truth)
            console.log(`📸 [PublishService] Using snapshot from editor`);
            project = projectSnapshot as Project;
        } else {
            // FALLBACK: Read from Firestore
            // Try primary path first
            const primaryPath = tenantId
                ? ['tenants', tenantId, 'projects', projectId]
                : ['users', userId, 'projects', projectId];

            console.log(`📂 [PublishService] Reading project from primary path: ${primaryPath.join('/')}`);
            const primaryRef = doc(db, primaryPath[0], ...primaryPath.slice(1));
            const primarySnap = await getDoc(primaryRef);

            if (primarySnap.exists()) {
                project = { id: primarySnap.id, ...primarySnap.data() } as Project;
            } else {
                // Secondary path (try the other one to be robust)
                // If tenantId was provided, try user path as fallback
                // If no tenantId, we can only try the user path (which we already did)
                if (tenantId) {
                    const fallbackPath = ['users', userId, 'projects', projectId];
                    console.log(`📂 [PublishService] Not found in tenant. Trying user path: ${fallbackPath.join('/')}`);
                    const fallbackRef = doc(db, fallbackPath[0], ...fallbackPath.slice(1));
                    const fallbackSnap = await getDoc(fallbackRef);
                    if (fallbackSnap.exists()) {
                        project = { id: fallbackSnap.id, ...fallbackSnap.data() } as Project;
                    }
                }
            }
        }

        if (!project) {
            throw new Error(`Project ${projectId} not found in user or tenant path.`);
        }

        // Update projectPath for snapshot saving if needed
        const finalProjectPath = (project as any).tenantId
            ? ['tenants', (project as any).tenantId, 'projects', projectId]
            : ['users', userId, 'projects', projectId];

        if (projectSnapshot && saveDraftFirst) {
            console.log(`💾 [PublishService] Saving draft to Firestore first...`);
            // Correctly spread the path into the doc function
            const projectRef = doc(db, finalProjectPath[0], ...finalProjectPath.slice(1));
            // Filter out undefined values (Firestore doesn't accept undefined)
            const draftData: Record<string, any> = {
                lastUpdated: new Date().toISOString(),
            };
            for (const [key, value] of Object.entries(projectSnapshot)) {
                if (value !== undefined) {
                    draftData[key] = value;
                }
            }
            await setDoc(projectRef, draftData, { merge: true });
            console.log(`✅ [PublishService] Draft saved to ${finalProjectPath.join('/')}`);
        }

        console.log(`📋 [PublishService] Project ready: "${project.name}"`);

        // Debug: Log the hero data we're about to publish
        console.log(`🔍 [PublishService] Hero data to publish:`, {
            heroVariant: project.data?.hero?.heroVariant,
            headline: project.data?.hero?.headline?.substring(0, 30),
            hasBackgroundImage: !!project.data?.hero?.backgroundImage,
            imageUrl: project.data?.hero?.imageUrl?.substring(0, 50),
        });

        // =========================================================================
        // PASO 2: Crear el snapshot COMPLETO para publicStores
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
            sourceProjectPath: finalProjectPath.join('/'),

            // === FAVICON ===
            faviconUrl: project.faviconUrl || null,
            thumbnailUrl: project.thumbnailUrl || null,
        };

        // =========================================================================
        // PASO 3: Escribir a publicStores (atómico)
        // =========================================================================
        console.log(`🔐 [PublishService] About to write to publicStores/${projectId}`, {
            userId: publishData.userId,
            tenantId: publishData.tenantId,
            projectName: publishData.name,
        });

        const publicStoreRef = doc(db, 'publicStores', projectId);

        // Check if document already exists and verify ownership
        const existingPublicDoc = await getDoc(publicStoreRef);
        if (existingPublicDoc.exists()) {
            const existingData = existingPublicDoc.data();
            const existingUserId = existingData?.userId;

            if (existingUserId && existingUserId !== userId) {
                console.warn(`⚠️ [PublishService] publicStores/${projectId} has different userId:`);
                console.warn(`   Existing: ${existingUserId}`);
                console.warn(`   Current:  ${userId}`);
                console.warn(`   Will attempt to update with current user as owner...`);

                // The document exists with a different userId
                // This could happen if:
                // 1. The project was transferred to another user
                // 2. There's a data inconsistency
                // 3. The userId was changed in the source project
                // 
                // Since we verified the user owns the source project (saved draft successfully),
                // we should be able to update. But Firestore rules check resource.data.userId.
                // 
                // Solution: Use a Cloud Function or Admin SDK for cross-user updates.
                // For now, let's try a workaround by deleting and recreating if we're the actual owner.

                // First, check if this is actually our project in the source collection
                const sourceProjectRef = doc(db, finalProjectPath[0], ...finalProjectPath.slice(1));
                const sourceProjectSnap = await getDoc(sourceProjectRef);

                if (sourceProjectSnap.exists()) {
                    // We own the source project, so we should own the public store
                    // The public store has stale data - we need to handle this
                    console.log(`🔄 [PublishService] User owns source project, attempting to fix publicStore ownership...`);

                    // Try to write anyway - if Firestore rules allow based on source ownership
                    // we'll add a rule exception, otherwise we need admin intervention
                    try {
                        await setDoc(publicStoreRef, publishData);
                    } catch (permError) {
                        console.error(`❌ [PublishService] Cannot update publicStore - userId mismatch`);
                        console.error(`   Source project is owned by ${userId}`);
                        console.error(`   publicStores/${projectId} is owned by ${existingUserId}`);
                        console.error(`   This may require admin intervention to fix.`);
                        throw new Error(`Permission denied: The published store has a different owner. Please contact support to resolve this issue.`);
                    }
                } else {
                    throw new Error(`Cannot publish: source project not found and publicStore belongs to another user.`);
                }
            } else {
                // Same userId or no userId in existing doc - proceed normally
                await setDoc(publicStoreRef, publishData);
            }
        } else {
            // Document doesn't exist - create new
            await setDoc(publicStoreRef, publishData);
        }

        console.log(`✅ [PublishService] Main project data published`);

        // =========================================================================
        // PASO 4: Publicar datos de ecommerce (productos y categorías)
        // =========================================================================
        if (includeEcommerce) {
            const ecommerceStats = await publishEcommerceData(userId, projectId);
            stats.productsPublished = ecommerceStats.products;
            stats.categoriesPublished = ecommerceStats.categories;
        }

        // =========================================================================
        // PASO 5: Publicar artículos del CMS
        // =========================================================================
        if (includeCMS) {
            stats.postsPublished = await publishCMSData(userId, projectId, tenantId);
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
// ECOMMERCE DATA PUBLISHING
// =============================================================================

interface EcommerceStats {
    products: number;
    categories: number;
}

/**
 * Publica los productos y categorías del ecommerce
 */
async function publishEcommerceData(userId: string, projectId: string): Promise<EcommerceStats> {
    const stats: EcommerceStats = { products: 0, categories: 0 };

    try {
        // === PRODUCTOS ===
        const privateProductsRef = collection(db, 'users', userId, 'stores', projectId, 'products');
        const productsSnapshot = await getDocs(privateProductsRef);

        if (!productsSnapshot.empty) {
            console.log(`📦 [PublishService] Publishing ${productsSnapshot.size} products...`);

            for (const productDoc of productsSnapshot.docs) {
                const productData = productDoc.data();
                // Solo publicar productos activos
                if (productData.status === 'active') {
                    const publicProductRef = doc(db, 'publicStores', projectId, 'products', productDoc.id);
                    await setDoc(publicProductRef, {
                        ...productData,
                        publishedAt: new Date().toISOString(),
                    }, { merge: true });
                    stats.products++;
                }
            }
        }

        // === CATEGORÍAS ===
        const privateCategoriesRef = collection(db, 'users', userId, 'stores', projectId, 'categories');
        const categoriesSnapshot = await getDocs(privateCategoriesRef);

        if (!categoriesSnapshot.empty) {
            console.log(`📂 [PublishService] Publishing ${categoriesSnapshot.size} categories...`);

            for (const categoryDoc of categoriesSnapshot.docs) {
                const publicCategoryRef = doc(db, 'publicStores', projectId, 'categories', categoryDoc.id);
                await setDoc(publicCategoryRef, {
                    ...categoryDoc.data(),
                    publishedAt: new Date().toISOString(),
                }, { merge: true });
                stats.categories++;
            }
        }

        console.log(`✅ [PublishService] Ecommerce data published: ${stats.products} products, ${stats.categories} categories`);

    } catch (error) {
        console.warn('[PublishService] Ecommerce publish warning (non-critical):', error);
    }

    return stats;
}

// =============================================================================
// CMS DATA PUBLISHING
// =============================================================================

/**
 * Publica los artículos del CMS
 */
async function publishCMSData(
    userId: string,
    projectId: string,
    tenantId?: string | null
): Promise<number> {
    let postsPublished = 0;

    try {
        // Intentar obtener posts desde la ruta del proyecto
        const projectPostsPath = tenantId
            ? ['tenants', tenantId, 'projects', projectId, 'posts']
            : ['users', userId, 'projects', projectId, 'posts'];

        const privatePostsRef = collection(db, projectPostsPath[0], ...projectPostsPath.slice(1));
        const postsSnapshot = await getDocs(privatePostsRef);

        if (!postsSnapshot.empty) {
            console.log(`📝 [PublishService] Publishing ${postsSnapshot.size} CMS posts...`);

            for (const postDoc of postsSnapshot.docs) {
                const postData = postDoc.data();
                // Solo publicar posts con status 'published'
                if (postData.status === 'published') {
                    const publicPostRef = doc(db, 'publicStores', projectId, 'posts', postDoc.id);
                    await setDoc(publicPostRef, {
                        ...postData,
                        publishedAt: new Date().toISOString(),
                    }, { merge: true });
                    postsPublished++;
                }
            }
        }

        console.log(`✅ [PublishService] CMS data published: ${postsPublished} posts`);

    } catch (error) {
        console.warn('[PublishService] CMS publish warning (non-critical):', error);
    }

    return postsPublished;
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Verifica si un proyecto está publicado
 */
export async function isProjectPublished(projectId: string): Promise<boolean> {
    try {
        const publicStoreRef = doc(db, 'publicStores', projectId);
        const snapshot = await getDoc(publicStoreRef);
        return snapshot.exists();
    } catch {
        return false;
    }
}

/**
 * Obtiene la fecha de última publicación de un proyecto
 */
export async function getLastPublishedDate(projectId: string): Promise<string | null> {
    try {
        const publicStoreRef = doc(db, 'publicStores', projectId);
        const snapshot = await getDoc(publicStoreRef);
        if (snapshot.exists()) {
            return snapshot.data()?.publishedAt || null;
        }
        return null;
    } catch {
        return null;
    }
}

/**
 * Limpia los datos publicados de un proyecto (útil al eliminar proyectos)
 */
export async function unpublishProject(projectId: string): Promise<boolean> {
    try {
        // Nota: En producción, podrías querer eliminar también las subcollections
        // Por ahora solo eliminamos el documento principal
        const { deleteDoc } = await import('firebase/firestore');
        const publicStoreRef = doc(db, 'publicStores', projectId);
        await deleteDoc(publicStoreRef);
        console.log(`🗑️ [PublishService] Project ${projectId} unpublished`);
        return true;
    } catch (error) {
        console.error('[PublishService] Error unpublishing:', error);
        return false;
    }
}


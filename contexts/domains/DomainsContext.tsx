/**
 * DomainsContext
 * Maneja dominios y deployment
 * Los dominios tienen un campo projectId que los vincula a un proyecto
 * Los deployment logs están organizados por proyecto
 */

import React, { createContext, useState, useContext, useEffect, ReactNode, useCallback, useMemo } from 'react';
import { Domain, DeploymentLog } from '../../types';
import {
    db,
    doc,
    collection,
    getDocs,
    getDoc,
    addDoc,
    updateDoc,
    deleteDoc,
    setDoc,
    query,
    orderBy,
    onSnapshot,
} from '../../firebase';
import { useAuth } from '../core/AuthContext';
import { useSafeProject } from '../project';
import { useSafeTenant } from '../tenant';
import { deploymentService } from '../../utils/deploymentService';

interface DomainsContextType {
    // Domains (all user domains, with optional filtering by active project)
    domains: Domain[];
    domainsForActiveProject: Domain[];
    addDomain: (domain: Domain) => Promise<void>;
    updateDomain: (id: string, data: Partial<Domain>) => Promise<void>;
    deleteDomain: (id: string) => Promise<void>;
    verifyDomain: (id: string) => Promise<boolean>;
    deployDomain: (domainId: string, provider?: 'vercel' | 'cloudflare' | 'netlify' | 'cloud_run' | 'custom') => Promise<boolean>;
    getDomainDeploymentLogs: (domainId: string) => DeploymentLog[];
    refetch: () => Promise<void>;
    
    // Project info
    hasActiveProject: boolean;
    activeProjectId: string | null;
}

const DomainsContext = createContext<DomainsContextType | undefined>(undefined);

export const DomainsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { user } = useAuth();
    const projectContext = useSafeProject();
    const tenantContext = useSafeTenant();
    const activeProjectId = projectContext?.activeProjectId || null;
    const currentTenantId = tenantContext?.currentTenant?.id || null;

    // Domains State
    const [domains, setDomains] = useState<Domain[]>([]);
    const [deploymentLogs, setDeploymentLogs] = useState<DeploymentLog[]>([]);

    // Filter domains by active project
    const domainsForActiveProject = useMemo(() => {
        if (!activeProjectId) return [];
        return domains.filter(d => d.projectId === activeProjectId);
    }, [domains, activeProjectId]);

    // Fetch domains
    const fetchUserDomains = useCallback(async (userId: string) => {
        try {
            console.log(`📂 [DomainsContext] Fetching domains for user: ${userId}`);
            const domainsCol = collection(db, 'users', userId, 'domains');
            const q = query(domainsCol, orderBy('createdAt', 'desc'));
            const snap = await getDocs(q);
            const userDomains = snap.docs.map(docSnapshot => {
                const data = docSnapshot.data();
                // IMPORTANT: Use docSnapshot.id (Firestore document ID), NOT data.id
                return {
                    ...data,
                    id: docSnapshot.id,  // This MUST come after ...data to override any "id" field in the document
                } as Domain;
            });
            console.log(`✅ [DomainsContext] Loaded ${userDomains.length} domains from Firestore`);
            userDomains.forEach(d => console.log(`   - ${d.name} (docId: ${d.id}, projectId: ${d.projectId})`));
            setDomains(userDomains);
        } catch (error: any) {
            console.error("❌ [DomainsContext] Error loading domains:", error);
            console.error("❌ [DomainsContext] Error code:", error?.code);
        }
    }, []);

    // Load domains when user changes
    useEffect(() => {
        if (user) {
            fetchUserDomains(user.uid);
        } else {
            setDomains([]);
        }
    }, [user, fetchUserDomains]);

    // Load deployment logs (scoped to active project)
    useEffect(() => {
        if (!user || !activeProjectId) {
            setDeploymentLogs([]);
            return;
        }

        // Project-scoped deployment logs path
        const logsPath = `users/${user.uid}/projects/${activeProjectId}/deploymentLogs`;
        const q = query(
            collection(db, logsPath),
            orderBy('timestamp', 'desc')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const logs = snapshot.docs.map(docSnapshot => ({
                id: docSnapshot.id,
                projectId: activeProjectId,
                ...docSnapshot.data()
            })) as DeploymentLog[];
            setDeploymentLogs(logs);
        }, (error: any) => {
            // Silently ignore permission-denied errors (collection may not exist yet)
            if (error.code !== 'permission-denied' && error.code !== 'failed-precondition') {
                console.error("[DomainsContext] Error fetching deployment logs:", error);
            }
        });

        return () => {
            unsubscribe();
        };
    }, [user, activeProjectId]);

    // Helper to add deployment log (project-scoped)
    const addDeploymentLog = useCallback(async (logData: Omit<DeploymentLog, 'id' | 'projectId'>) => {
        if (!user || !activeProjectId) return;
        
        const logsPath = `users/${user.uid}/projects/${activeProjectId}/deploymentLogs`;
        await addDoc(collection(db, logsPath), {
            ...logData,
            projectId: activeProjectId,
        });
    }, [user, activeProjectId]);

    // Add domain (syncs to both user collection and global customDomains)
    const addDomain = async (domain: Domain) => {
        if (!user) return;

        try {
            const domainsCol = collection(db, 'users', user.uid, 'domains');
            
            // Don't save the temporary "id" field - Firestore will generate the real ID
            const { id: _tempId, ...domainDataWithoutId } = domain;
            
            // Ensure projectId is set (use active project if not specified)
            const projectIdToUse = domain.projectId || activeProjectId;
            
            // Store projectUserId and projectTenantId for cross-user deployment support
            // If not provided, default to current user/tenant
            const projectUserIdToUse = domain.projectUserId || user.uid;
            const projectTenantIdToUse = domain.projectTenantId || currentTenantId || null;
            
            const docRef = await addDoc(domainsCol, {
                ...domainDataWithoutId,
                projectId: projectIdToUse,
                projectUserId: projectUserIdToUse,
                projectTenantId: projectTenantIdToUse,
                createdAt: new Date().toISOString(),
                status: 'pending',
            });

            // Use Firestore's generated ID
            const newDomain = { 
                ...domainDataWithoutId, 
                id: docRef.id, 
                projectId: projectIdToUse,
                projectUserId: projectUserIdToUse,
                projectTenantId: projectTenantIdToUse,
            } as Domain;
            setDomains(prev => [newDomain, ...prev]);

            // Sync to global customDomains collection for domain resolution
            const normalizedDomain = domain.name.toLowerCase().replace(/^www\./, '');
            await setDoc(doc(db, 'customDomains', normalizedDomain), {
                domain: normalizedDomain,
                projectId: projectIdToUse || null,
                projectUserId: projectUserIdToUse,
                projectTenantId: projectTenantIdToUse,
                userId: user.uid, // Who created the domain entry
                status: 'pending',
                sslStatus: 'pending',
                dnsVerified: false,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            }, { merge: true });
            console.log(`✅ [DomainsContext] Domain added with ID: ${docRef.id}, projectId: ${projectIdToUse}, projectUserId: ${projectUserIdToUse}`);
        } catch (error) {
            console.error("[DomainsContext] Error adding domain:", error);
            throw error;
        }
    };

    // Update domain (syncs to both user collection and global customDomains)
    const updateDomain = async (id: string, data: Partial<Domain>) => {
        if (!user) return;

        try {
            await updateDoc(doc(db, 'users', user.uid, 'domains', id), {
                ...data,
                updatedAt: new Date().toISOString(),
            });

            // Get the domain to sync
            const domain = domains.find(d => d.id === id);
            
            setDomains(prev => prev.map(d =>
                d.id === id ? { ...d, ...data } : d
            ));

            // Sync to global customDomains collection
            if (domain?.name) {
                const normalizedDomain = domain.name.toLowerCase().replace(/^www\./, '');
                const syncData: any = {
                    projectId: data.projectId !== undefined ? data.projectId : domain.projectId,
                    status: data.status || domain.status,
                    sslStatus: data.sslStatus || domain.sslStatus || 'pending',
                    updatedAt: new Date().toISOString(),
                };
                
                // Also sync projectUserId and projectTenantId if provided
                if (data.projectUserId !== undefined) {
                    syncData.projectUserId = data.projectUserId;
                }
                if (data.projectTenantId !== undefined) {
                    syncData.projectTenantId = data.projectTenantId;
                }
                
                await setDoc(doc(db, 'customDomains', normalizedDomain), syncData, { merge: true });
                console.log(`✅ [DomainsContext] Domain updated in customDomains: ${normalizedDomain} -> projectId: ${data.projectId || domain.projectId}`);
            }
        } catch (error) {
            console.error("[DomainsContext] Error updating domain:", error);
            throw error;
        }
    };

    // Delete domain (removes from both user collection and global customDomains)
    const deleteDomain = async (id: string) => {
        if (!user) {
            console.error("❌ [DomainsContext] No user logged in");
            throw new Error("No user logged in");
        }

        console.log(`🗑️ [DomainsContext] Deleting domain: ${id}`);
        
        const domain = domains.find(d => d.id === id);
        const domainName = domain?.name;
        const normalizedDomain = domainName ? domainName.toLowerCase().trim().replace(/^www\./, '') : null;
        
        // Simple delete without complex transactions
        const domainRef = doc(db, 'users', user.uid, 'domains', id);
        
        try {
            // Just delete - simple approach
            await deleteDoc(domainRef);
            console.log(`✅ [DomainsContext] deleteDoc executed`);
            
        } catch (firestoreError: any) {
            console.error("❌ [DomainsContext] Delete failed:", firestoreError);
            
            // If it's an internal Firestore error, try to clear cache
            if (firestoreError.message?.includes('INTERNAL ASSERTION')) {
                console.log("🔧 [DomainsContext] Firestore internal error - cache may be corrupted");
                throw new Error("Error interno de Firestore. Por favor limpia el cache del navegador (DevTools > Application > Clear site data)");
            }
            
            throw new Error(`Error eliminando: ${firestoreError?.message || 'Error desconocido'}`);
        }
            
        // Delete from customDomains
        if (normalizedDomain) {
            try {
                await deleteDoc(doc(db, 'customDomains', normalizedDomain));
                console.log(`✅ [DomainsContext] Deleted from customDomains`);
            } catch (e) {
                console.warn(`⚠️ [DomainsContext] customDomains delete warning:`, e);
            }
        }
        
        // Update local state
        setDomains(prev => prev.filter(d => d.id !== id));
        console.log(`🎉 [DomainsContext] Domain deleted: ${domainName}`);
    };

    // Refetch domains from Firestore
    const refetch = useCallback(async () => {
        if (user) {
            console.log("🔄 [DomainsContext] Refetching domains...");
            await fetchUserDomains(user.uid);
        }
    }, [user, fetchUserDomains]);

    // Verify domain (DNS check) - does REAL verification before marking as active
    const verifyDomain = async (id: string): Promise<boolean> => {
        if (!user) return false;

        try {
            const domain = domains.find(d => d.id === id);
            if (!domain) return false;

            console.log(`🔍 [DomainsContext] Verifying domain: ${domain.name}`);
            
            const normalizedDomain = domain.name.toLowerCase().trim().replace(/^www\./, '');

            // Update status to verifying
            await updateDomain(id, { status: 'verifying' });

            // REAL VERIFICATION: Try to fetch the domain
            // This checks if DNS is configured and SSL is working
            try {
                const testUrl = `https://${normalizedDomain}`;
                console.log(`🔍 [DomainsContext] Testing URL: ${testUrl}`);
                
                const response = await fetch(testUrl, { 
                    method: 'HEAD',
                    mode: 'no-cors', // Allow cross-origin
                    cache: 'no-cache'
                });
                
                // If we get here without error, the domain is reachable
                // Note: no-cors mode always returns opaque response, so we can't check status
                // But if fetch succeeds, DNS + SSL are working
                console.log(`✅ [DomainsContext] Domain ${normalizedDomain} is reachable`);
                
                // Domain is working - mark as active
                await setDoc(doc(db, 'customDomains', normalizedDomain), {
                    domain: normalizedDomain,
                    projectId: domain.projectId || null,
                    userId: user.uid,
                    status: 'active',
                    sslStatus: 'active',
                    dnsVerified: true,
                    cloudRunTarget: 'quimera-ssr-575386543550.us-central1.run.app',
                    updatedAt: new Date().toISOString()
                }, { merge: true });

                await updateDomain(id, {
                    status: 'active',
                    sslStatus: 'active',
                    verifiedAt: new Date().toISOString(),
                });

                return true;

            } catch (fetchError: any) {
                console.log(`⏳ [DomainsContext] Domain ${normalizedDomain} not ready yet: ${fetchError.message}`);
                
                // Domain not ready yet - keep as pending
                await updateDomain(id, {
                    status: 'pending',
                    sslStatus: 'pending',
                });

                // Still save to customDomains so SSR knows about it
                await setDoc(doc(db, 'customDomains', normalizedDomain), {
                    domain: normalizedDomain,
                    projectId: domain.projectId || null,
                    userId: user.uid,
                    status: 'pending',
                    sslStatus: 'pending',
                    dnsVerified: false,
                    cloudRunTarget: 'quimera-ssr-575386543550.us-central1.run.app',
                    updatedAt: new Date().toISOString()
                }, { merge: true });

                return false;
            }

        } catch (error: any) {
            console.error("❌ [DomainsContext] Error verifying domain:", error);
            await updateDomain(id, { status: 'error' });
            return false;
        }
    };

    // Deploy domain - Uses centralized publish service (like Shopify/Wix)
    const deployDomain = async (
        domainId: string,
        provider: 'vercel' | 'cloudflare' | 'netlify' | 'cloud_run' | 'custom' = 'cloud_run'
    ): Promise<boolean> => {
        if (!user) return false;

        try {
            const domain = domains.find(d => d.id === domainId);
            if (!domain) return false;

            console.log(`🚀 [DomainsContext] Deploying domain: ${domain.name} using provider: ${provider}`);

            if (!domain.projectId) {
                console.error('❌ [DomainsContext] No project linked to this domain');
                throw new Error("No hay un proyecto vinculado a este dominio");
            }

            // Update status to deploying
            await updateDomain(domainId, { status: 'deploying' });

            // Log deployment start
            await addDeploymentLog({
                domainId,
                action: 'deploy_start',
                provider,
                timestamp: new Date().toISOString(),
                status: 'started',
                message: `Iniciando despliegue en ${provider}...`
            });

            // Handle Cloud Run / Custom / Quimera (SSR Mapping)
            if (provider === 'cloud_run' || provider === 'custom' || domain.provider === 'Quimera') {
                const normalizedDomain = domain.name.toLowerCase().trim().replace(/^www\./, '');
                
                console.log(`📡 [DomainsContext] Publishing project using centralized service...`);

                // ============================================
                // STEP 1: CHECK IF PROJECT IS LOADED IN EDITOR
                // If loaded, use snapshot (single source of truth)
                // Otherwise, publishService will read from Firestore
                // ============================================
                let projectSnapshot: any = null;
                let projectUserId = domain.projectUserId || user.uid;
                const projectTenantId = domain.projectTenantId || currentTenantId;

                // Check if project is currently loaded in the editor
                if (projectContext?.activeProjectId === domain.projectId && projectContext.getProjectSnapshot) {
                    projectSnapshot = projectContext.getProjectSnapshot();
                    if (projectSnapshot) {
                        console.log(`📸 [DomainsContext] Using editor snapshot for project: ${projectSnapshot.name}`);
                    }
                }

                // If not loaded in editor, try to get userId from loaded projects
                if (!projectSnapshot && !domain.projectUserId && projectContext?.projects) {
                    const loadedProject = projectContext.projects.find(p => p.id === domain.projectId);
                    if (loadedProject?.userId) {
                        projectUserId = loadedProject.userId;
                        console.log(`📋 [DomainsContext] Found projectUserId from loaded projects: ${projectUserId}`);
                        await updateDomain(domainId, { projectUserId });
                    }
                }

                // ============================================
                // STEP 2: PUBLISH USING CENTRALIZED SERVICE
                // ============================================
                const { publishProject: publishToService } = await import('../../services/publishService');
                
                const publishResult = await publishToService({
                    userId: projectUserId,
                    projectId: domain.projectId,
                    tenantId: projectTenantId || null,
                    projectSnapshot: projectSnapshot || undefined, // Use snapshot if available
                    saveDraftFirst: !!projectSnapshot, // Only save draft if using snapshot
                    includeEcommerce: true,
                    includeCMS: true,
                });

                if (!publishResult.success) {
                    throw new Error(publishResult.error || 'Error publishing project');
                }

                console.log(`✅ [DomainsContext] Project published via service at ${publishResult.publishedAt}`);
                if (publishResult.stats) {
                    console.log(`   📦 Products: ${publishResult.stats.productsPublished}`);
                    console.log(`   📂 Categories: ${publishResult.stats.categoriesPublished}`);
                    console.log(`   📝 Posts: ${publishResult.stats.postsPublished}`);
                }

                // ============================================
                // STEP 3: REGISTER DOMAIN IN customDomains
                // ============================================
                const domainData = {
                    domain: normalizedDomain,
                    projectId: domain.projectId,
                    userId: user.uid,
                    status: 'active',
                    sslStatus: 'active',
                    dnsVerified: true,
                    cloudRunTarget: 'quimera-ssr-575386543550.us-central1.run.app',
                    updatedAt: new Date().toISOString()
                };

                await setDoc(doc(db, 'customDomains', normalizedDomain), domainData, { merge: true });
                console.log(`✅ [DomainsContext] Domain synced to customDomains: ${normalizedDomain}`);

                // Update domain status to active
                await updateDomain(domainId, {
                    status: 'active',
                    sslStatus: 'active',
                    deployment: {
                        provider: 'cloud_run',
                        deploymentUrl: `https://${domain.name}`,
                        lastDeployedAt: new Date().toISOString(),
                        status: 'success',
                        error: null
                    }
                });

                // Log success
                await addDeploymentLog({
                    domainId,
                    action: 'deploy_success',
                    provider: 'cloud_run',
                    timestamp: new Date().toISOString(),
                    status: 'success',
                    message: 'Proyecto publicado y dominio desplegado correctamente en Quimera Cloud',
                    url: `https://${domain.name}`,
                });

                console.log(`🎉 [DomainsContext] Deploy complete for ${domain.name}`);
                return true;
            }

            // Handle Static Providers (Vercel, Cloudflare, Netlify)
            // Fetch project data from Firestore
            const projectDoc = await getDocs(query(collection(db, 'users', user.uid, 'projects')));
            const projectData = projectDoc.docs.find(d => d.id === domain.projectId)?.data() as any;

            if (!projectData) {
                throw new Error("Project data not found");
            }

            const project = { id: domain.projectId, ...projectData };

            // Use deployment service with full objects
            const result = await deploymentService.deployProject(project, domain, provider as any);

            // Update domain status
            await updateDomain(domainId, {
                status: result.success ? 'active' : 'error',
                deployment: {
                    provider: provider as any,
                    deploymentUrl: result.deploymentUrl || '',
                    deploymentId: result.deploymentId || '',
                    lastDeployedAt: new Date().toISOString(),
                    status: result.success ? 'success' : 'failed',
                    error: result.error || null
                }
            });

            // Log deployment result (project-scoped)
            await addDeploymentLog({
                domainId,
                action: result.success ? 'deploy_success' : 'deploy_failed',
                provider,
                timestamp: new Date().toISOString(),
                status: result.success ? 'success' : 'failed',
                message: result.success ? 'Sitio desplegado correctamente' : 'Error en el despliegue',
                error: result.error || null,
                url: result.deploymentUrl || null,
            });

            return result.success;
        } catch (error: any) {
            console.error("❌ [DomainsContext] Error deploying domain:", error);

            // Log error (project-scoped)
            await addDeploymentLog({
                domainId,
                action: 'deploy_error',
                timestamp: new Date().toISOString(),
                status: 'failed',
                message: 'Error durante el despliegue',
                error: error instanceof Error ? error.message : String(error) || 'Unknown error',
            });

            await updateDomain(domainId, { status: 'error' });
            return false;
        }
    };

    // Get deployment logs for a domain
    const getDomainDeploymentLogs = (domainId: string): DeploymentLog[] => {
        return deploymentLogs.filter(log => log.domainId === domainId);
    };

    const value: DomainsContextType = {
        domains,
        domainsForActiveProject,
        addDomain,
        updateDomain,
        deleteDomain,
        verifyDomain,
        deployDomain,
        getDomainDeploymentLogs,
        refetch,
        hasActiveProject: !!activeProjectId,
        activeProjectId,
    };

    return <DomainsContext.Provider value={value}>{children}</DomainsContext.Provider>;
};

export const useDomains = (): DomainsContextType => {
    const context = useContext(DomainsContext);
    if (!context) {
        throw new Error('useDomains must be used within a DomainsProvider');
    }
    return context;
};


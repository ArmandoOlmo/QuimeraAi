/**
 * DomainsContext
 * Maneja dominios y deployment
 * Los dominios tienen un campo projectId que los vincula a un proyecto
 * Los deployment logs están organizados por proyecto
 */

import React, { createContext, useState, useContext, useEffect, ReactNode, useCallback, useMemo } from 'react';
import { Domain, DeploymentLog } from '../../types';
import { supabase } from '../../supabase';
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

const mapCustomDomainRow = (row: any): Domain => {
    const data = row.data || {};
    const domainName = row.domain_name || data.domain || data.name;

    return {
        id: domainName,
        name: domainName,
        projectId: data.projectId || data.project_id || row.project_id,
        projectUserId: data.projectUserId || data.project_user_id,
        userId: row.user_id || data.userId || data.user_id,
        status: data.status || row.status || 'pending',
        sslStatus: data.sslStatus || data.ssl_status || row.ssl_status || 'pending',
        createdAt: data.createdAt || row.created_at || row.updated_at,
        dnsVerified: data.dnsVerified ?? data.dns_verified ?? row.dns_verified ?? false,
        cloudRunTarget: data.cloudRunTarget || data.cloud_run_target || row.cloud_run_target,
        ...data,
    } as any;
};

const toCustomDomainData = (domain: Partial<Domain>, normalizedDomain: string) => ({
    domain: normalizedDomain,
    name: normalizedDomain,
    projectId: domain.projectId || null,
    projectUserId: domain.projectUserId,
    status: domain.status || 'pending',
    sslStatus: domain.sslStatus || 'pending',
    dnsVerified: domain.dnsVerified ?? false,
    cloudRunTarget: domain.cloudRunTarget || 'quimera-ssr-575386543550.us-central1.run.app',
    updatedAt: new Date().toISOString(),
});

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
            const { data, error } = await supabase
                .from('custom_domains')
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: false });

            if (error) {
                console.error("❌ [DomainsContext] Supabase Error:", error);
                return;
            }

            const userDomains = (data || []).map(mapCustomDomainRow);

            console.log(`✅ [DomainsContext] Loaded ${userDomains.length} domains from Supabase`);
            setDomains(userDomains);
        } catch (error: any) {
            console.error("❌ [DomainsContext] Error loading domains:", error);
            console.error("❌ [DomainsContext] Error code:", error?.code);
        }
    }, []);

    // Load domains when user changes
    useEffect(() => {
        if (user) {
            fetchUserDomains(user.id);
        } else {
            setDomains([]);
        }
    }, [user, fetchUserDomains]);

    // Load deployment logs (scoped to active project)
    useEffect(() => {
        if (!user || !activeProjectId || !currentTenantId) {
            setDeploymentLogs([]);
            return;
        }

        const fetchLogs = async () => {
            const { data, error } = await supabase
                .from('deployment_logs')
                .select('*')
                .eq('project_id', activeProjectId)
                .order('created_at', { ascending: false });

            if (!error && data) {
                setDeploymentLogs(data.map(log => ({
                    id: log.id,
                    domainId: log.domain_id,
                    projectId: log.project_id,
                    action: log.action as any,
                    provider: log.provider as any,
                    status: log.status as any,
                    message: log.message,
                    error: log.error,
                    url: log.url,
                    timestamp: log.created_at,
                    metadata: log.metadata
                })));
            }
        };

        fetchLogs();

        const channel = supabase.channel(`public:deployment_logs:project_id=eq.${activeProjectId}`)
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'deployment_logs',
                filter: `project_id=eq.${activeProjectId}`
            }, () => {
                fetchLogs();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [user, activeProjectId, currentTenantId]);

    // Helper to add deployment log (project-scoped)
    const addDeploymentLog = useCallback(async (logData: Omit<DeploymentLog, 'id' | 'projectId'>) => {
        if (!user || !activeProjectId || !currentTenantId) return;

        await supabase.from('deployment_logs').insert([{
            tenant_id: currentTenantId,
            project_id: activeProjectId,
            domain_id: logData.domainId,
            action: logData.action,
            provider: logData.provider,
            status: logData.status,
            message: logData.message || null,
            error: logData.error || null,
            url: logData.url || null,
            created_at: logData.timestamp || new Date().toISOString(),
            metadata: {}
        }]);
    }, [user, activeProjectId, currentTenantId]);

    // Add domain
    const addDomain = async (domain: Domain) => {
        if (!user) return;

        try {
            const { id: _tempId, ...domainDataWithoutId } = domain;
            const projectIdToUse = domain.projectId || activeProjectId;
            const projectUserIdToUse = domain.projectUserId || user.id;
            const normalizedDomain = domain.name.toLowerCase().replace(/^www\./, '');
            const domainId = normalizedDomain; 

            // Sync to global customDomains table
            await supabase.from('custom_domains').upsert({
                domain_name: normalizedDomain,
                user_id: user.id, // Who created the domain entry
                data: toCustomDomainData({
                    ...domain,
                    projectId: projectIdToUse || undefined,
                    projectUserId: projectUserIdToUse,
                    status: 'ssl_pending',
                    sslStatus: 'provisioning',
                    dnsVerified: false,
                    cloudRunTarget: 'cname.vercel-dns.com', // Legacy property name, points to Vercel now
                }, normalizedDomain),
                updated_at: new Date().toISOString()
            }, { onConflict: 'domain_name' });

            const newDomain = {
                ...domainDataWithoutId,
                id: domainId,
                projectId: projectIdToUse,
                projectUserId: projectUserIdToUse,
                status: 'ssl_pending',
            } as Domain;

            setDomains(prev => {
                const filtered = prev.filter(d => d.id !== domainId);
                return [newDomain, ...filtered];
            });

            console.log(`✅ [DomainsContext] Domain added with ID: ${domainId}, projectId: ${projectIdToUse}`);

            // AUTOMATIC: Bind custom domain to Vercel Project
            try {
                console.log(`🔐 [DomainsContext] Binding domain to Vercel: ${normalizedDomain}`);
                const DeploymentService = (await import('../../utils/deploymentService')).DeploymentService;
                const deploymentService = DeploymentService.getInstance();
                const mappingResult = await deploymentService.addDomainToVercel(normalizedDomain);

                if (mappingResult.success) {
                    console.log(`✅ [DomainsContext] Domain successfully added to Vercel.`);

                    const newStatus = 'pending';
                    const newSslStatus = 'provisioning';
                    
                    await supabase.from('custom_domains').update({
                        data: toCustomDomainData({
                            ...newDomain,
                            status: newStatus,
                            sslStatus: newSslStatus,
                        }, normalizedDomain),
                        updated_at: new Date().toISOString()
                    }).eq('domain_name', normalizedDomain);

                    setDomains(prev => prev.map(d =>
                        d.id === domainId
                            ? { ...d, status: newStatus, sslStatus: newSslStatus }
                            : d
                    ));
                } else {
                    console.warn(`⚠️ [DomainsContext] Vercel mapping failed:`, mappingResult.error);
                }
            } catch (mappingError: any) {
                console.error(`❌ [DomainsContext] Vercel mapping error:`, mappingError);
            }
        } catch (error) {
            console.error("[DomainsContext] Error adding domain:", error);
            throw error;
        }
    };

    // Update domain
    const updateDomain = async (id: string, data: Partial<Domain>) => {
        if (!user) return;

        try {
            const domain = domains.find(d => d.id === id);
            
            const normalizedDomain = (domain?.name || id).toLowerCase().replace(/^www\./, '');
            
            const updatedDomain = { ...(domain || {}), ...data } as Partial<Domain>;
            
            await supabase.from('custom_domains').update({
                data: toCustomDomainData(updatedDomain, normalizedDomain),
                updated_at: new Date().toISOString()
            }).eq('domain_name', normalizedDomain);

            setDomains(prev => prev.map(d => d.id === id ? { ...d, ...data } : d));
            
            console.log(`✅ [DomainsContext] Domain updated: ${normalizedDomain}`);
        } catch (error) {
            console.error("[DomainsContext] Error updating domain:", error);
            throw error;
        }
    };

    // Delete domain
    const deleteDomain = async (id: string) => {
        if (!user) {
            console.error("❌ [DomainsContext] No user logged in");
            throw new Error("No user logged in");
        }

        console.log(`🗑️ [DomainsContext] Deleting domain: ${id}`);
        const domain = domains.find(d => d.id === id);
        const domainName = domain?.name || id;
        const normalizedDomain = domainName.toLowerCase().trim().replace(/^www\./, '');

        try {
            const { removeCustomDomainFromProject } = await import('../../services/domainService');
            console.log(`🔐 [DomainsContext] Calling domains-remove for: ${normalizedDomain}`);
            const result = await removeCustomDomainFromProject(normalizedDomain);

            if (!result.success) {
                console.warn(`⚠️ [DomainsContext] Cloud Function returned error: ${result.error}`);
            }
        } catch (cloudFnError: any) {
            console.warn(`⚠️ [DomainsContext] Cloud Function delete failed, continuing with direct delete:`, cloudFnError.message);
        }

        try {
            await supabase.from('custom_domains').delete().eq('domain_name', normalizedDomain);
            console.log(`✅ [DomainsContext] Direct delete from custom_domains succeeded`);
        } catch (e) {
            console.error(`❌ [DomainsContext] Delete failed:`, e);
        }

        setDomains(prev => prev.filter(d => d.id !== id));
        console.log(`🎉 [DomainsContext] Domain deleted: ${domainName}`);
    };

    // Refetch domains
    const refetch = useCallback(async () => {
        if (user) {
            console.log("🔄 [DomainsContext] Refetching domains...");
            await fetchUserDomains(user.id);
        }
    }, [user, fetchUserDomains]);

    // Verify domain (DNS check)
    const verifyDomain = async (id: string): Promise<boolean> => {
        if (!user) return false;

        try {
            const domain = domains.find(d => d.id === id);
            if (!domain) return false;

            console.log(`🔍 [DomainsContext] Verifying domain: ${domain.name}`);
            const normalizedDomain = domain.name.toLowerCase().trim().replace(/^www\./, '');

            await updateDomain(id, { status: 'verifying' });

            // AUTO-RECOVERY
            try {
                const { checkCloudRunDomainMappingStatus, createCloudRunDomainMapping } = await import('../../services/domainService');
                const mappingStatus = await checkCloudRunDomainMappingStatus(normalizedDomain);

                if (!mappingStatus.exists) {
                    console.log(`⚠️ [DomainsContext] Cloud Run mapping missing. Attempting to create...`);
                    const createResult = await createCloudRunDomainMapping(normalizedDomain);
                    if (createResult.success) {
                        await updateDomain(id, {
                            cloudRunMappingCreated: true,
                            sslStatus: 'provisioning',
                            status: 'ssl_pending' 
                        });
                    }
                } else if (mappingStatus.ready) {
                    await updateDomain(id, { sslStatus: 'active' });
                } else {
                    await updateDomain(id, { sslStatus: 'provisioning' });
                }
            } catch (e) {
                console.warn("⚠️ [DomainsContext] Failed to check/recover Cloud Run status:", e);
            }

            // REAL VERIFICATION
            try {
                const testUrl = `https://${normalizedDomain}`;
                console.log(`🔍 [DomainsContext] Testing URL: ${testUrl}`);

                await fetch(testUrl, { method: 'HEAD', mode: 'no-cors', cache: 'no-cache' });
                console.log(`✅ [DomainsContext] Domain ${normalizedDomain} is reachable`);

                await supabase.from('custom_domains').update({
                    data: toCustomDomainData({
                        ...domain,
                        status: 'active',
                        sslStatus: 'active',
                        dnsVerified: true,
                    }, normalizedDomain),
                    updated_at: new Date().toISOString()
                }).eq('domain_name', normalizedDomain);

                await updateDomain(id, {
                    status: 'active',
                    sslStatus: 'active',
                    verifiedAt: new Date().toISOString(),
                });

                return true;
            } catch (fetchError: any) {
                console.log(`⏳ [DomainsContext] Domain ${normalizedDomain} not ready yet: ${fetchError.message}`);

                await updateDomain(id, {
                    status: 'pending',
                    sslStatus: 'pending',
                });
                return false;
            }
        } catch (error: any) {
            console.error("❌ [DomainsContext] Error verifying domain:", error);
            await updateDomain(id, { status: 'error' });
            return false;
        }
    };

    // Deploy domain
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
                throw new Error("No hay un proyecto vinculado a este dominio");
            }

            await updateDomain(domainId, { status: 'deploying' });

            await addDeploymentLog({
                domainId,
                action: 'deploy_start',
                provider,
                timestamp: new Date().toISOString(),
                status: 'started',
                message: `Iniciando despliegue en ${provider}...`
            });

            if (provider === 'cloud_run' || provider === 'custom' || domain.provider === 'Quimera') {
                const normalizedDomain = domain.name.toLowerCase().trim().replace(/^www\./, '');

                let projectSnapshot: any = null;
                let projectUserId = domain.projectUserId || user.id;
                const projectTenantId = domain.projectTenantId || currentTenantId;

                if (projectContext?.activeProjectId === domain.projectId && projectContext.getProjectSnapshot) {
                    projectSnapshot = projectContext.getProjectSnapshot();
                }

                if (!projectSnapshot && !domain.projectUserId && projectContext?.projects) {
                    const loadedProject = projectContext.projects.find(p => p.id === domain.projectId);
                    if (loadedProject?.userId) {
                        projectUserId = loadedProject.userId;
                    }
                }

                const { publishProject: publishToService } = await import('../../services/publishService');
                const publishResult = await publishToService({
                    userId: projectUserId,
                    projectId: domain.projectId,
                    tenantId: projectTenantId || null,
                    projectSnapshot: projectSnapshot || undefined,
                    saveDraftFirst: !!projectSnapshot,
                    includeEcommerce: true,
                    includeCMS: true,
                });

                if (!publishResult.success) {
                    throw new Error(publishResult.error || 'Error publishing project');
                }

                await supabase.from('custom_domains').update({
                    data: toCustomDomainData({
                        ...domain,
                        status: 'active',
                        sslStatus: 'active',
                        dnsVerified: true,
                    }, normalizedDomain),
                    updated_at: new Date().toISOString()
                }).eq('domain_name', normalizedDomain);

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

                await addDeploymentLog({
                    domainId,
                    action: 'deploy_success',
                    provider: 'cloud_run',
                    timestamp: new Date().toISOString(),
                    status: 'success',
                    message: 'Proyecto publicado y dominio desplegado correctamente en Quimera Cloud',
                    url: `https://${domain.name}`,
                });

                return true;
            }

            // Handle Static Providers (Vercel, Cloudflare, Netlify)
            const { data: projectData } = await supabase.from('projects').select('*').eq('id', domain.projectId).single();

            if (!projectData) {
                throw new Error("Project data not found");
            }

            const project = { id: domain.projectId, ...projectData };
            const result = await deploymentService.deployProject(project, domain, provider as any);

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

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
    const domainName = row.domain_name || row.domain || data.domain || data.name;

    return {
        ...data, // Mantener metadata original
        id: domainName,
        name: domainName,
        domain: domainName,
        projectId: row.project_id || data.projectId || data.project_id,
        userId: row.user_id || data.userId || data.user_id,
        status: row.status || data.status || 'pending',
        sslStatus: row.ssl_status || data.sslStatus || data.ssl_status || 'pending',
        dnsVerified: row.dns_verified ?? data.dnsVerified ?? data.dns_verified ?? false,
        cloudRunTarget: row.cloud_run_target || data.cloudRunTarget || data.cloud_run_target,
        updatedAt: row.updated_at || data.updatedAt,
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
    const addDomain = async (domain: Partial<Domain>) => {
        if (!user) return;

        try {
            const domainDataWithoutId = { ...domain };
            delete (domainDataWithoutId as any).id;

            const projectIdToUse = domain.projectId || activeProjectId;
            if (!projectIdToUse) {
                throw new Error("No hay un proyecto activo para vincular este dominio");
            }

            const normalizedDomain = domain.name!.toLowerCase().trim().replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/.*$/, '');
            const domainId = normalizedDomain;

            const { addCustomDomainToProject } = await import('../../services/domainService');
            const mappingResult = await addCustomDomainToProject(normalizedDomain, projectIdToUse);

            if (!mappingResult.success) {
                throw new Error(mappingResult.error || "No se pudo vincular el dominio a Vercel");
            }

            const projectUserIdToUse = mappingResult.projectUserId || domain.projectUserId || user.id;

            const newDomain = {
                ...domainDataWithoutId,
                id: domainId,
                name: mappingResult.domain || normalizedDomain,
                projectId: projectIdToUse,
                projectUserId: projectUserIdToUse,
                status: (mappingResult.status as Domain['status']) || 'pending',
                sslStatus: (mappingResult.sslStatus as Domain['sslStatus']) || 'provisioning',
                dnsVerified: mappingResult.dnsVerified ?? false,
                data: {
                    ...(domainDataWithoutId.data || {}),
                    dnsRecords: mappingResult.dnsRecords || []
                }
            } as Domain;

            setDomains(prev => {
                const filtered = prev.filter(d => d.id !== domainId);
                return [newDomain, ...filtered];
            });

            console.log(`✅ [DomainsContext] Domain added: ${domainId}`);
            await fetchUserDomains(user.id);
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
            await supabase.from('custom_domains').delete().or(`domain_name.eq.${normalizedDomain},domain.eq.${normalizedDomain}`);
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
        const domain = domains.find(d => d.id === id);
        if (!domain || !user) return false;

        try {
            console.log(`🔍 [DomainsContext] Verifying domain: ${domain.name}`);
            const { syncDomainMapping } = await import('../../services/domainService');
            const result = await syncDomainMapping(domain.name, domain.projectId);
            
            await fetchUserDomains(user.id);
            return result.success && (result.status === 'active' || result.dnsVerified);
        } catch (e) {
            console.error('Error verifying domain:', e);
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

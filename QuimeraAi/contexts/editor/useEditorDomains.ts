/**
 * useEditorDomains.ts
 * Extracted from EditorContext.tsx — Domain management, DNS verification, SSL, and deployment
 */
import { useState, useEffect } from 'react';
import { Domain, DeploymentLog, Project } from '../../types';
import { supabase } from '../../supabase';
import { deploymentService } from '../../utils/deploymentService';
import type { User } from '../../firebase';

interface UseEditorDomainsParams {
    user: User | null;
    projects: Project[];
}

export const useEditorDomains = ({ user, projects }: UseEditorDomainsParams) => {
    const [domains, setDomains] = useState<Domain[]>([]);

    const fetchUserDomains = async (userId: string) => {
        try {
            const { data, error } = await supabase
                .from('custom_domains')
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: false });

            if (error) throw error;

            const userDomains = (data || []).map(row => ({
                id: row.domain,
                name: row.domain,
                projectId: row.project_id,
                userId: row.user_id,
                status: row.status,
                sslStatus: row.ssl_status,
                createdAt: row.updated_at,
                dnsVerified: row.dns_verified,
                cloudRunTarget: row.cloud_run_target,
            } as any));

            setDomains(userDomains);
        } catch (error) {
            console.error("Error loading user domains:", error);
        }
    };

    const addDomain = async (domainData: Domain) => {
        if (!user) return;

        const newDomain = { ...domainData, createdAt: new Date().toISOString() };
        setDomains(prev => [newDomain, ...prev]);

        try {
            if (domainData.provider === 'External' && domainData.projectId) {
                try {
                    const { addCustomDomainToProject } = await import('../../services/domainService');
                    const result = await addCustomDomainToProject(domainData.name, domainData.projectId);

                    if (result.success && result.dnsRecords) {
                        newDomain.dnsRecords = result.dnsRecords;
                        newDomain.verificationToken = result.verificationToken;
                        newDomain.status = 'pending';
                    }
                } catch (cfError) {
                    console.warn('Cloud Function call failed, falling back to local storage:', cfError);
                }
            }

            const normalizedDomain = domainData.name.toLowerCase().replace(/^www\./, '');
            await supabase.from('custom_domains').upsert({
                domain: normalizedDomain,
                project_id: domainData.projectId || null,
                user_id: user.id,
                status: newDomain.status || 'pending',
                ssl_status: newDomain.sslStatus || 'pending',
                dns_verified: false,
                cloud_run_target: 'quimera-ssr-575386543550.us-central1.run.app',
                updated_at: new Date().toISOString()
            });

            setDomains(prev => prev.map(d => d.id === domainData.id ? { ...newDomain, id: normalizedDomain } : d));
        } catch (e) {
            console.error("Error adding domain", e);
            setDomains(prev => prev.filter(d => d.id !== domainData.id));
        }
    };

    const updateDomain = async (id: string, data: Partial<Domain>) => {
        if (!user) return;
        setDomains(prev => prev.map(d => d.id === id ? { ...d, ...data } : d));
        
        try {
            const domain = domains.find(d => d.id === id);
            const normalizedDomain = (domain?.name || id).toLowerCase().replace(/^www\./, '');
            
            const syncData: any = { updated_at: new Date().toISOString() };
            if (data.projectId !== undefined) syncData.project_id = data.projectId;
            if (data.status !== undefined) syncData.status = data.status;
            if (data.sslStatus !== undefined) syncData.ssl_status = data.sslStatus;
            
            await supabase.from('custom_domains').update(syncData).eq('domain', normalizedDomain);
        } catch (e) {
            console.error("Error updating domain", e);
        }
    };

    const deleteDomain = async (id: string) => {
        if (!user) return;

        const domain = domains.find(d => d.id === id);
        const normalizedDomain = (domain?.name || id).toLowerCase().replace(/^www\./, '');
        setDomains(prev => prev.filter(d => d.id !== id));

        try {
            if (domain?.provider === 'External') {
                try {
                    const { removeCustomDomainFromProject } = await import('../../services/domainService');
                    await removeCustomDomainFromProject(domain.name);
                } catch (cfError) {
                    console.warn('Cloud Function call failed:', cfError);
                }
            }

            await supabase.from('custom_domains').delete().eq('domain', normalizedDomain);
        } catch (e) {
            console.error("Error deleting domain", e);
        }
    };

    const verifyDomain = async (id: string): Promise<boolean> => {
        if (!user) return false;

        const domain = domains.find(d => d.id === id);
        if (!domain) return false;

        try {
            const { verifyDomainDNS } = await import('../../services/domainService');
            const result = await verifyDomainDNS(domain.name);

            if (result.verified) {
                await updateDomain(id, {
                    status: 'ssl_pending',
                    dnsRecords: result.records.map(r => ({
                        type: r.type,
                        host: r.type === 'A' ? '@' : (r.type === 'CNAME' ? 'www' : '_quimera-verify'),
                        value: r.expected,
                        verified: r.verified,
                        lastChecked: result.checkedAt
                    })),
                    lastVerifiedAt: result.checkedAt
                });
                return true;
            } else {
                await updateDomain(id, {
                    status: 'pending',
                    dnsRecords: result.records.map(r => ({
                        type: r.type,
                        host: r.type === 'A' ? '@' : (r.type === 'CNAME' ? 'www' : '_quimera-verify'),
                        value: r.expected,
                        verified: r.verified,
                        lastChecked: result.checkedAt
                    }))
                });
                return false;
            }
        } catch (error) {
            console.error('Domain verification error:', error);
            await updateDomain(id, { status: 'error' });
            return false;
        }
    };

    const checkDomainSSL = async (id: string): Promise<boolean> => {
        if (!user) return false;

        const domain = domains.find(d => d.id === id);
        if (!domain) return false;

        try {
            const { checkDomainSSLStatus } = await import('../../services/domainService');
            const result = await checkDomainSSLStatus(domain.name);

            await updateDomain(id, {
                status: result.status as any,
                sslStatus: result.sslStatus
            });

            return result.sslStatus === 'active';
        } catch (error) {
            console.error('SSL check error:', error);
            return false;
        }
    };

    const deployDomain = async (
        domainId: string,
        provider: 'vercel' | 'cloudflare' | 'netlify' | 'cloud_run' = 'cloud_run'
    ): Promise<boolean> => {
        if (!user) return false;

        const domain = domains.find(d => d.id === domainId);
        if (!domain || !domain.projectId) {
            console.error('Domain or project not found');
            return false;
        }

        const project = projects.find(p => p.id === domain.projectId);
        if (!project) {
            console.error('Project not found');
            return false;
        }

        try {
            await updateDomain(domainId, {
                status: 'deploying',
                deployment: {
                    provider,
                    status: 'deploying'
                }
            });

            if (provider === 'cloud_run' || domain.provider === 'Quimera') {
                const normalizedDomain = domain.name.toLowerCase().trim().replace(/^www\./, '');

                await supabase.from('custom_domains').update({
                    status: 'active',
                    ssl_status: 'active',
                    dns_verified: true
                }).eq('domain', normalizedDomain);

                await updateDomain(domainId, {
                    status: 'active',
                    sslStatus: 'active',
                    deployment: {
                        provider: 'cloud_run',
                        deploymentUrl: `https://${domain.name}`,
                        lastDeployedAt: new Date().toISOString(),
                        status: 'success'
                    }
                });

                return true;
            }

            const result = await deploymentService.deployProject(project, domain, provider as any);

            if (result.success) {
                await updateDomain(domainId, {
                    status: 'deployed',
                    deployment: {
                        provider,
                        deploymentUrl: result.deploymentUrl,
                        deploymentId: result.deploymentId,
                        lastDeployedAt: new Date().toISOString(),
                        status: 'success'
                    },
                    dnsRecords: result.dnsRecords
                });
                return true;
            } else {
                await updateDomain(domainId, {
                    status: 'error',
                    deployment: {
                        provider,
                        status: 'failed',
                        error: result.error
                    }
                });
                return false;
            }
        } catch (error) {
            console.error('Deployment error:', error);
            await updateDomain(domainId, {
                status: 'error',
                deployment: {
                    provider,
                    status: 'failed',
                    error: error instanceof Error ? error.message : 'Unknown error'
                }
            });
            return false;
        }
    };

    const [deploymentLogs, setDeploymentLogs] = useState<DeploymentLog[]>([]);

    useEffect(() => {
        if (!user) return;
        const fetchLogs = async () => {
            const { data } = await supabase.from('deployment_logs').select('*');
            if (data) {
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
    }, [user]);

    const getDomainDeploymentLogs = (domainId: string): DeploymentLog[] => {
        return deploymentLogs.filter(d => d.domainId === domainId) || [];
    };

    return {
        domains,
        setDomains,
        fetchUserDomains,
        addDomain,
        updateDomain,
        deleteDomain,
        verifyDomain,
        checkDomainSSL,
        deployDomain,
        getDomainDeploymentLogs,
    };
};

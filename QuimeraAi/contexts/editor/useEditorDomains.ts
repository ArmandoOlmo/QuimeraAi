/**
 * useEditorDomains.ts
 * Extracted from EditorContext.tsx — Domain management, DNS verification, SSL, and deployment
 */
import { useState } from 'react';
import { Domain, DeploymentLog, Project } from '../../types';
import {
    db, doc, setDoc, updateDoc, deleteDoc,
    collection, getDocs, query, orderBy
} from '../../firebase';
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
            const domainsCol = collection(db, 'users', userId, 'domains');
            const q = query(domainsCol, orderBy('createdAt', 'desc'));
            const snap = await getDocs(q);
            const userDomains = snap.docs.map(docSnapshot => ({
                ...docSnapshot.data(),
                id: docSnapshot.id
            } as Domain));
            setDomains(userDomains);
        } catch (error) {
            console.error("Error loading user domains:", error);
        }
    };

    const addDomain = async (domainData: Domain) => {
        if (!user) return;

        const newDomain = { ...domainData, createdAt: new Date().toISOString() };
        setDomains(prev => [newDomain, ...prev]); // Optimistic update

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

            const domainsCol = collection(db, 'users', user.uid, 'domains');
            await setDoc(doc(domainsCol, domainData.id), newDomain);
            setDomains(prev => prev.map(d => d.id === domainData.id ? newDomain : d));
        } catch (e) {
            console.error("Error adding domain", e);
            setDomains(prev => prev.filter(d => d.id !== domainData.id));
        }
    };

    const updateDomain = async (id: string, data: Partial<Domain>) => {
        if (!user) return;
        setDomains(prev => prev.map(d => d.id === id ? { ...d, ...data } : d));
        try {
            const docRef = doc(db, 'users', user.uid, 'domains', id);
            await updateDoc(docRef, data);
        } catch (e) {
            console.error("Error updating domain", e);
        }
    };

    const deleteDomain = async (id: string) => {
        if (!user) return;

        const domain = domains.find(d => d.id === id);
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

            const docRef = doc(db, 'users', user.uid, 'domains', id);
            await deleteDoc(docRef);
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

                await setDoc(doc(db, 'customDomains', normalizedDomain), {
                    domain: normalizedDomain,
                    projectId: domain.projectId,
                    userId: user.uid,
                    status: 'active',
                    sslStatus: 'active',
                    dnsVerified: true,
                    cloudRunTarget: 'quimera-ssr-575386543550.us-central1.run.app',
                    updatedAt: new Date().toISOString()
                }, { merge: true });

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

    const getDomainDeploymentLogs = (domainId: string): DeploymentLog[] => {
        const domain = domains.find(d => d.id === domainId);
        return domain?.deploymentLogs || [];
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

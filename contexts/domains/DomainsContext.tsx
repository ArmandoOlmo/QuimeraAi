/**
 * DomainsContext
 * Maneja dominios y deployment
 */

import React, { createContext, useState, useContext, useEffect, ReactNode, useCallback } from 'react';
import { Domain, DeploymentLog } from '../../types';
import {
    db,
    doc,
    collection,
    getDocs,
    addDoc,
    updateDoc,
    deleteDoc,
    query,
    orderBy,
    onSnapshot,
    serverTimestamp,
} from '../../firebase';
import { useAuth } from '../core/AuthContext';
import { deploymentService } from '../../utils/deploymentService';

interface DomainsContextType {
    // Domains
    domains: Domain[];
    addDomain: (domain: Domain) => Promise<void>;
    updateDomain: (id: string, data: Partial<Domain>) => Promise<void>;
    deleteDomain: (id: string) => Promise<void>;
    verifyDomain: (id: string) => Promise<boolean>;
    deployDomain: (domainId: string, provider?: 'vercel' | 'cloudflare' | 'netlify') => Promise<boolean>;
    getDomainDeploymentLogs: (domainId: string) => DeploymentLog[];
    refetch: () => Promise<void>;
}

const DomainsContext = createContext<DomainsContextType | undefined>(undefined);

export const DomainsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { user } = useAuth();

    // Domains State
    const [domains, setDomains] = useState<Domain[]>([]);
    const [deploymentLogs, setDeploymentLogs] = useState<DeploymentLog[]>([]);

    // Fetch domains
    const fetchUserDomains = useCallback(async (userId: string) => {
        try {
            console.log(`📂 [DomainsContext] Fetching domains for user: ${userId}`);
            const domainsCol = collection(db, 'users', userId, 'domains');
            const q = query(domainsCol, orderBy('createdAt', 'desc'));
            const snap = await getDocs(q);
            const userDomains = snap.docs.map(docSnapshot => ({
                id: docSnapshot.id,
                ...docSnapshot.data()
            } as Domain));
            console.log(`✅ [DomainsContext] Loaded ${userDomains.length} domains from Firestore`);
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

    // Load deployment logs
    useEffect(() => {
        if (!user) {
            setDeploymentLogs([]);
            return;
        }

        const q = query(
            collection(db, 'users', user.uid, 'deploymentLogs'),
            orderBy('timestamp', 'desc')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const logs = snapshot.docs.map(docSnapshot => ({
                id: docSnapshot.id,
                ...docSnapshot.data()
            })) as DeploymentLog[];
            setDeploymentLogs(logs);
        }, (error: any) => {
            // Silently ignore permission-denied errors (collection may not exist yet)
            if (error.code !== 'permission-denied' && error.code !== 'failed-precondition') {
                console.error("Error fetching deployment logs:", error);
            }
        });

        return () => {
            unsubscribe();
        };
    }, [user]);

    // Add domain
    const addDomain = async (domain: Domain) => {
        if (!user) return;

        try {
            const domainsCol = collection(db, 'users', user.uid, 'domains');
            const docRef = await addDoc(domainsCol, {
                ...domain,
                createdAt: new Date().toISOString(),
                status: 'pending',
            });

            const newDomain = { ...domain, id: docRef.id } as Domain;
            setDomains(prev => [newDomain, ...prev]);
        } catch (error) {
            console.error("Error adding domain:", error);
            throw error;
        }
    };

    // Update domain
    const updateDomain = async (id: string, data: Partial<Domain>) => {
        if (!user) return;

        try {
            await updateDoc(doc(db, 'users', user.uid, 'domains', id), {
                ...data,
                updatedAt: new Date().toISOString(),
            });

            setDomains(prev => prev.map(d =>
                d.id === id ? { ...d, ...data } : d
            ));
        } catch (error) {
            console.error("Error updating domain:", error);
            throw error;
        }
    };

    // Delete domain
    const deleteDomain = async (id: string) => {
        if (!user) {
            console.error("❌ [DomainsContext] Cannot delete domain: No user logged in");
            throw new Error("No user logged in");
        }

        console.log(`🗑️ [DomainsContext] Attempting to delete domain: ${id}`);
        
        try {
            const domainRef = doc(db, 'users', user.uid, 'domains', id);
            await deleteDoc(domainRef);
            console.log(`✅ [DomainsContext] Domain deleted from Firestore: ${id}`);
            
            // Update local state after successful deletion
            setDomains(prev => {
                const filtered = prev.filter(d => d.id !== id);
                console.log(`📝 [DomainsContext] Updated local state: ${prev.length} -> ${filtered.length} domains`);
                return filtered;
            });
        } catch (error: any) {
            console.error("❌ [DomainsContext] Error deleting domain:", error);
            console.error("❌ [DomainsContext] Error code:", error?.code);
            console.error("❌ [DomainsContext] Error message:", error?.message);
            throw error;
        }
    };

    // Refetch domains from Firestore
    const refetch = useCallback(async () => {
        if (user) {
            console.log("🔄 [DomainsContext] Refetching domains...");
            await fetchUserDomains(user.uid);
        }
    }, [user, fetchUserDomains]);

    // Verify domain (DNS check)
    const verifyDomain = async (id: string): Promise<boolean> => {
        if (!user) return false;

        try {
            const domain = domains.find(d => d.id === id);
            if (!domain) return false;

            // Use deployment service to verify
            const isVerified = await deploymentService.verifyDNS(domain.name);

            if (isVerified.verified) {
                await updateDomain(id, {
                    status: 'active',
                    verifiedAt: new Date().toISOString(),
                });
            }

            return isVerified.verified;
        } catch (error) {
            console.error("Error verifying domain:", error);
            return false;
        }
    };

    // Deploy domain
    const deployDomain = async (
        domainId: string,
        provider: 'vercel' | 'cloudflare' | 'netlify' = 'cloudflare'
    ): Promise<boolean> => {
        if (!user) return false;

        try {
            const domain = domains.find(d => d.id === domainId);
            if (!domain) return false;

            // Update status to deploying
            await updateDomain(domainId, { status: 'deploying' });

            // Log deployment start
            await addDoc(collection(db, 'users', user.uid, 'deploymentLogs'), {
                domainId,
                action: 'deploy_start',
                provider,
                timestamp: new Date().toISOString(),
                status: 'in_progress',
            });

            // Fetch project data (assuming projects are available or we fetch them)
            // In a real scenario, you might need to fetch the project from Firestore if it's not in state
            // For now, we'll try to find it in the context's domain or elsewhere if possible
            // But usually, the editor or dashboard has the project data.

            // For this implementation, we'll need the project object. 
            // Let's assume we fetch it from Firestore.
            const projectDoc = await getDocs(query(collection(db, 'users', user.uid, 'projects')));
            const projectData = projectDoc.docs.find(d => d.id === domain.projectId)?.data() as any;

            if (!projectData) {
                throw new Error("Project data not found");
            }

            const project = { id: domain.projectId, ...projectData };

            // Use deployment service with full objects
            const result = await deploymentService.deployProject(project, domain, provider);

            // Update domain status
            await updateDomain(domainId, {
                status: result.success ? 'active' : 'error',
                deployment: {
                    provider,
                    deploymentUrl: result.deploymentUrl,
                    deploymentId: result.deploymentId,
                    lastDeployedAt: new Date().toISOString(),
                    status: result.success ? 'success' : 'failed',
                    error: result.error
                }
            });

            // Log deployment result
            await addDoc(collection(db, 'users', user.uid, 'deploymentLogs'), {
                domainId,
                action: result.success ? 'deploy_success' : 'deploy_failed',
                provider,
                timestamp: new Date().toISOString(),
                status: result.success ? 'success' : 'failed',
                error: result.error,
                url: result.deploymentUrl,
            });

            return result.success;
        } catch (error) {
            console.error("Error deploying domain:", error);

            // Log error
            await addDoc(collection(db, 'users', user.uid, 'deploymentLogs'), {
                domainId,
                action: 'deploy_error',
                timestamp: new Date().toISOString(),
                status: 'failed',
                error: error instanceof Error ? error.message : 'Unknown error',
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
        addDomain,
        updateDomain,
        deleteDomain,
        verifyDomain,
        deployDomain,
        getDomainDeploymentLogs,
        refetch,
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




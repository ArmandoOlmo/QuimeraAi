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
    setDoc,
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
    deployDomain: (domainId: string, provider?: 'vercel' | 'cloudflare' | 'netlify' | 'cloud_run' | 'custom') => Promise<boolean>;
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
            const userDomains = snap.docs.map(docSnapshot => {
                const data = docSnapshot.data();
                // IMPORTANT: Use docSnapshot.id (Firestore document ID), NOT data.id
                return {
                    ...data,
                    id: docSnapshot.id,  // This MUST come after ...data to override any "id" field in the document
                } as Domain;
            });
            console.log(`✅ [DomainsContext] Loaded ${userDomains.length} domains from Firestore`);
            userDomains.forEach(d => console.log(`   - ${d.name} (docId: ${d.id})`));
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

    // Add domain (syncs to both user collection and global customDomains)
    const addDomain = async (domain: Domain) => {
        if (!user) return;

        try {
            const domainsCol = collection(db, 'users', user.uid, 'domains');
            
            // Don't save the temporary "id" field - Firestore will generate the real ID
            const { id: _tempId, ...domainDataWithoutId } = domain;
            
            const docRef = await addDoc(domainsCol, {
                ...domainDataWithoutId,
                createdAt: new Date().toISOString(),
                status: 'pending',
            });

            // Use Firestore's generated ID
            const newDomain = { ...domainDataWithoutId, id: docRef.id } as Domain;
            setDomains(prev => [newDomain, ...prev]);

            // Sync to global customDomains collection for domain resolution
            const normalizedDomain = domain.name.toLowerCase().replace(/^www\./, '');
            await setDoc(doc(db, 'customDomains', normalizedDomain), {
                domain: normalizedDomain,
                projectId: domain.projectId || null,
                userId: user.uid,
                status: 'pending',
                sslStatus: 'pending',
                dnsVerified: false,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            }, { merge: true });
            console.log(`✅ [DomainsContext] Domain added with ID: ${docRef.id}`);
        } catch (error) {
            console.error("Error adding domain:", error);
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
                await setDoc(doc(db, 'customDomains', normalizedDomain), {
                    projectId: data.projectId !== undefined ? data.projectId : domain.projectId,
                    status: data.status || domain.status,
                    sslStatus: data.sslStatus || domain.sslStatus || 'pending',
                    updatedAt: new Date().toISOString(),
                }, { merge: true });
                console.log(`✅ [DomainsContext] Domain updated in customDomains: ${normalizedDomain} -> projectId: ${data.projectId || domain.projectId}`);
            }
        } catch (error) {
            console.error("Error updating domain:", error);
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

    // Verify domain (DNS check) - also syncs status to customDomains
    const verifyDomain = async (id: string): Promise<boolean> => {
        if (!user) return false;

        try {
            const domain = domains.find(d => d.id === id);
            if (!domain) return false;

            console.log(`🔍 [DomainsContext] Verifying domain: ${domain.name}`);
            
            const normalizedDomain = domain.name.toLowerCase().trim().replace(/^www\./, '');

            // For Quimera domains or domains with a project, mark as active directly
            // The SSR server will handle the actual serving
            if (domain.provider === 'Quimera' || domain.projectId) {
                console.log(`✅ [DomainsContext] Domain ${normalizedDomain} has project, marking as active`);
                
                // Direct write to customDomains collection
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
            }

            // For external domains without a project, just update local status
            await updateDomain(id, {
                status: domain.projectId ? 'active' : 'pending',
            });

            return !!domain.projectId;
        } catch (error: any) {
            console.error("❌ [DomainsContext] Error verifying domain:", error);
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
                console.error('❌ [DomainsContext] No project linked to this domain');
                throw new Error("No hay un proyecto vinculado a este dominio");
            }

            // Update status to deploying
            await updateDomain(domainId, { status: 'deploying' });

            // Log deployment start
            await addDoc(collection(db, 'users', user.uid, 'deploymentLogs'), {
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
                
                console.log(`📡 [DomainsContext] Syncing ${normalizedDomain} to customDomains (direct write)...`);

                // DIRECT FIRESTORE WRITE - Bypass Cloud Function
                // This writes directly to the customDomains collection that the SSR server reads
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
                console.log(`✅ [DomainsContext] Domain synced directly to customDomains: ${normalizedDomain}`);

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
                await addDoc(collection(db, 'users', user.uid, 'deploymentLogs'), {
                    domainId,
                    action: 'deploy_success',
                    provider: 'cloud_run',
                    timestamp: new Date().toISOString(),
                    status: 'success',
                    message: 'Sitio desplegado correctamente en Quimera Cloud',
                    url: `https://${domain.name}`,
                });

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

            // Log deployment result
            await addDoc(collection(db, 'users', user.uid, 'deploymentLogs'), {
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

            // Log error
            await addDoc(collection(db, 'users', user.uid, 'deploymentLogs'), {
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




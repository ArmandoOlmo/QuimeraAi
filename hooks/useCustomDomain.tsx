/**
 * useCustomDomain Hook
 * 
 * Detects if the app is running on a custom domain and resolves
 * the associated projectId from Firestore.
 */

import { useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';

// Domains that are NOT custom domains (our own app domains)
// Custom domains like quimeraapp.com ARE treated as custom domains
// and will be resolved via Firestore customDomains collection
const KNOWN_DOMAINS = [
    'localhost',
    '127.0.0.1',
    'quimera.ai',
    'quimeraai.web.app',
    'quimera-502e2.web.app',
];

interface CustomDomainState {
    isCustomDomain: boolean;
    isLoading: boolean;
    projectId: string | null;
    userId: string | null;
    domain: string | null;
    error: string | null;
    projectData: any | null;
}

/**
 * Check if the current hostname is a custom domain
 */
function isCustomDomainHostname(hostname: string): boolean {
    const normalizedHost = hostname.toLowerCase().replace(/^www\./, '');
    
    // Check against known domains
    for (const known of KNOWN_DOMAINS) {
        if (normalizedHost === known || normalizedHost.endsWith(`.${known}`)) {
            return false;
        }
    }
    
    // Firebase preview channels
    if (normalizedHost.includes('--') && normalizedHost.includes('.web.app')) {
        return false;
    }
    
    // Local development ports
    if (normalizedHost.includes(':')) {
        return false;
    }
    
    return true;
}

/**
 * Hook to detect and resolve custom domains
 */
export function useCustomDomain(): CustomDomainState {
    const [state, setState] = useState<CustomDomainState>({
        isCustomDomain: false,
        isLoading: true,
        projectId: null,
        userId: null,
        domain: null,
        error: null,
        projectData: null,
    });

    useEffect(() => {
        const hostname = typeof window !== 'undefined' ? window.location.hostname : '';
        
        if (!hostname || !isCustomDomainHostname(hostname)) {
            setState({
                isCustomDomain: false,
                isLoading: false,
                projectId: null,
                userId: null,
                domain: null,
                error: null,
                projectData: null,
            });
            return;
        }

        // It's a custom domain - resolve it
        const normalizedDomain = hostname.toLowerCase().replace(/^www\./, '');
        console.log(`[CustomDomain] Detected custom domain: ${normalizedDomain}`);

        const resolveDomain = async () => {
            try {
                const domainDoc = await getDoc(doc(db, 'customDomains', normalizedDomain));
                
                if (!domainDoc.exists()) {
                    console.warn(`[CustomDomain] Domain ${normalizedDomain} not found in Firestore`);
                    setState({
                        isCustomDomain: true,
                        isLoading: false,
                        projectId: null,
                        userId: null,
                        domain: normalizedDomain,
                        error: 'Domain not configured',
                        projectData: null,
                    });
                    return;
                }

                const domainData = domainDoc.data();
                
                if (domainData.status !== 'active') {
                    console.warn(`[CustomDomain] Domain ${normalizedDomain} is not active (status: ${domainData.status})`);
                    setState({
                        isCustomDomain: true,
                        isLoading: false,
                        projectId: null,
                        userId: null,
                        domain: normalizedDomain,
                        error: `Domain is ${domainData.status}`,
                        projectData: null,
                    });
                    return;
                }

                console.log(`[CustomDomain] Resolved ${normalizedDomain} -> Project ${domainData.projectId}, User ${domainData.userId}`);

                // Fetch the full project data from user's collection
                let projectData = null;
                if (domainData.userId && domainData.projectId) {
                    try {
                        const projectDoc = await getDoc(doc(db, 'users', domainData.userId, 'projects', domainData.projectId));
                        if (projectDoc.exists()) {
                            projectData = { id: projectDoc.id, ...projectDoc.data() };
                            console.log(`[CustomDomain] Loaded project data: ${projectData.name}`);
                        }
                    } catch (e) {
                        console.warn(`[CustomDomain] Could not load project data:`, e);
                    }
                }

                setState({
                    isCustomDomain: true,
                    isLoading: false,
                    projectId: domainData.projectId,
                    userId: domainData.userId,
                    domain: normalizedDomain,
                    error: null,
                    projectData,
                });

            } catch (error) {
                console.error(`[CustomDomain] Error resolving ${normalizedDomain}:`, error);
                setState({
                    isCustomDomain: true,
                    isLoading: false,
                    projectId: null,
                    userId: null,
                    domain: normalizedDomain,
                    error: 'Failed to resolve domain',
                    projectData: null,
                });
            }
        };

        resolveDomain();
    }, []);

    return state;
}

/**
 * Component to display when domain is not configured
 */
export function DomainNotConfiguredPage({ domain }: { domain: string }) {
    return (
        <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-indigo-500 to-purple-600">
            <div className="text-center p-8 bg-white rounded-2xl shadow-2xl max-w-md mx-4">
                <div className="text-5xl mb-4">🌐</div>
                <h1 className="text-xl font-bold text-gray-900 mb-2">
                    Dominio no configurado
                </h1>
                <p className="text-gray-600 mb-4">
                    El dominio <code className="bg-gray-100 px-2 py-1 rounded text-indigo-600">{domain}</code> no está asociado a ningún proyecto activo.
                </p>
                <p className="text-sm text-gray-500">
                    Si eres el propietario, configura este dominio en tu{' '}
                    <a href="https://quimera.ai/dashboard" className="text-indigo-600 hover:underline font-medium">
                        panel de control
                    </a>.
                </p>
            </div>
        </div>
    );
}

/**
 * Component to display while loading domain info
 */
export function DomainLoadingPage() {
    return (
        <div className="flex items-center justify-center min-h-screen bg-background">
            <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
                <p className="text-muted-foreground">Cargando...</p>
            </div>
        </div>
    );
}

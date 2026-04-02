/**
 * useCustomDomain Hook
 * 
 * Detects if the app is running on a custom domain and resolves
 * the associated projectId from Firestore.
 */

import { useState, useEffect } from 'react';
import { doc, getDoc, collection, query, where, limit, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { detectSubdomain } from '../utils/subdomainUtils';

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

// Global domain config injected by SSR server
declare global {
    interface Window {
        __DOMAIN_CONFIG__?: {
            domain: string;
            projectId: string;
            userId: string;
            isCustomDomain: boolean;
            // Project styling for loader
            primaryColor?: string;
            backgroundColor?: string;
            projectName?: string;
        };
    }
}

/**
 * Hook to detect and resolve custom domains
 */
export function useCustomDomain(): CustomDomainState {
    // Check for SSR-injected config SYNCHRONOUSLY to avoid any loading flash
    const serverConfig = typeof window !== 'undefined' ? window.__DOMAIN_CONFIG__ : null;

    const [state, setState] = useState<CustomDomainState>(() => {
        // If SSR server injected domain config, use it immediately — no loading state
        if (serverConfig?.isCustomDomain && serverConfig.projectId) {
            console.log(`[CustomDomain] Instant resolution from SSR config: ${serverConfig.domain}`);
            return {
                isCustomDomain: true,
                isLoading: false,
                projectId: serverConfig.projectId,
                userId: serverConfig.userId || null,
                domain: serverConfig.domain,
                error: null,
                projectData: null,
            };
        }
        // No SSR config — start in loading state for client-side resolution
        return {
            isCustomDomain: false,
            isLoading: true,
            projectId: null,
            userId: null,
            domain: null,
            error: null,
            projectData: null,
        };
    });

    useEffect(() => {
        // If already resolved from SSR config, skip all resolution
        if (serverConfig?.isCustomDomain && serverConfig.projectId) {
            return;
        }

        // PRIORITY 2: Check for user subdomain (username.quimera.ai)
        const hostname = typeof window !== 'undefined' ? window.location.hostname : '';
        const subInfo = detectSubdomain(hostname);
        
        if (subInfo.type === 'user' && subInfo.subdomain) {
            console.log(`[CustomDomain] User subdomain detected: ${subInfo.subdomain}`);
            
            const resolveSubdomain = async () => {
                try {
                    // Resolve username to user + project
                    const usersCol = collection(db, 'users');
                    const usernameQuery = query(usersCol, where('username', '==', subInfo.subdomain), limit(1));
                    const usernameSnap = await getDocs(usernameQuery);
                    
                    if (!usernameSnap.empty) {
                        const userDoc = usernameSnap.docs[0];
                        const userData = userDoc.data();
                        const userId = userDoc.id;
                        let projectId = userData.defaultProjectId || userData.primaryProjectId;
                        
                        if (!projectId) {
                            // Fallback: first project
                            const projectsCol = collection(db, 'users', userId, 'projects');
                            const projectsQuery = query(projectsCol, limit(1));
                            const projectsSnap = await getDocs(projectsQuery);
                            if (!projectsSnap.empty) {
                                projectId = projectsSnap.docs[0].id;
                            }
                        }
                        
                        if (projectId) {
                            setState({
                                isCustomDomain: true,
                                isLoading: false,
                                projectId,
                                userId,
                                domain: `${subInfo.subdomain}.quimera.ai`,
                                error: null,
                                projectData: null,
                            });
                            return;
                        }
                    }
                    
                    // Username not found or no projects
                    setState({
                        isCustomDomain: true,
                        isLoading: false,
                        projectId: null,
                        userId: null,
                        domain: `${subInfo.subdomain}.quimera.ai`,
                        error: 'User not found',
                        projectData: null,
                    });
                } catch (error) {
                    console.error(`[CustomDomain] Error resolving subdomain ${subInfo.subdomain}:`, error);
                    setState({
                        isCustomDomain: true,
                        isLoading: false,
                        projectId: null,
                        userId: null,
                        domain: `${subInfo.subdomain}.quimera.ai`,
                        error: 'Failed to resolve subdomain',
                        projectData: null,
                    });
                }
            };
            
            resolveSubdomain();
            return;
        }
        
        // PRIORITY 3: App subdomain (app.quimera.ai) — treat as root (not custom domain)
        if (subInfo.type === 'app' || subInfo.type === 'root') {
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

        // It's a custom domain - resolve it via Firestore
        const normalizedDomain = hostname.toLowerCase().replace(/^www\./, '');
        console.log(`[CustomDomain] Detected custom domain: ${normalizedDomain}, resolving via Firestore...`);

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
 * Shows nothing visible — just a dark background matching the project theme.
 * React will immediately replace this when it mounts.
 * NO Quimera branding, NO blue backgrounds, NO logos.
 */
export function DomainLoadingPage() {
    const serverConfig = typeof window !== 'undefined' ? window.__DOMAIN_CONFIG__ : null;
    const backgroundColor = serverConfig?.backgroundColor || '#0f172a';

    return (
        <div
            style={{
                minHeight: '100vh',
                background: backgroundColor,
            }}
        />
    );
}

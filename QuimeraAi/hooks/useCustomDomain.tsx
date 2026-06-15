/**
 * useCustomDomain Hook
 * 
 * Detects if the app is running on a custom domain and resolves
 * the associated projectId from Supabase.
 */

import { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { detectSubdomain, isDevelopmentHostname } from '../utils/subdomainUtils';
import { getBootBackgroundColor } from '../utils/bootBackground';

// Domains that are NOT custom domains (our own app domains)
// Custom domains like quimeraapp.com ARE treated as custom domains
// and will be resolved via Supabase custom_domains collection
const KNOWN_DOMAINS = [
    'localhost',
    '127.0.0.1',
    'quimera.ai',
    'www.quimera.ai',
    'vercel.app',
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

    if (isDevelopmentHostname(normalizedHost)) {
        return false;
    }

    // Check against known domains
    for (const known of KNOWN_DOMAINS) {
        if (normalizedHost === known || normalizedHost.endsWith(`.${known}`)) {
            return false;
        }
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

        const hostname = typeof window !== 'undefined' ? window.location.hostname : '';
        const subInfo = detectSubdomain(hostname);
        const needsDomainResolution =
            subInfo.type === 'user' ||
            Boolean(hostname && isCustomDomainHostname(hostname));

        return {
            isCustomDomain: false,
            isLoading: needsDomainResolution,
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

        let isMounted = true;

        // PRIORITY 2: Check for user subdomain (username.quimera.ai)
        const hostname = typeof window !== 'undefined' ? window.location.hostname : '';
        const subInfo = detectSubdomain(hostname);
        
        if (subInfo.type === 'user' && subInfo.subdomain) {
            console.log(`[CustomDomain] User subdomain detected: ${subInfo.subdomain}`);
            
            const resolveSubdomain = async () => {
                try {
                    // Resolve username to user + project
                    const { data: userDoc, error: userError } = await supabase
                        .from('users')
                        .select('*')
                        .eq('username', subInfo.subdomain)
                        .limit(1)
                        .single();
                    
                    if (!isMounted) return;
                    
                    if (!userError && userDoc) {
                        const userId = userDoc.id;
                        let projectId = userDoc.default_project_id || userDoc.defaultProjectId || userDoc.primary_project_id || userDoc.primaryProjectId;
                        
                        if (!projectId) {
                            // Fallback: first project
                            const { data: projectDoc, error: projectError } = await supabase
                                .from('projects')
                                .select('id')
                                .eq('user_id', userId)
                                .limit(1)
                                .single();

                            if (!projectError && projectDoc) {
                                projectId = projectDoc.id;
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
                    
                    if (!isMounted) return;
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
                    if (!isMounted) return;
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
            return () => { isMounted = false; };
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

        // It's a custom domain - resolve it via Supabase
        const normalizedDomain = hostname.toLowerCase().replace(/^www\./, '');
        console.log(`[CustomDomain] Detected custom domain: ${normalizedDomain}, resolving via Supabase...`);

        const resolveDomain = async () => {
            try {
                const { data: domainDoc, error: domainError } = await supabase
                    .from('custom_domains')
                    .select('*')
                    .eq('domain_name', normalizedDomain)
                    .maybeSingle();

                if (!isMounted) return;

                if (domainError || !domainDoc) {
                    console.warn(`[CustomDomain] Domain ${normalizedDomain} not found in Supabase`);
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

                const domainData = domainDoc.data || {};
                const domainStatus = domainData.status || domainDoc.status || 'pending';

                if (domainStatus === 'error') {
                    console.warn(`[CustomDomain] Domain ${normalizedDomain} has an error status`);
                    setState({
                        isCustomDomain: true,
                        isLoading: false,
                        projectId: null,
                        userId: null,
                        domain: normalizedDomain,
                        error: `Domain is ${domainStatus}`,
                        projectData: null,
                    });
                    return;
                }

                if (domainStatus !== 'active') {
                    console.warn(`[CustomDomain] Domain ${normalizedDomain} is ${domainStatus}; rendering because the request reached this Vercel domain.`);
                }

                const projectId = domainData.projectId || domainData.project_id || domainDoc.project_id || domainDoc.projectId;
                const userId = domainDoc.user_id || domainData.userId || domainData.user_id;

                console.log(`[CustomDomain] Resolved ${normalizedDomain} -> Project ${projectId}, User ${userId}`);

                // Fetch the full project data
                let projectData = null;
                if (userId && projectId) {
                    try {
                        const { data: projectDoc, error: projectError } = await supabase
                            .from('projects')
                            .select('id, name, published_data, tenant_id, user_id')
                            .eq('id', projectId)
                            .maybeSingle();

                        if (!projectError && projectDoc) {
                            projectData = projectDoc;
                            console.log(`[CustomDomain] Loaded project data: ${projectData.name}`);
                        }
                    } catch (e) {
                        console.warn(`[CustomDomain] Could not load project data:`, e);
                    }
                }

                if (isMounted) {
                    setState({
                        isCustomDomain: true,
                        isLoading: false,
                        projectId,
                        userId,
                        domain: normalizedDomain,
                        error: null,
                        projectData,
                    });
                }

            } catch (error) {
                if (!isMounted) return;
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
        
        return () => { isMounted = false; };
    }, [serverConfig]);

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
    const backgroundColor = getBootBackgroundColor();

    return (
        <div
            aria-hidden="true"
            style={{
                minHeight: '100vh',
                background: backgroundColor,
            }}
        />
    );
}

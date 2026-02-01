/**
 * PortalContext
 * Context for managing portal state in white-label client portals
 */

import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { useAuth } from '../../contexts/core/AuthContext';
import {
    Tenant,
    TenantBranding,
    TenantFeature,
    TenantMembership,
    TenantPermissions,
    AgencyRole,
    getMembershipId,
} from '../../types/multiTenant';
import {
    db,
    doc,
    getDoc,
    collection,
    getDocs,
    query,
    where,
    onSnapshot,
} from '../../firebase';

// =============================================================================
// TYPES
// =============================================================================

export interface PortalConfig {
    tenant: Tenant;
    branding: TenantBranding;
    features: TenantFeature[];
    userRole: AgencyRole | null;
    permissions: TenantPermissions | null;
    isOwner: boolean;
}

export interface PortalTheme {
    primaryColor: string;
    secondaryColor: string;
    logoUrl: string;
    faviconUrl: string;
    companyName: string;
    footerText: string;
}

interface PortalContextType {
    // Portal state
    portalConfig: PortalConfig | null;
    isLoadingPortal: boolean;
    error: string | null;
    
    // Theme
    theme: PortalTheme;
    
    // Permissions
    hasFeature: (feature: TenantFeature) => boolean;
    hasPermission: (permission: keyof TenantPermissions) => boolean;
    
    // User info
    userRole: AgencyRole | null;
    isOwner: boolean;
}

const PortalContext = createContext<PortalContextType | undefined>(undefined);

// =============================================================================
// DEFAULT THEME
// =============================================================================

const DEFAULT_THEME: PortalTheme = {
    primaryColor: '#4f46e5',
    secondaryColor: '#10b981',
    logoUrl: '',
    faviconUrl: '/favicon.ico',
    companyName: 'Portal',
    footerText: '',
};

// =============================================================================
// PROVIDER
// =============================================================================

interface PortalProviderProps {
    tenantId: string;
    children: ReactNode;
}

export const PortalProvider: React.FC<PortalProviderProps> = ({ tenantId, children }) => {
    const { user } = useAuth();
    
    const [portalConfig, setPortalConfig] = useState<PortalConfig | null>(null);
    const [isLoadingPortal, setIsLoadingPortal] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [membership, setMembership] = useState<TenantMembership | null>(null);

    // ==========================================================================
    // LOAD PORTAL CONFIG
    // ==========================================================================
    
    useEffect(() => {
        if (!tenantId) {
            setError('No tenant ID provided');
            setIsLoadingPortal(false);
            return;
        }

        const loadPortal = async () => {
            setIsLoadingPortal(true);
            setError(null);

            try {
                // Load tenant data
                const tenantDoc = await getDoc(doc(db, 'tenants', tenantId));
                
                if (!tenantDoc.exists()) {
                    setError('Portal not found');
                    setIsLoadingPortal(false);
                    return;
                }

                const tenant = { id: tenantDoc.id, ...tenantDoc.data() } as Tenant;

                // Check tenant status
                if (tenant.status !== 'active' && tenant.status !== 'trial') {
                    setError('Portal is not active');
                    setIsLoadingPortal(false);
                    return;
                }

                // Load membership if user is logged in
                let userMembership: TenantMembership | null = null;
                let userPermissions: TenantPermissions | null = null;
                let userRole: AgencyRole | null = null;
                let isOwner = false;

                if (user) {
                    const membershipId = getMembershipId(tenantId, user.uid);
                    const membershipDoc = await getDoc(doc(db, 'tenantMembers', membershipId));
                    
                    if (membershipDoc.exists()) {
                        userMembership = {
                            id: membershipDoc.id,
                            ...membershipDoc.data(),
                        } as TenantMembership;
                        userRole = userMembership.role;
                        userPermissions = userMembership.permissions;
                        isOwner = tenant.ownerUserId === user.uid;
                        setMembership(userMembership);
                    }
                }

                // Build portal config
                const config: PortalConfig = {
                    tenant,
                    branding: tenant.branding || {},
                    features: tenant.settings?.enabledFeatures || [],
                    userRole,
                    permissions: userPermissions,
                    isOwner,
                };

                setPortalConfig(config);
            } catch (err: any) {
                console.error('Error loading portal:', err);
                setError(err.message || 'Error loading portal');
            } finally {
                setIsLoadingPortal(false);
            }
        };

        loadPortal();
    }, [tenantId, user]);

    // ==========================================================================
    // THEME
    // ==========================================================================
    
    const theme: PortalTheme = {
        primaryColor: portalConfig?.branding.primaryColor || DEFAULT_THEME.primaryColor,
        secondaryColor: portalConfig?.branding.secondaryColor || DEFAULT_THEME.secondaryColor,
        logoUrl: portalConfig?.branding.logoUrl || DEFAULT_THEME.logoUrl,
        faviconUrl: portalConfig?.branding.faviconUrl || DEFAULT_THEME.faviconUrl,
        companyName: portalConfig?.branding.companyName || portalConfig?.tenant.name || DEFAULT_THEME.companyName,
        footerText: portalConfig?.branding.footerText || DEFAULT_THEME.footerText,
    };

    // Apply theme CSS variables
    useEffect(() => {
        if (theme) {
            document.documentElement.style.setProperty('--portal-primary', theme.primaryColor);
            document.documentElement.style.setProperty('--portal-secondary', theme.secondaryColor);
            
            // Update favicon if custom
            if (theme.faviconUrl && theme.faviconUrl !== '/favicon.ico') {
                const link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
                if (link) {
                    link.href = theme.faviconUrl;
                }
            }
            
            // Update page title
            if (theme.companyName) {
                document.title = theme.companyName;
            }
        }
    }, [theme]);

    // ==========================================================================
    // PERMISSION HELPERS
    // ==========================================================================
    
    const hasFeature = (feature: TenantFeature): boolean => {
        if (!portalConfig) return false;
        return portalConfig.features.includes(feature);
    };

    const hasPermission = (permission: keyof TenantPermissions): boolean => {
        if (!portalConfig?.permissions) return false;
        return portalConfig.permissions[permission] === true;
    };

    // ==========================================================================
    // CONTEXT VALUE
    // ==========================================================================
    
    const value: PortalContextType = {
        portalConfig,
        isLoadingPortal,
        error,
        theme,
        hasFeature,
        hasPermission,
        userRole: membership?.role || null,
        isOwner: portalConfig?.isOwner || false,
    };

    return <PortalContext.Provider value={value}>{children}</PortalContext.Provider>;
};

// =============================================================================
// HOOKS
// =============================================================================

export const usePortal = (): PortalContextType => {
    const context = useContext(PortalContext);
    if (!context) {
        throw new Error('usePortal must be used within a PortalProvider');
    }
    return context;
};

export const useSafePortal = (): PortalContextType | null => {
    return useContext(PortalContext) || null;
};







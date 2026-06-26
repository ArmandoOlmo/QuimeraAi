/**
 * AppProviders
 * Composición de todos los contextos modulares de la aplicación
 * 
 * Architecture:
 * - CoreProviders: Always initialized (Auth, Toast, Language, UI, AppContent, Tenant, Plans)
 * - FeatureProviders: Deferred until user is authenticated (Editor, Project, Files, CRM, etc.)
 * 
 * This two-tier approach prevents ~12 unnecessary Supabase queries and 
 * heavy module loads (EditorContext = 212KB) when the user hasn't logged in yet.
 */

import React, { ReactNode, Suspense, lazy } from 'react';

// Core Contexts — always needed, lightweight
import { AuthProvider, useAuth } from './core/AuthContext';
import { UIProvider } from './core/UIContext';
import { ToastProvider } from './ToastContext';
import { LanguageProvider } from './LanguageContext';
import { TenantProvider } from './tenant';
import { AppContentProvider } from './appContent';
import { PlansProvider } from './PlansContext';

interface AppProvidersProps {
    children: ReactNode;
}

const FeatureProviders = lazy(() => import('./AppFeatureProviders'));

/**
 * AuthGatedProviders — Gates feature providers behind authentication.
 * Before auth resolves, children render without feature contexts (login screen etc.)
 * After auth resolves with a user, all feature providers mount.
 */
const AuthGatedProviders: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { user, loadingAuth } = useAuth();

    // If Supabase already has a user while auth is still settling, keep authenticated
    // children inside the feature tree so route-level hooks never mount without providers.
    if (!user) {
        return <>{children}</>;
    }

    // User is authenticated — mount all feature providers.
    // Keep these imports out of public landing boot; they pull editor/export/domain code.
    return (
        <Suspense fallback={null}>
            <FeatureProviders>{children}</FeatureProviders>
        </Suspense>
    );
};

/**
 * AppProviders - Wrapper con todos los contextos modulares
 */
export const AppProviders: React.FC<AppProvidersProps> = ({ children }) => {
    return (
        <AuthProvider>
            <ToastProvider>
                <LanguageProvider>
                    <UIProvider>
                        <AppContentProvider>
                            <TenantProvider>
                                <PlansProvider>
                                    <AuthGatedProviders>
                                        {children}
                                    </AuthGatedProviders>
                                </PlansProvider>
                            </TenantProvider>
                        </AppContentProvider>
                    </UIProvider>
                </LanguageProvider>
            </ToastProvider>
        </AuthProvider>
    );
};

/**
 * LightProviders - Versión ligera para rutas públicas
 * Incluye AppContentProvider para mostrar artículos y navegación en el landing público
 */
export const LightProviders: React.FC<AppProvidersProps> = ({ children }) => {
    return (
        <AuthProvider>
            <ToastProvider>
                <LanguageProvider>
                    <UIProvider>
                        <AppContentProvider>
                            <PlansProvider>
                                {children}
                            </PlansProvider>
                        </AppContentProvider>
                    </UIProvider>
                </LanguageProvider>
            </ToastProvider>
        </AuthProvider>
    );
};

export default AppProviders;

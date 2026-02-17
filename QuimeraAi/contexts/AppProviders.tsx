/**
 * AppProviders
 * Composición de todos los contextos modulares de la aplicación
 * 
 * Architecture:
 * - CoreProviders: Always initialized (Auth, Toast, Language, UI, AppContent, Tenant, Plans)
 * - FeatureProviders: Deferred until user is authenticated (Editor, Project, Files, CRM, etc.)
 * 
 * This two-tier approach prevents ~12 unnecessary Firestore queries and 
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

// Feature Contexts — deferred until authenticated
import { EditorProvider } from './EditorContext';
import { ProjectProvider } from './project';
import { FilesProvider } from './files';
import { CRMProvider } from './crm';
import { CMSProvider } from './cms';
import { AdminProvider } from './admin';
import { DomainsProvider } from './domains';
import { AIProvider } from './ai';
import { UpgradeProvider } from './UpgradeContext';
import { AgencyProvider } from './agency/AgencyContext';
import { AgencyContentProvider } from './agency/AgencyContentContext';
import { NewsProvider } from './news';
import { UndoProvider } from './undo';
import { BioPageProvider } from './bioPage';

interface AppProvidersProps {
    children: ReactNode;
}

/**
 * FeatureProviders — Only mounted when user is authenticated.
 * This prevents ~12 Firestore queries and heavy module initialization
 * from running before the user even logs in.
 */
const FeatureProviders: React.FC<{ children: ReactNode }> = ({ children }) => {
    return (
        <AdminProvider>
            <ProjectProvider>
                <EditorProvider>
                    <FilesProvider>
                        <CRMProvider>
                            <CMSProvider>
                                <DomainsProvider>
                                    <AIProvider>
                                        <AgencyProvider>
                                            <AgencyContentProvider>
                                                <NewsProvider>
                                                    <UpgradeProvider>
                                                        <UndoProvider>
                                                            <BioPageProvider>
                                                                {children}
                                                            </BioPageProvider>
                                                        </UndoProvider>
                                                    </UpgradeProvider>
                                                </NewsProvider>
                                            </AgencyContentProvider>
                                        </AgencyProvider>
                                    </AIProvider>
                                </DomainsProvider>
                            </CMSProvider>
                        </CRMProvider>
                    </FilesProvider>
                </EditorProvider>
            </ProjectProvider>
        </AdminProvider>
    );
};

/**
 * AuthGatedProviders — Gates feature providers behind authentication.
 * Before auth resolves, children render without feature contexts (login screen etc.)
 * After auth resolves with a user, all feature providers mount.
 */
const AuthGatedProviders: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { user, loadingAuth } = useAuth();

    // While loading auth or if not logged in, render without feature providers
    // This makes the login screen and auth flow much faster
    if (loadingAuth || !user) {
        return <>{children}</>;
    }

    // User is authenticated — mount all feature providers
    return <FeatureProviders>{children}</FeatureProviders>;
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


/**
 * AppProviders
 * Composición de todos los contextos modulares de la aplicación
 */

import React, { ReactNode } from 'react';

// Core Contexts
import { AuthProvider } from './core/AuthContext';
import { UIProvider } from './core/UIContext';
import { ToastProvider } from './ToastContext';
import { LanguageProvider } from './LanguageContext';

import { EditorProvider } from './EditorContext';

// Feature Contexts
import { ProjectProvider } from './project';
import { FilesProvider } from './files';
import { CRMProvider } from './crm';
import { CMSProvider } from './cms';
import { AdminProvider } from './admin';
import { DomainsProvider } from './domains';
import { AIProvider } from './ai';
import { TenantProvider } from './tenant';

interface AppProvidersProps {
    children: ReactNode;
}

/**
 * AppProviders - Wrapper con todos los contextos modulares
 */
export const AppProviders: React.FC<AppProvidersProps> = ({ children }) => {
    return (
        <AuthProvider>
            <ToastProvider>
                <LanguageProvider>
                    <UIProvider>
                        <TenantProvider>
                            <EditorProvider>
                                <ProjectProvider>
                                    <FilesProvider>
                                        <CRMProvider>
                                            <CMSProvider>
                                                <AdminProvider>
                                                    <DomainsProvider>
                                                        <AIProvider>
                                                            {children}
                                                        </AIProvider>
                                                    </DomainsProvider>
                                                </AdminProvider>
                                            </CMSProvider>
                                        </CRMProvider>
                                    </FilesProvider>
                                </ProjectProvider>
                            </EditorProvider>
                        </TenantProvider>
                    </UIProvider>
                </LanguageProvider>
            </ToastProvider>
        </AuthProvider>
    );
};

/**
 * LightProviders - Versión ligera para rutas públicas
 */
export const LightProviders: React.FC<AppProvidersProps> = ({ children }) => {
    return (
        <AuthProvider>
            <ToastProvider>
                <LanguageProvider>
                    <UIProvider>
                        {children}
                    </UIProvider>
                </LanguageProvider>
            </ToastProvider>
        </AuthProvider>
    );
};

export default AppProviders;

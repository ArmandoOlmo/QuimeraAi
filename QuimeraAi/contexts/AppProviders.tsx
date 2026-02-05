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
import { AppContentProvider } from './appContent';
import { UpgradeProvider } from './UpgradeContext';
import { PlansProvider } from './PlansContext';
import { AgencyProvider } from './agency/AgencyContext';
import { AgencyContentProvider } from './agency/AgencyContentContext';
import { NewsProvider } from './news';
import { UndoProvider } from './undo';
import { BioPageProvider } from './bioPage';

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
                        <AppContentProvider>
                            <TenantProvider>
                                <PlansProvider>
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

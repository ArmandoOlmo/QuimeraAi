/**
 * AppProviders
 * Composición de todos los contextos modulares de la aplicación
 */

import React, { ReactNode, useEffect } from 'react';

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

interface AppProvidersProps {
    children: ReactNode;
}

/**
 * AppProviders - Wrapper con todos los contextos modulares
 */
export const AppProviders: React.FC<AppProvidersProps> = ({ children }) => {
    // #region agent log
    useEffect(() => {
        const mountId = `appProviders-${Date.now()}`;
        fetch('http://127.0.0.1:7242/ingest/3746d5d4-0d14-4e6f-a56e-45539de64e9d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AppProviders.tsx:35',message:'AppProviders mounted',data:{mountId},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H5'})}).catch(()=>{});
        return () => {
            fetch('http://127.0.0.1:7242/ingest/3746d5d4-0d14-4e6f-a56e-45539de64e9d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AppProviders.tsx:38',message:'AppProviders unmounted',data:{mountId},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H5'})}).catch(()=>{});
        };
    }, []);
    // #endregion
    return (
        <AuthProvider>
            <ToastProvider>
                <LanguageProvider>
                    <UIProvider>
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

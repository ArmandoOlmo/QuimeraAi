/**
 * AppProviders
 * Composición de todos los contextos de la aplicación
 * 
 * Este componente envuelve la aplicación con todos los providers necesarios
 * en el orden correcto de dependencias.
 * 
 * Orden de dependencias:
 * 1. AuthProvider - No depende de nada
 * 2. UIProvider - No depende de nada  
 * 3. ProjectProvider - Depende de Auth
 * 4. FilesProvider - Depende de Auth
 * 5. CRMProvider - Depende de Auth
 * 6. CMSProvider - Depende de Auth
 * 7. AdminProvider - Depende de Auth
 * 8. DomainsProvider - Depende de Auth
 * 9. AIProvider - Depende de Auth
 */

import React, { ReactNode } from 'react';

// Core Contexts
import { AuthProvider } from './core/AuthContext';
import { UIProvider } from './core/UIContext';

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
 * AppProviders - Wrapper que provee todos los contextos
 * 
 * Uso:
 * ```tsx
 * <AppProviders>
 *   <App />
 * </AppProviders>
 * ```
 */
export const AppProviders: React.FC<AppProvidersProps> = ({ children }) => {
    return (
        <AuthProvider>
            <UIProvider>
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
            </UIProvider>
        </AuthProvider>
    );
};

/**
 * LightProviders - Versión ligera solo con Auth y UI
 * Útil para rutas públicas o componentes que no necesitan todos los contextos
 */
export const LightProviders: React.FC<AppProvidersProps> = ({ children }) => {
    return (
        <AuthProvider>
            <UIProvider>
                {children}
            </UIProvider>
        </AuthProvider>
    );
};

export default AppProviders;

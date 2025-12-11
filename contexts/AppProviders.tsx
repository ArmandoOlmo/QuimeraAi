/**
 * AppProviders
 * Composición de todos los contextos de la aplicación
 * 
 * Este componente envuelve la aplicación con todos los providers necesarios.
 * 
 * IMPORTANTE: EditorProvider se mantiene para compatibilidad con componentes
 * que aún no han sido migrados a los hooks modulares (~80+ componentes).
 * 
 * Los componentes migrados pueden usar los hooks específicos (useAuth, useProject, etc.)
 * mientras que los no migrados siguen usando useEditor().
 */

import React, { ReactNode } from 'react';

// Legacy Context (para compatibilidad)
import { EditorProvider } from './EditorContext';

// Additional Contexts
import { ToastProvider } from './ToastContext';
import { LanguageProvider } from './LanguageContext';

interface AppProvidersProps {
    children: ReactNode;
}

/**
 * AppProviders - Wrapper que provee todos los contextos
 * 
 * Mantiene EditorProvider para compatibilidad con componentes no migrados.
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
        <EditorProvider>
            <ToastProvider>
                <LanguageProvider>
                    {children}
                </LanguageProvider>
            </ToastProvider>
        </EditorProvider>
    );
};

/**
 * LightProviders - Versión ligera solo para rutas públicas
 */
export const LightProviders: React.FC<AppProvidersProps> = ({ children }) => {
    return (
        <ToastProvider>
            <LanguageProvider>
                {children}
            </LanguageProvider>
        </ToastProvider>
    );
};

export default AppProviders;

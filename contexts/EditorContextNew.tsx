/**
 * EditorContext (Refactorizado)
 * 
 * Este es el nuevo EditorContext que actúa como wrapper de compatibilidad.
 * Internamente usa los contextos modulares pero expone la misma interfaz
 * que el viejo EditorContext para mantener compatibilidad.
 * 
 * MIGRACIÓN GRADUAL:
 * Los componentes pueden seguir usando useEditor() pero internamente
 * se delegará a los contextos específicos.
 * 
 * Para nuevos componentes, usar hooks específicos:
 * - useAuth() - autenticación y permisos
 * - useUI() - estado de UI (sidebars, vistas, preview)
 * - useProject() - proyectos y templates
 * - useFiles() - archivos y storage
 * - useCRM() - leads y CRM
 * - useCMS() - posts y menus
 * - useAdmin() - administración
 * - useDomains() - dominios y deployment
 * - useAI() - generación de AI
 */

import React, { createContext, useContext, ReactNode, useState } from 'react';
import { AppProviders } from './AppProviders';
import { useEditorCompat } from './compatibility/useEditorCompat';
import { SEOConfig } from '../types';

// Re-export types from the old context for compatibility
export type { 
    PageData, 
    ThemeData, 
    PageSection, 
    PreviewDevice, 
    PreviewOrientation, 
    View, 
    Project, 
    ThemeMode, 
    UserDocument, 
    FileRecord, 
    LLMPrompt, 
    ComponentStyles, 
    EditableComponentID, 
    CustomComponent, 
    BrandIdentity, 
    CMSPost, 
    Menu, 
    AdminView, 
    AiAssistantConfig, 
    GlobalAssistantConfig, 
    Lead, 
    LeadStatus, 
    LeadActivity, 
    LeadTask, 
    Domain, 
    DeploymentLog, 
    Tenant, 
    TenantStatus, 
    TenantLimits, 
    UserRole, 
    RolePermissions, 
    SEOConfig, 
    ComponentVariant, 
    ComponentVersion, 
    DesignTokens,
} from '../types';

// Tipo del contexto - inferido del hook de compatibilidad
type EditorContextType = ReturnType<typeof useEditorCompat> & {
    seoConfig: SEOConfig | null;
    setSeoConfig: React.Dispatch<React.SetStateAction<SEOConfig | null>>;
    updateSeoConfig: (updates: Partial<SEOConfig>) => Promise<void>;
    isOnboardingOpen: boolean;
    setIsOnboardingOpen: React.Dispatch<React.SetStateAction<boolean>>;
    sidebarOrder: string[];
    setSidebarOrder: React.Dispatch<React.SetStateAction<string[]>>;
};

const EditorContext = createContext<EditorContextType | undefined>(undefined);

/**
 * EditorProviderInner - Componente interno que provee el contexto
 * Debe estar envuelto en AppProviders
 */
const EditorProviderInner: React.FC<{ children: ReactNode }> = ({ children }) => {
    // Obtener valores de los contextos modulares
    const compatValues = useEditorCompat();
    
    // Estado adicional que no está en los contextos modulares aún
    const [seoConfig, setSeoConfig] = useState<SEOConfig | null>(null);
    const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);
    const [sidebarOrder, setSidebarOrder] = useState<string[]>(() => {
        const saved = localStorage.getItem('sidebar-nav-order');
        return saved ? JSON.parse(saved) : [];
    });

    // Función para actualizar SEO config
    const updateSeoConfig = async (updates: Partial<SEOConfig>) => {
        setSeoConfig(prev => prev ? { ...prev, ...updates } : null);
    };

    // Combinar todo en el valor del contexto
    const value: EditorContextType = {
        ...compatValues,
        seoConfig,
        setSeoConfig,
        updateSeoConfig,
        isOnboardingOpen,
        setIsOnboardingOpen,
        sidebarOrder,
        setSidebarOrder,
    };

    return (
        <EditorContext.Provider value={value}>
            {children}
        </EditorContext.Provider>
    );
};

/**
 * EditorProvider - Provider principal de compatibilidad
 * Envuelve la app con todos los contextos modulares + el contexto de compatibilidad
 */
export const EditorProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    return (
        <AppProviders>
            <EditorProviderInner>
                {children}
            </EditorProviderInner>
        </AppProviders>
    );
};

/**
 * useEditor - Hook principal de compatibilidad
 * @deprecated Para nuevos componentes, usar hooks específicos (useProject, useCRM, etc.)
 */
export const useEditor = (): EditorContextType => {
    const context = useContext(EditorContext);
    if (context === undefined) {
        throw new Error('useEditor must be used within an EditorProvider');
    }
    return context;
};

/**
 * useSafeEditor - Versión segura que no lanza error si no hay provider
 */
export const useSafeEditor = (): EditorContextType | null => {
    return useContext(EditorContext) || null;
};












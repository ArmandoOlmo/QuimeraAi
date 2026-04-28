import React, { createContext, useContext, ReactNode, useState } from 'react';
import { useEditorCompat } from './compatibility/useEditorCompat';
import { SEOConfig } from '../types';

// Re-export types from the old context for compatibility
export type { 
    PageData, ThemeData, PageSection, PreviewDevice, PreviewOrientation, 
    View, Project, ThemeMode, UserDocument, FileRecord, LLMPrompt, 
    ComponentStyles, EditableComponentID, CustomComponent, BrandIdentity, 
    CMSPost, Menu, AdminView, AiAssistantConfig, GlobalAssistantConfig, 
    Lead, LeadStatus, LeadActivity, LeadTask, Domain, DeploymentLog, 
    Tenant, TenantStatus, TenantLimits, UserRole, RolePermissions, 
    SEOConfig, ComponentVariant, ComponentVersion, DesignTokens, LibraryLead
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

export const EditorContext = createContext<EditorContextType | undefined>(undefined);

/**
 * EditorProvider
 * Este provider actúa como wrapper de compatibilidad para el código existente.
 * Internamente delega todo el estado a los contextos granulares (useEditorCompat)
 * y sólo maneja estado local menor.
 */
export const EditorProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
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

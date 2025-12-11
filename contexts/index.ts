/**
 * Contexts Index
 * Punto de entrada principal para todos los contextos de la aplicación
 * 
 * IMPORTANTE: La app actualmente usa EditorProvider (legacy).
 * Los nuevos hooks modulares (useAuth, useProject, etc.) solo funcionan
 * cuando la app esté envuelta en AppProviders.
 * 
 * Para migrar la app:
 * 1. Reemplazar <EditorProvider> con <AppProviders> en App.tsx
 * 2. Migrar componentes uno por uno a los nuevos hooks
 * 
 * Mientras tanto, usa useEditor() que sigue funcionando.
 */

// =============================================================================
// LEGACY EXPORTS (Usar mientras la app use EditorProvider)
// =============================================================================
export { EditorProvider, useEditor, useSafeEditor } from './EditorContext';
export { ToastProvider, useToast } from './ToastContext';
export { LanguageProvider, useLanguage } from './LanguageContext';

// =============================================================================
// NEW MODULAR CONTEXTS (Solo funcionan con AppProviders)
// =============================================================================
// NOTA: No usar estos hooks hasta migrar App.tsx a AppProviders

// App Providers (Composition) - Para futura migración
export { AppProviders, LightProviders } from './AppProviders';

// Core Contexts
export { AuthProvider, useAuth } from './core/AuthContext';
export { UIProvider, useUI } from './core/UIContext';

// Feature Contexts
export { ProjectProvider, useProject, useSafeProject } from './project';
export { FilesProvider, useFiles } from './files';
export { CRMProvider, useCRM } from './crm';
export { CMSProvider, useCMS } from './cms';
export { AdminProvider, useAdmin } from './admin';
export { DomainsProvider, useDomains } from './domains';
export { AIProvider, useAI } from './ai';

// Compatibility layer (para cuando se use AppProviders)
export { useEditorCompat } from './compatibility';

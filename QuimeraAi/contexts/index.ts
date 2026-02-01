/**
 * Contexts Index
 * Punto de entrada principal para todos los contextos de la aplicación
 * 
 * La app ahora usa AppProviders con contextos modulares.
 * Cada hook (useAuth, useProject, useCRM, etc.) maneja una responsabilidad específica.
 * 
 * Ejemplo de uso:
 * ```tsx
 * import { useAuth, useProject, useCRM } from '@/contexts';
 * 
 * const { user, userDocument } = useAuth();
 * const { projects, loadProject } = useProject();
 * const { leads, addLead } = useCRM();
 * ```
 */

// =============================================================================
// APP PROVIDERS (Main wrapper)
// =============================================================================
export { AppProviders, LightProviders } from './AppProviders';

// =============================================================================
// CORE CONTEXTS (Always available)
// =============================================================================
export { AuthProvider, useAuth, useSafeAuth } from './core/AuthContext';
export { UIProvider, useUI } from './core/UIContext';
export { ToastProvider, useToast } from './ToastContext';
export { LanguageProvider, useLanguage } from './LanguageContext';

// =============================================================================
// FEATURE CONTEXTS
// =============================================================================
export { ProjectProvider, useProject, useSafeProject } from './project';
export { FilesProvider, useFiles } from './files';
export { CRMProvider, useCRM } from './crm';
export { CMSProvider, useCMS } from './cms';
export { AdminProvider, useAdmin } from './admin';
export { DomainsProvider, useDomains } from './domains';
export { AIProvider, useAI } from './ai';
export { TenantProvider, useTenant, useSafeTenant } from './tenant';
export { AppContentProvider, useAppContent, useSafeAppContent } from './appContent';

// =============================================================================
// UPGRADE CONTEXT (For subscription upgrade flows)
// =============================================================================
export { UpgradeProvider, useUpgrade, useSafeUpgrade } from './UpgradeContext';
export type { UpgradeTrigger, UpgradeMetadata } from './UpgradeContext';

// =============================================================================
// PLANS CONTEXT (For dynamic plan features from Firestore)
// =============================================================================
export { PlansProvider, usePlans, useSafePlans } from './PlansContext';
export type { StoredPlanData, PlansContextValue } from './PlansContext';

// =============================================================================
// LEGACY EXPORTS (For backwards compatibility)
// =============================================================================
// The old EditorContext is still available for components not yet migrated
export { EditorProvider, useEditor, useSafeEditor } from './EditorContext';

// Compatibility layer that maps new contexts to old useEditor interface
export { useEditorCompat } from './compatibility';












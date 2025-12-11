/**
 * Contexts Index
 * Punto de entrada principal para todos los contextos de la aplicación
 * 
 * Importa contextos específicos:
 * import { useAuth } from '@/contexts';
 * import { useProject, useCRM } from '@/contexts';
 * 
 * O importa el wrapper completo:
 * import { AppProviders } from '@/contexts';
 */

// App Providers (Composition)
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

// Legacy exports (para compatibilidad)
// TODO: Migrar componentes a usar los nuevos hooks
export { EditorProvider, useEditor, useSafeEditor } from './EditorContext';
export { ToastProvider, useToast } from './ToastContext';
export { LanguageProvider, useLanguage } from './LanguageContext';

// Compatibility layer
export { useEditorCompat } from './compatibility';

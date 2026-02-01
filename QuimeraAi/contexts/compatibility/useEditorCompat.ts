/**
 * useEditorCompat
 * 
 * Hook de compatibilidad que proporciona la misma interfaz que el viejo useEditor()
 * pero usando los nuevos contextos modulares por debajo.
 * 
 * Esto permite una migración gradual - los componentes pueden seguir usando
 * useEditor() mientras se van migrando uno por uno a los hooks específicos.
 * 
 * USO RECOMENDADO:
 * - Para componentes nuevos: usar hooks específicos (useProject, useCRM, etc.)
 * - Para componentes existentes: pueden seguir usando useEditor() temporalmente
 * 
 * MIGRACIÓN:
 * 1. Reemplazar: const { projects, activeProjectId } = useEditor();
 *    Con: const { projects, activeProjectId } = useProject();
 * 
 * 2. Reemplazar: const { leads, addLead } = useEditor();
 *    Con: const { leads, addLead } = useCRM();
 */

import { useAuth } from '../core/AuthContext';
import { useUI } from '../core/UIContext';
import { useProject } from '../project';
import { useFiles } from '../files';
import { useCRM } from '../crm';
import { useCMS } from '../cms';
import { useAdmin } from '../admin';
import { useDomains } from '../domains';
import { useAI } from '../ai';

/**
 * Hook de compatibilidad con la interfaz del viejo EditorContext
 * 
 * @deprecated Usa los hooks específicos en su lugar:
 * - useAuth() para autenticación
 * - useUI() para estado de UI
 * - useProject() para proyectos
 * - useFiles() para archivos
 * - useCRM() para leads/CRM
 * - useCMS() para posts/menus
 * - useAdmin() para administración
 * - useDomains() para dominios
 * - useAI() para AI/generación
 */
export const useEditorCompat = () => {
    // Obtener todos los contextos
    const auth = useAuth();
    const ui = useUI();
    const project = useProject();
    const files = useFiles();
    const crm = useCRM();
    const cms = useCMS();
    const admin = useAdmin();
    const domains = useDomains();
    const ai = useAI();

    // Construir objeto compatible con la vieja interfaz
    return {
        // Auth
        user: auth.user,
        loadingAuth: auth.loadingAuth,
        userDocument: auth.userDocument,
        setUserDocument: auth.setUserDocument,
        verificationEmail: auth.verificationEmail,
        setVerificationEmail: auth.setVerificationEmail,
        userPermissions: auth.userPermissions,
        canPerform: auth.canPerform,
        isUserOwner: auth.userDocument?.role === 'owner',

        // UI
        isSidebarOpen: ui.isSidebarOpen,
        setIsSidebarOpen: ui.setIsSidebarOpen,
        isDashboardSidebarCollapsed: ui.isDashboardSidebarCollapsed,
        toggleDashboardSidebar: ui.toggleDashboardSidebar,
        view: ui.view,
        setView: ui.setView,
        adminView: ui.adminView,
        setAdminView: ui.setAdminView,
        previewRef: ui.previewRef,
        previewDevice: ui.previewDevice,
        setPreviewDevice: ui.setPreviewDevice,
        previewOrientation: ui.previewOrientation,
        setPreviewOrientation: ui.setPreviewOrientation,
        activeSection: ui.activeSection,
        onSectionSelect: ui.onSectionSelect,
        isProfileModalOpen: ui.isProfileModalOpen,
        openProfileModal: ui.openProfileModal,
        closeProfileModal: ui.closeProfileModal,
        themeMode: ui.themeMode,
        setThemeMode: ui.setThemeMode,

        // Project
        projects: project.projects,
        isLoadingProjects: project.isLoadingProjects,
        activeProjectId: project.activeProjectId,
        activeProject: project.activeProject,
        data: project.data,
        setData: project.setData,
        theme: project.theme,
        setTheme: project.setTheme,
        brandIdentity: project.brandIdentity,
        setBrandIdentity: project.setBrandIdentity,
        componentOrder: project.componentOrder,
        setComponentOrder: project.setComponentOrder,
        sectionVisibility: project.sectionVisibility,
        setSectionVisibility: project.setSectionVisibility,
        loadProject: project.loadProject,
        saveProject: project.saveProject,
        renameActiveProject: project.renameActiveProject,
        addNewProject: project.addNewProject,
        deleteProject: project.deleteProject,
        createProjectFromTemplate: project.createProjectFromTemplate,
        exportProjectAsHtml: project.exportProjectAsHtml,
        updateProjectThumbnail: project.updateProjectThumbnail,
        updateProjectFavicon: project.updateProjectFavicon,
        isEditingTemplate: project.isEditingTemplate,
        exitTemplateEditor: project.exitTemplateEditor,
        createNewTemplate: project.createNewTemplate,
        archiveTemplate: project.archiveTemplate,
        duplicateTemplate: project.duplicateTemplate,
        updateTemplateInState: project.updateTemplateInState,

        // Multi-page architecture
        pages: project.pages,
        setPages: project.setPages,
        activePage: project.activePage,
        setActivePage: project.setActivePage,
        addPage: project.addPage,
        updatePage: project.updatePage,
        deletePage: project.deletePage,
        reorderPages: project.reorderPages,
        duplicatePage: project.duplicatePage,
        getPageBySlug: project.getPageBySlug,
        isMultiPage: project.isMultiPage,
        migrateToMultiPage: project.migrateToMultiPage,

        // Files
        files: files.files,
        isFilesLoading: files.isFilesLoading,
        uploadFile: files.uploadFile,
        deleteFile: files.deleteFile,
        updateFileNotes: files.updateFileNotes,
        generateFileSummary: files.generateFileSummary,
        uploadImageAndGetURL: files.uploadImageAndGetURL,
        globalFiles: files.globalFiles,
        isGlobalFilesLoading: files.isGlobalFilesLoading,
        fetchGlobalFiles: files.fetchGlobalFiles,
        uploadGlobalFile: files.uploadGlobalFile,
        deleteGlobalFile: files.deleteGlobalFile,

        // CRM
        leads: crm.leads,
        isLoadingLeads: crm.isLoadingLeads,
        addLead: crm.addLead,
        updateLeadStatus: crm.updateLeadStatus,
        updateLead: crm.updateLead,
        deleteLead: crm.deleteLead,
        leadActivities: crm.leadActivities,
        addLeadActivity: crm.addLeadActivity,
        getLeadActivities: crm.getLeadActivities,
        leadTasks: crm.leadTasks,
        addLeadTask: crm.addLeadTask,
        updateLeadTask: crm.updateLeadTask,
        deleteLeadTask: crm.deleteLeadTask,
        getLeadTasks: crm.getLeadTasks,
        libraryLeads: crm.libraryLeads,
        isLoadingLibraryLeads: crm.isLoadingLibraryLeads,
        addLibraryLead: crm.addLibraryLead,
        deleteLibraryLead: crm.deleteLibraryLead,
        importLibraryLead: crm.importLibraryLead,

        // CMS
        cmsPosts: cms.cmsPosts,
        isLoadingCMS: cms.isLoadingCMS,
        loadCMSPosts: cms.loadCMSPosts,
        saveCMSPost: cms.saveCMSPost,
        deleteCMSPost: cms.deleteCMSPost,
        menus: cms.menus,
        saveMenu: cms.saveMenu,
        deleteMenu: cms.deleteMenu,

        // Admin
        allUsers: admin.allUsers,
        fetchAllUsers: admin.fetchAllUsers,
        updateUserRole: admin.updateUserRole,
        deleteUserRecord: admin.deleteUserRecord,
        createAdmin: admin.createAdmin,
        updateUserProfile: admin.updateUserProfile,
        updateUserDetails: admin.updateUserDetails,
        tenants: admin.tenants,
        fetchTenants: admin.fetchTenants,
        createTenant: admin.createTenant,
        updateTenant: admin.updateTenant,
        deleteTenant: admin.deleteTenant,
        updateTenantStatus: admin.updateTenantStatus,
        updateTenantLimits: admin.updateTenantLimits,
        prompts: admin.prompts,
        getPrompt: admin.getPrompt,
        fetchAllPrompts: admin.fetchAllPrompts,
        savePrompt: admin.savePrompt,
        deletePrompt: admin.deletePrompt,
        syncPrompts: admin.syncPrompts,
        globalAssistantConfig: admin.globalAssistantConfig,
        saveGlobalAssistantConfig: admin.saveGlobalAssistantConfig,
        componentStyles: admin.componentStyles,
        customComponents: admin.customComponents,
        updateComponentStyle: admin.updateComponentStyle,
        saveComponent: admin.saveComponent,
        createNewCustomComponent: admin.createNewCustomComponent,
        deleteCustomComponent: admin.deleteCustomComponent,
        duplicateComponent: admin.duplicateComponent,
        renameCustomComponent: admin.renameCustomComponent,
        updateComponentVariants: admin.updateComponentVariants,
        exportComponent: admin.exportComponent,
        importComponent: admin.importComponent,
        revertToVersion: admin.revertToVersion,
        trackComponentUsage: admin.trackComponentUsage,
        designTokens: admin.designTokens,
        updateDesignTokens: admin.updateDesignTokens,
        componentStatus: admin.componentStatus,
        updateComponentStatus: admin.updateComponentStatus,
        usage: admin.usage,
        isLoadingUsage: admin.isLoadingUsage,

        // Domains
        domains: domains.domains,
        addDomain: domains.addDomain,
        updateDomain: domains.updateDomain,
        deleteDomain: domains.deleteDomain,
        verifyDomain: domains.verifyDomain,
        deployDomain: domains.deployDomain,
        getDomainDeploymentLogs: domains.getDomainDeploymentLogs,

        // AI
        hasApiKey: ai.hasApiKey,
        promptForKeySelection: ai.promptForKeySelection,
        handleApiError: ai.handleApiError,
        aiAssistantConfig: ai.aiAssistantConfig,
        saveAiAssistantConfig: ai.saveAiAssistantConfig,
        generateImage: ai.generateImage,
        generateProjectImagesWithProgress: ai.generateProjectImagesWithProgress,
        enhancePrompt: ai.enhancePrompt,

        // Placeholder for fields that need special handling
        // These would need to be implemented based on specific requirements
        seoConfig: null,
        setSeoConfig: () => {},
        updateSeoConfig: async () => {},
        isOnboardingOpen: false,
        setIsOnboardingOpen: () => {},
        sidebarOrder: [] as string[],
        setSidebarOrder: () => {},
    };
};












# Guía de Migración de Contextos

## 📋 Resumen

Este documento explica cómo migrar componentes del viejo `useEditor()` a los nuevos hooks modulares.

## 🔄 Antes vs Después

### Ejemplo: Componente de Dashboard de Leads

**ANTES (usando useEditor masivo):**

```tsx
import { useEditor } from '../contexts/EditorContext';

function LeadsDashboard() {
    const { 
        // Auth
        user,
        canPerform,
        
        // UI
        view,
        setView,
        
        // Leads (solo usamos esto realmente)
        leads,
        isLoadingLeads,
        addLead,
        updateLead,
        deleteLead,
        leadActivities,
        leadTasks,
        
        // Todo el resto se carga aunque no lo usemos...
        // projects, files, cmsPosts, domains, tenants, etc.
    } = useEditor();
    
    // ...
}
```

**DESPUÉS (usando hooks específicos):**

```tsx
import { useAuth, useCRM } from '../contexts';

function LeadsDashboard() {
    // Solo cargamos lo que necesitamos
    const { user, canPerform } = useAuth();
    const { 
        leads, 
        isLoadingLeads, 
        addLead, 
        updateLead, 
        deleteLead,
        leadActivities,
        leadTasks,
    } = useCRM();
    
    // ...
}
```

## 📊 Mapeo de Campos

### useAuth()
```tsx
const {
    user,                // Usuario de Firebase
    loadingAuth,         // Estado de carga
    userDocument,        // Documento de usuario
    setUserDocument,
    verificationEmail,
    setVerificationEmail,
    userPermissions,     // Permisos del rol
    canPerform,          // Función para verificar permisos
    currentTenant,       // ID del tenant actual
    canAccessSuperAdmin, // Puede acceder a admin
} = useAuth();
```

### useUI()
```tsx
const {
    isSidebarOpen, setIsSidebarOpen,
    isDashboardSidebarCollapsed, toggleDashboardSidebar,
    view, setView,
    adminView, setAdminView,
    previewRef,
    previewDevice, setPreviewDevice,
    previewOrientation, setPreviewOrientation,
    activeSection, onSectionSelect,
    isProfileModalOpen, openProfileModal, closeProfileModal,
    themeMode, setThemeMode,
} = useUI();
```

### useProject()
```tsx
const {
    projects,
    isLoadingProjects,
    activeProjectId,
    activeProject,
    data, setData,
    theme, setTheme,
    brandIdentity, setBrandIdentity,
    componentOrder, setComponentOrder,
    sectionVisibility, setSectionVisibility,
    loadProject,
    saveProject,
    renameActiveProject,
    addNewProject,
    deleteProject,
    createProjectFromTemplate,
    exportProjectAsHtml,
    updateProjectThumbnail,
    updateProjectFavicon,
    isEditingTemplate,
    exitTemplateEditor,
    createNewTemplate,
    archiveTemplate,
    duplicateTemplate,
    updateTemplateInState,
    refreshProjects,
} = useProject();
```

### useFiles()
```tsx
const {
    files,
    isFilesLoading,
    uploadFile,
    deleteFile,
    updateFileNotes,
    generateFileSummary,
    uploadImageAndGetURL,
    globalFiles,
    isGlobalFilesLoading,
    fetchGlobalFiles,
    uploadGlobalFile,
    deleteGlobalFile,
} = useFiles();
```

### useCRM()
```tsx
const {
    leads,
    isLoadingLeads,
    addLead,
    updateLeadStatus,
    updateLead,
    deleteLead,
    leadActivities,
    addLeadActivity,
    getLeadActivities,
    leadTasks,
    addLeadTask,
    updateLeadTask,
    deleteLeadTask,
    getLeadTasks,
    libraryLeads,
    isLoadingLibraryLeads,
    addLibraryLead,
    deleteLibraryLead,
    importLibraryLead,
} = useCRM();
```

### useCMS()
```tsx
const {
    cmsPosts,
    isLoadingCMS,
    loadCMSPosts,
    saveCMSPost,
    deleteCMSPost,
    menus,
    saveMenu,
    deleteMenu,
} = useCMS();
```

### useAdmin()
```tsx
const {
    // User Management
    allUsers,
    fetchAllUsers,
    updateUserRole,
    deleteUserRecord,
    createAdmin,
    updateUserProfile,
    updateUserDetails,
    
    // Tenants
    tenants,
    fetchTenants,
    createTenant,
    updateTenant,
    deleteTenant,
    updateTenantStatus,
    updateTenantLimits,
    
    // Prompts
    prompts,
    getPrompt,
    fetchAllPrompts,
    savePrompt,
    deletePrompt,
    syncPrompts,
    
    // Global Assistant
    globalAssistantConfig,
    saveGlobalAssistantConfig,
    
    // Component Studio
    componentStyles,
    customComponents,
    updateComponentStyle,
    saveComponent,
    createNewCustomComponent,
    deleteCustomComponent,
    duplicateComponent,
    renameCustomComponent,
    updateComponentVariants,
    exportComponent,
    importComponent,
    revertToVersion,
    trackComponentUsage,
    
    // Design Tokens
    designTokens,
    updateDesignTokens,
    
    // Component Status
    componentStatus,
    updateComponentStatus,
    
    // Usage
    usage,
    isLoadingUsage,
} = useAdmin();
```

### useDomains()
```tsx
const {
    domains,
    addDomain,
    updateDomain,
    deleteDomain,
    verifyDomain,
    deployDomain,
    getDomainDeploymentLogs,
} = useDomains();
```

### useAI()
```tsx
const {
    hasApiKey,
    promptForKeySelection,
    handleApiError,
    aiAssistantConfig,
    setAiAssistantConfig,
    saveAiAssistantConfig,
    generateImage,
    generateProjectImagesWithProgress,
    enhancePrompt,
} = useAI();
```

## ✅ Checklist de Migración

Para cada componente:

- [ ] Identificar qué campos del `useEditor()` se usan realmente
- [ ] Agrupar campos por contexto (Auth, Project, CRM, etc.)
- [ ] Importar solo los hooks necesarios
- [ ] Desestructurar solo los campos que se usan
- [ ] Verificar que el componente funciona correctamente
- [ ] Actualizar tests si existen

## 🚨 Notas Importantes

1. **No es urgente migrar todo** - El viejo `useEditor()` sigue funcionando
2. **Priorizar componentes de alto impacto** - Empezar por los más usados
3. **Beneficio inmediato** - Menos re-renders, mejor performance
4. **Tests** - Asegúrate de que los tests pasen después de migrar

## 📈 Beneficios de Rendimiento

| Métrica | Antes | Después |
|---------|-------|---------|
| Re-renders por cambio de lead | Todos los componentes | Solo componentes con useCRM |
| Bundle size por componente | Todo el contexto | Solo lo necesario |
| Tiempo de carga inicial | Alto | Reducido |
| Facilidad de testing | Difícil | Fácil (mocks específicos) |












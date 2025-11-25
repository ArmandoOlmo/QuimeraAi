# Plan de Refactorización: EditorContext

## 📊 Análisis Actual

**Archivo:** `contexts/EditorContext.tsx`
- **Líneas totales:** 3,289
- **Propiedades/Métodos:** 146
- **Problema:** Archivo monolítico difícil de mantener y entender

## 🎯 Objetivo

Dividir EditorContext en contextos más pequeños y especializados, manteniendo compatibilidad con el código existente.

## 📋 División Propuesta

### 1. **UIContext** (~300 líneas)
**Responsabilidad:** Estado de la interfaz de usuario

**Propiedades:**
```typescript
- isSidebarOpen
- setIsSidebarOpen
- isDashboardSidebarCollapsed
- toggleDashboardSidebar
- view
- setView
- previewRef
- previewDevice
- setPreviewDevice
- activeSection
- onSectionSelect
- isProfileModalOpen
- openProfileModal
- closeProfileModal
- themeMode
- setThemeMode
- isOnboardingOpen
- setIsOnboardingOpen
```

**Beneficio:** Separar estado de UI del estado de negocio

---

### 2. **AuthContext** (~400 líneas)
**Responsabilidad:** Autenticación y permisos

**Propiedades:**
```typescript
- user
- loadingAuth
- userDocument
- setUserDocument
- verificationEmail
- setVerificationEmail
- userPermissions
- canPerform(permission)
- currentTenant
- currentTenantRole
- canAccessSuperAdmin
```

**Beneficio:** Centralizar lógica de autenticación y permisos

---

### 3. **ProjectContext** (~800 líneas)
**Responsabilidad:** Gestión de proyectos

**Propiedades:**
```typescript
- activeProjectId
- activeProject
- projects
- isLoadingProjects
- data
- setData
- theme
- setTheme
- brandIdentity
- setBrandIdentity
- componentOrder
- setComponentOrder
- sectionVisibility
- setSectionVisibility
- imagePrompts
- setImagePrompts

// Métodos
- loadProject(projectId)
- saveProject()
- renameActiveProject(newName)
- exportProjectAsHtml()
- createProjectFromTemplate(templateId, newName)
- deleteProject(projectId)
- addNewProject(project)
- archiveProject(projectId)
- updateSEOConfig(config)
```

**Beneficio:** Aislar toda la lógica de gestión de proyectos

---

### 4. **AdminContext** (~900 líneas)
**Responsabilidad:** Funciones de administración

**Propiedades:**
```typescript
- adminView
- setAdminView
- allUsers
- tenants
- prompts
- customComponents
- globalAssistantConfig
- designTokens

// User Management
- fetchAllUsers()
- updateUserRole(userId, role)
- deleteUserRecord(userId)
- createAdminUser(email, name, role)

// Tenant Management
- fetchTenants()
- createTenant(tenant)
- updateTenant(tenantId, updates)
- deleteTenant(tenantId)
- updateTenantStatus(tenantId, status)
- updateTenantLimits(tenantId, limits)

// Prompt Management
- fetchPrompts()
- savePrompt(prompt)
- deletePrompt(promptId)

// Component Management
- saveComponentStyles(componentId, styles)
- createCustomComponent(component)
- deleteCustomComponent(componentId)
- duplicateComponent(componentId)
- updateComponentVariants(componentId, variants)
- importComponents(components)
- revertComponentToVersion(componentId, version)

// Design Tokens
- saveDesignTokens(tokens)
- updateComponentStatus(componentId, isPublic)

// Global Assistant
- saveGlobalAssistantConfig(config)
```

**Beneficio:** Separar funciones administrativas del resto de la app

---

### 5. **LeadsContext** (~400 líneas)
**Responsabilidad:** Gestión de leads y CRM

**Propiedades:**
```typescript
- leads
- isLoadingLeads
- leadActivities
- leadTasks

// Lead Management
- fetchLeads()
- createLead(lead)
- updateLead(leadId, updates)
- deleteLead(leadId)
- scoreLeadWithAI(leadId)

// Activities
- fetchLeadActivities(leadId)
- addLeadActivity(leadId, activity)

// Tasks
- fetchLeadTasks(leadId)
- addLeadTask(leadId, task)
- updateLeadTask(taskId, updates)
- completeLeadTask(taskId)
```

**Beneficio:** Aislar lógica de CRM

---

### 6. **FileContext** (~300 líneas)
**Responsabilidad:** Gestión de archivos

**Propiedades:**
```typescript
- files
- isFilesLoading
- globalFiles
- isGlobalFilesLoading

// User Files
- uploadFile(file)
- deleteFile(fileId, storagePath)
- updateFileNotes(fileId, notes)
- generateFileSummary(fileId, downloadURL)

// Global Files (Admin)
- fetchGlobalFiles()
- uploadGlobalFile(file)
- deleteGlobalFile(fileId, storagePath)

// Image Operations
- uploadImageAndGetURL(file, path)
- generateImage(prompt, options)
- enhancePrompt(draftPrompt)
```

**Beneficio:** Centralizar operaciones de archivos e imágenes

---

### 7. **NavigationContext** (~200 líneas)
**Responsabilidad:** Gestión de menús y navegación

**Propiedades:**
```typescript
- menus
- setMenus

// Menu Operations
- saveMenus()
- createMenu(menu)
- updateMenu(menuId, updates)
- deleteMenu(menuId)
```

**Beneficio:** Separar lógica de navegación

---

### 8. **DomainsContext** (~250 líneas)
**Responsabilidad:** Gestión de dominios y despliegue

**Propiedades:**
```typescript
- domains
- isLoadingDomains

// Domain Management
- fetchDomains()
- connectDomain(domain)
- disconnectDomain(domainId)
- deployToDomain(domainId, provider)
```

**Beneficio:** Aislar lógica de deployment

---

## 🏗️ Arquitectura de Composición

### Patrón: Context Composition

```typescript
// App.tsx
<AuthProvider>
  <UIProvider>
    <ProjectProvider>
      <AdminProvider>
        <LeadsProvider>
          <FileProvider>
            <NavigationProvider>
              <DomainsProvider>
                <AppContent />
              </DomainsProvider>
            </NavigationProvider>
          </FileProvider>
        </LeadsProvider>
      </AdminProvider>
    </ProjectProvider>
  </UIProvider>
</AuthProvider>
```

### Hook Compuesto para Compatibilidad

Para mantener compatibilidad con código existente:

```typescript
// contexts/useEditor.ts (hook compuesto)
export const useEditor = () => {
  const auth = useAuth();
  const ui = useUI();
  const project = useProject();
  const admin = useAdmin();
  const leads = useLeads();
  const files = useFiles();
  const navigation = useNavigation();
  const domains = useDomains();

  return {
    ...auth,
    ...ui,
    ...project,
    ...admin,
    ...leads,
    ...files,
    ...navigation,
    ...domains,
  };
};
```

**Beneficio:** El código existente sigue funcionando sin cambios

---

## 📝 Plan de Implementación

### Fase 1: Crear Contextos Base (2-3 horas)
1. Crear estructura de directorios `contexts/`
2. Crear archivos de contextos individuales
3. Definir interfaces TypeScript

### Fase 2: Migrar Lógica (4-5 horas)
1. Migrar AuthContext
2. Migrar UIContext
3. Migrar ProjectContext
4. Migrar otros contextos

### Fase 3: Integración (2-3 horas)
1. Crear hook compuesto `useEditor`
2. Actualizar `App.tsx` con providers
3. Testing de integración

### Fase 4: Deprecación (1 hora)
1. Marcar `EditorContext` como deprecated
2. Agregar warnings de deprecación
3. Documentar migración

### Fase 5: Limpieza (1 hora)
1. Eliminar `EditorContext.tsx` original
2. Actualizar documentación
3. Commit final

**Tiempo total estimado:** 10-13 horas

---

## ✅ Beneficios Esperados

1. **Mantenibilidad:** Cada contexto tiene una responsabilidad clara
2. **Testing:** Más fácil probar contextos individuales
3. **Performance:** Menos re-renders innecesarios
4. **Escalabilidad:** Fácil agregar nuevas funcionalidades
5. **Comprensión:** Código más fácil de entender
6. **Reutilización:** Contextos pueden usarse independientemente

---

## 🚨 Riesgos y Mitigación

### Riesgo 1: Breaking Changes
**Mitigación:** Hook compuesto mantiene API existente

### Riesgo 2: Dependencias Circulares
**Mitigación:** Definir jerarquía clara de dependencias

### Riesgo 3: Performance
**Mitigación:** Usar `React.memo` y `useMemo` donde sea necesario

---

## 📚 Referencias

- [React Context Best Practices](https://kentcdodds.com/blog/how-to-use-react-context-effectively)
- [Context Composition Pattern](https://react.dev/learn/passing-data-deeply-with-context)




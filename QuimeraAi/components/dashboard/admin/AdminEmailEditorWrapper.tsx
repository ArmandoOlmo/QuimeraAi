/**
 * AdminEmailEditorWrapper
 * 
 * Wraps the EmailEditor for Super Admin context where there is no ProjectProvider.
 * Provides a minimal stub ProjectContext so child components that call useProject()
 * (like HeroBlockControls, ButtonBlockControls) don't crash.
 * The ImagePicker within the editor will use destination="global" for the 
 * Super Admin's global file library.
 */

import React from 'react';
import EmailEditor from '../email/editor/EmailEditor';
import type { EmailDocument } from '../../../types/email';
import { ProjectContext } from '../../../contexts/project/ProjectContext';

// =============================================================================
// STUB PROJECT CONTEXT VALUE
// =============================================================================

// Minimal stub that satisfies useProject() calls in child components.
// activeProject is null so ecommerce selectors (Product/Collection/Content)
// gracefully show nothing, and ImagePicker falls through to URL-only mode.
const ADMIN_STUB_PROJECT_CONTEXT = {
    projects: [],
    isLoadingProjects: false,
    activeProjectId: null,
    activeProject: null,
    data: null,
    setData: () => {},
    theme: {},
    setTheme: () => {},
    brandIdentity: null,
    setBrandIdentity: () => {},
    componentOrder: [],
    setComponentOrder: () => {},
    sectionVisibility: {},
    setSectionVisibility: () => {},
    pages: [],
    setPages: () => {},
    activePage: null,
    setActivePage: () => {},
    addPage: async () => '',
    updatePage: async () => {},
    deletePage: async () => {},
    reorderPages: async () => {},
    duplicatePage: async () => '',
    getPageBySlug: () => null,
    isMultiPage: false,
    migrateToMultiPage: async () => {},
    loadProject: () => {},
    saveProject: async () => {},
    publishProject: async () => false,
    getProjectSnapshot: () => null,
    renameActiveProject: async () => {},
    addNewProject: async () => {},
    deleteProject: async () => {},
    createProjectFromTemplate: async () => {},
    exportProjectAsHtml: () => {},
    deletedProjects: [],
    restoreFromTrash: async () => {},
    permanentlyDelete: async () => {},
    restoreFromBackup: async () => {},
    updateProjectThumbnail: async () => {},
    updateProjectFavicon: async () => {},
    isEditingTemplate: false,
    exitTemplateEditor: () => {},
    createNewTemplate: async () => {},
    archiveTemplate: async () => {},
    duplicateTemplate: async () => {},
    updateTemplateInState: () => {},
    updateProjectAiConfig: () => {},
    refreshProjects: async () => {},
};

// =============================================================================
// WRAPPER COMPONENT
// =============================================================================

interface AdminEmailEditorWrapperProps {
    initialDocument?: Partial<EmailDocument>;
    onSave?: (document: EmailDocument) => void;
    onClose?: () => void;
    onSendTest?: () => void;
    campaignId?: string;
    campaignName?: string;
}

const AdminEmailEditorWrapper: React.FC<AdminEmailEditorWrapperProps> = (props) => {
    return (
        <ProjectContext.Provider value={ADMIN_STUB_PROJECT_CONTEXT as any}>
            <EmailEditor {...props} />
        </ProjectContext.Provider>
    );
};

export default AdminEmailEditorWrapper;

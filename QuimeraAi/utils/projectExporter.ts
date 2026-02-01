import { Project } from '../types';

export interface ExportedProject {
  version: string;
  exportDate: string;
  project: Project;
  metadata: {
    exportedBy: string;
    appVersion: string;
  };
}

/**
 * Export a project as JSON
 */
export const exportProject = (project: Project, userEmail: string): string => {
  const exportData: ExportedProject = {
    version: '1.0',
    exportDate: new Date().toISOString(),
    project: {
      ...project,
      // Clean up any Firebase-specific fields if needed
    },
    metadata: {
      exportedBy: userEmail,
      appVersion: '1.0.0',
    },
  };

  return JSON.stringify(exportData, null, 2);
};

/**
 * Download project as JSON file
 */
export const downloadProjectAsJSON = (project: Project, userEmail: string) => {
  const jsonString = exportProject(project, userEmail);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = `${project.name.replace(/\s+/g, '_')}_${Date.now()}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  URL.revokeObjectURL(url);
};

/**
 * Export multiple projects as JSON
 */
export const exportMultipleProjects = (projects: Project[], userEmail: string): string => {
  const exportData = {
    version: '1.0',
    exportDate: new Date().toISOString(),
    projectCount: projects.length,
    projects: projects.map(p => ({
      ...p,
    })),
    metadata: {
      exportedBy: userEmail,
      appVersion: '1.0.0',
    },
  };

  return JSON.stringify(exportData, null, 2);
};

/**
 * Download multiple projects as JSON file
 */
export const downloadMultipleProjectsAsJSON = (projects: Project[], userEmail: string) => {
  const jsonString = exportMultipleProjects(projects, userEmail);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = `quimera_projects_${Date.now()}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  URL.revokeObjectURL(url);
};

/**
 * Copy project JSON to clipboard
 */
export const copyProjectToClipboard = async (project: Project, userEmail: string): Promise<boolean> => {
  try {
    const jsonString = exportProject(project, userEmail);
    await navigator.clipboard.writeText(jsonString);
    return true;
  } catch (error) {
    console.error('Failed to copy to clipboard:', error);
    return false;
  }
};


import { Project } from '../types';
import { ExportedProject } from './projectExporter';

export interface ImportValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validate imported project JSON
 */
export const validateProjectImport = (jsonString: string): ImportValidationResult => {
  const result: ImportValidationResult = {
    valid: true,
    errors: [],
    warnings: [],
  };

  try {
    const data = JSON.parse(jsonString);

    // Check if it's a single project or multiple projects
    const isSingleProject = data.project !== undefined;
    const isMultipleProjects = data.projects !== undefined && Array.isArray(data.projects);

    if (!isSingleProject && !isMultipleProjects) {
      result.valid = false;
      result.errors.push('Invalid project format. Expected "project" or "projects" field.');
      return result;
    }

    // Validate version
    if (!data.version) {
      result.warnings.push('No version information found. Assuming compatible format.');
    }

    // Validate single project
    if (isSingleProject) {
      const project = data.project;
      
      if (!project.id) result.errors.push('Project missing required field: id');
      if (!project.name) result.errors.push('Project missing required field: name');
      if (!project.data) result.errors.push('Project missing required field: data');
      if (!project.theme) result.errors.push('Project missing required field: theme');
    }

    // Validate multiple projects
    if (isMultipleProjects) {
      data.projects.forEach((project: any, index: number) => {
        if (!project.id) result.errors.push(`Project ${index + 1} missing required field: id`);
        if (!project.name) result.errors.push(`Project ${index + 1} missing required field: name`);
        if (!project.data) result.errors.push(`Project ${index + 1} missing required field: data`);
        if (!project.theme) result.errors.push(`Project ${index + 1} missing required field: theme`);
      });
    }

    if (result.errors.length > 0) {
      result.valid = false;
    }

  } catch (error) {
    result.valid = false;
    result.errors.push('Invalid JSON format. Please check your file.');
  }

  return result;
};

/**
 * Parse imported project JSON
 */
export const parseProjectImport = (jsonString: string): { single?: ExportedProject; multiple?: ExportedProject[] } => {
  const data = JSON.parse(jsonString);

  if (data.project) {
    return { single: data as ExportedProject };
  } else if (data.projects && Array.isArray(data.projects)) {
    return { multiple: data.projects.map((p: any) => ({ ...data, project: p })) };
  }

  throw new Error('Invalid project format');
};

/**
 * Prepare imported project for saving (generate new IDs, update timestamps)
 */
export const prepareImportedProject = (exportedProject: ExportedProject, userId: string): Project => {
  const now = new Date().toISOString();
  const newId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  return {
    ...exportedProject.project,
    id: newId,
    status: 'Draft', // Always import as draft
    createdAt: now,
    lastUpdated: now,
    userId: userId,
  };
};

/**
 * Read file as text
 */
export const readFileAsText = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (event) => {
      if (event.target?.result) {
        resolve(event.target.result as string);
      } else {
        reject(new Error('Failed to read file'));
      }
    };
    
    reader.onerror = () => {
      reject(new Error('Error reading file'));
    };
    
    reader.readAsText(file);
  });
};

/**
 * Import project from file
 */
export const importProjectFromFile = async (
  file: File,
  userId: string
): Promise<{ projects: Project[]; warnings: string[] }> => {
  try {
    // Read file
    const fileContent = await readFileAsText(file);

    // Validate
    const validation = validateProjectImport(fileContent);
    
    if (!validation.valid) {
      throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
    }

    // Parse
    const parsed = parseProjectImport(fileContent);
    
    // Prepare projects
    const projects: Project[] = [];
    
    if (parsed.single) {
      projects.push(prepareImportedProject(parsed.single, userId));
    } else if (parsed.multiple) {
      projects.push(...parsed.multiple.map(ep => prepareImportedProject(ep, userId)));
    }

    return {
      projects,
      warnings: validation.warnings,
    };
  } catch (error) {
    console.error('Import error:', error);
    throw error;
  }
};


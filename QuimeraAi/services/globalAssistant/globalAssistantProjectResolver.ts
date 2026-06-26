import type { Project } from '../../types/project';

const normalize = (value: unknown): string =>
    String(value || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, ' ')
        .trim();

const getProjectName = (project: Pick<Project, 'name'>): string => {
    const name = project.name as unknown;
    if (typeof name === 'string') return name;
    if (name && typeof name === 'object') {
        const record = name as Record<string, unknown>;
        return String(record.es || record.en || record.value || record.label || '');
    }
    return '';
};

export interface ProjectResolutionResult {
    projectId: string | null;
    projectName?: string | null;
    ambiguous: boolean;
    matches: Array<Pick<Project, 'id' | 'name' | 'status' | 'tenantId' | 'userId'>>;
    reason?: string;
}

export function resolveProjectByNameOrId(
    projects: Array<Pick<Project, 'id' | 'name' | 'status' | 'tenantId' | 'userId'>>,
    query: string,
): ProjectResolutionResult {
    const target = normalize(query);
    if (!target) {
        return { projectId: null, ambiguous: false, matches: [], reason: 'empty_query' };
    }

    const directId = projects.find(project => project.id === query);
    if (directId) {
        return {
            projectId: directId.id,
            projectName: getProjectName(directId),
            ambiguous: false,
            matches: [directId],
        };
    }

    const matches = projects.filter(project => {
        const name = normalize(getProjectName(project));
        if (!name) return false;
        if (name === target) return true;
        if (name.includes(target) || target.includes(name)) return true;

        const targetTokens = target.split(/\s+/).filter(token => token.length > 2);
        const nameTokens = name.split(/\s+/).filter(token => token.length > 2);
        return targetTokens.some(token => nameTokens.includes(token));
    });

    if (matches.length === 1) {
        return {
            projectId: matches[0].id,
            projectName: getProjectName(matches[0]),
            ambiguous: false,
            matches,
        };
    }

    return {
        projectId: null,
        ambiguous: matches.length > 1,
        matches,
        reason: matches.length > 1 ? 'multiple_matches' : 'not_found',
    };
}

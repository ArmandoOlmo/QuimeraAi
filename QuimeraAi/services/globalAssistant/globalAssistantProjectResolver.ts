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

const cleanReference = (value: string): string =>
    value
        .replace(/[?.!,;:]+$/g, '')
        .replace(/\s+/g, ' ')
        .trim();

const containsNormalizedPhrase = (text: string, phrase: string): boolean => {
    if (!text || !phrase) return false;
    return ` ${text} `.includes(` ${phrase} `);
};

const extractExplicitProjectReference = (request: string): string | null => {
    const match = request.match(/\b(?:proyecto|project)\s+(.+)$/i);
    if (!match?.[1]) return null;
    return cleanReference(match[1]);
};

const extractTrailingProjectReference = (request: string): string | null => {
    const matches = [...request.matchAll(/\b(?:de|del|para|for)\s+([a-z0-9][a-z0-9 '&.-]*)$/gi)];
    const value = matches[matches.length - 1]?.[1];
    if (!value) return null;
    return cleanReference(value.replace(/\b(?:el|la|los|las|un|una|a|an)\s+/gi, ''));
};

const resolveStrictProjectReference = (
    projects: Array<Pick<Project, 'id' | 'name' | 'status' | 'tenantId' | 'userId'>>,
    query: string,
    options: { allowPrefix: boolean },
): ProjectResolutionResult => {
    const target = normalize(query);
    if (!target) return { projectId: null, ambiguous: false, matches: [], reason: 'empty_query' };

    const directId = projects.find(project => project.id === query || project.id === target);
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
        if (containsNormalizedPhrase(target, name)) return true;
        return options.allowPrefix && name.startsWith(target);
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
};

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

export function resolveProjectReferenceFromRequest(
    projects: Array<Pick<Project, 'id' | 'name' | 'status' | 'tenantId' | 'userId'>>,
    request: string,
): ProjectResolutionResult {
    const text = normalize(request);
    if (!text) {
        return { projectId: null, ambiguous: false, matches: [], reason: 'empty_query' };
    }

    const directId = projects.find(project => request.includes(project.id));
    if (directId) {
        return {
            projectId: directId.id,
            projectName: getProjectName(directId),
            ambiguous: false,
            matches: [directId],
        };
    }

    const exactNameMatches = projects.filter(project => {
        const name = normalize(getProjectName(project));
        return name.length >= 3 && containsNormalizedPhrase(text, name);
    });

    if (exactNameMatches.length === 1) {
        return {
            projectId: exactNameMatches[0].id,
            projectName: getProjectName(exactNameMatches[0]),
            ambiguous: false,
            matches: exactNameMatches,
        };
    }

    if (exactNameMatches.length > 1) {
        const maxLength = Math.max(...exactNameMatches.map(project => normalize(getProjectName(project)).length));
        const longestMatches = exactNameMatches.filter(project => normalize(getProjectName(project)).length === maxLength);
        return {
            projectId: longestMatches.length === 1 ? longestMatches[0].id : null,
            projectName: longestMatches.length === 1 ? getProjectName(longestMatches[0]) : null,
            ambiguous: longestMatches.length > 1,
            matches: longestMatches,
            reason: longestMatches.length > 1 ? 'multiple_matches' : undefined,
        };
    }

    const explicitReference = extractExplicitProjectReference(request);
    if (explicitReference) {
        return resolveStrictProjectReference(projects, explicitReference, { allowPrefix: true });
    }

    const trailingReference = extractTrailingProjectReference(request);
    if (trailingReference) {
        return resolveStrictProjectReference(projects, trailingReference, { allowPrefix: false });
    }

    return {
        projectId: null,
        ambiguous: false,
        matches: [],
        reason: 'no_project_reference',
    };
}

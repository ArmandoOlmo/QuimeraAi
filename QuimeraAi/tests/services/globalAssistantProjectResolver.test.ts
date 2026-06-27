import { describe, expect, it } from 'vitest';
import {
    resolveProjectByNameOrId,
    resolveProjectReferenceFromRequest,
} from '../../services/globalAssistant/globalAssistantProjectResolver.ts';

const projects = [
    {
        id: 'project-1',
        name: 'Casa Luna',
        status: 'Draft' as const,
        tenantId: 'tenant-1',
        userId: 'user-1',
    },
    {
        id: 'project-2',
        name: 'Ocean Clinic',
        status: 'Draft' as const,
        tenantId: 'tenant-1',
        userId: 'user-1',
    },
    {
        id: 'project-3',
        name: 'Puerto Rico Studio',
        status: 'Draft' as const,
        tenantId: 'tenant-1',
        userId: 'user-1',
    },
];

describe('globalAssistantProjectResolver', () => {
    it('keeps direct project lookup fuzzy for project search surfaces', () => {
        expect(resolveProjectByNameOrId(projects, 'Ocean')).toMatchObject({
            projectId: 'project-2',
            ambiguous: false,
        });
    });

    it('requires explicit project references before switching context from natural requests', () => {
        expect(resolveProjectReferenceFromRequest(projects, 'Cambia al proyecto Ocean')).toMatchObject({
            projectId: 'project-2',
            ambiguous: false,
        });

        expect(resolveProjectReferenceFromRequest(projects, 'Abre ecommerce de Ocean Clinic')).toMatchObject({
            projectId: 'project-2',
            ambiguous: false,
        });

        expect(resolveProjectReferenceFromRequest(projects, 'Genera una imagen para el hero de Casa Luna')).toMatchObject({
            projectId: 'project-1',
            ambiguous: false,
        });
    });

    it('does not confuse content words or locations with project names', () => {
        expect(resolveProjectReferenceFromRequest(projects, 'Quiero crear una imagen de una casa en Puerto Rico')).toMatchObject({
            projectId: null,
            ambiguous: false,
            reason: 'not_found',
        });
    });
});

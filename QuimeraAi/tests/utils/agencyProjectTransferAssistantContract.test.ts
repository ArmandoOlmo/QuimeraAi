import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = path.resolve(__dirname, '../..');
const read = (relativePath: string) => fs.readFileSync(path.join(root, relativePath), 'utf8');

describe('Agency Project Transfer Global Assistant contract', () => {
    const registry = read('services/globalAssistant/globalAssistantActionRegistry.ts');
    const handlers = read('services/globalAssistant/globalAssistantActionHandlers.ts');
    const previews = read('services/globalAssistant/globalAssistantActionPreviews.ts');
    const router = read('services/globalAssistant/globalAssistantIntentRouter.ts');

    it('registers transfer_agency_project as a confirmed Agency Engine operation', () => {
        expect(registry).toContain("action('agency', 'transfer_agency_project'");
        expect(registry).toContain("requiredService: 'agency'");
        expect(registry).toContain("requiredFeature: 'agencyModule'");
        expect(registry).toContain('rollbackSupported: false');
    });

    it('delegates project transfer to onboarding-api instead of copying projects in the assistant', () => {
        const start = handlers.indexOf('const createAgencyProjectTransferHandler');
        const end = handlers.indexOf('type ProjectMetadataUpdateDraft', start);
        const handlerBlock = handlers.slice(start, end);

        expect(handlers).toContain('transfer_agency_project: createAgencyProjectTransferHandler');
        expect(handlerBlock).toContain("await invokeFunction(deps, 'onboarding-api'");
        expect(handlerBlock).toContain("action: 'transferProject'");
        expect(handlerBlock).toContain('Agency Project Transfer can only target clients managed by the active agency tenant.');
        expect(handlerBlock).not.toContain("insertRow(client, 'projects'");
    });

    it('previews a draft copy, transfer audit, approval request, and activity without auto-publish', () => {
        expect(previews).toContain("if (action.actionType === 'transfer_agency_project')");
        expect(previews).toContain("functionName: 'onboarding-api'");
        expect(previews).toContain('copiedAsDraft: true');
        expect(previews).toContain('published: false');
        expect(previews).toContain('approvalRequested: true');
        expect(previews).toContain("'agency_project_transfers.$pending'");
        expect(previews).toContain("'agency_client_approvals.$pending'");
        expect(previews).toContain("'agency_activity.$pending'");
    });

    it('routes project transfer language to the Agency Project Transfer action', () => {
        expect(router).toContain("return ['transfer_agency_project']");
        expect(router).toContain('transferir proyecto');
        expect(router).toContain('copy project');
    });
});

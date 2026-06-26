import { supabase } from '../../supabase';
import type { BioPageBlueprint } from '../../types/businessBlueprint';
import type { Project } from '../../types/project';
import {
    createBioPageDraft,
    createBioPageFromBlueprint,
    getBioPageByProject,
    updateBioPageDraft,
} from './bioPageEngineService';
import type { BioPageData } from './bioPageTypes';

type SupabaseClient = typeof supabase;

const isProtected = (item: { userModified?: boolean; lockedFromRegeneration?: boolean }) => (
    item.lockedFromRegeneration === true || item.userModified === true
);

export function previewBioPageBlueprintSync(input: {
    existing?: BioPageData | null;
    blueprint: BioPageBlueprint;
}) {
    const draft = createBioPageFromBlueprint({
        projectId: input.existing?.projectId || '',
        tenantId: input.existing?.tenantId,
        userId: input.existing?.userId || '',
        blueprint: input.blueprint,
    });

    const protectedBlockIds = new Set((input.existing?.blocks || []).filter(isProtected).map(block => block.id));
    const protectedLinkIds = new Set((input.existing?.links || []).filter(isProtected).map(link => link.id));

    return {
        slug: draft.slug,
        blockCount: draft.blocks?.length || 0,
        linkCount: draft.links?.length || 0,
        protectedBlockIds: Array.from(protectedBlockIds),
        protectedLinkIds: Array.from(protectedLinkIds),
        warnings: [
            'Bio Page blueprint will be applied as a draft.',
            'AI-generated external links, products, bookings, and email audiences remain needs_review until confirmed.',
            protectedBlockIds.size || protectedLinkIds.size
                ? 'User-modified or locked blocks/links will be preserved.'
                : '',
        ].filter(Boolean),
    };
}

export async function applyBioPageBlueprintDraft(input: {
    projectId: string;
    tenantId?: string | null;
    userId: string;
    blueprint: BioPageBlueprint;
}, client: SupabaseClient = supabase): Promise<BioPageData> {
    const existing = await getBioPageByProject(input.projectId, client);
    const draft = createBioPageFromBlueprint(input);

    if (!existing) {
        return createBioPageDraft({
            projectId: input.projectId,
            tenantId: input.tenantId,
            userId: input.userId,
            ...draft,
        }, client);
    }

    const protectedBlocks = existing.blocks.filter(isProtected);
    const protectedLinks = existing.links.filter(isProtected);
    const protectedBlockIds = new Set(protectedBlocks.map(block => block.id));
    const protectedLinkIds = new Set(protectedLinks.map(link => link.id));

    return updateBioPageDraft({
        page: existing,
        profile: isProtected(existing.profile) ? existing.profile : draft.profile,
        theme: draft.theme,
        links: [
            ...protectedLinks,
            ...(draft.links || []).filter(link => !protectedLinkIds.has(link.id)),
        ],
        blocks: [
            ...protectedBlocks,
            ...(draft.blocks || []).filter(block => !protectedBlockIds.has(block.id)),
        ].map((block, index) => ({ ...block, order: index })),
        seo: draft.seo,
        settings: {
            ...existing.settings,
            ...draft.settings,
            source: 'ai-studio-bio-page-blueprint',
        },
        emailSignupEnabled: draft.settings?.emailSignupEnabled === true,
    }, client);
}

export async function applyProjectBioPageBlueprintDraft(input: {
    project: Pick<Project, 'id' | 'tenantId' | 'userId' | 'businessBlueprint'>;
    userId?: string | null;
    tenantId?: string | null;
}, client: SupabaseClient = supabase): Promise<BioPageData | null> {
    const blueprint = input.project.businessBlueprint?.bioPageBlueprint;
    if (!blueprint?.enabled) return null;

    const projectId = input.project.id;
    const userId = input.userId || input.project.userId;
    if (!projectId || !userId) return null;

    return applyBioPageBlueprintDraft({
        projectId,
        tenantId: input.tenantId ?? input.project.tenantId ?? input.project.businessBlueprint?.tenantId,
        userId,
        blueprint,
    }, client);
}

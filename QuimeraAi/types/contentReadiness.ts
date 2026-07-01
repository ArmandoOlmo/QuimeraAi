export interface ContentReadinessChecklist {
    briefComplete: boolean;
    brandApplied: boolean;
    storyboardApproved: boolean;
    assetsApproved: boolean;
    captionsReady: boolean;
    exportFormatSelected: boolean;
    rightsConfirmed: boolean;
}

export interface ContentReadiness {
    isReady: boolean;
    blockers: string[];
    warnings: string[];
    checklist: ContentReadinessChecklist;
}

const emptyContentReadinessChecklist: ContentReadinessChecklist = {
    briefComplete: false,
    brandApplied: false,
    storyboardApproved: false,
    assetsApproved: false,
    captionsReady: false,
    exportFormatSelected: false,
    rightsConfirmed: false,
};

export const createEmptyContentReadiness = (
    overrides: Partial<ContentReadiness> = {},
): ContentReadiness => ({
    isReady: false,
    blockers: [],
    warnings: [],
    ...overrides,
    checklist: {
        ...emptyContentReadinessChecklist,
        ...(overrides.checklist || {}),
    },
});

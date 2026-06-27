import { componentRegistry, getRegistryItem } from '../data/componentRegistry';
import type { SitePage } from '../types/project';
import type { PageSection } from '../types/ui';
import type { GlobalServiceAvailability, PlatformServiceId } from '../types/serviceAvailability';

export type ServicePublicPredicate = (serviceId: PlatformServiceId) => boolean;

export type ComponentStatusMap = Partial<Record<PageSection, boolean>>;
export type SectionVisibilityMap = Partial<Record<PageSection, boolean>>;

export const isSectionServiceAvailable = (
    section: PageSection,
    isServicePublic: ServicePublicPredicate,
): boolean => {
    const registryItem = getRegistryItem(section);
    if (!registryItem?.requiredService) return true;
    return isServicePublic(registryItem.requiredService);
};

export const filterServiceAvailableSections = (
    sections: readonly PageSection[] | null | undefined,
    isServicePublic: ServicePublicPredicate,
): PageSection[] => {
    if (!sections?.length) return [];

    const seen = new Set<PageSection>();
    const result: PageSection[] = [];

    for (const section of sections) {
        if (seen.has(section)) continue;
        seen.add(section);
        if (isSectionServiceAvailable(section, isServicePublic)) {
            result.push(section);
        }
    }

    return result;
};

export const buildServiceAwareComponentStatus = (
    componentStatus: ComponentStatusMap | null | undefined,
    sections: readonly PageSection[] | null | undefined,
    isServicePublic: ServicePublicPredicate,
): Record<PageSection, boolean> => {
    const next: Record<PageSection, boolean> = {} as Record<PageSection, boolean>;
    const sectionIds = new Set<PageSection>();

    for (const section of sections || []) sectionIds.add(section);
    for (const section of Object.keys(componentStatus || {}) as PageSection[]) sectionIds.add(section);
    for (const item of componentRegistry) sectionIds.add(item.id);

    for (const section of sectionIds) {
        next[section] = componentStatus?.[section] !== false && isSectionServiceAvailable(section, isServicePublic);
    }

    return next;
};

export const buildServiceAwareSectionVisibility = (
    sectionVisibility: SectionVisibilityMap | null | undefined,
    isServicePublic: ServicePublicPredicate,
): Record<PageSection, boolean> => {
    const next: Record<PageSection, boolean> = { ...(sectionVisibility || {}) } as Record<PageSection, boolean>;

    for (const item of componentRegistry) {
        if (!isSectionServiceAvailable(item.id, isServicePublic)) {
            next[item.id] = false;
        }
    }

    return next;
};

export const filterServiceAvailablePages = (
    pages: readonly SitePage[] | null | undefined,
    isServicePublic: ServicePublicPredicate,
): SitePage[] => {
    if (!pages?.length) return [];

    return pages.map(page => ({
        ...page,
        sections: filterServiceAvailableSections(page.sections, isServicePublic),
    }));
};

export const createServicePublicPredicate = (
    availability: GlobalServiceAvailability | null | undefined,
): ServicePublicPredicate => {
    return (serviceId: PlatformServiceId) => {
        const status = availability?.services?.[serviceId]?.status;
        return !status || status === 'public';
    };
};

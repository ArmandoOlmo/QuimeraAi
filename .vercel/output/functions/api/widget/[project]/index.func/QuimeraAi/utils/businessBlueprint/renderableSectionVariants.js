const EDITORIAL_MOSAIC_SETTINGS = {
    features: {
        featuresVariant: 'editorial-mosaic',
        gridColumns: 4,
        imageHeight: 420,
        showSectionHeader: true,
        enableCardAnimation: true,
    },
    testimonials: {
        testimonialsVariant: 'editorial-mosaic',
        enableCardAnimation: true,
    },
    menu: {
        menuVariant: 'editorial-mosaic',
        gridColumns: 4,
        showSectionHeader: true,
        enableCardAnimation: true,
    },
};
export function getRenderableSectionVariantSettings(section) {
    if (section.layoutVariant !== 'editorialMosaic')
        return undefined;
    if (section.type === 'features' || section.componentId === 'features')
        return EDITORIAL_MOSAIC_SETTINGS.features;
    if (section.type === 'testimonials' || section.componentId === 'testimonials')
        return EDITORIAL_MOSAIC_SETTINGS.testimonials;
    if (section.type === 'menu' || section.componentId === 'restaurantMenu')
        return EDITORIAL_MOSAIC_SETTINGS.menu;
    return undefined;
}
export function mergeRenderableSectionVariantSettings(section) {
    const runtimeSettings = getRenderableSectionVariantSettings(section);
    if (!runtimeSettings)
        return section;
    return {
        ...section,
        settings: {
            ...(section.settings || {}),
            ...runtimeSettings,
        },
        sourceMap: {
            ...(section.sourceMap || {}),
            runtimeVariantSettings: 'businessBlueprint.renderableSectionVariants',
        },
    };
}
export function applyRenderableSectionVariantSettingsToData(data, sections) {
    if (!data || typeof data !== 'object' || !Array.isArray(sections) || sections.length === 0)
        return data;
    const nextData = { ...data };
    sections.forEach(section => {
        const runtimeSettings = getRenderableSectionVariantSettings(section);
        if (!runtimeSettings)
            return;
        const current = nextData[section.type];
        if (!current || typeof current !== 'object' || Array.isArray(current))
            return;
        nextData[section.type] = {
            ...current,
            ...runtimeSettings,
        };
    });
    return nextData;
}
//# sourceMappingURL=renderableSectionVariants.js.map
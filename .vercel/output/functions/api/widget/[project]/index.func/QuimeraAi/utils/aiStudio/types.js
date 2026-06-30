export function createAiStudioMetadata(now = new Date().toISOString()) {
    return {
        generatedBy: 'ai',
        generatedByAI: true,
        userModified: false,
        generatedAt: now,
        updatedAt: now,
        generationSource: 'ai-studio-c1',
    };
}
export function createAiStudioReadiness(warnings = [], blockers = []) {
    return {
        isReady: blockers.length === 0,
        warnings,
        blockers,
    };
}
export function getBriefText(input) {
    const plan = input.existingWebsitePlan;
    const services = [
        ...(input.services || []),
        ...(plan?.businessProfile.services || []),
    ].flatMap(service => [service.name, service.description]);
    const goals = Array.isArray(input.goals) ? input.goals.join(' ') : input.goals;
    return [
        input.businessName,
        input.businessDescription,
        input.description,
        input.industry,
        input.subIndustry,
        input.productsServicesText,
        input.productsText,
        input.servicesText,
        input.audience,
        goals,
        input.brandStyle,
        plan?.businessProfile.businessName,
        plan?.businessProfile.industry,
        plan?.businessProfile.description,
        plan?.businessProfile.tagline,
        ...services,
        ...(plan?.contentMap.products || []).flatMap(product => {
            if (!product || typeof product !== 'object')
                return [];
            const record = product;
            return [record.name, record.title, record.category, record.description].filter(Boolean).map(String);
        }),
        ...(plan?.contentMap.menuItems || []).flatMap(item => {
            if (!item || typeof item !== 'object')
                return [];
            const record = item;
            return [record.name, record.title, record.category, record.description].filter(Boolean).map(String);
        }),
    ].filter(Boolean).join(' ').toLowerCase();
}
export function uniqueValues(values, limit = 12) {
    const seen = new Set();
    const result = [];
    for (const value of values) {
        const normalized = value?.trim();
        if (!normalized)
            continue;
        const key = normalized.toLowerCase();
        if (seen.has(key))
            continue;
        seen.add(key);
        result.push(normalized);
        if (result.length >= limit)
            break;
    }
    return result;
}
export function classifyCommerceSignals(input) {
    const text = getBriefText(input);
    const signals = [];
    const add = (signal, pattern) => {
        if (pattern.test(text) && !signals.includes(signal))
            signals.push(signal);
    };
    add('restaurant', /\b(restaurant|restaurante|caf[eé]|cafeteria|food|menu|reservas?|comida|meal|catering|steakhouse|bakery|panader[ií]a|bar|sushi|pizza|brunch|fine dining|casual dining|food truck)\b/i);
    add('real-estate', /\b(real estate|realtor|broker|inmobili|propiedad|buyer|seller|listings?|bienes raices|bienes raices)\b/i);
    add('fitness', /\b(fitness|gym|gimnasio|sport|sports|crossfit|bike|bikes|bicycle|bicicleta|cycling|yoga|training)\b/i);
    add('luxury', /\b(luxury|premium|jewelry|joyeria|high-end|boutique|curated|curado)\b/i);
    add('fashion', /\b(fashion|moda|clothing|ropa|apparel|shoes|zapatos)\b/i);
    add('beauty', /\b(beauty|belleza|spa|skincare|cosmetic|cosmetica|salon)\b/i);
    add('digital', /\b(digital product|download|course|curso|ebook|guide|guia|template|software|membership)\b/i);
    add('marketplace', /\b(marketplace|many categories|multi-category|catalog|catalogo|retail|department|inventory)\b/i);
    add('commerce', /\b(ecommerce|e-commerce|online store|tienda online|shop|store|tienda|sell|vende|vender|productos?|merch|gift card|tarjeta de regalo|checkout|cart|carrito)\b/i);
    add('services', /\b(service|servicio|appointment|cita|consultation|consulta|booking|reserva|package|paquete|deposit|add-on|addon)\b/i);
    if (input.hasEcommerce || input.existingWebsitePlan?.businessProfile.hasEcommerce) {
        if (!signals.includes('commerce'))
            signals.unshift('commerce');
    }
    return signals.length ? signals : ['non-commerce'];
}
export function hasCommerceIntent(input) {
    const signals = classifyCommerceSignals(input);
    if (signals.some(signal => signal !== 'services' && signal !== 'non-commerce'))
        return true;
    const text = getBriefText(input);
    return /\b(paid consultation|consulta pagada|packages?|paquetes?|deposit|add-on|booking|appointment|cita)\b/i.test(text);
}
//# sourceMappingURL=types.js.map
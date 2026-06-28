type PortfolioBrief = {
    businessName?: string;
    industry?: string;
    description?: string;
    services?: Array<{ name?: string; description?: string }>;
};

const MIN_PORTFOLIO_PROJECTS = 3;

function buildFallbackPortfolioItem(brief: PortfolioBrief, isSpanish: boolean, index: number) {
    const service = brief.services?.[index];
    const genericTitles = isSpanish
        ? ['Proyecto destacado', 'Experiencia de cliente', 'Resultado reciente']
        : ['Featured Project', 'Client Experience', 'Recent Result'];
    const genericDescriptions = isSpanish
        ? [
            'Una muestra representativa del trabajo y la calidad del negocio.',
            'Una solucion creada para responder a necesidades reales de clientes.',
            'Un ejemplo reciente del nivel de detalle y ejecucion del equipo.',
        ]
        : [
            'A representative showcase of the business work and quality.',
            'A solution created to answer real client needs.',
            'A recent example of the team detail and execution.',
        ];

    return {
        title: service?.name || `${genericTitles[index] || genericTitles[0]} ${index + 1}`,
        description: service?.description || brief.description || genericDescriptions[index] || genericDescriptions[0],
        category: brief.industry || (isSpanish ? 'Proyecto' : 'Project'),
        imageUrl: '',
    };
}

function normalizePortfolioItem(item: unknown, brief: PortfolioBrief, isSpanish: boolean, index: number) {
    const fallback = buildFallbackPortfolioItem(brief, isSpanish, index);
    const source = item && typeof item === 'object' ? item as Record<string, unknown> : {};

    return {
        ...source,
        title: source.title || fallback.title,
        description: source.description || fallback.description,
        category: source.category || fallback.category,
        imageUrl: typeof source.imageUrl === 'string' ? source.imageUrl : '',
    };
}

function ensureMinimumPortfolioEntries(items: unknown, brief: PortfolioBrief, isSpanish: boolean) {
    const normalized = Array.isArray(items)
        ? items.map((item, index) => normalizePortfolioItem(item, brief, isSpanish, index))
        : [];

    for (let index = normalized.length; index < MIN_PORTFOLIO_PROJECTS; index += 1) {
        normalized.push(normalizePortfolioItem(null, brief, isSpanish, index));
    }

    return normalized;
}

export function ensureStandardPortfolioItems(portfolio: Record<string, any>, brief: PortfolioBrief, isSpanish: boolean) {
    const sourceItems = Array.isArray(portfolio.items) && portfolio.items.length > 0
        ? portfolio.items
        : portfolio.projects;

    portfolio.items = ensureMinimumPortfolioEntries(sourceItems, brief, isSpanish);
    delete portfolio.projects;

    if (!portfolio.title) portfolio.title = isSpanish ? 'Portafolio' : 'Portfolio';
    if (!portfolio.description) portfolio.description = isSpanish ? 'Proyectos recientes' : 'Recent projects';
}

export function ensurePortfolioProjects(portfolio: Record<string, any>, brief: PortfolioBrief, isSpanish: boolean) {
    const sourceProjects = Array.isArray(portfolio.projects) && portfolio.projects.length > 0
        ? portfolio.projects
        : portfolio.items;

    portfolio.projects = ensureMinimumPortfolioEntries(sourceProjects, brief, isSpanish);
}

export function ensureGeneratedPortfolioSections(
    data: Record<string, any>,
    brief: PortfolioBrief,
    isSpanish: boolean,
    componentOrder: string[] = [],
) {
    if (!data || typeof data !== 'object') return;

    if (!data.portfolio && componentOrder.includes('portfolio')) {
        data.portfolio = {};
    }

    if (data.portfolio && typeof data.portfolio === 'object') {
        ensureStandardPortfolioItems(data.portfolio, brief, isSpanish);
    }

    for (const key of ['portfolioNeon', 'portfolioLumina']) {
        if (!data[key] && componentOrder.includes(key)) {
            data[key] = {};
        }

        if (data[key] && typeof data[key] === 'object') {
            ensurePortfolioProjects(data[key], brief, isSpanish);
        }
    }
}

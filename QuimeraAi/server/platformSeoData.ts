/**
 * Platform SEO Data
 * 
 * Contains static data and generators for the QuimeraAi platform's main marketing site.
 * Used for True SSR fallback and dynamic SEO generation (sitemaps, llms.txt).
 */

export const PLATFORM_ROUTES = [
    { path: '/', priority: 1.0, changefreq: 'weekly', title: 'QuimeraAi - Constructor de Sitios Web IA' },
    { path: '/pricing', priority: 0.9, changefreq: 'weekly', title: 'Precios - QuimeraAi' },
    { path: '/features', priority: 0.9, changefreq: 'weekly', title: 'Características - QuimeraAi' },
    { path: '/about', priority: 0.8, changefreq: 'monthly', title: 'Sobre Nosotros - QuimeraAi' },
    { path: '/contact', priority: 0.8, changefreq: 'monthly', title: 'Contacto - QuimeraAi' },
    { path: '/blog', priority: 0.9, changefreq: 'daily', title: 'Blog - QuimeraAi' }
];

export const PLATFORM_METADATA = {
    title: 'QuimeraAi - Constructor de Sitios Web e Inteligencia Artificial',
    description: 'Crea sitios web increíbles, tiendas online, aplicaciones para restaurantes y más con el poder de la Inteligencia Artificial de Quimera. Optimizado para SEO, LLMs y conversiones.',
    url: 'https://quimera.ai',
    image: 'https://quimera.ai/og-image.jpg'
};

export const PLATFORM_LLMS_TEXT = `
# QuimeraAi - The Next Generation AI Website Builder

QuimeraAi is an advanced, AI-powered website builder designed to help agencies, businesses, and entrepreneurs create highly optimized, conversion-ready websites in seconds.

## Core Features
- **AI-Powered Generation**: Instantly generate complete websites, e-commerce stores, and restaurant menus using natural language prompts.
- **True SSR & SEO**: Every generated website comes with True Server-Side Rendering (SSR), dynamic sitemaps, robots.txt, and optimized LLM metadata, ensuring perfect crawlability for Google, ChatGPT, and Claude.
- **E-Commerce Ready**: Built-in cart, product management, and checkout capabilities.
- **Agency Dashboard**: White-label capabilities, client management, analytics, and CRM features built specifically for digital agencies.
- **Multi-tenant Architecture**: Manage hundreds of custom domains and subdomains from a single dashboard.

## Services
- Landing Pages & Portfolios
- E-commerce Stores
- Real Estate Listings
- Restaurant Menus with QR & Reservations
- Link-in-Bio pages
- CMS & Blog Hub

## Pricing
We offer flexible pricing for solo creators and robust plans for agencies requiring white-labeling and unlimited client sites.

Visit https://quimera.ai for more information.
`;

/**
 * Generates a clean HTML fallback containing the semantic structure
 * of the platform for search engines.
 */
export function generatePlatformFallbackHtml(): string {
    return `
        <div id="seo-fallback" style="display:none;" aria-hidden="true">
            <header>
                <h1>${PLATFORM_METADATA.title}</h1>
                <p>${PLATFORM_METADATA.description}</p>
            </header>
            <main>
                <section id="hero">
                    <h2>Crea tu sitio web con IA en segundos</h2>
                    <p>Diseño premium, SEO técnico integrado y optimización perfecta para LLMs.</p>
                </section>
                <section id="features">
                    <h2>Características Principales</h2>
                    <ul>
                        <li>Generador de Webs con IA</li>
                        <li>Tiendas Online y Ecommerce</li>
                        <li>Gestión de Restaurantes y Menús</li>
                        <li>Agencias y White Label</li>
                        <li>SEO Automático y Sitemaps</li>
                    </ul>
                </section>
                <nav>
                    <h2>Navegación</h2>
                    <ul>
                        ${PLATFORM_ROUTES.map(route => `<li><a href="${route.path}">${route.title}</a></li>`).join('')}
                    </ul>
                </nav>
            </main>
        </div>
    `;
}

/**
 * Generates the complete HTML head tags for the platform
 */
export function generatePlatformMetaTags(path: string): string {
    const routeInfo = PLATFORM_ROUTES.find(r => r.path === path) || PLATFORM_ROUTES[0];
    const pageTitle = routeInfo.title;
    
    return `
        <title>${pageTitle}</title>
        <meta name="description" content="${PLATFORM_METADATA.description}">
        
        <!-- Open Graph / Facebook -->
        <meta property="og:type" content="website">
        <meta property="og:url" content="${PLATFORM_METADATA.url}${path}">
        <meta property="og:title" content="${pageTitle}">
        <meta property="og:description" content="${PLATFORM_METADATA.description}">
        <meta property="og:image" content="${PLATFORM_METADATA.image}">

        <!-- Twitter -->
        <meta property="twitter:card" content="summary_large_image">
        <meta property="twitter:url" content="${PLATFORM_METADATA.url}${path}">
        <meta property="twitter:title" content="${pageTitle}">
        <meta property="twitter:description" content="${PLATFORM_METADATA.description}">
        <meta property="twitter:image" content="${PLATFORM_METADATA.image}">
        
        <!-- LLM Discovery -->
        <link rel="llms-txt" href="/llms.txt">
        
        <!-- Schema.org -->
        <script type="application/ld+json">
        {
            "@context": "https://schema.org",
            "@type": "SoftwareApplication",
            "name": "QuimeraAi",
            "applicationCategory": "BusinessApplication",
            "description": "${PLATFORM_METADATA.description}",
            "url": "${PLATFORM_METADATA.url}",
            "offers": {
                "@type": "Offer",
                "price": "0",
                "priceCurrency": "USD"
            }
        }
        </script>
    `;
}

import { PageSection, Project, SitePage } from '../types';
import { resolveI18nSectionData } from './i18nContent';
import { resolveProjectName } from './resolveProjectName';

export interface ExportedProject {
  version: string;
  exportDate: string;
  project: Project;
  metadata: {
    exportedBy: string;
    appVersion: string;
  };
}

/**
 * Export a project as JSON
 */
export const exportProject = (project: Project, userEmail: string): string => {
  const exportData: ExportedProject = {
    version: '1.0',
    exportDate: new Date().toISOString(),
    project: {
      ...project,
      // Clean up any Supabase-specific fields if needed
    },
    metadata: {
      exportedBy: userEmail,
      appVersion: '1.0.0',
    },
  };

  return JSON.stringify(exportData, null, 2);
};

/**
 * Download project as JSON file
 */
export const downloadProjectAsJSON = (project: Project, userEmail: string) => {
  const jsonString = exportProject(project, userEmail);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = `${project.name.replace(/\s+/g, '_')}_${Date.now()}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  URL.revokeObjectURL(url);
};

/**
 * Export multiple projects as JSON
 */
export const exportMultipleProjects = (projects: Project[], userEmail: string): string => {
  const exportData = {
    version: '1.0',
    exportDate: new Date().toISOString(),
    projectCount: projects.length,
    projects: projects.map(p => ({
      ...p,
    })),
    metadata: {
      exportedBy: userEmail,
      appVersion: '1.0.0',
    },
  };

  return JSON.stringify(exportData, null, 2);
};

/**
 * Download multiple projects as JSON file
 */
export const downloadMultipleProjectsAsJSON = (projects: Project[], userEmail: string) => {
  const jsonString = exportMultipleProjects(projects, userEmail);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = `quimera_projects_${Date.now()}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  URL.revokeObjectURL(url);
};

/**
 * Copy project JSON to clipboard
 */
export const copyProjectToClipboard = async (project: Project, userEmail: string): Promise<boolean> => {
  try {
    const jsonString = exportProject(project, userEmail);
    await navigator.clipboard.writeText(jsonString);
    return true;
  } catch (error) {
    console.error('Failed to copy to clipboard:', error);
    return false;
  }
};

interface HtmlExportOptions {
  language?: string;
}

type SectionRecord = Record<string, any>;

const STRUCTURAL_SECTIONS = new Set<string>([
  'colors',
  'typography',
  'chatbot',
  'cmsFeed',
  'signupFloat',
  'storeSettings',
]);

const HERO_SECTIONS = new Set<string>([
  'hero',
  'heroSplit',
  'heroGallery',
  'heroWave',
  'heroNova',
  'heroLead',
  'heroLumina',
  'heroNeon',
  'heroQuimera',
]);

const FEATURE_SECTIONS = new Set<string>([
  'features',
  'featuresLumina',
  'featuresNeon',
  'featuresQuimera',
  'services',
  'howItWorks',
  'trustBadges',
  'platformShowcaseQuimera',
  'aiCapabilitiesQuimera',
  'industrySolutionsQuimera',
  'templatesPreviewQuimera',
  'contentManagerQuimera',
  'imageGeneratorQuimera',
  'chatbotWorkflowQuimera',
  'chatbotBuilderQuimera',
  'leadsManagerQuimera',
  'appointmentsQuimera',
  'bioPageQuimera',
  'emailMarketingQuimera',
]);

const CARD_GRID_SECTIONS = new Set<string>([
  'portfolio',
  'portfolioLumina',
  'portfolioNeon',
  'team',
  'products',
  'featuredProducts',
  'categoryGrid',
  'productGrid',
  'realEstateListings',
  'menu',
]);

const TESTIMONIAL_SECTIONS = new Set<string>([
  'testimonials',
  'testimonialsLumina',
  'testimonialsNeon',
  'testimonialsQuimera',
]);

const FAQ_SECTIONS = new Set<string>([
  'faq',
  'faqLumina',
  'faqNeon',
  'faqQuimera',
]);

const CTA_SECTIONS = new Set<string>([
  'cta',
  'ctaLumina',
  'ctaNeon',
  'ctaQuimera',
  'newsletter',
  'leads',
  'banner',
  'saleCountdown',
  'restaurantReservation',
]);

const GALLERY_SECTIONS = new Set<string>([
  'slideshow',
  'video',
  'logoBanner',
]);

const normalizeText = (value: unknown, fallback = ''): string => {
  if (value === null || value === undefined) return fallback;
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (typeof value === 'object' && !Array.isArray(value)) {
    const record = value as Record<string, unknown>;
    return normalizeText(record.es ?? record.en ?? Object.values(record)[0], fallback);
  }
  return fallback;
};

const stripHtml = (value: unknown): string =>
  normalizeText(value).replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, '').replace(/<[^>]+>/g, ' ');

const escapeHtml = (value: unknown): string =>
  stripHtml(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/\s+/g, ' ')
    .trim();

const escapeAttribute = (value: unknown): string =>
  normalizeText(value)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .trim();

const sanitizeFileName = (name: string): string =>
  normalizeText(name, 'quimera-project')
    .toLowerCase()
    .replace(/[^a-z0-9-_]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'quimera-project';

const isSafeUrl = (value: unknown): value is string => {
  const url = normalizeText(value).trim();
  if (!url) return false;
  if (url.startsWith('/') || url.startsWith('#')) return true;
  if (/^(https?:|mailto:|tel:|data:image\/)/i.test(url)) return true;
  return false;
};

const firstText = (data: SectionRecord | undefined, keys: string[], fallback = ''): string => {
  for (const key of keys) {
    const value = data?.[key];
    const text = stripHtml(value).trim();
    if (text) return text;
  }
  return fallback;
};

const firstUrl = (data: SectionRecord | undefined, keys: string[]): string | undefined => {
  for (const key of keys) {
    const value = normalizeText(data?.[key]).trim();
    if (isSafeUrl(value)) return value;
  }
  return undefined;
};

const getItems = (data: SectionRecord | undefined, keys = ['items', 'features', 'services', 'cards', 'products', 'projects', 'categories']): SectionRecord[] => {
  for (const key of keys) {
    const value = data?.[key];
    if (Array.isArray(value)) return value.filter(item => item && typeof item === 'object') as SectionRecord[];
    if (value && typeof value === 'object') {
      return Object.values(value as Record<string, unknown>).filter(item => item && typeof item === 'object') as SectionRecord[];
    }
  }
  return [];
};

const getColors = (project: Project) => {
  const theme = (project.theme || {}) as Record<string, any>;
  const globalColors = (theme.globalColors || {}) as Record<string, unknown>;
  const heroColors = ((project.data as any)?.hero?.colors || {}) as Record<string, unknown>;
  return {
    primary: normalizeText(globalColors.primary || heroColors.primary || heroColors.buttonBackground || '#4f46e5'),
    secondary: normalizeText(globalColors.secondary || '#0f172a'),
    accent: normalizeText(globalColors.accent || heroColors.accent || heroColors.primary || '#8b5cf6'),
    background: normalizeText(theme.pageBackground || globalColors.background || heroColors.background || '#0f172a'),
    surface: normalizeText(globalColors.surface || '#111827'),
    text: normalizeText(globalColors.text || heroColors.text || '#f8fafc'),
    textMuted: normalizeText(globalColors.textMuted || '#cbd5e1'),
    heading: normalizeText(globalColors.heading || heroColors.heading || globalColors.text || '#ffffff'),
    border: normalizeText(globalColors.border || 'rgba(148, 163, 184, 0.24)'),
  };
};

const cssColor = (value: string, fallback: string): string =>
  /^#([0-9a-f]{3,8})$/i.test(value) || /^rgba?\(/i.test(value) || /^hsla?\(/i.test(value)
    ? value
    : fallback;

const sectionBackgroundStyle = (data: SectionRecord | undefined): string => {
  const background = firstUrl(data, ['backgroundImageUrl', 'backgroundImage']);
  const color = normalizeText(data?.colors?.background || data?.backgroundColor).trim();
  const styles: string[] = [];
  if (background) {
    styles.push(`background-image: linear-gradient(rgba(15, 23, 42, 0.62), rgba(15, 23, 42, 0.62)), url(&quot;${escapeAttribute(background)}&quot;)`);
    styles.push('background-size: cover');
    styles.push(`background-position: ${escapeAttribute(data?.backgroundPosition || 'center')}`);
  } else if (color) {
    styles.push(`background: ${escapeAttribute(cssColor(color, 'transparent'))}`);
  }
  return styles.length ? ` style="${styles.join('; ')}"` : '';
};

const renderImage = (url: string | undefined, alt: string, className = 'section-image'): string => {
  if (!url) return '<div class="image-placeholder" aria-hidden="true"></div>';
  return `<img class="${className}" src="${escapeAttribute(url)}" alt="${escapeAttribute(alt)}" loading="lazy">`;
};

const renderButton = (label: unknown, href: unknown, className = 'button primary'): string => {
  const text = escapeHtml(label);
  if (!text) return '';
  const url = isSafeUrl(href) ? normalizeText(href) : '#';
  return `<a class="${className}" href="${escapeAttribute(url)}">${text}</a>`;
};

const renderSectionTitle = (data: SectionRecord | undefined, fallbackTitle: string): string => {
  const eyebrow = firstText(data, ['eyebrow', 'badgeText', 'label']);
  const title = firstText(data, ['title', 'headline', 'heading', 'name'], fallbackTitle);
  const description = firstText(data, ['subtitle', 'description', 'subheadline', 'body']);
  return `
    <div class="section-heading">
      ${eyebrow ? `<p class="eyebrow">${escapeHtml(eyebrow)}</p>` : ''}
      ${title ? `<h2>${escapeHtml(title)}</h2>` : ''}
      ${description ? `<p>${escapeHtml(description)}</p>` : ''}
    </div>`;
};

const renderHero = (section: string, data: SectionRecord | undefined, project: Project): string => {
  const projectName = resolveProjectName(project.name);
  const title = firstText(data, ['headline', 'title', 'heading'], projectName);
  const subtitle = firstText(data, ['subheadline', 'description', 'subtitle']);
  const badge = firstText(data, ['badgeText', 'eyebrow']);
  const imageUrl = firstUrl(data, ['imageUrl', 'headlineImageUrl', 'backgroundImageUrl', 'backgroundImage'])
    || getItems(data, ['slides', 'items'])
      .map(item => firstUrl(item, ['imageUrl', 'backgroundImage', 'backgroundImageUrl', 'src']))
      .find(Boolean);
  const primaryLabel = firstText(data, ['primaryCta', 'buttonText', 'ctaText'], 'Conoce mas');
  const secondaryLabel = firstText(data, ['secondaryCta', 'secondaryButtonText']);
  return `
    <section id="${escapeAttribute(section)}" class="section hero-section"${sectionBackgroundStyle(data)}>
      <div class="container hero-grid">
        <div class="hero-copy">
          ${badge ? `<p class="eyebrow">${escapeHtml(badge)}</p>` : ''}
          <h1>${escapeHtml(title)}</h1>
          ${subtitle ? `<p class="lead">${escapeHtml(subtitle)}</p>` : ''}
          <div class="button-row">
            ${renderButton(primaryLabel, data?.primaryCtaLink || data?.buttonUrl || '#')}
            ${secondaryLabel ? renderButton(secondaryLabel, data?.secondaryCtaLink || '#', 'button secondary') : ''}
          </div>
        </div>
        <div class="hero-media">
          ${renderImage(imageUrl, title, 'hero-image')}
        </div>
      </div>
    </section>`;
};

const renderCards = (section: string, data: SectionRecord | undefined, fallbackTitle: string): string => {
  const items = getItems(data);
  if (!items.length && !firstText(data, ['title', 'headline', 'description'])) return '';
  return `
    <section id="${escapeAttribute(section)}" class="section"${sectionBackgroundStyle(data)}>
      <div class="container">
        ${renderSectionTitle(data, fallbackTitle)}
        ${items.length ? `
          <div class="card-grid">
            ${items.map((item, index) => {
              const title = firstText(item, ['title', 'name', 'label'], `Item ${index + 1}`);
              const description = firstText(item, ['description', 'body', 'bio', 'caption', 'summary', 'role', 'price']);
              const image = firstUrl(item, ['imageUrl', 'image', 'src', 'thumbnailUrl', 'photoUrl']);
              return `
                <article class="card">
                  ${image ? renderImage(image, title, 'card-image') : ''}
                  <div class="card-body">
                    <h3>${escapeHtml(title)}</h3>
                    ${description ? `<p>${escapeHtml(description)}</p>` : ''}
                  </div>
                </article>`;
            }).join('')}
          </div>` : ''}
      </div>
    </section>`;
};

const renderTestimonials = (section: string, data: SectionRecord | undefined): string => {
  const items = getItems(data, ['items', 'testimonials']);
  return `
    <section id="${escapeAttribute(section)}" class="section"${sectionBackgroundStyle(data)}>
      <div class="container">
        ${renderSectionTitle(data, 'Testimonios')}
        <div class="card-grid">
          ${items.map(item => {
            const quote = firstText(item, ['quote', 'text', 'content', 'description']);
            const author = firstText(item, ['author', 'name', 'customerName']);
            return `
              <blockquote class="card testimonial">
                ${quote ? `<p>"${escapeHtml(quote)}"</p>` : ''}
                ${author ? `<cite>${escapeHtml(author)}</cite>` : ''}
              </blockquote>`;
          }).join('')}
        </div>
      </div>
    </section>`;
};

const renderFaq = (section: string, data: SectionRecord | undefined): string => {
  const items = getItems(data, ['items', 'faqs']);
  return `
    <section id="${escapeAttribute(section)}" class="section"${sectionBackgroundStyle(data)}>
      <div class="container narrow">
        ${renderSectionTitle(data, 'Preguntas frecuentes')}
        <div class="faq-list">
          ${items.map(item => `
            <details class="faq-item" open>
              <summary>${escapeHtml(firstText(item, ['question', 'title']))}</summary>
              <p>${escapeHtml(firstText(item, ['answer', 'description', 'body']))}</p>
            </details>`).join('')}
        </div>
      </div>
    </section>`;
};

const renderPricing = (section: string, data: SectionRecord | undefined): string => {
  const tiers = getItems(data, ['tiers', 'plans', 'items']);
  return `
    <section id="${escapeAttribute(section)}" class="section"${sectionBackgroundStyle(data)}>
      <div class="container">
        ${renderSectionTitle(data, 'Planes')}
        <div class="card-grid">
          ${tiers.map(tier => {
            const features = Array.isArray(tier.features) ? tier.features : [];
            return `
              <article class="card">
                <div class="card-body">
                  <h3>${escapeHtml(firstText(tier, ['name', 'title']))}</h3>
                  <p class="price">${escapeHtml(firstText(tier, ['price']))}</p>
                  <p>${escapeHtml(firstText(tier, ['description']))}</p>
                  ${features.length ? `<ul>${features.map((feature: unknown) => `<li>${escapeHtml(feature)}</li>`).join('')}</ul>` : ''}
                  ${renderButton(firstText(tier, ['buttonText', 'ctaText']), tier.buttonLink || '#')}
                </div>
              </article>`;
          }).join('')}
        </div>
      </div>
    </section>`;
};

const renderGallery = (section: string, data: SectionRecord | undefined): string => {
  const items = getItems(data, ['items', 'images', 'slides', 'logos']);
  const images = items
    .map(item => ({
      title: firstText(item, ['title', 'caption', 'altText', 'name']),
      url: firstUrl(item, ['imageUrl', 'url', 'src', 'logoUrl']),
    }))
    .filter(item => item.url);

  if (!images.length && !firstText(data, ['title', 'headline', 'description'])) return '';

  return `
    <section id="${escapeAttribute(section)}" class="section"${sectionBackgroundStyle(data)}>
      <div class="container">
        ${renderSectionTitle(data, section === 'video' ? 'Video' : 'Galeria')}
        <div class="gallery-grid">
          ${images.map(item => `
            <figure>
              ${renderImage(item.url, item.title || 'Gallery image', 'gallery-image')}
              ${item.title ? `<figcaption>${escapeHtml(item.title)}</figcaption>` : ''}
            </figure>`).join('')}
        </div>
      </div>
    </section>`;
};

const renderCta = (section: string, data: SectionRecord | undefined): string => {
  const title = firstText(data, ['title', 'headline', 'heading'], 'Hablemos');
  const description = firstText(data, ['description', 'subtitle', 'subheadline']);
  const buttonText = firstText(data, ['buttonText', 'primaryCta', 'ctaText'], 'Contactar');
  return `
    <section id="${escapeAttribute(section)}" class="section cta-section"${sectionBackgroundStyle(data)}>
      <div class="container narrow">
        <h2>${escapeHtml(title)}</h2>
        ${description ? `<p>${escapeHtml(description)}</p>` : ''}
        <div class="button-row centered">
          ${renderButton(buttonText, data?.buttonUrl || data?.buttonLink || data?.primaryCtaLink || '#')}
        </div>
      </div>
    </section>`;
};

const renderMap = (section: string, data: SectionRecord | undefined): string => {
  const address = firstText(data, ['address', 'businessAddress']);
  if (!address) return '';
  const title = firstText(data, ['title', 'headline'], 'Ubicacion');
  const description = firstText(data, ['description', 'subtitle'], 'Encuentranos aqui');
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
  return `
    <section id="${escapeAttribute(section)}" class="section"${sectionBackgroundStyle(data)}>
      <div class="container map-grid">
        <div>
          ${renderSectionTitle(data, title)}
          <div class="contact-stack">
            <p><strong>Direccion:</strong> ${escapeHtml(address)}</p>
            ${data?.phone ? `<p><strong>Telefono:</strong> ${escapeHtml(data.phone)}</p>` : ''}
            ${data?.email ? `<p><strong>Email:</strong> ${escapeHtml(data.email)}</p>` : ''}
            ${data?.businessHours ? `<p><strong>Horario:</strong> ${escapeHtml(data.businessHours)}</p>` : ''}
          </div>
          ${renderButton(data?.buttonText || 'Abrir en Google Maps', mapsUrl)}
        </div>
        <div class="map-card" aria-label="${escapeAttribute(description)}">
          <div class="map-grid-lines"></div>
          <div class="map-pin">Map</div>
          <p>${escapeHtml(description)}</p>
        </div>
      </div>
    </section>`;
};

const renderFooter = (data: SectionRecord | undefined, project: Project): string => {
  const name = firstText(data, ['title', 'companyName'], resolveProjectName(project.name));
  const description = firstText(data, ['description']);
  const copyright = firstText(data, ['copyrightText', 'copyright'], `Copyright ${new Date().getFullYear()} ${name}. All rights reserved.`);
  const columns = getItems(data, ['linkColumns', 'columns']);
  const socialLinks = getItems(data, ['socialLinks']);

  return `
    <footer class="site-footer">
      <div class="container footer-grid">
        <div>
          <h2>${escapeHtml(name)}</h2>
          ${description ? `<p>${escapeHtml(description)}</p>` : ''}
        </div>
        ${columns.map(column => {
          const links = getItems(column, ['links', 'items']);
          return `
            <nav>
              <h3>${escapeHtml(firstText(column, ['title', 'heading']))}</h3>
              ${links.map(link => renderButton(firstText(link, ['label', 'text', 'title']), link.url || link.href || '#', 'footer-link')).join('')}
            </nav>`;
        }).join('')}
        ${socialLinks.length ? `
          <nav>
            <h3>Social</h3>
            ${socialLinks.map(link => renderButton(firstText(link, ['label', 'platform', 'name']), link.url || link.href || '#', 'footer-link')).join('')}
          </nav>` : ''}
      </div>
      <p class="copyright">${escapeHtml(copyright)}</p>
    </footer>`;
};

const renderGenericSection = (section: string, data: SectionRecord | undefined): string => {
  const title = firstText(data, ['title', 'headline', 'heading', 'name']);
  const description = firstText(data, ['description', 'subtitle', 'subheadline', 'body']);
  const items = getItems(data);
  if (!title && !description && !items.length) return '';
  return `
    <section id="${escapeAttribute(section)}" class="section"${sectionBackgroundStyle(data)}>
      <div class="container">
        ${renderSectionTitle(data, title || section)}
        ${items.length ? `
          <div class="card-grid">
            ${items.slice(0, 12).map((item, index) => `
              <article class="card">
                <div class="card-body">
                  <h3>${escapeHtml(firstText(item, ['title', 'name', 'label'], `Item ${index + 1}`))}</h3>
                  <p>${escapeHtml(firstText(item, ['description', 'body', 'summary', 'text']))}</p>
                </div>
              </article>`).join('')}
          </div>` : ''}
      </div>
    </section>`;
};

const renderSection = (section: PageSection | string, rawData: SectionRecord | undefined, project: Project, language: string): string => {
  if (STRUCTURAL_SECTIONS.has(section)) return '';
  const data = rawData ? resolveI18nSectionData(rawData, language) as SectionRecord : undefined;
  if (HERO_SECTIONS.has(section)) return renderHero(section, data, project);
  if (FEATURE_SECTIONS.has(section)) return renderCards(section, data, section === 'services' ? 'Servicios' : 'Caracteristicas');
  if (CARD_GRID_SECTIONS.has(section)) return renderCards(section, data, section === 'menu' ? 'Menu' : 'Contenido');
  if (TESTIMONIAL_SECTIONS.has(section)) return renderTestimonials(section, data);
  if (FAQ_SECTIONS.has(section)) return renderFaq(section, data);
  if (section === 'pricing' || section === 'pricingLumina' || section === 'pricingNeon' || section === 'pricingQuimera') return renderPricing(section, data);
  if (GALLERY_SECTIONS.has(section)) return renderGallery(section, data);
  if (CTA_SECTIONS.has(section)) return renderCta(section, data);
  if (section === 'map') return renderMap(section, data);
  if (section === 'footer') return renderFooter(data, project);
  return renderGenericSection(section, data);
};

const getProjectPayload = (project: Project) => {
  const payload = project as Project & { data?: any };
  const nestedData = payload.data?.data && typeof payload.data.data === 'object' ? payload.data.data : payload.data;
  return {
    ...payload,
    data: nestedData || {},
    theme: payload.theme || payload.data?.theme || {},
    componentOrder: payload.componentOrder || payload.data?.componentOrder || [],
    sectionVisibility: payload.sectionVisibility || payload.data?.sectionVisibility || {},
    pages: payload.pages || payload.data?.pages || [],
    seoConfig: payload.seoConfig || payload.data?.seoConfig,
  } as Project;
};

const getExportPages = (project: Project): SitePage[] => {
  const pages = Array.isArray(project.pages) ? project.pages.filter(page => page && Array.isArray(page.sections)) : [];
  if (pages.length) {
    const home = pages.find(page => page.isHomePage || page.slug === '/' || page.id === project.activePageId) || pages[0];
    return [home, ...pages.filter(page => page !== home && page.type !== 'dynamic')];
  }

  return [{
    id: 'home',
    title: 'Home',
    slug: '/',
    sections: project.componentOrder || [],
    sectionData: project.data || {},
    isHomePage: true,
    showInNavigation: true,
  } as SitePage];
};

const getSectionData = (project: Project, page: SitePage, section: PageSection | string): SectionRecord | undefined => {
  const pageData = page.sectionData as SectionRecord | undefined;
  const projectData = project.data as SectionRecord | undefined;
  return pageData?.[section] || projectData?.[section];
};

const getPageAnchor = (page: SitePage): string =>
  page.slug === '/' ? 'home' : sanitizeFileName(page.slug || page.id || page.title);

const buildStyles = (project: Project): string => {
  const colors = getColors(project);
  const bodyFont = escapeAttribute(project.theme?.fontFamilyBody || project.theme?.fontFamily || 'Inter');
  const headingFont = escapeAttribute(project.theme?.fontFamilyHeader || bodyFont);
  const buttonFont = escapeAttribute(project.theme?.fontFamilyButton || bodyFont);
  return `
    :root {
      --primary: ${cssColor(colors.primary, '#4f46e5')};
      --secondary: ${cssColor(colors.secondary, '#0f172a')};
      --accent: ${cssColor(colors.accent, '#8b5cf6')};
      --background: ${cssColor(colors.background, '#0f172a')};
      --surface: ${cssColor(colors.surface, '#111827')};
      --text: ${cssColor(colors.text, '#f8fafc')};
      --muted: ${cssColor(colors.textMuted, '#cbd5e1')};
      --heading: ${cssColor(colors.heading, '#ffffff')};
      --border: ${cssColor(colors.border, 'rgba(148, 163, 184, 0.24)')};
    }
    * { box-sizing: border-box; }
    html { scroll-behavior: smooth; }
    body { margin: 0; font-family: "${bodyFont}", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: var(--background); color: var(--text); line-height: 1.6; }
    img { max-width: 100%; display: block; }
    a { color: inherit; }
    h1, h2, h3 { font-family: "${headingFont}", system-ui, sans-serif; color: var(--heading); line-height: 1.05; margin: 0; }
    h1 { font-size: clamp(2.75rem, 8vw, 6.5rem); letter-spacing: 0; }
    h2 { font-size: clamp(2rem, 5vw, 4rem); }
    h3 { font-size: 1.25rem; }
    p { margin: 0; color: var(--muted); }
    .site-header { position: sticky; top: 0; z-index: 10; backdrop-filter: blur(18px); background: color-mix(in srgb, var(--background) 82%, transparent); border-bottom: 1px solid var(--border); }
    .nav { min-height: 72px; display: flex; align-items: center; justify-content: space-between; gap: 24px; }
    .brand { font-weight: 800; color: var(--heading); text-decoration: none; font-size: 1.05rem; }
    .nav-links { display: flex; flex-wrap: wrap; align-items: center; justify-content: flex-end; gap: 14px; font-size: 0.92rem; }
    .nav-links a, .footer-link { color: var(--muted); text-decoration: none; }
    .nav-links a:hover, .footer-link:hover { color: var(--heading); }
    .container { width: min(1120px, calc(100% - 40px)); margin: 0 auto; }
    .narrow { width: min(820px, calc(100% - 40px)); text-align: center; }
    .section { padding: clamp(64px, 10vw, 128px) 0; border-bottom: 1px solid var(--border); background-repeat: no-repeat; }
    .hero-section { min-height: 82vh; display: flex; align-items: center; }
    .hero-grid, .map-grid { display: grid; grid-template-columns: minmax(0, 1.05fr) minmax(320px, 0.95fr); gap: clamp(28px, 6vw, 72px); align-items: center; }
    .hero-copy, .section-heading { display: grid; gap: 18px; }
    .section-heading { max-width: 760px; margin: 0 auto 44px; text-align: center; }
    .lead { font-size: clamp(1.05rem, 2vw, 1.35rem); max-width: 680px; }
    .eyebrow { color: var(--accent); font-size: 0.78rem; font-weight: 800; letter-spacing: 0.14em; text-transform: uppercase; }
    .button-row { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 10px; }
    .button-row.centered { justify-content: center; }
    .button { font-family: "${buttonFont}", system-ui, sans-serif; display: inline-flex; align-items: center; justify-content: center; min-height: 44px; padding: 0 18px; border-radius: 999px; border: 1px solid transparent; background: var(--primary); color: white; text-decoration: none; font-weight: 700; }
    .button.secondary { background: transparent; border-color: var(--border); color: var(--heading); }
    .hero-media, .card, .map-card { border: 1px solid var(--border); background: color-mix(in srgb, var(--surface) 86%, transparent); border-radius: 24px; overflow: hidden; box-shadow: 0 24px 80px rgba(0, 0, 0, 0.22); }
    .hero-image { width: 100%; height: min(58vh, 620px); object-fit: cover; }
    .section-image, .card-image, .gallery-image { width: 100%; height: 260px; object-fit: cover; }
    .image-placeholder { min-height: 320px; background: radial-gradient(circle at 20% 20%, var(--accent), transparent 35%), linear-gradient(135deg, var(--surface), var(--secondary)); }
    .card-grid, .gallery-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 20px; }
    .card-body { padding: 22px; display: grid; gap: 10px; }
    .testimonial cite { color: var(--heading); font-style: normal; font-weight: 700; }
    .faq-list { display: grid; gap: 12px; text-align: left; }
    .faq-item { border: 1px solid var(--border); border-radius: 18px; padding: 18px 20px; background: color-mix(in srgb, var(--surface) 86%, transparent); }
    .faq-item summary { cursor: pointer; color: var(--heading); font-weight: 800; }
    .price { font-size: 2rem; color: var(--heading); font-weight: 800; }
    .cta-section { text-align: center; }
    .contact-stack { display: grid; gap: 8px; margin: 24px 0; }
    .map-card { min-height: 360px; position: relative; display: grid; place-items: center; padding: 28px; text-align: center; isolation: isolate; }
    .map-grid-lines { position: absolute; inset: 0; opacity: 0.28; background-image: linear-gradient(var(--border) 1px, transparent 1px), linear-gradient(90deg, var(--border) 1px, transparent 1px); background-size: 32px 32px; z-index: -1; }
    .map-pin { width: 88px; height: 88px; border-radius: 28px; display: grid; place-items: center; background: var(--primary); color: white; font-weight: 900; box-shadow: 0 20px 60px color-mix(in srgb, var(--primary) 42%, transparent); }
    .site-footer { padding: 56px 0 28px; background: color-mix(in srgb, var(--secondary) 84%, black); border-top: 1px solid var(--border); }
    .footer-grid { display: grid; grid-template-columns: 1.4fr repeat(3, minmax(120px, 1fr)); gap: 28px; }
    .footer-grid nav { display: grid; gap: 8px; align-content: start; }
    .copyright { width: min(1120px, calc(100% - 40px)); margin: 32px auto 0; padding-top: 20px; border-top: 1px solid var(--border); font-size: 0.9rem; }
    @media (max-width: 900px) {
      .nav { align-items: flex-start; flex-direction: column; padding: 16px 0; }
      .hero-grid, .map-grid, .footer-grid { grid-template-columns: 1fr; }
      .card-grid, .gallery-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      .hero-section { min-height: auto; }
    }
    @media (max-width: 640px) {
      .container, .narrow { width: min(100% - 28px, 1120px); }
      .section { padding: 56px 0; }
      .card-grid, .gallery-grid { grid-template-columns: 1fr; }
      .nav-links { gap: 10px; }
      .button { width: 100%; }
      .hero-image { height: 320px; }
    }`;
};

export const generateProjectHtml = (rawProject: Project, options: HtmlExportOptions = {}): string => {
  const language = options.language || 'es';
  const project = getProjectPayload(rawProject);
  const pages = getExportPages(project);
  const homePage = pages[0];
  const projectName = escapeHtml(resolveProjectName(project.name));
  const seoTitle = escapeHtml((project.seoConfig as any)?.title || homePage?.seo?.title || resolveProjectName(project.name));
  const description = escapeHtml((project.seoConfig as any)?.description || homePage?.seo?.description || firstText((project.data as any)?.hero, ['subheadline', 'description']));
  const favicon = isSafeUrl(project.faviconUrl) ? `<link rel="icon" href="${escapeAttribute(project.faviconUrl)}">` : '';
  const navPages = pages.filter(page => page.showInNavigation !== false);

  const body = pages.map((page, pageIndex) => {
    const sections = Array.from(new Set((page.sections || project.componentOrder || []).filter(Boolean)));
    const pageTitle = pageIndex > 0 ? `
      <section id="${escapeAttribute(getPageAnchor(page))}" class="section">
        <div class="container narrow">
          <p class="eyebrow">Pagina</p>
          <h2>${escapeHtml(page.title || page.slug || page.id)}</h2>
        </div>
      </section>` : '';
    return `
      ${pageTitle}
      ${sections.map(section => {
        if (project.sectionVisibility?.[section as PageSection] === false) return '';
        if ((project as any).componentStatus?.[section] === false) return '';
        return renderSection(section, getSectionData(project, page, section), project, language);
      }).join('')}`;
  }).join('');

  return `<!DOCTYPE html>
<html lang="${escapeAttribute(language)}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${seoTitle}</title>
  ${description ? `<meta name="description" content="${escapeAttribute(description)}">` : ''}
  ${favicon}
  <style>
${buildStyles(project)}
  </style>
</head>
<body>
  <header class="site-header">
    <div class="container nav">
      <a class="brand" href="#home">${projectName}</a>
      <nav class="nav-links" aria-label="Main navigation">
        ${navPages.map(page => `<a href="#${escapeAttribute(getPageAnchor(page))}">${escapeHtml(page.title || page.slug || 'Page')}</a>`).join('')}
      </nav>
    </div>
  </header>
  <main id="home">
${body || renderHero('hero', (project.data as any)?.hero, project)}
  </main>
</body>
</html>`;
};

export const exportProjectAsHtml = generateProjectHtml;

export const downloadProjectAsHtml = (project: Project, options: HtmlExportOptions = {}) => {
  const html = generateProjectHtml(project, options);
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${sanitizeFileName(resolveProjectName(project.name))}.html`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

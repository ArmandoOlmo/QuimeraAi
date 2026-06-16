/**
 * BlogHub
 * Sección interna del dashboard para leer los artículos del blog
 * Reutiliza los mismos artículos de AppContentContext (que se publican en /blog)
 */

import React, { useState, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { marked } from 'marked';
import { sanitizeHtml } from '../../utils/sanitize';
import { useSafeAppContent } from '../../contexts/appContent';
import { useUI } from '../../contexts/core/UIContext';
import { AppArticle, AppArticleCategory } from '../../types/appContent';
import DashboardSidebar from './DashboardSidebar';
import HeaderBackButton from '../ui/HeaderBackButton';
import MobileSearchModal from '../ui/MobileSearchModal';
import { SettingsStatCard } from './settings/SettingsStatCard';
import { FilterChipRow } from './filters';
import type { FilterChipOption } from './filters';
import {
  Menu,
  Search,
  Star,
  Calendar,
  Clock,
  User,
  Tag,
  FileText,
  ArrowRight,
  ExternalLink,
  Filter,
  Newspaper,
  ChevronDown,
  Loader2,
} from 'lucide-react';

// ─── Category styling ────────────────────────────────────────────────────────

const CATEGORY_LABELS: Record<AppArticleCategory, string> = {
  blog: 'Blog',
  news: 'News',
  tutorial: 'Tutorial',
  'case-study': 'Case Study',
  announcement: 'Announcement',
  guide: 'Guide',
  update: 'Product Update',
  help: 'Help Center',
};

const CATEGORY_COLORS: Record<AppArticleCategory, { bg: string; text: string; border: string }> = {
  blog: { bg: 'bg-blue-500/10', text: 'text-blue-500', border: 'border-blue-500/20' },
  news: { bg: 'bg-purple-500/10', text: 'text-purple-500', border: 'border-purple-500/20' },
  tutorial: { bg: 'bg-emerald-500/10', text: 'text-emerald-500', border: 'border-emerald-500/20' },
  'case-study': { bg: 'bg-amber-500/10', text: 'text-amber-500', border: 'border-amber-500/20' },
  announcement: { bg: 'bg-rose-500/10', text: 'text-rose-500', border: 'border-rose-500/20' },
  guide: { bg: 'bg-cyan-500/10', text: 'text-cyan-500', border: 'border-cyan-500/20' },
  update: { bg: 'bg-indigo-500/10', text: 'text-indigo-500', border: 'border-indigo-500/20' },
  help: { bg: 'bg-orange-500/10', text: 'text-orange-500', border: 'border-orange-500/20' },
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(dateStr: string, locale: string = 'es'): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString(locale === 'es' ? 'es-ES' : 'en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function getMonthYear(dateStr: string, locale: string = 'es'): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString(locale === 'es' ? 'es-ES' : 'en-US', {
    year: 'numeric',
    month: 'long',
  });
}

function groupByMonth(articles: AppArticle[], locale: string): { label: string; articles: AppArticle[] }[] {
  const grouped: Record<string, AppArticle[]> = {};
  articles.forEach((a) => {
    const key = getMonthYear(a.publishedAt || a.createdAt, locale);
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(a);
  });
  return Object.entries(grouped).map(([label, arts]) => ({ label, articles: arts }));
}

// ─── Main Component ──────────────────────────────────────────────────────────

const BlogHub: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { setView } = useUI();
  const appContent = useSafeAppContent();
  const articles = appContent?.articles || [];
  const isLoading = appContent?.isLoadingArticles || false;
  const currentLang = (i18n.language?.startsWith('es') ? 'es' : 'en') as 'es' | 'en';

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'all' | AppArticleCategory>('all');
  const [selectedArticle, setSelectedArticle] = useState<AppArticle | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // Scroll to top when selecting an article
  useEffect(() => {
    if (selectedArticle) {
      const main = document.getElementById('blog-hub-main');
      main?.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [selectedArticle]);

  // Load articles on mount
  useEffect(() => {
    if (appContent?.loadArticles) {
      appContent.loadArticles();
    }
  }, []);

  // Only published articles in the current language
  const publishedArticles = useMemo(() => {
    return articles.filter((a) => a.status === 'published' && a.language === currentLang);
  }, [articles, currentLang]);

  // Filtered articles
  const filteredArticles = useMemo(() => {
    let filtered = publishedArticles;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (a) =>
          a.title.toLowerCase().includes(query) ||
          a.excerpt.toLowerCase().includes(query) ||
          a.tags.some((tag) => tag.toLowerCase().includes(query))
      );
    }

    if (categoryFilter !== 'all') {
      filtered = filtered.filter((a) => a.category === categoryFilter);
    }

    // Sort by date (newest first)
    filtered.sort(
      (a, b) =>
        new Date(b.publishedAt || b.createdAt).getTime() -
        new Date(a.publishedAt || a.createdAt).getTime()
    );

    return filtered;
  }, [publishedArticles, searchQuery, categoryFilter]);

  // Featured article
  const featuredArticle = useMemo(() => {
    return publishedArticles.find((a) => a.featured) || null;
  }, [publishedArticles]);

  const featuredCount = useMemo(
    () => publishedArticles.filter((a) => a.featured).length,
    [publishedArticles]
  );

  const isFiltering = searchQuery.length > 0 || categoryFilter !== 'all';

  // Available categories
  const availableCategories = useMemo(() => {
    const cats = new Set(publishedArticles.map((a) => a.category));
    return Array.from(cats);
  }, [publishedArticles]);

  const categoryFilterOptions = useMemo<FilterChipOption<'all' | AppArticleCategory>[]>(() => {
    const categoryCounts = publishedArticles.reduce<Record<string, number>>((acc, article) => {
      acc[article.category] = (acc[article.category] || 0) + 1;
      return acc;
    }, {});

    return [
      { id: 'all', label: t('common.all', 'Todos'), count: publishedArticles.length },
      ...availableCategories.map((cat) => ({
        id: cat,
        label: t(`blog.categories.${cat}`, cat),
        count: categoryCounts[cat],
      })),
    ];
  }, [availableCategories, publishedArticles, t]);

  // Related articles for the currently selected article
  const relatedArticles = useMemo(() => {
    if (!selectedArticle) return [];
    return publishedArticles
      .filter(
        (a) =>
          a.category === selectedArticle.category &&
          a.id !== selectedArticle.id &&
          a.language === selectedArticle.language
      )
      .slice(0, 3);
  }, [publishedArticles, selectedArticle]);

  // Grouped by month for the list view
  const groupedArticles = useMemo(() => {
    const articlesToGroup = filteredArticles.filter(
      (a) =>
        !featuredArticle || a.id !== featuredArticle.id || searchQuery || categoryFilter !== 'all'
    );
    return groupByMonth(articlesToGroup, currentLang);
  }, [filteredArticles, featuredArticle, searchQuery, categoryFilter, currentLang]);

  // Convert markdown to HTML
  const articleHtml = useMemo(() => {
    if (!selectedArticle?.content) return '';
    const rawHtml = marked.parse(selectedArticle.content) as string;
    const processedHtml = rawHtml.replace(
      /<a href="(.*?)".*?>(.*?)<\/a>/g,
      '<a href="$1" target="_blank" rel="noopener noreferrer" class="quimera-status-card-link hover:opacity-80 font-medium underline underline-offset-4 transition-colors">$2</a>'
    );
    return processedHtml;
  }, [selectedArticle?.content]);

  // ═══════════════════════════════════════════════════════════════════════════
  // ARTICLE READER VIEW
  // ═══════════════════════════════════════════════════════════════════════════

  if (selectedArticle) {
    const catColors = CATEGORY_COLORS[selectedArticle.category] || CATEGORY_COLORS.blog;

    return (
      <div className="flex h-screen bg-q-bg text-foreground">
        <DashboardSidebar isMobileOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} />

        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Header */}
          <header className="quimera-dashboard-header-bar h-14 px-4 sm:px-6 flex items-center z-20 sticky top-0">
            <div className="flex items-center gap-2 sm:gap-4">
              <button
                onClick={() => setIsMobileMenuOpen(true)}
                className="lg:hidden h-10 w-10 flex items-center justify-center text-q-text-muted hover:text-foreground hover:bg-secondary/80 rounded-xl transition-colors"
              >
                <Menu className="w-5 h-5" />
              </button>
              <HeaderBackButton onClick={() => setSelectedArticle(null)} label={t('blog.backToBlog', 'Volver al Blog')} />
            </div>

            <div className="ml-auto flex items-center gap-2">
              <a
                href={`/blog/${selectedArticle.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium bg-secondary/50 hover:bg-secondary text-q-text-muted hover:text-foreground rounded-lg transition-colors"
              >
                <ExternalLink size={14} />
                <span className="hidden sm:inline">{t('blog.viewPublic', 'Ver en la web')}</span>
              </a>
            </div>
          </header>

          <main id="blog-hub-main" className="flex-1 overflow-y-auto scroll-smooth">
            {/* Hero Image */}
            <div className="relative w-full h-48 sm:h-64 md:h-80 overflow-hidden bg-secondary/30">
              {selectedArticle.featuredImage ? (
                <>
                  <img
                    src={selectedArticle.featuredImage}
                    alt={selectedArticle.title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />
                </>
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-[color-mix(in_srgb,var(--quimera-status-accent-from)_10%,transparent)] via-secondary/20 to-transparent flex items-center justify-center">
                  <Newspaper className="w-16 h-16 text-q-text-muted/20" />
                </div>
              )}

              {/* Category & Date overlay */}
              <div className="absolute bottom-4 left-4 sm:left-8 flex items-center gap-3">
                <span
                  className={`px-3 py-1 text-xs font-bold uppercase tracking-wider rounded-full ${catColors.bg} ${catColors.text} border ${catColors.border}`}
                >
                  {t(`blog.categories.${selectedArticle.category}`, selectedArticle.category)}
                </span>
                {selectedArticle.showDate !== false && (
                  <span className="flex items-center gap-1.5 text-xs text-q-text-muted bg-q-bg/80 backdrop-blur-sm px-3 py-1 rounded-full">
                    <Calendar size={12} />
                    {formatDate(selectedArticle.publishedAt || selectedArticle.createdAt, currentLang)}
                  </span>
                )}
              </div>
            </div>

            <div className="max-w-4xl mx-auto px-4 sm:px-8 py-8 sm:py-12">
              {/* Title & Excerpt */}
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-foreground mb-4 leading-tight tracking-tight">
                {selectedArticle.title}
              </h1>
              <p className="text-lg text-q-text-muted mb-8 leading-relaxed">
                {selectedArticle.excerpt}
              </p>

              {/* Author & Read time */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-8 border-b border-q-border mb-10">
                {selectedArticle.showAuthor !== false && (
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[var(--quimera-status-accent-from)]/50 to-[var(--quimera-status-accent-from)]/20 p-[2px]">
                      <div className="w-full h-full bg-q-bg rounded-full overflow-hidden flex items-center justify-center">
                        {selectedArticle.authorImage ? (
                          <img
                            src={selectedArticle.authorImage}
                            alt={selectedArticle.author}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <User size={16} className="text-q-text-muted" />
                        )}
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">{selectedArticle.author}</p>
                      <p className="text-xs text-q-text-muted">{t('blog.author', 'Autor')}</p>
                    </div>
                  </div>
                )}
                {selectedArticle.readTime && (
                  <div className="flex items-center gap-2 text-sm text-q-text-muted bg-secondary/50 px-3 py-1.5 rounded-lg">
                    <Clock size={14} />
                    <span>{t('blog.minRead', { time: selectedArticle.readTime })}</span>
                  </div>
                )}
              </div>

              {/* Article Body */}
              <div
                className="prose prose-neutral dark:prose-invert prose-lg max-w-none
                  prose-headings:font-bold prose-headings:text-foreground
                  prose-h2:text-3xl prose-h2:mt-12 prose-h2:mb-6
                  prose-h3:text-xl prose-h3:mt-8
                  prose-p:leading-relaxed prose-p:text-q-text-muted
                  prose-li:text-q-text-muted
                  prose-img:rounded-xl
                  prose-blockquote:border-[var(--quimera-status-accent-from)] prose-blockquote:bg-[color-mix(in_srgb,var(--quimera-status-accent-from)_8%,transparent)] prose-blockquote:py-2 prose-blockquote:px-6 prose-blockquote:rounded-r-xl prose-blockquote:not-italic
                  prose-hr:border-q-border
                  prose-strong:text-foreground
                  prose-code:quimera-status-card-accent-text prose-code:bg-[color-mix(in_srgb,var(--quimera-status-accent-from)_12%,transparent)] prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-md prose-code:text-sm prose-code:font-normal prose-code:before:content-none prose-code:after:content-none"
                dangerouslySetInnerHTML={{ __html: sanitizeHtml(articleHtml) }}
              />

              {/* Tags */}
              {selectedArticle.tags && selectedArticle.tags.length > 0 && (
                <div className="mt-12 pt-8 border-t border-q-border">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Tag size={16} className="text-q-text-muted" />
                    {selectedArticle.tags.map((tag) => (
                      <button
                        key={tag}
                        onClick={() => {
                          setSearchQuery(tag);
                          setSelectedArticle(null);
                        }}
                        className="px-3 py-1.5 bg-secondary/50 hover:bg-secondary text-sm text-q-text-muted hover:text-foreground rounded-lg border border-q-border transition-colors"
                      >
                        #{tag}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Related Articles */}
              {relatedArticles.length > 0 && (
                <div className="mt-16 pt-8 border-t border-q-border">
                  <h3 className="text-xl font-bold text-foreground mb-6 flex items-center gap-3">
                    {t('blog.relatedArticles', 'Artículos Relacionados')}
                    <div className="h-px flex-1 bg-border" />
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {relatedArticles.map((article) => (
                      <ArticleCard
                        key={article.id}
                        article={article}
                        compact
                        lang={currentLang}
                        onClick={() => setSelectedArticle(article)}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </main>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // BLOG LIST VIEW (main view)
  // ═══════════════════════════════════════════════════════════════════════════

  return (
    <div className="flex h-screen bg-q-bg text-foreground">
      <DashboardSidebar isMobileOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} />

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="quimera-dashboard-header-bar h-14 px-4 sm:px-6 flex items-center z-20 sticky top-0">
          <div className="flex items-center gap-2 sm:gap-4">
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="lg:hidden h-10 w-10 flex items-center justify-center text-q-text-muted hover:text-foreground hover:bg-secondary/80 rounded-xl transition-colors touch-manipulation"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2">
              <Newspaper className="w-5 h-5 quimera-dashboard-header-icon" strokeWidth={2} />
              <h1 className="text-lg font-semibold text-foreground hidden sm:block">
                Blog
              </h1>
            </div>
          </div>

          {/* Right actions */}
          <div className="ml-auto flex items-center gap-2">
            {/* Search trigger */}
            <button
              onClick={() => setIsSearchOpen(true)}
              className="h-9 w-9 flex items-center justify-center rounded-lg text-q-text-muted hover:text-foreground hover:bg-secondary transition-colors"
              title={t('blog.searchPlaceholder', 'Buscar artículos...')}
            >
              <Search className="w-4 h-4" />
            </button>

            {/* Filter toggle */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-2 sm:px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                showFilters || categoryFilter !== 'all'
                  ? 'bg-[color-mix(in_srgb,var(--quimera-status-accent-from)_15%,transparent)] quimera-status-card-accent-text border border-[color-mix(in_srgb,var(--quimera-status-accent-from)_30%,transparent)]'
                  : 'bg-secondary/50 hover:bg-secondary text-q-text-muted hover:text-foreground'
              }`}
            >
              <Filter size={14} />
              <span className="hidden sm:inline">{t('common.filters', 'Filtros')}</span>
              {categoryFilter !== 'all' && (
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--quimera-status-accent-from)]" />
              )}
            </button>
            <HeaderBackButton onClick={() => setView('dashboard')} />
          </div>
        </header>

        <MobileSearchModal
          isOpen={isSearchOpen}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onClose={() => setIsSearchOpen(false)}
          placeholder={t('blog.searchPlaceholder', 'Buscar artículos...')}
        />

        {/* Filters panel */}
        {showFilters && (
          <div className="px-4 sm:px-6 py-3 border-b border-q-border bg-q-surface/40 animate-slide-down">
            {/* Category filters */}
            <FilterChipRow
              options={categoryFilterOptions}
              value={categoryFilter}
              onChange={setCategoryFilter}
            />
          </div>
        )}

        <main id="blog-hub-main" className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 scroll-smooth">
          <div className="max-w-6xl mx-auto space-y-8">
            {isLoading ? (
              <div className="flex justify-center items-center h-64">
                <Loader2 className="animate-spin w-10 h-10 quimera-status-card-accent-text" />
              </div>
            ) : publishedArticles.length === 0 ? (
              /* Empty state */
              <div className="text-center py-24 quimera-dashboard-panel-card border-dashed p-8">
                <Newspaper size={48} className="text-q-text-muted mx-auto mb-6" strokeWidth={1.5} />
                <h3 className="text-2xl font-bold text-foreground mb-3">
                  {t('blog.noArticles', 'No hay artículos publicados')}
                </h3>
                <p className="text-q-text-muted max-w-md mx-auto">
                  {t('blog.comingSoon', 'Próximamente encontrarás contenido interesante aquí. ¡Vuelve pronto!')}
                </p>
              </div>
            ) : filteredArticles.length === 0 ? (
              /* No results state */
              <div className="text-center py-24 quimera-dashboard-panel-card border-dashed p-8">
                <Search size={48} className="text-q-text-muted mx-auto mb-6" strokeWidth={1.5} />
                <h3 className="text-xl font-bold text-foreground mb-3">
                  {t('blog.noResults', 'No se encontraron artículos')}
                </h3>
                <p className="text-q-text-muted mb-6">
                  {t('blog.tryDifferent', 'Intenta ajustar tu búsqueda o filtros.')}
                </p>
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setCategoryFilter('all');
                  }}
                  className="quimera-status-card-link font-semibold hover:underline"
                >
                  {t('common.clearAll', 'Limpiar todo')}
                </button>
              </div>
            ) : (
              <>
                {/* Stats */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                  <SettingsStatCard
                    label={t('blog.articles', 'artículos')}
                    value={publishedArticles.length}
                    icon={Newspaper}
                  />
                  <SettingsStatCard
                    label={t('blog.featured', 'Destacados')}
                    value={featuredCount}
                    icon={Star}
                  />
                  <SettingsStatCard
                    label={t('common.categories', 'Categorías')}
                    value={availableCategories.length}
                    icon={Tag}
                  />
                  <SettingsStatCard
                    label={isFiltering ? t('blog.results', 'Resultados') : t('blog.showing', 'Mostrando')}
                    value={filteredArticles.length}
                    icon={isFiltering ? Search : FileText}
                  />
                </div>

                {/* Featured Article Hero */}
                {featuredArticle && !searchQuery && categoryFilter === 'all' && (
                  <FeaturedArticleHero
                    article={featuredArticle}
                    lang={currentLang}
                    onClick={() => setSelectedArticle(featuredArticle)}
                  />
                )}

                {/* Grouped Articles by Month */}
                {groupedArticles.map((group) => (
                  <div key={group.label}>
                    {/* Month Header */}
                    <div className="flex items-center gap-3 mb-4">
                      <h2 className="text-sm font-bold text-q-text-muted uppercase tracking-wider whitespace-nowrap">
                        {group.label}
                      </h2>
                      <div className="h-px flex-1 bg-border" />
                    </div>

                    {/* Articles Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-5 mb-8">
                      {group.articles.map((article) => (
                        <ArticleCard
                          key={article.id}
                          article={article}
                          lang={currentLang}
                          onClick={() => setSelectedArticle(article)}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

// ─── Featured Article Hero Component ─────────────────────────────────────────

interface FeaturedArticleHeroProps {
  article: AppArticle;
  lang: string;
  onClick: () => void;
}

const FeaturedArticleHero: React.FC<FeaturedArticleHeroProps> = ({ article, lang, onClick }) => {
  const { t } = useTranslation();
  const catColors = CATEGORY_COLORS[article.category] || CATEGORY_COLORS.blog;

  return (
    <div
      onClick={onClick}
      className="group relative cursor-pointer overflow-hidden rounded-xl sm:rounded-2xl border border-q-border/60 bg-q-surface/80 backdrop-blur-xl hover:border-q-border transition-all duration-300"
    >
      <div
        className="quimera-status-card-accent-bg quimera-status-card-blob absolute -top-12 -right-12 w-40 h-40 sm:w-48 sm:h-48 rounded-full blur-2xl group-hover:scale-110 transition-all duration-500 pointer-events-none"
        aria-hidden="true"
      />
      <div className="relative z-10 grid lg:grid-cols-2 gap-0">
        {/* Image */}
        <div className="relative h-56 sm:h-64 lg:h-80 overflow-hidden bg-secondary/30">
          {article.featuredImage ? (
            <img
              src={article.featuredImage}
              alt={article.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-[color-mix(in_srgb,var(--quimera-status-accent-from)_10%,transparent)] via-secondary/20 to-transparent flex items-center justify-center">
              <Newspaper className="w-20 h-20 text-q-text-muted/15" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent lg:bg-gradient-to-r lg:from-transparent lg:via-transparent lg:to-background/80" />

          {/* Featured badge */}
          <div className="absolute top-4 left-4 flex items-center gap-1.5 px-3 py-1.5 quimera-guide-cta text-[10px] font-bold uppercase tracking-widest rounded-full">
            <Star size={12} className="fill-current" />
            {t('blog.featured', 'Destacado')}
          </div>
        </div>

        {/* Content */}
        <div className="p-6 sm:p-8 flex flex-col justify-center bg-q-surface/80">
          <div className="flex items-center gap-3 mb-4">
            <span className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-full ${catColors.bg} ${catColors.text} border ${catColors.border}`}>
              {t(`blog.categories.${article.category}`, article.category)}
            </span>
            {article.showDate !== false && (
              <span className="flex items-center gap-1.5 text-xs text-q-text-muted">
                <Calendar size={12} />
                {formatDate(article.publishedAt || article.createdAt, lang)}
              </span>
            )}
          </div>

          <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-3 leading-tight group-hover:text-[var(--quimera-status-accent-from)] transition-colors duration-300">
            {article.title}
          </h2>

          <p className="text-q-text-muted mb-6 line-clamp-3 leading-relaxed">
            {article.excerpt}
          </p>

          <div className="flex items-center justify-between mt-auto">
            {article.showAuthor !== false && (
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-secondary overflow-hidden flex items-center justify-center">
                  {article.authorImage ? (
                    <img src={article.authorImage} alt={article.author} className="w-full h-full object-cover" />
                  ) : (
                    <User size={14} className="text-q-text-muted" />
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">{article.author}</p>
                  {article.readTime && (
                    <p className="text-xs text-q-text-muted flex items-center gap-1">
                      <Clock size={10} /> {article.readTime} min
                    </p>
                  )}
                </div>
              </div>
            )}

            <div className="flex items-center gap-2 text-sm font-semibold quimera-status-card-link group-hover:gap-3 transition-all duration-300">
              {t('blog.readArticle', 'Leer artículo')}
              <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Article Card Component ──────────────────────────────────────────────────

interface ArticleCardProps {
  article: AppArticle;
  lang: string;
  compact?: boolean;
  onClick: () => void;
}

const ArticleCard: React.FC<ArticleCardProps> = ({ article, lang, compact = false, onClick }) => {
  const { t } = useTranslation();
  const catColors = CATEGORY_COLORS[article.category] || CATEGORY_COLORS.blog;

  return (
    <article
      onClick={onClick}
      className="group relative flex flex-col h-full overflow-hidden rounded-xl sm:rounded-2xl border border-q-border/60 bg-q-surface/80 backdrop-blur-xl hover:border-q-border transition-all duration-300 cursor-pointer"
    >
      <div
        className="quimera-status-card-accent-bg quimera-status-card-blob absolute -top-8 -right-8 w-24 h-24 sm:w-32 sm:h-32 rounded-full blur-2xl group-hover:scale-110 transition-all duration-500 pointer-events-none"
        aria-hidden="true"
      />
      {/* Image */}
      <div className={`relative z-10 overflow-hidden bg-secondary/30 ${compact ? 'h-32' : 'h-40 sm:h-44'}`}>
        {article.featuredImage ? (
          <img
            src={article.featuredImage}
            alt={article.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-secondary/50 to-secondary/20 flex items-center justify-center">
            <FileText className="w-8 h-8 text-q-text-muted/20" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-card/80 to-transparent opacity-60" />

        {/* Category badge */}
        <div className="absolute top-3 left-3">
          <span className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full ${catColors.bg} ${catColors.text} border ${catColors.border} backdrop-blur-sm`}>
            {t(`blog.categories.${article.category}`, article.category)}
          </span>
        </div>

        {/* Featured tag */}
        {article.featured && (
          <div className="absolute top-3 right-3">
            <Star size={14} className="quimera-status-card-accent-text fill-[var(--quimera-status-accent-from)]" />
          </div>
        )}
      </div>

      {/* Content */}
      <div className={`relative z-10 flex-1 flex flex-col ${compact ? 'p-3' : 'p-4 sm:p-5'}`}>
        <div className="flex items-center gap-3 text-xs text-q-text-muted mb-2">
          {article.showDate !== false && (
            <span className="flex items-center gap-1">
              <Calendar size={11} />
              {formatDate(article.publishedAt || article.createdAt, lang)}
            </span>
          )}
          {article.readTime && (
            <>
              <span className="w-1 h-1 rounded-full bg-border" />
              <span className="flex items-center gap-1">
                <Clock size={11} />
                {t('blog.minRead', { time: article.readTime })}
              </span>
            </>
          )}
        </div>

        <h3 className={`font-bold text-foreground mb-2 leading-snug group-hover:text-[var(--quimera-status-accent-from)] transition-colors duration-200 ${compact ? 'text-sm line-clamp-2' : 'text-base sm:text-lg line-clamp-2'}`}>
          {article.title}
        </h3>

        {!compact && (
          <p className="text-sm text-q-text-muted line-clamp-2 mb-3 flex-1">
            {article.excerpt}
          </p>
        )}

        <div className="flex items-center justify-between mt-auto pt-3 border-t border-q-border/50">
          {article.showAuthor !== false ? (
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-full bg-secondary overflow-hidden flex items-center justify-center flex-shrink-0">
                {article.authorImage ? (
                  <img src={article.authorImage} alt={article.author} className="w-full h-full object-cover" />
                ) : (
                  <User size={10} className="text-q-text-muted" />
                )}
              </div>
              <span className="text-xs text-q-text-muted truncate">{article.author}</span>
            </div>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-1 text-xs font-semibold quimera-status-card-link opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            {t('blog.read', 'Leer')}
            <ArrowRight size={12} className="group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>
      </div>
    </article>
  );
};

export default BlogHub;

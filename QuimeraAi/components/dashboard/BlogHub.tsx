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
import { AppArticle, AppArticleCategory } from '../../types/appContent';
import DashboardSidebar from './DashboardSidebar';
import {
  Menu,
  Search,
  Star,
  Calendar,
  Clock,
  User,
  Tag,
  FileText,
  ArrowLeft,
  ArrowRight,
  ExternalLink,
  X,
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
  const appContent = useSafeAppContent();
  const articles = appContent?.articles || [];
  const isLoading = appContent?.isLoadingArticles || false;
  const currentLang = (i18n.language?.startsWith('es') ? 'es' : 'en') as 'es' | 'en';

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'all' | AppArticleCategory>('all');
  const [selectedArticle, setSelectedArticle] = useState<AppArticle | null>(null);
  const [showFilters, setShowFilters] = useState(false);

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

  // Available categories
  const availableCategories = useMemo(() => {
    const cats = new Set(publishedArticles.map((a) => a.category));
    return Array.from(cats);
  }, [publishedArticles]);

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
      '<a href="$1" target="_blank" rel="noopener noreferrer" class="text-primary hover:opacity-80 font-medium underline underline-offset-4 decoration-primary/30 hover:decoration-primary transition-colors">$2</a>'
    );
    return processedHtml;
  }, [selectedArticle?.content]);

  // ═══════════════════════════════════════════════════════════════════════════
  // ARTICLE READER VIEW
  // ═══════════════════════════════════════════════════════════════════════════

  if (selectedArticle) {
    const catColors = CATEGORY_COLORS[selectedArticle.category] || CATEGORY_COLORS.blog;

    return (
      <div className="flex h-screen bg-background text-foreground">
        <DashboardSidebar isMobileOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} />

        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Header */}
          <header className="h-14 px-4 sm:px-6 border-b border-border flex items-center bg-background z-20 sticky top-0">
            <div className="flex items-center gap-2 sm:gap-4">
              <button
                onClick={() => setIsMobileMenuOpen(true)}
                className="lg:hidden h-10 w-10 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary/80 rounded-xl transition-colors"
              >
                <Menu className="w-5 h-5" />
              </button>
              <button
                onClick={() => setSelectedArticle(null)}
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors group"
              >
                <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
                {t('blog.backToBlog', 'Volver al Blog')}
              </button>
            </div>

            <div className="ml-auto flex items-center gap-2">
              <a
                href={`/blog/${selectedArticle.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium bg-secondary/50 hover:bg-secondary text-muted-foreground hover:text-foreground rounded-lg transition-colors"
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
                <div className="w-full h-full bg-gradient-to-br from-primary/10 via-secondary/20 to-primary/5 flex items-center justify-center">
                  <Newspaper className="w-16 h-16 text-muted-foreground/20" />
                </div>
              )}

              {/* Category & Date overlay */}
              <div className="absolute bottom-4 left-4 sm:left-8 flex items-center gap-3">
                <span
                  className={`px-3 py-1 text-xs font-bold uppercase tracking-wider rounded-full ${catColors.bg} ${catColors.text} border ${catColors.border}`}
                >
                  {CATEGORY_LABELS[selectedArticle.category] || selectedArticle.category}
                </span>
                {selectedArticle.showDate !== false && (
                  <span className="flex items-center gap-1.5 text-xs text-muted-foreground bg-background/80 backdrop-blur-sm px-3 py-1 rounded-full">
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
              <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
                {selectedArticle.excerpt}
              </p>

              {/* Author & Read time */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-8 border-b border-border mb-10">
                {selectedArticle.showAuthor !== false && (
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-primary/50 to-primary/20 p-[2px]">
                      <div className="w-full h-full bg-background rounded-full overflow-hidden flex items-center justify-center">
                        {selectedArticle.authorImage ? (
                          <img
                            src={selectedArticle.authorImage}
                            alt={selectedArticle.author}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <User size={16} className="text-muted-foreground" />
                        )}
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">{selectedArticle.author}</p>
                      <p className="text-xs text-muted-foreground">{t('blog.author', 'Autor')}</p>
                    </div>
                  </div>
                )}
                {selectedArticle.readTime && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground bg-secondary/50 px-3 py-1.5 rounded-lg">
                    <Clock size={14} />
                    <span>{selectedArticle.readTime} min read</span>
                  </div>
                )}
              </div>

              {/* Article Body */}
              <div
                className="prose prose-neutral dark:prose-invert prose-lg max-w-none
                  prose-headings:font-bold prose-headings:text-foreground
                  prose-h2:text-3xl prose-h2:mt-12 prose-h2:mb-6
                  prose-h3:text-xl prose-h3:mt-8
                  prose-p:leading-relaxed prose-p:text-muted-foreground
                  prose-li:text-muted-foreground
                  prose-img:rounded-xl prose-img:shadow-lg
                  prose-blockquote:border-primary prose-blockquote:bg-primary/5 prose-blockquote:py-2 prose-blockquote:px-6 prose-blockquote:rounded-r-xl prose-blockquote:not-italic
                  prose-hr:border-border
                  prose-strong:text-foreground
                  prose-code:text-primary prose-code:bg-primary/10 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-md prose-code:text-sm prose-code:font-normal prose-code:before:content-none prose-code:after:content-none"
                dangerouslySetInnerHTML={{ __html: sanitizeHtml(articleHtml) }}
              />

              {/* Tags */}
              {selectedArticle.tags && selectedArticle.tags.length > 0 && (
                <div className="mt-12 pt-8 border-t border-border">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Tag size={16} className="text-muted-foreground" />
                    {selectedArticle.tags.map((tag) => (
                      <button
                        key={tag}
                        onClick={() => {
                          setSearchQuery(tag);
                          setSelectedArticle(null);
                        }}
                        className="px-3 py-1.5 bg-secondary/50 hover:bg-secondary text-sm text-muted-foreground hover:text-foreground rounded-lg border border-border transition-colors"
                      >
                        #{tag}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Related Articles */}
              {relatedArticles.length > 0 && (
                <div className="mt-16 pt-8 border-t border-border">
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
    <div className="flex h-screen bg-background text-foreground">
      <DashboardSidebar isMobileOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} />

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-14 px-4 sm:px-6 border-b border-border flex items-center bg-background z-20 sticky top-0">
          <div className="flex items-center gap-2 sm:gap-4">
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="lg:hidden h-10 w-10 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary/80 rounded-xl transition-colors touch-manipulation"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2">
              <Newspaper className="text-primary w-5 h-5" />
              <h1 className="text-lg font-semibold text-foreground hidden sm:block">
                Blog
              </h1>
            </div>
            <span className="hidden sm:inline-flex px-2 py-0.5 text-xs font-medium bg-primary/10 text-primary rounded-full">
              {publishedArticles.length} {publishedArticles.length === 1 ? 'artículo' : 'artículos'}
            </span>
          </div>

          {/* Search */}
          <div className="hidden md:flex flex-1 justify-center mx-4">
            <div className="flex items-center gap-2 w-full max-w-md bg-muted/50 rounded-lg px-3 py-2">
              <Search className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <input
                type="text"
                placeholder={t('blog.searchPlaceholder', 'Buscar artículos...')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 bg-transparent outline-none text-sm min-w-0 text-foreground placeholder:text-muted-foreground"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="text-muted-foreground hover:text-foreground flex-shrink-0"
                >
                  <X size={16} />
                </button>
              )}
            </div>
          </div>

          {/* Filter toggle */}
          <div className="ml-auto flex items-center gap-2">
            {/* Mobile search */}
            <div className="md:hidden">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`h-9 w-9 flex items-center justify-center rounded-lg transition-colors ${
                  showFilters ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                }`}
              >
                <Search className="w-4 h-4" />
              </button>
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`hidden md:flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                showFilters || categoryFilter !== 'all'
                  ? 'bg-primary/10 text-primary border border-primary/20'
                  : 'bg-secondary/50 hover:bg-secondary text-muted-foreground hover:text-foreground'
              }`}
            >
              <Filter size={14} />
              {t('common.filters', 'Filtros')}
              {categoryFilter !== 'all' && (
                <span className="w-1.5 h-1.5 rounded-full bg-primary" />
              )}
            </button>
          </div>
        </header>

        {/* Filters panel */}
        {showFilters && (
          <div className="px-4 sm:px-6 py-3 border-b border-border bg-secondary/20 animate-slide-down">
            {/* Mobile search field */}
            <div className="md:hidden mb-3">
              <div className="flex items-center gap-2 bg-background rounded-lg px-3 py-2 border border-border">
                <Search className="w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder={t('blog.searchPlaceholder', 'Buscar artículos...')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1 bg-transparent outline-none text-sm text-foreground placeholder:text-muted-foreground"
                  autoFocus
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery('')} className="text-muted-foreground hover:text-foreground">
                    <X size={16} />
                  </button>
                )}
              </div>
            </div>

            {/* Category pills */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
              <button
                onClick={() => setCategoryFilter('all')}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all flex-shrink-0 ${
                  categoryFilter === 'all'
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'bg-secondary/50 text-muted-foreground hover:text-foreground hover:bg-secondary border border-border'
                }`}
              >
                {t('common.all', 'Todos')}
              </button>
              {availableCategories.map((cat) => {
                const colors = CATEGORY_COLORS[cat] || CATEGORY_COLORS.blog;
                return (
                  <button
                    key={cat}
                    onClick={() => setCategoryFilter(cat === categoryFilter ? 'all' : cat)}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all flex-shrink-0 ${
                      categoryFilter === cat
                        ? `${colors.bg} ${colors.text} border ${colors.border} shadow-sm`
                        : 'bg-secondary/50 text-muted-foreground hover:text-foreground hover:bg-secondary border border-border'
                    }`}
                  >
                    {CATEGORY_LABELS[cat] || cat}
                  </button>
                );
              })}
              {categoryFilter !== 'all' && (
                <button
                  onClick={() => setCategoryFilter('all')}
                  className="ml-auto text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 flex-shrink-0"
                >
                  <X size={12} />
                  {t('common.clear', 'Limpiar')}
                </button>
              )}
            </div>
          </div>
        )}

        <main id="blog-hub-main" className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 scroll-smooth">
          <div className="max-w-6xl mx-auto space-y-8">
            {isLoading ? (
              <div className="flex justify-center items-center h-64">
                <Loader2 className="animate-spin w-10 h-10 text-primary" />
              </div>
            ) : publishedArticles.length === 0 ? (
              /* Empty state */
              <div className="text-center py-24">
                <div className="w-20 h-20 bg-secondary/50 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Newspaper size={36} className="text-muted-foreground/40" />
                </div>
                <h3 className="text-2xl font-bold text-foreground mb-3">
                  {t('blog.noArticles', 'No hay artículos publicados')}
                </h3>
                <p className="text-muted-foreground max-w-md mx-auto">
                  {t('blog.comingSoon', 'Próximamente encontrarás contenido interesante aquí. ¡Vuelve pronto!')}
                </p>
              </div>
            ) : filteredArticles.length === 0 ? (
              /* No results state */
              <div className="text-center py-24">
                <div className="w-20 h-20 bg-secondary/50 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Search size={36} className="text-muted-foreground/40" />
                </div>
                <h3 className="text-xl font-bold text-foreground mb-3">
                  {t('blog.noResults', 'No se encontraron artículos')}
                </h3>
                <p className="text-muted-foreground mb-6">
                  {t('blog.tryDifferent', 'Intenta ajustar tu búsqueda o filtros.')}
                </p>
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setCategoryFilter('all');
                  }}
                  className="text-primary font-semibold hover:underline"
                >
                  {t('common.clearAll', 'Limpiar todo')}
                </button>
              </div>
            ) : (
              <>
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
                      <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wider whitespace-nowrap">
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
  const catColors = CATEGORY_COLORS[article.category] || CATEGORY_COLORS.blog;

  return (
    <div
      onClick={onClick}
      className="group relative cursor-pointer rounded-2xl overflow-hidden border border-border hover:border-primary/30 transition-all duration-500 hover:shadow-lg hover:shadow-primary/5"
    >
      <div className="grid lg:grid-cols-2 gap-0">
        {/* Image */}
        <div className="relative h-56 sm:h-64 lg:h-80 overflow-hidden bg-secondary/30">
          {article.featuredImage ? (
            <img
              src={article.featuredImage}
              alt={article.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-primary/10 via-secondary/20 to-primary/5 flex items-center justify-center">
              <Newspaper className="w-20 h-20 text-muted-foreground/15" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent lg:bg-gradient-to-r lg:from-transparent lg:via-transparent lg:to-background/80" />

          {/* Featured badge */}
          <div className="absolute top-4 left-4 flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground text-[10px] font-bold uppercase tracking-widest rounded-full shadow-sm">
            <Star size={12} className="fill-current" />
            Destacado
          </div>
        </div>

        {/* Content */}
        <div className="p-6 sm:p-8 flex flex-col justify-center bg-card">
          <div className="flex items-center gap-3 mb-4">
            <span className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-full ${catColors.bg} ${catColors.text} border ${catColors.border}`}>
              {CATEGORY_LABELS[article.category] || article.category}
            </span>
            {article.showDate !== false && (
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Calendar size={12} />
                {formatDate(article.publishedAt || article.createdAt, lang)}
              </span>
            )}
          </div>

          <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-3 leading-tight group-hover:text-primary transition-colors duration-300">
            {article.title}
          </h2>

          <p className="text-muted-foreground mb-6 line-clamp-3 leading-relaxed">
            {article.excerpt}
          </p>

          <div className="flex items-center justify-between mt-auto">
            {article.showAuthor !== false && (
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-secondary overflow-hidden flex items-center justify-center">
                  {article.authorImage ? (
                    <img src={article.authorImage} alt={article.author} className="w-full h-full object-cover" />
                  ) : (
                    <User size={14} className="text-muted-foreground" />
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">{article.author}</p>
                  {article.readTime && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock size={10} /> {article.readTime} min
                    </p>
                  )}
                </div>
              </div>
            )}

            <div className="flex items-center gap-2 text-sm font-semibold text-primary group-hover:gap-3 transition-all duration-300">
              Leer artículo
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
  const catColors = CATEGORY_COLORS[article.category] || CATEGORY_COLORS.blog;

  return (
    <article
      onClick={onClick}
      className="group relative flex flex-col h-full bg-card border border-border hover:border-primary/20 rounded-xl overflow-hidden hover:-translate-y-0.5 transition-all duration-300 hover:shadow-md hover:shadow-primary/5 cursor-pointer"
    >
      {/* Image */}
      <div className={`relative overflow-hidden bg-secondary/30 ${compact ? 'h-32' : 'h-40 sm:h-44'}`}>
        {article.featuredImage ? (
          <img
            src={article.featuredImage}
            alt={article.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-secondary/50 to-secondary/20 flex items-center justify-center">
            <FileText className="w-8 h-8 text-muted-foreground/20" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-card/80 to-transparent opacity-60" />

        {/* Category badge */}
        <div className="absolute top-3 left-3">
          <span className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full ${catColors.bg} ${catColors.text} border ${catColors.border} backdrop-blur-sm`}>
            {CATEGORY_LABELS[article.category] || article.category}
          </span>
        </div>

        {/* Featured tag */}
        {article.featured && (
          <div className="absolute top-3 right-3">
            <Star size={14} className="text-primary fill-primary" />
          </div>
        )}
      </div>

      {/* Content */}
      <div className={`flex-1 flex flex-col ${compact ? 'p-3' : 'p-4 sm:p-5'}`}>
        <div className="flex items-center gap-3 text-xs text-muted-foreground mb-2">
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
                {article.readTime} min
              </span>
            </>
          )}
        </div>

        <h3 className={`font-bold text-foreground mb-2 leading-snug group-hover:text-primary transition-colors duration-200 ${compact ? 'text-sm line-clamp-2' : 'text-base sm:text-lg line-clamp-2'}`}>
          {article.title}
        </h3>

        {!compact && (
          <p className="text-sm text-muted-foreground line-clamp-2 mb-3 flex-1">
            {article.excerpt}
          </p>
        )}

        <div className="flex items-center justify-between mt-auto pt-3 border-t border-border/50">
          {article.showAuthor !== false ? (
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-full bg-secondary overflow-hidden flex items-center justify-center flex-shrink-0">
                {article.authorImage ? (
                  <img src={article.authorImage} alt={article.author} className="w-full h-full object-cover" />
                ) : (
                  <User size={10} className="text-muted-foreground" />
                )}
              </div>
              <span className="text-xs text-muted-foreground truncate">{article.author}</span>
            </div>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-1 text-xs font-semibold text-primary opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            Leer
            <ArrowRight size={12} className="group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>
      </div>
    </article>
  );
};

export default BlogHub;

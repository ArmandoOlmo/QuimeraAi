/**
 * PublicBlogPage
 * Página pública de blog que muestra todos los artículos publicados de Quimera
 */

import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeft,
  Search,
  Calendar,
  Clock,
  Star,
  FileText,
  Tag,
  X,
  Filter,
  User
} from 'lucide-react';
import { useSafeAppContent } from '../contexts/appContent';
import { AppArticle, AppArticleCategory, DEFAULT_APP_NAVIGATION } from '../types/appContent';
import LanguageSelector from './ui/LanguageSelector';

// --- Brand Assets ---
const QUIMERA_LOGO = "https://firebasestorage.googleapis.com/v0/b/quimeraai.firebasestorage.app/o/quimera%2Fquimeralogo.png?alt=media&token=82368c1c-0f63-42b7-831f-72780006f032";

interface PublicBlogPageProps {
  onNavigateToHome: () => void;
  onNavigateToLogin: () => void;
  onNavigateToRegister: () => void;
  onNavigateToArticle: (slug: string) => void;
}

const CATEGORY_LABELS: Record<AppArticleCategory, string> = {
  'blog': 'Blog',
  'news': 'News',
  'tutorial': 'Tutorial',
  'case-study': 'Case Study',
  'announcement': 'Announcement',
  'guide': 'Guide',
  'update': 'Product Update',
};

const PublicBlogPage: React.FC<PublicBlogPageProps> = ({
  onNavigateToHome,
  onNavigateToLogin,
  onNavigateToRegister,
  onNavigateToArticle
}) => {
  const { t } = useTranslation();
  const appContent = useSafeAppContent();
  
  const articles = appContent?.articles || [];
  const navigation = appContent?.navigation || DEFAULT_APP_NAVIGATION;
  const isLoading = appContent?.isLoadingArticles || false;

  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'all' | AppArticleCategory>('all');
  const [showFilters, setShowFilters] = useState(false);

  // Only published articles
  const publishedArticles = useMemo(() => {
    return articles.filter(a => a.status === 'published');
  }, [articles]);

  // Filtered articles
  const filteredArticles = useMemo(() => {
    let filtered = publishedArticles;

    // Search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(article =>
        article.title.toLowerCase().includes(query) ||
        article.excerpt.toLowerCase().includes(query) ||
        article.tags.some(tag => tag.toLowerCase().includes(query))
      );
    }

    // Category
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(article => article.category === categoryFilter);
    }

    // Sort by date (newest first)
    filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return filtered;
  }, [publishedArticles, searchQuery, categoryFilter]);

  // Featured article (first featured or first article)
  const featuredArticle = useMemo(() => {
    return publishedArticles.find(a => a.featured) || publishedArticles[0];
  }, [publishedArticles]);

  // All unique categories from published articles
  const availableCategories = useMemo(() => {
    const cats = new Set(publishedArticles.map(a => a.category));
    return Array.from(cats);
  }, [publishedArticles]);

  // All unique tags
  const allTags = useMemo(() => {
    const tags = new Set<string>();
    publishedArticles.forEach(a => a.tags.forEach(tag => tags.add(tag)));
    return Array.from(tags).slice(0, 10);
  }, [publishedArticles]);

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#0A0A0A]/95 backdrop-blur-sm border-b border-white/5">
        <div className="container mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <button onClick={onNavigateToHome} className="flex items-center gap-2 sm:gap-3">
              <img src={QUIMERA_LOGO} alt="Quimera.ai" className="w-8 h-8 sm:w-10 sm:h-10" />
              <span className="text-lg sm:text-xl font-bold text-white">
                Quimera<span className="text-yellow-400">.ai</span>
              </span>
            </button>

            {/* Actions */}
            <div className="flex items-center gap-4">
              <LanguageSelector variant="minimal" />
              <button
                onClick={onNavigateToLogin}
                className="hidden sm:block text-sm text-gray-300 hover:text-white transition-colors"
              >
                {t('landing.login', 'Login')}
              </button>
              <button
                onClick={onNavigateToRegister}
                className="px-4 py-2 bg-yellow-400 text-black font-semibold rounded-lg hover:bg-yellow-300 transition-colors text-sm"
              >
                {t('landing.register', 'Get Started')}
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {/* Page Header */}
        <div className="mb-8 sm:mb-12">
          <button
            onClick={onNavigateToHome}
            className="flex items-center gap-2 text-sm text-gray-400 hover:text-white mb-4 transition-colors"
          >
            <ArrowLeft size={16} />
            Back to Home
          </button>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4">
            {t('blog.title', 'Blog')}
          </h1>
          <p className="text-gray-400 text-lg max-w-2xl">
            {t('blog.subtitle', 'Insights, tutorials, and updates from the Quimera team')}
          </p>
        </div>

        {/* Search and Filters */}
        <div className="mb-8 flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('blog.searchPlaceholder', 'Search articles...')}
              className="w-full pl-10 pr-10 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-gray-500 focus:outline-none focus:border-yellow-400/50"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
              >
                <X size={18} />
              </button>
            )}
          </div>

          {/* Category Filter */}
          <div className="flex gap-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`px-4 py-3 rounded-xl border transition-colors flex items-center gap-2 ${
                showFilters || categoryFilter !== 'all'
                  ? 'bg-yellow-400/10 border-yellow-400/30 text-yellow-400'
                  : 'bg-white/5 border-white/10 text-gray-400 hover:text-white'
              }`}
            >
              <Filter size={18} />
              <span className="hidden sm:inline">Filters</span>
            </button>
          </div>
        </div>

        {/* Filter Panel */}
        {showFilters && (
          <div className="mb-8 p-4 bg-white/5 border border-white/10 rounded-xl">
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setCategoryFilter('all')}
                className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                  categoryFilter === 'all'
                    ? 'bg-yellow-400 text-black'
                    : 'bg-white/5 text-gray-400 hover:text-white'
                }`}
              >
                All
              </button>
              {availableCategories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setCategoryFilter(cat)}
                  className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                    categoryFilter === cat
                      ? 'bg-yellow-400 text-black'
                      : 'bg-white/5 text-gray-400 hover:text-white'
                  }`}
                >
                  {CATEGORY_LABELS[cat]}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Featured Article */}
        {featuredArticle && !searchQuery && categoryFilter === 'all' && (
          <div
            onClick={() => onNavigateToArticle(featuredArticle.slug)}
            className="mb-12 rounded-2xl overflow-hidden bg-gradient-to-r from-yellow-400/10 to-purple-600/10 border border-white/10 hover:border-yellow-400/30 transition-all cursor-pointer group"
          >
            <div className="grid md:grid-cols-2 gap-6">
              <div className="relative h-64 md:h-auto overflow-hidden">
                {featuredArticle.featuredImage ? (
                  <img
                    src={featuredArticle.featuredImage}
                    alt={featuredArticle.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-yellow-400/20 to-purple-600/20 flex items-center justify-center">
                    <FileText className="w-16 h-16 text-white/20" />
                  </div>
                )}
                <div className="absolute top-4 left-4 px-3 py-1 bg-yellow-400 text-black text-xs font-bold rounded-full flex items-center gap-1">
                  <Star size={12} /> Featured
                </div>
              </div>
              <div className="p-6 sm:p-8 flex flex-col justify-center">
                <div className="flex items-center gap-3 text-sm text-gray-500 mb-4">
                  <span className="px-2 py-0.5 bg-white/10 rounded-full capitalize">
                    {CATEGORY_LABELS[featuredArticle.category]}
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar size={12} />
                    {new Date(featuredArticle.createdAt).toLocaleDateString()}
                  </span>
                  {featuredArticle.readTime && (
                    <span className="flex items-center gap-1">
                      <Clock size={12} />
                      {featuredArticle.readTime} min read
                    </span>
                  )}
                </div>
                <h2 className="text-2xl sm:text-3xl font-bold mb-4 group-hover:text-yellow-400 transition-colors">
                  {featuredArticle.title}
                </h2>
                <p className="text-gray-400 mb-6 line-clamp-3">
                  {featuredArticle.excerpt}
                </p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center">
                    <User size={18} className="text-gray-400" />
                  </div>
                  <div>
                    <p className="font-medium text-white">{featuredArticle.author}</p>
                    <p className="text-xs text-gray-500">{featuredArticle.category}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Articles Grid */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filteredArticles.length === 0 ? (
          <div className="text-center py-20">
            <FileText className="w-16 h-16 mx-auto text-gray-600 mb-4" />
            <h3 className="text-xl font-semibold mb-2">
              {searchQuery || categoryFilter !== 'all'
                ? t('blog.noResults', 'No articles found')
                : t('blog.noArticles', 'No articles yet')}
            </h3>
            <p className="text-gray-500">
              {searchQuery || categoryFilter !== 'all'
                ? t('blog.tryDifferent', 'Try different search terms or filters')
                : t('blog.comingSoon', 'Check back soon for new content')}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredArticles
              .filter(a => !featuredArticle || a.id !== featuredArticle.id || searchQuery || categoryFilter !== 'all')
              .map(article => (
                <article
                  key={article.id}
                  onClick={() => onNavigateToArticle(article.slug)}
                  className="group bg-white/5 border border-white/10 rounded-2xl overflow-hidden hover:bg-white/10 hover:border-yellow-400/30 transition-all cursor-pointer"
                >
                  {/* Image */}
                  <div className="relative h-48 overflow-hidden">
                    {article.featuredImage ? (
                      <img
                        src={article.featuredImage}
                        alt={article.title}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-yellow-400/10 to-purple-600/10 flex items-center justify-center">
                        <FileText className="w-12 h-12 text-white/20" />
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="p-5">
                    <div className="flex items-center gap-2 text-xs text-gray-500 mb-3 flex-wrap">
                      <span className="px-2 py-0.5 bg-white/10 rounded-full capitalize">
                        {CATEGORY_LABELS[article.category]}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar size={10} />
                        {new Date(article.createdAt).toLocaleDateString()}
                      </span>
                      {article.readTime && (
                        <span className="flex items-center gap-1">
                          <Clock size={10} />
                          {article.readTime} min
                        </span>
                      )}
                    </div>
                    <h3 className="text-lg font-bold text-white mb-2 line-clamp-2 group-hover:text-yellow-400 transition-colors">
                      {article.title}
                    </h3>
                    <p className="text-sm text-gray-400 line-clamp-2 mb-4">
                      {article.excerpt}
                    </p>
                    
                    {/* Tags */}
                    {article.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {article.tags.slice(0, 3).map(tag => (
                          <span
                            key={tag}
                            className="px-2 py-0.5 text-xs bg-white/5 text-gray-500 rounded"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </article>
              ))}
          </div>
        )}

        {/* Popular Tags */}
        {allTags.length > 0 && (
          <div className="mt-16 pt-8 border-t border-white/10">
            <h3 className="text-lg font-semibold mb-4">{t('blog.popularTags', 'Popular Tags')}</h3>
            <div className="flex flex-wrap gap-2">
              {allTags.map(tag => (
                <button
                  key={tag}
                  onClick={() => setSearchQuery(tag)}
                  className="px-3 py-1.5 bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 rounded-full text-sm transition-colors"
                >
                  #{tag}
                </button>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="py-8 border-t border-white/10 mt-16">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="flex flex-col items-center gap-4 md:flex-row md:justify-between">
            <button onClick={onNavigateToHome} className="flex items-center gap-2">
              <img src={QUIMERA_LOGO} alt="Quimera.ai" className="w-7 h-7" />
              <span className="font-bold text-sm">Quimera<span className="text-yellow-400">.ai</span></span>
            </button>
            <div className="text-xs text-gray-500">
              © {new Date().getFullYear()} Quimera.ai. All rights reserved.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default PublicBlogPage;







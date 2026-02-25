/**
 * PublicBlogPage
 * Página pública de blog que muestra todos los artículos publicados de Quimera
 */

import React, { useState, useMemo, useEffect } from 'react';
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
  User,
  ArrowRight
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
  'help': 'Help Center',
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

  // Override overflow:hidden from index.html to allow native page scrolling
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const root = document.getElementById('root');

    html.style.overflow = 'auto';
    html.style.height = 'auto';
    body.style.overflow = 'auto';
    body.style.height = 'auto';
    if (root) {
      root.style.overflow = 'visible';
      root.style.height = 'auto';
    }

    return () => {
      html.style.overflow = '';
      html.style.height = '';
      body.style.overflow = '';
      body.style.height = '';
      if (root) {
        root.style.overflow = '';
        root.style.height = '';
      }
    };
  }, []);

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white selection:bg-yellow-400 selection:text-black">
      {/* Cinematic Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-[#0A0A0A]/80 backdrop-blur-xl border-b border-white/5 transition-all duration-300">
        <div className="container mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <button onClick={onNavigateToHome} className="flex items-center gap-2 sm:gap-3 group">
              <img src={QUIMERA_LOGO} alt="Quimera.ai" className="w-8 h-8 sm:w-10 sm:h-10 transition-transform group-hover:scale-110 duration-300" />
              <span className="text-lg sm:text-xl font-bold text-white tracking-tight">
                Quimera<span className="text-yellow-400">.ai</span>
              </span>
            </button>

            {/* Actions */}
            <div className="flex items-center gap-4">
              <LanguageSelector variant="minimal" />
              <button
                onClick={onNavigateToLogin}
                className="hidden sm:block text-sm font-medium text-gray-400 hover:text-white transition-colors"
              >
                {t('landing.login', 'Login')}
              </button>
              <button
                onClick={onNavigateToRegister}
                className="px-5 py-2.5 bg-white text-black font-bold tracking-wide rounded-full hover:scale-105 transition-transform shadow-[0_0_20px_rgba(255,255,255,0.1)] text-sm"
              >
                {t('landing.register', 'Get Started')}
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="relative">
        {/* Cinematic Hero Section */}
        <section className="relative pt-32 pb-24 sm:pt-48 sm:pb-32 overflow-hidden border-b border-white/5">
          {/* Ambient Dark Glow */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-yellow-400/10 blur-[120px] rounded-full pointer-events-none opacity-50" />
          <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 contrast-150 mix-blend-overlay pointer-events-none" />

          <div className="container mx-auto px-4 sm:px-6 relative z-10 text-center">
            <button
              onClick={onNavigateToHome}
              className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-white mb-8 px-5 py-2 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition-all font-medium backdrop-blur-md hover:scale-105"
            >
              <ArrowLeft size={16} />
              Return to Quimera
            </button>

            <h1 className="text-5xl sm:text-7xl md:text-8xl font-black mb-6 tracking-tighter drop-shadow-lg leading-none">
              {t('blog.title', 'Quimera')}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-yellow-600"> {t('blog.titleHighlight', 'Insights')}</span>
            </h1>
            <p className="text-lg sm:text-xl md:text-2xl text-gray-400 max-w-3xl mx-auto font-light leading-relaxed">
              {t('blog.subtitle', 'Ideas, tutorials, and visionary updates from the engineering and design team at Quimera.ai')}
            </p>
          </div>
        </section>

        <div className="container mx-auto px-4 sm:px-6 pb-20">
          {/* Search and Filters - Glassmorphic */}
          <div className="mb-16 flex flex-col sm:flex-row gap-4 relative z-20 -mt-10 max-w-5xl mx-auto">
            {/* Search */}
            <div className="flex-1 relative group">
              <div className="absolute inset-0 bg-gradient-to-r from-yellow-400/20 to-purple-600/20 rounded-2xl blur-xl opacity-0 group-focus-within:opacity-100 transition-opacity duration-500 pointer-events-none" />
              <div className="relative">
                <Search size={20} className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-yellow-400 transition-colors" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t('blog.searchPlaceholder', 'Explore articles, tutorials, news...')}
                  className="w-full pl-14 pr-12 py-4 bg-[#111111]/90 backdrop-blur-xl border border-white/10 hover:border-white/20 rounded-2xl text-white placeholder:text-gray-500 focus:outline-none focus:border-yellow-400/50 focus:ring-1 focus:ring-yellow-400/50 transition-all shadow-2xl font-medium"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
            </div>

            {/* Category Filter Toggle */}
            <div className="flex gap-2 relative z-20">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`px-6 py-4 rounded-2xl border transition-all flex items-center gap-3 font-semibold shadow-2xl backdrop-blur-xl ${showFilters || categoryFilter !== 'all' ? 'bg-yellow-400/10 border-yellow-400/30 text-yellow-400' : 'bg-[#111111]/90 border-white/10 text-gray-300 hover:text-white hover:border-white/20'}`}
              >
                <Filter size={18} className={showFilters ? 'fill-current' : ''} />
                <span className="hidden sm:inline">Filters</span>
              </button>
            </div>
          </div>

          {/* Filter Panel */}
          <div className={`transition-all duration-500 overflow-hidden ${showFilters ? 'max-h-[500px] mb-16 opacity-100' : 'max-h-0 mb-0 opacity-0'}`}>
            <div className="p-8 bg-[#111] border border-white/5 rounded-3xl max-w-5xl mx-auto shadow-2xl">
              <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4">Categories</h3>
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => setCategoryFilter('all')}
                  className={`px-5 py-2.5 rounded-full text-sm font-semibold transition-all ${categoryFilter === 'all' ? 'bg-white text-black shadow-[0_0_20px_rgba(255,255,255,0.3)] scale-105' : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 border border-white/5'}`}
                >
                  All Articles
                </button>
                {availableCategories.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setCategoryFilter(cat)}
                    className={`px-5 py-2.5 rounded-full text-sm font-semibold transition-all capitalize ${categoryFilter === cat ? 'bg-white text-black shadow-[0_0_20px_rgba(255,255,255,0.3)] scale-105' : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 border border-white/5'}`}
                  >
                    {CATEGORY_LABELS[cat] || cat}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Featured Article - Cinematic Asymmetric Layout */}
          {featuredArticle && !searchQuery && categoryFilter === 'all' && (
            <div
              onClick={() => onNavigateToArticle(featuredArticle.slug)}
              className="mb-24 group cursor-pointer relative"
            >
              <div className="absolute inset-0 bg-yellow-400/5 blur-[100px] rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-1000 pointer-events-none" />

              <div className="grid lg:grid-cols-12 gap-0 lg:gap-8 items-center relative z-10">
                <div className="lg:col-span-7 relative h-[450px] sm:h-[600px] rounded-t-3xl lg:rounded-[2.5rem] overflow-hidden border border-white/10 ring-1 ring-white/5 shadow-2xl z-10 lg:z-10">
                  {/* Image & overlay */}
                  {featuredArticle.featuredImage ? (
                    <img src={featuredArticle.featuredImage} alt={featuredArticle.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-[1.5s] ease-out" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-yellow-400/20 to-purple-900/40 relative">
                      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                  <div className="absolute top-6 left-6 px-4 py-2 bg-yellow-400 text-black text-[10px] sm:text-xs font-black uppercase tracking-widest rounded-full flex items-center gap-1.5 shadow-[0_0_20px_rgba(250,204,21,0.4)] backdrop-blur-md">
                    <Star size={12} className="fill-current" /> Featured Publication
                  </div>
                </div>

                <div className="lg:col-span-5 lg:-ml-16 relative z-20 -mt-10 lg:mt-0 px-4 lg:px-0">
                  <div className="p-8 sm:p-12 bg-[#0d0d0d]/95 backdrop-blur-3xl border border-white/10 rounded-3xl lg:rounded-[2.5rem] shadow-[0_30px_60px_rgba(0,0,0,0.8)] lg:shadow-[-30px_0_60px_rgba(0,0,0,0.8)] group-hover:border-white/20 transition-colors duration-500">
                    <div className="flex flex-wrap items-center gap-3 text-xs font-semibold text-gray-400 mb-6 uppercase tracking-wider">
                      <span className="text-yellow-400 bg-yellow-400/10 px-3 py-1 rounded-full">{CATEGORY_LABELS[featuredArticle.category] || featuredArticle.category}</span>
                      {featuredArticle.showDate !== false && (
                        <span className="flex items-center gap-1.5"><Calendar size={14} /> {new Date(featuredArticle.publishedAt || featuredArticle.createdAt).toLocaleDateString()}</span>
                      )}
                    </div>
                    <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black mb-6 leading-tight group-hover:text-yellow-400 transition-colors duration-300">
                      {featuredArticle.title}
                    </h2>
                    <p className="text-gray-400 text-lg mb-10 leading-relaxed line-clamp-3">
                      {featuredArticle.excerpt}
                    </p>

                    {/* Author & Read More */}
                    <div className="flex items-center justify-between pt-8 border-t border-white/5">
                      {featuredArticle.showAuthor !== false && (
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-yellow-400 to-purple-600 p-[2px]">
                            <div className="w-full h-full bg-[#111] rounded-full overflow-hidden flex items-center justify-center">
                              {featuredArticle.authorImage ? (
                                <img src={featuredArticle.authorImage} alt={featuredArticle.author} className="w-full h-full object-cover" />
                              ) : (
                                <User size={20} className="text-white/50" />
                              )}
                            </div>
                          </div>
                          <div>
                            <p className="font-bold text-white text-sm">{featuredArticle.author}</p>
                            {featuredArticle.readTime && (
                              <p className="text-xs text-gray-500 font-medium flex items-center gap-1 mt-0.5"><Clock size={12} /> {featuredArticle.readTime} min read</p>
                            )}
                          </div>
                        </div>
                      )}

                      <div className="w-12 h-12 rounded-full border border-white/10 flex items-center justify-center group-hover:bg-white group-hover:text-black transition-all duration-300 group-hover:scale-110 ml-auto">
                        <ArrowRight size={20} className="group-hover:-rotate-45 transition-transform duration-300" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Articles Grid */}
          {isLoading ? (
            <div className="flex items-center justify-center py-32">
              <div className="w-12 h-12 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin shadow-[0_0_30px_rgba(250,204,21,0.5)]" />
            </div>
          ) : filteredArticles.length === 0 ? (
            <div className="text-center py-32 bg-[#111] border border-white/5 rounded-3xl max-w-3xl mx-auto p-12 shadow-2xl">
              <div className="w-24 h-24 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6">
                <FileText className="w-10 h-10 text-gray-500" />
              </div>
              <h3 className="text-3xl font-bold mb-4">
                {searchQuery || categoryFilter !== 'all'
                  ? t('blog.noResults', 'No articles found')
                  : t('blog.noArticles', 'No articles published yet')}
              </h3>
              <p className="text-gray-400 text-lg max-w-md mx-auto">
                {searchQuery || categoryFilter !== 'all'
                  ? t('blog.tryDifferent', 'Try adjusting your search terms or filters to find what you are looking for.')
                  : t('blog.comingSoon', 'Our team is working on great content. Check back soon for updates.')}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
              {filteredArticles
                .filter(a => !featuredArticle || a.id !== featuredArticle.id || searchQuery || categoryFilter !== 'all')
                .map(article => (
                  <article
                    key={article.id}
                    onClick={() => onNavigateToArticle(article.slug)}
                    className="group relative flex flex-col h-full bg-[#0f0f0f] border border-white/5 hover:border-white/15 rounded-3xl overflow-hidden hover:-translate-y-2 transition-all duration-500 hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.5)] cursor-pointer"
                  >
                    {/* Image */}
                    <div className="relative h-56 overflow-hidden">
                      {article.featuredImage ? (
                        <img
                          src={article.featuredImage}
                          alt={article.title}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-[1.5s]"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-[#1a1a1a] to-[#050505] flex items-center justify-center relative">
                          <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10 mix-blend-overlay" />
                          <FileText className="w-12 h-12 text-white/10 relative z-10" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-[#0f0f0f] to-transparent opacity-80" />

                      <div className="absolute top-4 left-4 flex flex-wrap gap-2">
                        <span className="px-3 py-1 bg-black/60 backdrop-blur-md border border-white/10 text-white rounded-full text-[10px] font-bold uppercase tracking-widest">
                          {CATEGORY_LABELS[article.category] || article.category}
                        </span>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="p-6 sm:p-8 flex-1 flex flex-col relative z-20 -mt-2">
                      <div className="flex items-center gap-4 text-xs font-semibold text-gray-500 mb-4 tracking-wide uppercase">
                        {article.showDate !== false && (
                          <span className="flex items-center gap-1.5">
                            <Calendar size={12} />
                            {new Date(article.publishedAt || article.createdAt).toLocaleDateString()}
                          </span>
                        )}
                        {article.readTime && (
                          <>
                            <span className="w-1 h-1 rounded-full bg-gray-600" />
                            <span className="flex items-center gap-1.5">
                              <Clock size={12} />
                              {article.readTime} min
                            </span>
                          </>
                        )}
                      </div>

                      <h3 className="text-xl sm:text-2xl font-bold text-white mb-4 leading-snug group-hover:text-yellow-400 transition-colors duration-300">
                        {article.title}
                      </h3>

                      <p className="text-base text-gray-400 line-clamp-3 mb-6 flex-1 font-light leading-relaxed">
                        {article.excerpt}
                      </p>

                      <div className="flex items-center justify-between mt-auto pt-6 border-t border-white/5">
                        {/* Tags preview */}
                        <div className="flex items-center gap-2 overflow-hidden">
                          {article.tags.slice(0, 2).map(tag => (
                            <span key={tag} className="text-xs text-gray-500 font-medium truncate">
                              #{tag}
                            </span>
                          ))}
                          {article.tags.length > 2 && <span className="text-xs text-gray-600">+{article.tags.length - 2}</span>}
                        </div>

                        <div className="flex items-center gap-2 text-sm font-bold text-white group-hover:text-yellow-400 transition-colors">
                          Read
                          <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                        </div>
                      </div>
                    </div>
                  </article>
                ))}
            </div>
          )}

          {/* Popular Tags */}
          {allTags.length > 0 && !isLoading && (
            <div className="mt-24 pt-12 border-t border-white/5">
              <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                <Tag size={16} /> {t('blog.popularTags', 'Trending Topics')}
              </h3>
              <div className="flex flex-wrap gap-3">
                {allTags.map(tag => (
                  <button
                    key={tag}
                    onClick={() => {
                      setSearchQuery(tag);
                      window.scrollTo({ top: 300, behavior: 'smooth' });
                    }}
                    className="px-4 py-2 bg-[#111] border border-white/5 text-gray-300 hover:text-white hover:bg-white/10 hover:border-white/20 rounded-xl text-sm font-medium transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5"
                  >
                    #{tag}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="py-12 border-t border-white/5 bg-[#050505]">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="flex flex-col items-center gap-6 md:flex-row md:justify-between">
            <button onClick={onNavigateToHome} className="flex items-center gap-3 group">
              <img src={QUIMERA_LOGO} alt="Quimera.ai" className="w-8 h-8 group-hover:scale-110 transition-transform" />
              <span className="font-bold text-base tracking-tight">Quimera<span className="text-yellow-400">.ai</span></span>
            </button>
            <div className="flex items-center gap-6 text-sm text-gray-500 font-medium">
              <a href="#" className="hover:text-white transition-colors">Twitter</a>
              <a href="#" className="hover:text-white transition-colors">LinkedIn</a>
              <a href="#" className="hover:text-white transition-colors">GitHub</a>
            </div>
            <div className="text-sm text-gray-600 font-medium">
              © {new Date().getFullYear()} Quimera.ai. All rights reserved.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default PublicBlogPage;

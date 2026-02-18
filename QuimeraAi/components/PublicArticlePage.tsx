/**
 * PublicArticlePage
 * Página pública para mostrar un artículo individual del blog de Quimera
 */

import React, { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeft,
  Calendar,
  Clock,
  Star,
  User,
  Share2,
  Twitter,
  Linkedin,
  Facebook,
  Link as LinkIcon,
  Tag,
  ChevronRight
} from 'lucide-react';
import { marked } from 'marked';
import { useSafeAppContent } from '../contexts/appContent';
import { AppArticle, AppArticleCategory, DEFAULT_APP_NAVIGATION } from '../types/appContent';
import LanguageSelector from './ui/LanguageSelector';
import { sanitizeHtml } from '../utils/sanitize';

// Configure marked for better rendering
marked.setOptions({
  breaks: true, // Convert \n to <br>
  gfm: true,    // GitHub Flavored Markdown
});

// --- Brand Assets ---
const QUIMERA_LOGO = "https://firebasestorage.googleapis.com/v0/b/quimeraai.firebasestorage.app/o/quimera%2Fquimeralogo.png?alt=media&token=82368c1c-0f63-42b7-831f-72780006f032";

interface PublicArticlePageProps {
  slug: string;
  onNavigateToHome: () => void;
  onNavigateToBlog: () => void;
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

const PublicArticlePage: React.FC<PublicArticlePageProps> = ({
  slug,
  onNavigateToHome,
  onNavigateToBlog,
  onNavigateToLogin,
  onNavigateToRegister,
  onNavigateToArticle
}) => {
  const { t } = useTranslation();
  const appContent = useSafeAppContent();

  const articles = appContent?.articles || [];
  const isLoading = appContent?.isLoadingArticles || false;

  // Find the current article
  const article = useMemo(() => {
    return articles.find(a => a.slug === slug && a.status === 'published');
  }, [articles, slug]);

  // Related articles (same category, excluding current)
  const relatedArticles = useMemo(() => {
    if (!article) return [];
    return articles
      .filter(a =>
        a.id !== article.id &&
        a.status === 'published' &&
        (a.category === article.category || a.tags.some(tag => article.tags.includes(tag)))
      )
      .slice(0, 3);
  }, [articles, article]);

  // Convert Markdown to HTML and sanitize
  const sanitizedContent = useMemo(() => {
    if (!article || !article.content) return '';

    try {
      // Detect Markdown by common patterns
      const isMarkdown = article.content.trim().startsWith('#') ||
        article.content.includes('\n##') ||
        article.content.includes('\n- ') ||
        article.content.includes('\n* ') ||
        article.content.includes('```');

      let htmlContent: string;

      if (isMarkdown) {
        // Parse markdown to HTML
        const parsed = marked.parse(article.content);
        htmlContent = typeof parsed === 'string' ? parsed : article.content;
      } else {
        // Check if it's already HTML
        const containsHtmlTags = /<[a-z][\s\S]*>/i.test(article.content);
        htmlContent = containsHtmlTags ? article.content : marked.parse(article.content) as string;
      }

      return sanitizeHtml(htmlContent);
    } catch (error) {
      console.error('Error parsing article content:', error);
      return sanitizeHtml(article.content);
    }
  }, [article]);

  // Share functions
  const shareUrl = typeof window !== 'undefined' ? window.location.href : '';
  const shareTitle = article?.title || '';

  const shareOnTwitter = () => {
    window.open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareTitle)}`, '_blank');
  };

  const shareOnLinkedIn = () => {
    window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`, '_blank');
  };

  const shareOnFacebook = () => {
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`, '_blank');
  };

  const copyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    // Could show a toast here
  };

  // Scroll to top on mount
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [slug]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] text-white flex items-center justify-center">
        <img src="https://firebasestorage.googleapis.com/v0/b/quimeraai.firebasestorage.app/o/quimera%2Fquimeralogo.png?alt=media&token=82368c1c-0f63-42b7-831f-72780006f032" alt="Loading..." className="w-8 h-8 object-contain animate-pulse" />
      </div>
    );
  }

  if (!article) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] text-white">
        {/* Header */}
        <header className="sticky top-0 z-50 bg-[#0A0A0A]/95 backdrop-blur-sm border-b border-white/5">
          <div className="container mx-auto px-4 sm:px-6 py-4">
            <div className="flex items-center justify-between">
              <button onClick={onNavigateToHome} className="flex items-center gap-2 sm:gap-3">
                <img src={QUIMERA_LOGO} alt="Quimera.ai" className="w-8 h-8 sm:w-10 sm:h-10" />
                <span className="text-lg sm:text-xl font-bold text-white">
                  Quimera<span className="text-yellow-400">.ai</span>
                </span>
              </button>
            </div>
          </div>
        </header>

        <main className="container mx-auto px-4 sm:px-6 py-20 text-center">
          <h1 className="text-3xl font-bold mb-4">Article Not Found</h1>
          <p className="text-gray-400 mb-8">The article you're looking for doesn't exist or has been removed.</p>
          <button
            onClick={onNavigateToBlog}
            className="px-6 py-3 bg-yellow-400 text-black font-semibold rounded-xl hover:bg-yellow-300 transition-colors"
          >
            Browse All Articles
          </button>
        </main>
      </div>
    );
  }

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

      {/* Hero */}
      <div className="relative">
        {article.featuredImage ? (
          <div className="relative h-[40vh] sm:h-[50vh] overflow-hidden">
            <img
              src={article.featuredImage}
              alt={article.title}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0A] via-[#0A0A0A]/50 to-transparent" />
          </div>
        ) : (
          <div className="h-32 bg-gradient-to-r from-yellow-400/10 to-purple-600/10" />
        )}
      </div>

      <main className="container mx-auto px-4 sm:px-6">
        {/* Article Header */}
        <div className={`max-w-3xl mx-auto ${article.featuredImage ? '-mt-32 relative z-10' : 'pt-8'}`}>
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm text-gray-400 mb-6">
            <button onClick={onNavigateToHome} className="hover:text-white transition-colors">
              Home
            </button>
            <ChevronRight size={14} />
            <button onClick={onNavigateToBlog} className="hover:text-white transition-colors">
              Blog
            </button>
            <ChevronRight size={14} />
            <span className="text-gray-600 truncate max-w-[200px]">{article.title}</span>
          </div>

          {/* Meta */}
          <div className="flex flex-wrap items-center gap-3 text-sm text-gray-400 mb-4">
            <span className="px-3 py-1 bg-yellow-400/10 text-yellow-400 rounded-full font-medium capitalize">
              {CATEGORY_LABELS[article.category]}
            </span>
            {article.featured && (
              <span className="px-3 py-1 bg-yellow-400 text-black rounded-full font-medium flex items-center gap-1">
                <Star size={12} /> Featured
              </span>
            )}
          </div>

          {/* Title */}
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-6 leading-tight">
            {article.title}
          </h1>

          {/* Excerpt */}
          {article.excerpt && (
            <p className="text-xl text-gray-400 mb-8 leading-relaxed">
              {article.excerpt}
            </p>
          )}

          {/* Author & Date */}
          <div className="flex flex-wrap items-center justify-between gap-4 pb-8 border-b border-white/10">
            {article.showAuthor !== false && (
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center">
                  {article.authorImage ? (
                    <img src={article.authorImage} alt={article.author} className="w-full h-full rounded-full object-cover" />
                  ) : (
                    <User size={20} className="text-gray-400" />
                  )}
                </div>
                <div>
                  <p className="font-medium text-white">{article.author}</p>
                  <div className="flex items-center gap-3 text-sm text-gray-500">
                    {article.showDate !== false && (
                      <span className="flex items-center gap-1">
                        <Calendar size={12} />
                        {new Date(article.publishedAt || article.createdAt).toLocaleDateString('en-US', {
                          month: 'long',
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </span>
                    )}
                    {article.readTime && (
                      <span className="flex items-center gap-1">
                        <Clock size={12} />
                        {article.readTime} min read
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}
            {!article.showAuthor && article.showDate !== false && (
              <div className="flex items-center gap-3 text-sm text-gray-500">
                <span className="flex items-center gap-1">
                  <Calendar size={12} />
                  {new Date(article.publishedAt || article.createdAt).toLocaleDateString('en-US', {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric'
                  })}
                </span>
                {article.readTime && (
                  <span className="flex items-center gap-1">
                    <Clock size={12} />
                    {article.readTime} min read
                  </span>
                )}
              </div>
            )}

            {/* Share */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500 mr-2">Share:</span>
              <button
                onClick={shareOnTwitter}
                className="w-9 h-9 bg-white/5 hover:bg-white/10 rounded-lg flex items-center justify-center text-gray-400 hover:text-white transition-colors"
                title="Share on Twitter"
              >
                <Twitter size={16} />
              </button>
              <button
                onClick={shareOnLinkedIn}
                className="w-9 h-9 bg-white/5 hover:bg-white/10 rounded-lg flex items-center justify-center text-gray-400 hover:text-white transition-colors"
                title="Share on LinkedIn"
              >
                <Linkedin size={16} />
              </button>
              <button
                onClick={shareOnFacebook}
                className="w-9 h-9 bg-white/5 hover:bg-white/10 rounded-lg flex items-center justify-center text-gray-400 hover:text-white transition-colors"
                title="Share on Facebook"
              >
                <Facebook size={16} />
              </button>
              <button
                onClick={copyLink}
                className="w-9 h-9 bg-white/5 hover:bg-white/10 rounded-lg flex items-center justify-center text-gray-400 hover:text-white transition-colors"
                title="Copy link"
              >
                <LinkIcon size={16} />
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <article className="max-w-3xl mx-auto py-12">
          <div
            className="prose prose-lg prose-invert max-w-none
              prose-headings:font-bold prose-headings:text-white
              prose-p:text-gray-300 prose-p:leading-relaxed
              prose-a:text-yellow-400 prose-a:no-underline hover:prose-a:underline
              prose-strong:text-white
              prose-code:text-yellow-400 prose-code:bg-white/5 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded
              prose-pre:bg-white/5 prose-pre:border prose-pre:border-white/10
              prose-blockquote:border-l-yellow-400 prose-blockquote:text-gray-400
              prose-img:rounded-xl
              prose-hr:border-white/10"
            dangerouslySetInnerHTML={{ __html: sanitizedContent }}
          />
        </article>

        {/* Tags */}
        {article.tags.length > 0 && (
          <div className="max-w-3xl mx-auto pb-8 border-b border-white/10">
            <div className="flex items-center gap-2 flex-wrap">
              <Tag size={16} className="text-gray-500" />
              {article.tags.map(tag => (
                <span
                  key={tag}
                  className="px-3 py-1 bg-white/5 text-gray-400 rounded-full text-sm"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Related Articles */}
        {relatedArticles.length > 0 && (
          <div className="max-w-5xl mx-auto py-16">
            <h2 className="text-2xl font-bold mb-8">Related Articles</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {relatedArticles.map(related => (
                <article
                  key={related.id}
                  onClick={() => onNavigateToArticle(related.slug)}
                  className="group bg-white/5 border border-white/10 rounded-xl overflow-hidden hover:bg-white/10 hover:border-yellow-400/30 transition-all cursor-pointer"
                >
                  <div className="relative h-40 overflow-hidden">
                    {related.featuredImage ? (
                      <img
                        src={related.featuredImage}
                        alt={related.title}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-yellow-400/10 to-purple-600/10" />
                    )}
                  </div>
                  <div className="p-4">
                    <p className="text-xs text-gray-500 mb-2 capitalize">{CATEGORY_LABELS[related.category]}</p>
                    <h3 className="font-semibold text-white group-hover:text-yellow-400 transition-colors line-clamp-2">
                      {related.title}
                    </h3>
                  </div>
                </article>
              ))}
            </div>
          </div>
        )}

        {/* CTA */}
        <div className="max-w-3xl mx-auto py-16 text-center">
          <div className="p-8 bg-gradient-to-r from-yellow-400/10 to-purple-600/10 rounded-2xl border border-white/10">
            <h3 className="text-2xl font-bold mb-4">Ready to build with Quimera?</h3>
            <p className="text-gray-400 mb-6">Start creating amazing websites with AI today.</p>
            <button
              onClick={onNavigateToRegister}
              className="px-8 py-3 bg-yellow-400 text-black font-bold rounded-xl hover:bg-yellow-300 transition-colors"
            >
              Get Started Free
            </button>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-8 border-t border-white/10">
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

export default PublicArticlePage;







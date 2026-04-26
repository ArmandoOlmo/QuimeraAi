/**
 * PublicArticlePage
 * Página pública para mostrar un artículo individual del blog de Quimera
 */

import React, { useEffect, useMemo, useState } from 'react';
import { sanitizeHtml } from '../utils/sanitize';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeft,
  Calendar,
  Clock,
  User,
  Share2,
  Twitter,
  Linkedin,
  Facebook,
  Link as LinkIcon,
  Tag,
  Check,
  Globe
} from 'lucide-react';
import { marked } from 'marked';
import { useSafeAppContent } from '../contexts/appContent';
import { AppArticleCategory, DEFAULT_APP_NAVIGATION } from '../types/appContent';
import { setArticleSEO } from '../hooks/useRouteSEO';
import MarketingLayout from './marketing/MarketingLayout';
import QuimeraLoader from './ui/QuimeraLoader';

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
  const navigation = appContent?.navigation || DEFAULT_APP_NAVIGATION;
  const isLoading = appContent?.isLoadingArticles || false;

  const [copiedLink, setCopiedLink] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const article = useMemo(() => {
    return articles.find(a => a.slug === slug);
  }, [articles, slug]);

  // Inject dynamic SEO meta tags for this article
  useEffect(() => {
    if (article) {
      setArticleSEO({
        title: article.title,
        excerpt: article.excerpt,
        featuredImage: article.featuredImage,
        author: article.author,
        publishedAt: article.publishedAt || article.createdAt,
        slug: article.slug,
        tags: article.tags,
        category: article.category,
      });
    }
  }, [article]);

  // Find linked translation (via translationGroup)
  const linkedTranslation = useMemo(() => {
    if (!article?.translationGroup) return null;
    return articles.find(a =>
      a.status === 'published' &&
      a.translationGroup === article.translationGroup &&
      a.id !== article.id &&
      a.language !== article.language
    ) || null;
  }, [articles, article]);

  // Related articles (same category + same language, excluding current)
  const relatedArticles = useMemo(() => {
    if (!article) return [];
    return articles
      .filter(a => a.status === 'published' && a.category === article.category && a.id !== article.id && a.language === article.language)
      .slice(0, 3);
  }, [articles, article]);

  // Convert markdown to HTML via marked
  const articleHtml = useMemo(() => {
    if (!article?.content) return '';
    const rawHtml = marked.parse(article.content) as string;

    // Convert <a> tags to properly open in new tabs and use elegant stylings
    const processedHtml = rawHtml.replace(
      /<a href="(.*?)".*?>(.*?)<\/a>/g,
      '<a href="$1" target="_blank" rel="noopener noreferrer" class="text-yellow-400 hover:text-yellow-300 font-medium underline underline-offset-4 decoration-yellow-400/30 hover:decoration-yellow-400 transition-colors">$2</a>'
    );

    return processedHtml;
  }, [article?.content]);

  // Copy to clipboard
  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleShare = (platform: 'twitter' | 'linkedin' | 'facebook') => {
    const url = encodeURIComponent(window.location.href);
    const text = encodeURIComponent(`He leído "${article?.title}" en Quimera.ai`);

    let shareUrl = '';
    switch (platform) {
      case 'twitter':
        shareUrl = `https://twitter.com/intent/tweet?url=${url}&text=${text}`;
        break;
      case 'linkedin':
        shareUrl = `https://www.linkedin.com/shareArticle?mini=true&url=${url}&title=${text}`;
        break;
      case 'facebook':
        shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${url}`;
        break;
    }

    window.open(shareUrl, '_blank', 'width=600,height=400');
  };

  // Scroll to top on mount
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [slug]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <QuimeraLoader size="lg" />
      </div>
    );
  }

  if (!article) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] text-white flex flex-col items-center justify-center p-4">
        <h1 className="text-4xl font-bold mb-4">{t('blog.articleNotFound', 'Article Not Found')}</h1>
        <p className="text-gray-400 mb-8 max-w-md text-center">
          {t('blog.articleNotFoundDesc', 'The article you are looking for might have been removed, had its name changed, or is temporarily unavailable.')}
        </p>
        <button
          onClick={onNavigateToBlog}
          className="px-6 py-3 bg-white text-black font-bold rounded-full hover:bg-yellow-400 transition-colors shadow-lg"
        >
          {t('blog.backToBlog', 'Return to Blog')}
        </button>
      </div>
    );
  }

  return (
    <MarketingLayout
      onNavigateToHome={onNavigateToHome}
      onNavigateToLogin={onNavigateToLogin}
      onNavigateToRegister={onNavigateToRegister}
    >
      <div className="bg-[#0A0A0A] text-white selection:bg-yellow-400 selection:text-black font-sans pb-20">
        {/* Sticky Secondary Nav */}
        <header className="sticky top-16 left-0 right-0 z-40 bg-[#0A0A0A]/80 backdrop-blur-md border-b border-white/5 py-4">
          <div className="container mx-auto px-4 sm:px-6">
            <div className="flex items-center justify-between">
              <button
                onClick={onNavigateToBlog}
                className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors group"
              >
                <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
                {t('blog.backToBlog', 'Volver al Blog')}
              </button>

              <div className={`hidden sm:flex items-center gap-2 transition-opacity duration-300 ${scrolled ? 'opacity-100' : 'opacity-0'}`}>
                <span className="text-sm font-bold tracking-tight text-white line-clamp-1 max-w-md">
                  {article.title}
                </span>
              </div>

              <div className="flex items-center gap-3">
                {linkedTranslation && (
                  <button
                    onClick={() => onNavigateToArticle(linkedTranslation.slug)}
                    className="flex items-center gap-2 px-4 py-2 bg-yellow-400/10 hover:bg-yellow-400/20 border border-yellow-400/20 rounded-full text-sm font-medium transition-colors backdrop-blur-md text-yellow-400 hover:text-yellow-300"
                  >
                    <Globe size={14} />
                    {linkedTranslation.language === 'en' ? t('blog.readInEnglish', '🇺🇸 Read in English') : t('blog.readInSpanish', '🇪🇸 Leer en Español')}
                  </button>
                )}
                <button
                  onClick={handleCopyLink}
                  className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full text-sm font-medium transition-colors backdrop-blur-md"
                >
                  {copiedLink ? <Check size={14} className="text-green-400" /> : <Share2 size={14} />}
                  <span className={copiedLink ? "text-green-400" : ""}>{copiedLink ? t('common.copied', 'Copiado') : t('blog.share', 'Compartir')}</span>
                </button>
              </div>
            </div>
          </div>
        </header>

        <main>
          {/* Immersive Parallax Hero */}
          <div className="relative pt-0 h-[60vh] sm:h-[70vh] min-h-[400px] max-h-[800px] overflow-hidden">
            <div className="absolute inset-0 bg-black z-0 pointer-events-none" />
            {article.featuredImage ? (
              <div className="absolute inset-0 z-0">
                {/* Overlay Gradients */}
                <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-[#0A0A0A] via-[#0A0A0A]/80 to-transparent z-10" />
                <div className="absolute inset-0 bg-black/30 z-10" />
                {/* Image */}
                <img
                  src={article.featuredImage}
                  alt={article.title}
                  className="w-full h-full object-cover animate-slow-zoom scale-105"
                />
              </div>
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-yellow-400/20 to-purple-900/40 z-0">
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay" />
                <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-[#0A0A0A] to-transparent" />
              </div>
            )}

            {/* Hero Content */}
            <div className="absolute inset-0 z-20 flex flex-col justify-end pb-24 sm:pb-32 container mx-auto px-4 sm:px-6">
              <div className="max-w-4xl mx-auto w-full text-center sm:text-left drop-shadow-[0_4px_20px_rgba(0,0,0,0.8)]">
                <div className="flex items-center justify-center sm:justify-start gap-3 text-xs sm:text-sm font-bold text-white mb-6 uppercase tracking-widest">
                  <span className="text-yellow-400 bg-yellow-400/20 px-3 py-1 rounded-full border border-yellow-400/20 backdrop-blur-sm">
                    {t(`blog.categories.${article.category}`, article.category)}
                  </span>
                  {article.showDate !== false && (
                    <span className="flex items-center gap-1.5 opacity-80 decoration-transparent">
                      <Calendar size={14} />
                      {new Date(article.publishedAt || article.createdAt).toLocaleDateString()}
                    </span>
                  )}
                </div>

                <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black mb-6 leading-[1.1] tracking-tighter">
                  {article.title}
                </h1>

                <p className="text-lg sm:text-xl md:text-2xl text-gray-300 font-light leading-relaxed max-w-3xl opacity-90">
                  {article.excerpt}
                </p>
              </div>
            </div>
          </div>

          <div className="container mx-auto px-4 sm:px-6 relative z-30">
            {/* Floating Glassmorphism Content Box */}
            <div className="max-w-4xl mx-auto rounded-[2rem] sm:rounded-[2.5rem] bg-[#0d0d0d]/90 backdrop-blur-[40px] border border-white/10 shadow-[0_-20px_60px_rgba(0,0,0,0.7)] p-6 sm:p-10 md:p-16 relative -mt-16 sm:-mt-24">

              {/* Author info & Read Time */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pb-8 border-b border-white/10 mb-10">
                {article.showAuthor !== false && (
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-yellow-400 to-purple-600 p-[2px] shadow-[0_0_20px_rgba(250,204,21,0.3)]">
                      <div className="w-full h-full bg-[#111] rounded-full overflow-hidden flex items-center justify-center">
                        {article.authorImage ? (
                          <img src={article.authorImage} alt={article.author} className="w-full h-full object-cover" />
                        ) : (
                          <User size={24} className="text-white/50" />
                        )}
                      </div>
                    </div>
                    <div>
                      <p className="font-bold text-white text-lg">{article.author}</p>
                      <p className="text-sm text-yellow-400 font-medium">{t('blog.author', 'Author')}</p>
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-6">
                  {article.readTime && (
                    <div className="flex items-center gap-2 text-gray-400 bg-white/5 py-2 px-4 rounded-full border border-white/5 font-medium">
                      <Clock size={16} />
                      <span>{t('blog.minRead', { time: article.readTime })}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Article Markdown Body */}
              <div
                className="prose prose-invert prose-lg max-w-none hover:prose-a:text-yellow-300 prose-headings:font-bold prose-h2:text-4xl prose-h2:mt-16 prose-h2:mb-8 prose-h3:text-2xl prose-h3:mt-12 prose-img:rounded-2xl prose-img:shadow-2xl prose-a:text-yellow-400 prose-p:leading-loose prose-p:text-gray-300 prose-li:text-gray-300 prose-hr:border-white/10 prose-blockquote:border-yellow-400 prose-blockquote:bg-yellow-400/5 prose-blockquote:py-2 prose-blockquote:px-6 prose-blockquote:rounded-r-2xl prose-blockquote:text-gray-300 prose-blockquote:not-italic"
                dangerouslySetInnerHTML={{ __html: sanitizeHtml(articleHtml) }}
              />

              {/* Tags */}
              {article.tags && article.tags.length > 0 && (
                <div className="mt-16 pt-10 border-t border-white/10">
                  <div className="flex flex-wrap gap-2">
                    <Tag size={18} className="text-gray-500 mr-2 mt-1 hidden sm:block" />
                    {article.tags.map((tag, index) => (
                      <span
                        key={index}
                        className="px-4 py-2 bg-[#1a1a1a] border border-white/10 text-gray-300 text-sm font-medium rounded-xl hover:bg-white/10 hover:text-white transition-colors cursor-default"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Share Section */}
              <div className="mt-12 p-8 bg-gradient-to-r from-yellow-400/5 to-transparent border border-yellow-400/20 rounded-3xl flex flex-col sm:flex-row items-center justify-between gap-6">
                <div>
                  <h4 className="font-bold text-xl mb-2 text-white">{t('blog.shareArticle', '¿Te ha gustado este artículo?')}</h4>
                  <p className="text-sm text-gray-400">{t('blog.shareArticleDesc', 'Compártelo con tu red y ayuda a otros a descubrirlo.')}</p>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => handleShare('twitter')}
                    className="w-12 h-12 rounded-full bg-[#1DA1F2]/10 text-[#1DA1F2] border border-[#1DA1F2]/20 flex items-center justify-center hover:bg-[#1DA1F2] hover:text-white transition-all hover:scale-110 shadow-lg"
                    aria-label="Share on Twitter"
                  >
                    <Twitter size={20} />
                  </button>
                  <button
                    onClick={() => handleShare('linkedin')}
                    className="w-12 h-12 rounded-full bg-[#0A66C2]/10 text-[#0A66C2] border border-[#0A66C2]/20 flex items-center justify-center hover:bg-[#0A66C2] hover:text-white transition-all hover:scale-110 shadow-lg"
                    aria-label="Share on LinkedIn"
                  >
                    <Linkedin size={20} />
                  </button>
                  <button
                    onClick={() => handleShare('facebook')}
                    className="w-12 h-12 rounded-full bg-[#1877F2]/10 text-[#1877F2] border border-[#1877F2]/20 flex items-center justify-center hover:bg-[#1877F2] hover:text-white transition-all hover:scale-110 shadow-lg"
                    aria-label="Share on Facebook"
                  >
                    <Facebook size={20} />
                  </button>
                  <button
                    onClick={handleCopyLink}
                    className="w-12 h-12 rounded-full bg-white/5 text-white border border-white/10 flex items-center justify-center hover:bg-white/20 transition-all hover:scale-110 shadow-lg"
                    aria-label="Copy link"
                  >
                    {copiedLink ? <Check size={20} className="text-green-400" /> : <LinkIcon size={20} />}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Recommended Articles */}
          {relatedArticles.length > 0 && (
            <section className="container mx-auto px-4 sm:px-6 mt-24 mb-24">
              <div className="max-w-6xl mx-auto">
                <h3 className="text-2xl sm:text-3xl font-bold mb-10 flex items-center gap-4">
                  {t('blog.relatedArticles', 'Artículos Relacionados')}
                  <div className="h-[1px] flex-1 bg-gradient-to-r from-white/20 to-transparent" />
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {relatedArticles.map((relatedArticle) => (
                    <div
                      key={relatedArticle.id}
                      onClick={() => onNavigateToArticle(relatedArticle.slug)}
                      className="group cursor-pointer bg-[#111] border border-white/5 hover:border-white/20 rounded-3xl overflow-hidden hover:-translate-y-2 transition-all duration-500 hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.5)] flex flex-col h-full"
                    >
                      <div className="relative h-48 overflow-hidden">
                        {relatedArticle.featuredImage ? (
                          <img
                            src={relatedArticle.featuredImage}
                            alt={relatedArticle.title}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-[1.5s]"
                          />
                        ) : (
                          <div className="w-full h-full bg-[#1a1a1a] flex items-center justify-center">
                            <span className="text-white/20">Quimera.ai</span>
                          </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-[#111] to-transparent opacity-60" />
                      </div>

                      <div className="p-6 flex-1 flex flex-col">
                        <div className="text-xs font-semibold text-yellow-400 uppercase tracking-widest mb-3">
                          {t(`blog.categories.${relatedArticle.category}`, relatedArticle.category)}
                        </div>
                        <h4 className="text-lg font-bold text-white mb-3 leading-snug group-hover:text-yellow-400 transition-colors">
                          {relatedArticle.title}
                        </h4>
                        <p className="text-sm text-gray-500 line-clamp-2 mt-auto">
                          {relatedArticle.excerpt}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}
        </main>
      </div>
    </MarketingLayout>
  );
};

export default PublicArticlePage;

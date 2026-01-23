/**
 * NewsUpdates
 * Componente de feed de Noticias y Novedades para el Dashboard
 * Muestra tarjetas estilo "Home cards" de Shopify
 */

import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNews } from '../../contexts/news';
import {
    NewsItem,
    NEWS_CATEGORY_LABELS,
    NEWS_CATEGORY_COLORS,
} from '../../types/news';
import {
    Newspaper,
    Star,
    ExternalLink,
    X,
    Eye,
    ChevronRight,
    Loader2,
    AlertCircle,
    RefreshCw,
    CheckCircle,
    Play,
} from 'lucide-react';

interface NewsUpdatesProps {
    className?: string;
    maxItems?: number;
    compact?: boolean;
}

const NewsUpdates: React.FC<NewsUpdatesProps> = ({
    className = '',
    maxItems = 5,
    compact = false,
}) => {
    const { t } = useTranslation();
    const {
        userNews,
        userNewsStates,
        isLoadingUserNews,
        fetchUserNews,
        markAsRead,
        dismissNews,
        trackClick,
    } = useNews();

    const [selectedNews, setSelectedNews] = useState<NewsItem | null>(null);
    const [dismissingId, setDismissingId] = useState<string | null>(null);

    // Initial load
    useEffect(() => {
        fetchUserNews();
    }, []);

    // Get visible news (limited)
    const visibleNews = userNews.slice(0, maxItems);
    const hasMore = userNews.length > maxItems;

    // Handle card click
    const handleCardClick = async (news: NewsItem) => {
        await markAsRead(news.id);
        setSelectedNews(news);
    };

    // Handle CTA click
    const handleCtaClick = async (e: React.MouseEvent, news: NewsItem) => {
        e.stopPropagation();
        await trackClick(news.id);

        if (news.cta?.url) {
            if (news.cta.isExternal) {
                window.open(news.cta.url, '_blank', 'noopener,noreferrer');
            } else {
                window.location.href = news.cta.url;
            }
        }
    };

    // Handle dismiss
    const handleDismiss = async (e: React.MouseEvent, newsId: string) => {
        e.stopPropagation();
        setDismissingId(newsId);
        try {
            await dismissNews(newsId);
        } finally {
            setDismissingId(null);
        }
    };

    // Check if news is read
    const isRead = (newsId: string) => userNewsStates[newsId]?.read || false;

    // Format date
    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));

        if (days === 0) return t('common.today', 'Hoy');
        if (days === 1) return t('common.yesterday', 'Ayer');
        if (days < 7) return t('common.daysAgo', { count: days, defaultValue: `hace ${days} días` });

        return date.toLocaleDateString('es-ES', {
            day: '2-digit',
            month: 'short',
        });
    };

    // Loading state
    if (isLoadingUserNews) {
        return (
            <div className={`bg-editor-panel-bg border border-editor-border rounded-xl p-6 ${className}`}>
                <div className="flex items-center gap-3 mb-4">
                    <Newspaper className="text-editor-accent" size={20} />
                    <h2 className="font-semibold">{t('dashboard.news.title', 'Noticias y Novedades')}</h2>
                </div>
                <div className="flex items-center justify-center py-8">
                    <Loader2 className="animate-spin text-editor-accent" size={24} />
                </div>
            </div>
        );
    }

    // Empty state
    if (visibleNews.length === 0) {
        return (
            <div className={`bg-editor-panel-bg border border-editor-border rounded-xl p-6 ${className}`}>
                <div className="flex items-center gap-3 mb-4">
                    <Newspaper className="text-editor-accent" size={20} />
                    <h2 className="font-semibold">{t('dashboard.news.title', 'Noticias y Novedades')}</h2>
                </div>
                <div className="text-center py-8">
                    <CheckCircle className="mx-auto text-green-500 mb-3" size={32} />
                    <p className="text-editor-text-secondary text-sm">
                        {t('dashboard.news.allCaughtUp', 'Estás al día con todas las novedades')}
                    </p>
                    <button
                        onClick={() => fetchUserNews()}
                        className="mt-3 text-sm text-editor-accent hover:underline flex items-center gap-1 mx-auto"
                    >
                        <RefreshCw size={14} />
                        {t('dashboard.news.refresh', 'Actualizar')}
                    </button>
                </div>
            </div>
        );
    }

    return (
        <>
            <div className={`bg-editor-panel-bg border border-editor-border rounded-xl ${className}`}>
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-editor-border">
                    <div className="flex items-center gap-3">
                        <Newspaper className="text-editor-accent" size={20} />
                        <h2 className="font-semibold">{t('dashboard.news.title', 'Noticias y Novedades')}</h2>
                        {userNews.length > 0 && (
                            <span className="px-2 py-0.5 bg-editor-accent/10 text-editor-accent text-xs font-medium rounded-full">
                                {userNews.filter(n => !isRead(n.id)).length} {t('dashboard.news.new', 'nuevas')}
                            </span>
                        )}
                    </div>
                    <button
                        onClick={() => fetchUserNews()}
                        className="p-2 hover:bg-editor-border rounded-lg transition-colors text-editor-text-secondary hover:text-editor-text-primary"
                        title={t('dashboard.news.refresh', 'Actualizar')}
                    >
                        <RefreshCw size={16} />
                    </button>
                </div>

                {/* News List */}
                <div className="divide-y divide-editor-border">
                    {visibleNews.map(news => (
                        <div
                            key={news.id}
                            onClick={() => handleCardClick(news)}
                            className={`p-4 hover:bg-editor-border/30 transition-colors cursor-pointer group relative ${
                                !isRead(news.id) ? 'bg-editor-accent/5' : ''
                            }`}
                        >
                            {/* Unread indicator */}
                            {!isRead(news.id) && (
                                <div className="absolute left-1.5 top-1/2 -translate-y-1/2 w-2 h-2 bg-editor-accent rounded-full" />
                            )}

                            <div className={`flex gap-4 ${!isRead(news.id) ? 'pl-2' : ''}`}>
                                {/* Thumbnail */}
                                {!compact && news.imageUrl && (
                                    <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-editor-bg">
                                        <img
                                            src={news.imageUrl}
                                            alt={news.title}
                                            className="w-full h-full object-cover"
                                        />
                                        {news.videoUrl && (
                                            <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                                                <Play size={16} className="text-white fill-white" />
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Content */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="flex-1 min-w-0">
                                            {/* Featured badge */}
                                            {news.featured && (
                                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-yellow-500/10 text-yellow-500 rounded text-xs mb-1">
                                                    <Star size={10} className="fill-yellow-500" />
                                                    {t('dashboard.news.featured', 'Destacado')}
                                                </span>
                                            )}

                                            {/* Title */}
                                            <h3 className={`font-medium text-sm line-clamp-1 ${
                                                !isRead(news.id) ? 'text-editor-text-primary' : 'text-editor-text-secondary'
                                            }`}>
                                                {news.title}
                                            </h3>

                                            {/* Excerpt */}
                                            {!compact && (
                                                <p className="text-xs text-editor-text-secondary line-clamp-2 mt-1">
                                                    {news.excerpt}
                                                </p>
                                            )}

                                            {/* Meta */}
                                            <div className="flex items-center gap-2 mt-2">
                                                <span
                                                    className={`px-1.5 py-0.5 rounded text-xs border ${NEWS_CATEGORY_COLORS[news.category]}`}
                                                >
                                                    {t(`dashboard.news.category.${news.category}`, NEWS_CATEGORY_LABELS[news.category])}
                                                </span>
                                                <span className="text-xs text-editor-text-secondary">
                                                    {formatDate(news.createdAt)}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Dismiss button */}
                                        <button
                                            onClick={e => handleDismiss(e, news.id)}
                                            disabled={dismissingId === news.id}
                                            className="p-1 hover:bg-editor-border rounded opacity-0 group-hover:opacity-100 transition-opacity text-editor-text-secondary hover:text-editor-text-primary"
                                            title={t('dashboard.news.dismiss', 'Descartar')}
                                        >
                                            {dismissingId === news.id ? (
                                                <Loader2 size={14} className="animate-spin" />
                                            ) : (
                                                <X size={14} />
                                            )}
                                        </button>
                                    </div>

                                    {/* CTA Button */}
                                    {news.cta && !compact && (
                                        <button
                                            onClick={e => handleCtaClick(e, news)}
                                            className="mt-3 inline-flex items-center gap-1 px-3 py-1.5 bg-editor-accent text-editor-bg text-xs font-medium rounded-lg hover:bg-editor-accent/90 transition-colors"
                                        >
                                            {news.cta.label}
                                            {news.cta.isExternal && <ExternalLink size={12} />}
                                        </button>
                                    )}
                                </div>

                                {/* Arrow */}
                                <ChevronRight
                                    size={16}
                                    className="flex-shrink-0 text-editor-text-secondary opacity-0 group-hover:opacity-100 transition-opacity"
                                />
                            </div>
                        </div>
                    ))}
                </div>

                {/* See more */}
                {hasMore && (
                    <div className="p-4 border-t border-editor-border">
                        <button
                            onClick={() => setSelectedNews(userNews[0])}
                            className="w-full text-center text-sm text-editor-accent hover:underline"
                        >
                            {t('dashboard.news.seeAll', 'Ver todas las noticias')} ({userNews.length})
                        </button>
                    </div>
                )}
            </div>

            {/* Detail Modal */}
            {selectedNews && (
                <div
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
                    onClick={() => setSelectedNews(null)}
                >
                    <div
                        className="bg-editor-panel-bg border border-editor-border rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col"
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Modal Header */}
                        {selectedNews.imageUrl && (
                            <div className="relative h-48 flex-shrink-0">
                                <img
                                    src={selectedNews.imageUrl}
                                    alt={selectedNews.title}
                                    className="w-full h-full object-cover"
                                />
                                {selectedNews.videoUrl && (
                                    <a
                                        href={selectedNews.videoUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="absolute inset-0 flex items-center justify-center bg-black/40 hover:bg-black/50 transition-colors"
                                    >
                                        <div className="w-16 h-16 bg-white/90 rounded-full flex items-center justify-center">
                                            <Play size={24} className="text-gray-800 fill-gray-800 ml-1" />
                                        </div>
                                    </a>
                                )}
                                <button
                                    onClick={() => setSelectedNews(null)}
                                    className="absolute top-4 right-4 p-2 bg-black/50 hover:bg-black/70 rounded-full text-white transition-colors"
                                >
                                    <X size={20} />
                                </button>
                            </div>
                        )}

                        {/* Modal Content */}
                        <div className="flex-1 overflow-y-auto p-6">
                            {!selectedNews.imageUrl && (
                                <button
                                    onClick={() => setSelectedNews(null)}
                                    className="absolute top-4 right-4 p-2 hover:bg-editor-border rounded-full transition-colors"
                                >
                                    <X size={20} />
                                </button>
                            )}

                            {/* Badges */}
                            <div className="flex items-center gap-2 mb-3">
                                {selectedNews.featured && (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-yellow-500/10 text-yellow-500 rounded-full text-xs">
                                        <Star size={12} className="fill-yellow-500" />
                                        {t('dashboard.news.featured', 'Destacado')}
                                    </span>
                                )}
                                <span
                                    className={`px-2 py-0.5 rounded-full text-xs border ${NEWS_CATEGORY_COLORS[selectedNews.category]}`}
                                >
                                    {t(`dashboard.news.category.${selectedNews.category}`, NEWS_CATEGORY_LABELS[selectedNews.category])}
                                </span>
                                <span className="text-xs text-editor-text-secondary">
                                    {formatDate(selectedNews.createdAt)}
                                </span>
                            </div>

                            {/* Title */}
                            <h2 className="text-2xl font-bold mb-3">{selectedNews.title}</h2>

                            {/* Excerpt */}
                            {selectedNews.excerpt && (
                                <p className="text-editor-text-secondary mb-4 text-lg leading-relaxed">
                                    {selectedNews.excerpt}
                                </p>
                            )}

                            {/* Body */}
                            {selectedNews.body && (
                                <div
                                    className="prose prose-sm dark:prose-invert max-w-none"
                                    dangerouslySetInnerHTML={{ __html: selectedNews.body }}
                                />
                            )}

                            {/* Tags */}
                            {selectedNews.tags.length > 0 && (
                                <div className="flex flex-wrap gap-2 mt-6 pt-6 border-t border-editor-border">
                                    {selectedNews.tags.map(tag => (
                                        <span
                                            key={tag}
                                            className="px-2 py-1 bg-editor-bg border border-editor-border rounded-full text-xs text-editor-text-secondary"
                                        >
                                            #{tag}
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Modal Footer */}
                        <div className="p-4 border-t border-editor-border flex items-center justify-between bg-editor-bg/50">
                            <button
                                onClick={e => handleDismiss(e as any, selectedNews.id)}
                                className="flex items-center gap-2 text-sm text-editor-text-secondary hover:text-editor-text-primary transition-colors"
                            >
                                <X size={16} />
                                {t('dashboard.news.dismiss', 'Descartar')}
                            </button>

                            {selectedNews.cta && (
                                <button
                                    onClick={e => handleCtaClick(e, selectedNews)}
                                    className="flex items-center gap-2 px-4 py-2 bg-editor-accent text-editor-bg rounded-lg font-medium hover:bg-editor-accent/90 transition-colors"
                                >
                                    {selectedNews.cta.label}
                                    {selectedNews.cta.isExternal && <ExternalLink size={16} />}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default NewsUpdates;

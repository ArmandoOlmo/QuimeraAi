/**
 * NewsUpdates
 * Componente de feed de Noticias y Novedades para el Dashboard
 * Tarjetas estilo ProjectCard pero horizontales
 */

import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { sanitizeHtml } from '../../utils/sanitize';
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
    Loader2,
    RefreshCw,
    CheckCircle,
    Play,
    Clock,
    MoreVertical,
} from 'lucide-react';

interface NewsUpdatesProps {
    className?: string;
    maxItems?: number;
    compact?: boolean;
}

const NewsUpdates: React.FC<NewsUpdatesProps> = ({
    className = '',
    maxItems = 4,
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
    const [menuOpenId, setMenuOpenId] = useState<string | null>(null);

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
        setMenuOpenId(null);
        try {
            await dismissNews(newsId);
            if (selectedNews?.id === newsId) {
                setSelectedNews(null);
            }
        } finally {
            setDismissingId(null);
        }
    };

    // Check if news is read
    const isRead = (newsId: string) => userNewsStates[newsId]?.read || false;

    // Format date
    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('es-ES', {
            day: 'numeric',
            month: 'numeric',
            year: 'numeric',
        });
    };

    // Loading state
    if (isLoadingUserNews) {
        return (
            <div className={`${className}`}>
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <Newspaper className="text-primary" size={24} />
                        <h2 className="text-2xl font-bold">{t('dashboard.news.title', 'Noticias y Novedades')}</h2>
                    </div>
                </div>
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="animate-spin text-primary" size={32} />
                </div>
            </div>
        );
    }

    // Empty state
    if (visibleNews.length === 0) {
        return (
            <div className={`${className}`}>
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <Newspaper className="text-primary" size={24} />
                        <h2 className="text-2xl font-bold">{t('dashboard.news.title', 'Noticias y Novedades')}</h2>
                    </div>
                </div>
                <div className="text-center py-12 bg-card/50 rounded-2xl border border-border">
                    <CheckCircle className="mx-auto text-green-500 mb-4" size={40} />
                    <p className="text-muted-foreground">
                        {t('dashboard.news.allCaughtUp', 'Estás al día con todas las novedades')}
                    </p>
                    <button
                        onClick={() => fetchUserNews()}
                        className="mt-4 text-sm text-primary hover:underline flex items-center gap-2 mx-auto"
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
            <div className={`${className}`}>
                {/* Section Header */}
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <Newspaper className="text-primary" size={24} />
                        <h2 className="text-2xl font-bold">{t('dashboard.news.title', 'Noticias y Novedades')}</h2>
                        {userNews.length > 0 && (
                            <span className="px-2.5 py-1 bg-primary/10 text-primary text-xs font-bold rounded-full">
                                {userNews.filter(n => !isRead(n.id)).length} {t('dashboard.news.new', 'nuevas')}
                            </span>
                        )}
                    </div>
                    <button
                        onClick={() => fetchUserNews()}
                        className="p-2 hover:bg-secondary rounded-lg transition-colors text-muted-foreground hover:text-foreground"
                        title={t('dashboard.news.refresh', 'Actualizar')}
                    >
                        <RefreshCw size={18} />
                    </button>
                </div>

                {/* News Grid - Max 2 columns, horizontal cards with image background */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {visibleNews.map(news => (
                        <div
                            key={news.id}
                            onClick={() => handleCardClick(news)}
                            className="group relative h-[220px] rounded-2xl overflow-hidden cursor-pointer transition-all duration-300 hover:shadow-xl hover:shadow-primary/10 hover:-translate-y-1 border border-border/50 hover:border-primary/30"
                        >
                            {/* Full background image */}
                            {news.imageUrl ? (
                                <img
                                    src={news.imageUrl}
                                    alt={news.title}
                                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                />
                            ) : (
                                <div className="absolute inset-0 bg-gradient-to-br from-primary/30 via-primary/20 to-primary/5" />
                            )}

                            {/* Dark gradient overlay from bottom */}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />

                            {/* Video play button centered */}
                            {news.videoUrl && (
                                <div className="absolute inset-0 flex items-center justify-center z-10">
                                    <div className="w-14 h-14 bg-white/90 rounded-full flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                                        <Play size={24} className="text-gray-800 fill-gray-800 ml-1" />
                                    </div>
                                </div>
                            )}

                            {/* Top bar with badge and menu */}
                            <div className="absolute top-0 left-0 right-0 p-3 flex items-center justify-between z-10">
                                {/* Category Badge */}
                                <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider backdrop-blur-sm ${NEWS_CATEGORY_COLORS[news.category]}`}>
                                    {t(`dashboard.news.category.${news.category}`, NEWS_CATEGORY_LABELS[news.category])}
                                </span>

                                {/* Status + Menu */}
                                <div className="flex items-center gap-2">
                                    {news.featured && (
                                        <Star size={14} className="text-yellow-500 fill-yellow-500" />
                                    )}

                                    {/* Menu button */}
                                    <div className="relative">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setMenuOpenId(menuOpenId === news.id ? null : news.id);
                                            }}
                                            className="p-1 hover:bg-white/20 rounded transition-colors"
                                        >
                                            <MoreVertical size={16} className="text-white" />
                                        </button>

                                        {/* Dropdown menu */}
                                        {menuOpenId === news.id && (
                                            <div
                                                className="absolute right-0 top-full mt-1 bg-card border border-border rounded-lg shadow-xl py-1 z-20 min-w-[120px]"
                                                onClick={e => e.stopPropagation()}
                                            >
                                                <button
                                                    onClick={(e) => handleDismiss(e, news.id)}
                                                    className="w-full px-3 py-2 text-left text-sm text-muted-foreground hover:text-foreground hover:bg-secondary flex items-center gap-2"
                                                >
                                                    {dismissingId === news.id ? (
                                                        <Loader2 size={14} className="animate-spin" />
                                                    ) : (
                                                        <X size={14} />
                                                    )}
                                                    Descartar
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Bottom content with title and date - over the gradient */}
                            <div className="absolute bottom-0 left-0 right-0 p-4 z-10">
                                {/* Title */}
                                <h3 className="font-bold text-lg leading-tight text-white line-clamp-2 mb-2 drop-shadow-lg">
                                    {news.title}
                                </h3>

                                {/* Date */}
                                <div className="flex items-center gap-1.5 text-white/70">
                                    <Clock size={12} />
                                    <span className="text-xs">
                                        {formatDate(news.createdAt)}
                                    </span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* See more */}
                {hasMore && (
                    <div className="mt-6 text-center">
                        <button
                            onClick={() => setSelectedNews(userNews[0])}
                            className="text-sm font-medium text-primary hover:underline"
                        >
                            {t('dashboard.news.seeAll', 'Ver todas las noticias')} ({userNews.length})
                        </button>
                    </div>
                )}
            </div>

            {/* Detail Modal - Unified design */}
            {selectedNews && (
                <div
                    className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50 p-4"
                    onClick={() => setSelectedNews(null)}
                >
                    <div
                        className="bg-background w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col rounded-2xl shadow-2xl"
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Modal Header with Image */}
                        {selectedNews.imageUrl && (
                            <div className="relative h-56 flex-shrink-0">
                                <img
                                    src={selectedNews.imageUrl}
                                    alt={selectedNews.title}
                                    className="w-full h-full object-cover"
                                />
                                {/* Gradient overlay */}
                                <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent" />

                                {selectedNews.videoUrl && (
                                    <a
                                        href={selectedNews.videoUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="absolute inset-0 flex items-center justify-center"
                                        onClick={e => e.stopPropagation()}
                                    >
                                        <div className="w-16 h-16 bg-white/95 rounded-full flex items-center justify-center shadow-2xl hover:scale-110 transition-transform">
                                            <Play size={28} className="text-gray-800 fill-gray-800 ml-1" />
                                        </div>
                                    </a>
                                )}

                                {/* Close button */}
                                <button
                                    onClick={() => setSelectedNews(null)}
                                    className="absolute top-4 right-4 p-2.5 bg-black/40 hover:bg-black/60 rounded-full text-white transition-colors"
                                >
                                    <X size={20} />
                                </button>

                                {/* Title overlay on image */}
                                <div className="absolute bottom-0 left-0 right-0 p-6">
                                    <div className="flex items-center gap-2 mb-3">
                                        {selectedNews.featured && (
                                            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-yellow-500/20 text-yellow-400 rounded-full text-xs font-bold backdrop-blur-sm">
                                                <Star size={12} className="fill-yellow-400" />
                                                {t('dashboard.news.featured', 'Destacado')}
                                            </span>
                                        )}
                                        <span
                                            className={`px-2.5 py-1 rounded-full text-xs font-bold backdrop-blur-sm ${NEWS_CATEGORY_COLORS[selectedNews.category]}`}
                                        >
                                            {t(`dashboard.news.category.${selectedNews.category}`, NEWS_CATEGORY_LABELS[selectedNews.category])}
                                        </span>
                                        <span className="text-xs text-white/70 backdrop-blur-sm">
                                            {formatDate(selectedNews.createdAt)}
                                        </span>
                                    </div>
                                    <h2 className="text-2xl md:text-3xl font-bold text-white drop-shadow-lg">
                                        {selectedNews.title}
                                    </h2>
                                </div>
                            </div>
                        )}

                        {/* Modal Content */}
                        <div className="flex-1 overflow-y-auto p-6">
                            {/* Title for no-image case */}
                            {!selectedNews.imageUrl && (
                                <>
                                    <button
                                        onClick={() => setSelectedNews(null)}
                                        className="absolute top-4 right-4 p-2 hover:bg-secondary rounded-full transition-colors"
                                    >
                                        <X size={20} />
                                    </button>
                                    <div className="flex items-center gap-2 mb-3">
                                        {selectedNews.featured && (
                                            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-yellow-500/10 text-yellow-500 rounded-full text-xs font-bold">
                                                <Star size={12} className="fill-yellow-500" />
                                                {t('dashboard.news.featured', 'Destacado')}
                                            </span>
                                        )}
                                        <span
                                            className={`px-2.5 py-1 rounded-full text-xs font-bold ${NEWS_CATEGORY_COLORS[selectedNews.category]}`}
                                        >
                                            {t(`dashboard.news.category.${selectedNews.category}`, NEWS_CATEGORY_LABELS[selectedNews.category])}
                                        </span>
                                        <span className="text-xs text-muted-foreground">
                                            {formatDate(selectedNews.createdAt)}
                                        </span>
                                    </div>
                                    <h2 className="text-2xl md:text-3xl font-bold mb-4">{selectedNews.title}</h2>
                                </>
                            )}

                            {/* Excerpt */}
                            {selectedNews.excerpt && (
                                <p className="text-muted-foreground text-lg leading-relaxed mb-6">
                                    {selectedNews.excerpt}
                                </p>
                            )}

                            {/* Body */}
                            {selectedNews.body && (
                                <div
                                    className="prose prose-sm dark:prose-invert max-w-none"
                                    dangerouslySetInnerHTML={{ __html: sanitizeHtml(selectedNews.body || '') }}
                                />
                            )}

                            {/* Tags */}
                            {selectedNews.tags.length > 0 && (
                                <div className="flex flex-wrap gap-2 mt-8 pt-6 border-t border-border">
                                    {selectedNews.tags.map(tag => (
                                        <span
                                            key={tag}
                                            className="px-3 py-1.5 bg-secondary rounded-full text-xs font-medium text-muted-foreground"
                                        >
                                            #{tag}
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Modal Footer */}
                        <div className="p-4 border-t border-border flex items-center justify-between">
                            <button
                                onClick={e => handleDismiss(e as any, selectedNews.id)}
                                className="flex items-center gap-2 px-4 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg transition-colors"
                            >
                                <X size={16} />
                                {t('dashboard.news.dismiss', 'Descartar')}
                            </button>

                            {selectedNews.cta && (
                                <button
                                    onClick={e => handleCtaClick(e, selectedNews)}
                                    className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-lg font-bold hover:bg-primary/90 transition-colors"
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

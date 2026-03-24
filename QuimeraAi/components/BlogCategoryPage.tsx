/**
 * BlogCategoryPage
 * Content-only component for displaying blog category articles.
 * Uses the project's theme colors passed as props (same pattern as BlogPost).
 * No own header/footer — the parent component (PublicWebsitePreview) wraps it.
 */

import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Calendar, FileText } from 'lucide-react';
import { CMSPost, CMSCategory } from '../types';
import MasonryGallery from './cms/layouts/MasonryGallery';
import ProfileDirectory from './cms/layouts/ProfileDirectory';

interface BlogCategoryPageProps {
    category: CMSCategory;
    posts: CMSPost[];
    onNavigateBack: () => void;
    onArticleClick: (slug: string) => void;
    backgroundColor?: string;
    textColor?: string;
    accentColor?: string;
    headerStyle?: string;
}

const BlogCategoryPage: React.FC<BlogCategoryPageProps> = ({
    category,
    posts,
    onNavigateBack,
    onArticleClick,
    backgroundColor = 'var(--site-base, #ffffff)',
    textColor = 'var(--site-heading, #1a1a2e)',
    accentColor = 'var(--site-accent, #4f46e5)',
    headerStyle = '',
}) => {
    const { t } = useTranslation();

    // Only published articles, sorted appropriately per layout type
    const publishedPosts = useMemo(() => {
        const filtered = posts.filter(p => p.status === 'published');
        if (category.layoutType === 'profile') {
            // Profile categories: sort by manual sortOrder (ascending), fallback to date
            return filtered.sort((a, b) => {
                const orderA = a.sortOrder ?? 999;
                const orderB = b.sortOrder ?? 999;
                if (orderA !== orderB) return orderA - orderB;
                return new Date(b.publishedAt || b.createdAt).getTime() - new Date(a.publishedAt || a.createdAt).getTime();
            });
        }
        // Blog/gallery: sort by date descending
        return filtered.sort((a, b) => new Date(b.publishedAt || b.createdAt).getTime() - new Date(a.publishedAt || a.createdAt).getTime());
    }, [posts, category.layoutType]);

    // Derive a subtle card bg from the background
    const cardBg = `color-mix(in srgb, ${textColor} 5%, ${backgroundColor})`;
    const cardBorder = `color-mix(in srgb, ${textColor} 10%, transparent)`;
    const mutedText = `color-mix(in srgb, ${textColor} 60%, ${backgroundColor})`;

    // Dynamic top padding: floating and transparent headers don't push content down (absolute/fixed)
    // Only edge-* and default sticky-solid headers push content, so they use minimal padding
    const headerOverlapsContent = headerStyle.startsWith('floating') || headerStyle.startsWith('transparent') || headerStyle === 'sticky-transparent';
    const topPadding = headerOverlapsContent ? 'pt-28' : 'pt-6';

    return (
        <div className="min-h-screen pb-20 animate-fade-in-up" style={{ backgroundColor, color: textColor }}>
            {/* Compact Category Header */}
            <div className={`container mx-auto px-4 sm:px-6 ${topPadding} pb-8`}>
                <div className="max-w-6xl mx-auto">
                    {/* Back button */}
                    <button
                        onClick={onNavigateBack}
                        className="flex items-center gap-2 mb-5 text-sm hover:opacity-70 transition-opacity"
                        style={{ color: mutedText }}
                    >
                        <ArrowLeft size={16} />
                        <span>{t('blog.backToHome', 'Volver al inicio')}</span>
                    </button>

                    {/* Title row */}
                    <div className="flex items-baseline gap-4 flex-wrap">
                        <h1
                            className="text-2xl sm:text-3xl font-bold tracking-tight font-header"
                            style={{ color: textColor }}
                        >
                            {category.name}
                        </h1>
                        <span className="text-sm font-medium" style={{ color: mutedText }}>
                            {publishedPosts.length} {publishedPosts.length === 1 ? t('blog.article', 'artículo') : t('blog.articles', 'artículos')}
                        </span>
                    </div>

                    {category.description && (
                        <p
                            className="text-sm mt-2 max-w-2xl leading-relaxed"
                            style={{ color: mutedText }}
                        >
                            {category.description}
                        </p>
                    )}

                    {/* Divider */}
                    <div className="mt-5" style={{ borderBottom: `1px solid ${cardBorder}` }} />
                </div>
            </div>

            {/* Articles Grid */}
            <main className="container mx-auto px-4 sm:px-6 mt-8 sm:mt-12">
                <div className="max-w-6xl mx-auto">
                    {publishedPosts.length === 0 ? (
                        <div className="text-center py-20">
                            <div
                                className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"
                                style={{ backgroundColor: cardBg, border: `1px solid ${cardBorder}` }}
                            >
                                <FileText size={32} style={{ color: mutedText }} />
                            </div>
                            <h3 className="text-xl font-bold mb-2" style={{ color: mutedText }}>
                                {t('blog.noCategoryPosts', 'No hay artículos en esta categoría')}
                            </h3>
                            <p className="text-sm" style={{ color: mutedText }}>
                                {t('blog.noCategoryPostsDesc', 'Los artículos publicados en esta categoría aparecerán aquí.')}
                            </p>
                        </div>
                    ) : category.layoutType === 'gallery' ? (
                        <MasonryGallery
                            posts={publishedPosts}
                            backgroundColor={backgroundColor}
                            textColor={textColor}
                            accentColor={accentColor}
                            onArticleClick={onArticleClick}
                        />
                    ) : category.layoutType === 'profile' ? (
                        <ProfileDirectory
                            posts={publishedPosts}
                            backgroundColor={backgroundColor}
                            textColor={textColor}
                            accentColor={accentColor}
                            onArticleClick={onArticleClick}
                        />
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
                            {publishedPosts.map((post) => (
                                <article
                                    key={post.id}
                                    onClick={() => onArticleClick(post.slug)}
                                    className="group cursor-pointer rounded-2xl overflow-hidden hover:-translate-y-1 transition-all duration-300 flex flex-col h-full"
                                    style={{
                                        backgroundColor: cardBg,
                                        border: `1px solid ${cardBorder}`,
                                    }}
                                >
                                    {/* Article Image */}
                                    <div className="relative h-52 overflow-hidden">
                                        {post.featuredImage ? (
                                            <img
                                                src={post.featuredImage}
                                                alt={post.title}
                                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                            />
                                        ) : (
                                            <div
                                                className="w-full h-full flex items-center justify-center"
                                                style={{ background: `linear-gradient(135deg, ${accentColor}10, ${cardBg})` }}
                                            >
                                                <FileText size={32} style={{ color: `${textColor}20` }} />
                                            </div>
                                        )}
                                    </div>

                                    {/* Article Content */}
                                    <div className="p-6 flex-1 flex flex-col">
                                        <h3
                                            className="text-lg font-bold mb-3 leading-snug transition-colors line-clamp-2 font-header"
                                            style={{ color: textColor }}
                                        >
                                            {post.title}
                                        </h3>
                                        {post.excerpt && (
                                            <p className="text-sm line-clamp-3 mb-4 flex-1" style={{ color: mutedText }}>
                                                {post.excerpt}
                                            </p>
                                        )}
                                        <div
                                            className="flex items-center justify-between text-xs mt-auto pt-4"
                                            style={{ color: mutedText, borderTop: `1px solid ${cardBorder}` }}
                                        >
                                            <div className="flex items-center gap-1.5">
                                                <Calendar size={12} />
                                                <span>
                                                    {new Date(post.publishedAt || post.createdAt).toLocaleDateString(undefined, {
                                                        year: 'numeric',
                                                        month: 'short',
                                                        day: 'numeric',
                                                    })}
                                                </span>
                                            </div>
                                            {post.author && (
                                                <span className="font-medium">{post.author}</span>
                                            )}
                                        </div>
                                    </div>
                                </article>
                            ))}
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

export default BlogCategoryPage;

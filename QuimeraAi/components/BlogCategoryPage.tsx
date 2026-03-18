/**
 * BlogCategoryPage
 * Content-only component for displaying blog category articles.
 * Uses the project's theme colors passed as props (same pattern as BlogPost).
 * No own header/footer — the parent component (PublicWebsitePreview) wraps it.
 */

import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Calendar, FileText, Tag } from 'lucide-react';
import { CMSPost, CMSCategory } from '../types';

interface BlogCategoryPageProps {
    category: CMSCategory;
    posts: CMSPost[];
    onNavigateBack: () => void;
    onArticleClick: (slug: string) => void;
    backgroundColor?: string;
    textColor?: string;
    accentColor?: string;
}

const BlogCategoryPage: React.FC<BlogCategoryPageProps> = ({
    category,
    posts,
    onNavigateBack,
    onArticleClick,
    backgroundColor = 'var(--site-base, #ffffff)',
    textColor = 'var(--site-heading, #1a1a2e)',
    accentColor = 'var(--site-accent, #4f46e5)',
}) => {
    const { t } = useTranslation();

    // Only published articles, sorted by date
    const publishedPosts = useMemo(() => {
        return posts
            .filter(p => p.status === 'published')
            .sort((a, b) => new Date(b.publishedAt || b.createdAt).getTime() - new Date(a.publishedAt || a.createdAt).getTime());
    }, [posts]);

    // Derive a subtle card bg from the background
    const cardBg = `color-mix(in srgb, ${textColor} 5%, ${backgroundColor})`;
    const cardBorder = `color-mix(in srgb, ${textColor} 10%, transparent)`;
    const mutedText = `color-mix(in srgb, ${textColor} 60%, ${backgroundColor})`;

    return (
        <div className="min-h-screen pb-20 animate-fade-in-up" style={{ backgroundColor, color: textColor }}>
            {/* Hero Section */}
            <div className="relative overflow-hidden" style={{ minHeight: category.featuredImage ? '40vh' : '30vh' }}>
                {category.featuredImage ? (
                    <div className="absolute inset-0 z-0">
                        <div className="absolute inset-x-0 bottom-0 h-2/3 z-10" style={{ background: `linear-gradient(to top, ${backgroundColor}, ${backgroundColor}cc, transparent)` }} />
                        <div className="absolute inset-0 z-10" style={{ backgroundColor: 'rgba(0,0,0,0.3)' }} />
                        <img
                            src={category.featuredImage}
                            alt={category.name}
                            className="w-full h-full object-cover"
                        />
                    </div>
                ) : (
                    <div className="absolute inset-0 z-0" style={{ background: `linear-gradient(135deg, ${accentColor}15, ${backgroundColor})` }}>
                        <div className="absolute inset-x-0 bottom-0 h-1/2" style={{ background: `linear-gradient(to top, ${backgroundColor}, transparent)` }} />
                    </div>
                )}

                <div className="relative z-20 container mx-auto px-4 sm:px-6 pb-12 sm:pb-16 flex items-end" style={{ minHeight: 'inherit' }}>
                    <div className="max-w-4xl w-full">
                        {/* Back button */}
                        <button
                            onClick={onNavigateBack}
                            className="flex items-center gap-2 mb-6 font-medium hover:opacity-80 transition-opacity"
                            style={{ color: category.featuredImage ? '#ffffff' : textColor }}
                        >
                            <ArrowLeft size={18} />
                            <span>{t('blog.backToHome', 'Volver al inicio')}</span>
                        </button>

                        <div className="flex items-center gap-3 mb-4">
                            <span
                                className="px-3 py-1 rounded-full text-xs sm:text-sm font-bold uppercase tracking-widest flex items-center gap-1.5"
                                style={{
                                    color: accentColor,
                                    backgroundColor: `${accentColor}20`,
                                    border: `1px solid ${accentColor}30`,
                                }}
                            >
                                <Tag size={14} />
                                {t('blog.category', 'Categoría')}
                            </span>
                        </div>
                        <h1
                            className="text-4xl sm:text-5xl md:text-6xl font-black mb-4 leading-[1.1] tracking-tighter font-header"
                            style={{ color: category.featuredImage ? '#ffffff' : textColor }}
                        >
                            {category.name}
                        </h1>
                        {category.description && (
                            <p
                                className="text-lg sm:text-xl font-light leading-relaxed max-w-3xl opacity-80"
                                style={{ color: category.featuredImage ? '#ffffffcc' : mutedText }}
                            >
                                {category.description}
                            </p>
                        )}
                        <p className="text-sm mt-4 font-medium" style={{ color: mutedText }}>
                            {publishedPosts.length} {publishedPosts.length === 1 ? t('blog.article', 'artículo') : t('blog.articles', 'artículos')}
                        </p>
                    </div>
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

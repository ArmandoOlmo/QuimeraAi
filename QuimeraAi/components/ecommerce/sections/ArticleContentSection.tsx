/**
 * ArticleContentSection Component
 * 
 * A section component that renders a blog article/post.
 * Used in dynamic pages with dynamicSource: 'blogPosts'
 */

import React from 'react';
import { CMSPost } from '../../../types';
import BlogPost from '../../BlogPost';

interface ArticleContentSectionProps {
    /** Project ID for analytics/tracking */
    projectId?: string;
    /** Article slug from URL params */
    articleSlug?: string;
    /** Pre-loaded article data (for SSR) */
    article?: CMSPost;
    /** Custom colors */
    colors?: {
        background?: string;
        heading?: string;
        text?: string;
        accent?: string;
    };
    /** Theme object */
    theme?: {
        fontFamilyHeader?: string;
        fontFamilyBody?: string;
        cardBorderRadius?: string;
    };
    /** Navigation callback */
    onBack?: () => void;
}

/**
 * ArticleContentSection
 * 
 * Renders a full blog article within the page architecture.
 * Supports both SSR (pre-loaded article) and CSR (client-side fetch) modes.
 */
const ArticleContentSection: React.FC<ArticleContentSectionProps> = ({
    projectId,
    articleSlug,
    article: preloadedArticle,
    colors = {},
    theme = {},
    onBack = () => window.location.href = '/blog',
}) => {
    const {
        background = '#0f172a',
        heading = '#ffffff',
        text = '#94a3b8',
        accent = '#6366f1',
    } = colors;

    if (!preloadedArticle) {
        return (
            <section 
                id="article-content" 
                className="article-content-section min-h-[60vh] py-16"
                style={{ backgroundColor: background }}
            >
                <div className="container mx-auto px-4 max-w-4xl text-center">
                    <p className="text-lg" style={{ color: text }}>
                        {articleSlug ? 'Cargando artículo...' : 'Artículo no especificado'}
                    </p>
                </div>
            </section>
        );
    }

    return (
        <section id="article-content" className="article-content-section">
            <BlogPost
                post={preloadedArticle}
                theme={theme as any}
                onBack={onBack}
                backgroundColor={background}
                textColor={text}
                accentColor={accent}
            />
        </section>
    );
};

export default ArticleContentSection;




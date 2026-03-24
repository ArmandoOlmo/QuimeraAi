import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Calendar } from 'lucide-react';
import { CMSPost } from '../../../types';

interface MasonryGalleryProps {
    posts: CMSPost[];
    backgroundColor?: string;
    textColor?: string;
    accentColor?: string;
    onArticleClick: (slug: string) => void;
}

const MasonryGallery: React.FC<MasonryGalleryProps> = ({
    posts,
    backgroundColor = '#ffffff',
    textColor = '#1a1a2e',
    accentColor = '#4f46e5',
    onArticleClick
}) => {
    const { t } = useTranslation();
    const [selectedPost, setSelectedPost] = useState<CMSPost | null>(null);

    const mutedText = `color-mix(in srgb, ${textColor} 60%, ${backgroundColor})`;
    const cardBg = `color-mix(in srgb, ${textColor} 5%, ${backgroundColor})`;
    const cardBorder = `color-mix(in srgb, ${textColor} 10%, transparent)`;

    if (posts.length === 0) return null;

    return (
        <div className="w-full" style={{ containerType: 'inline-size' }}>
            <style>{`
                .masonry-gallery { columns: 1; gap: 1rem; }
                @container (min-width: 500px) { .masonry-gallery { columns: 2; } }
                @container (min-width: 900px) { .masonry-gallery { columns: 3; } }
                @container (min-width: 1200px) { .masonry-gallery { columns: 4; } }
            `}</style>
            <div className="masonry-gallery space-y-4">
                {posts.map((post) => (
                    <div
                        key={post.id}
                        className="break-inside-avoid cursor-pointer group relative overflow-hidden rounded-xl"
                        style={{ backgroundColor: cardBg, border: `1px solid ${cardBorder}` }}
                        onClick={() => setSelectedPost(post)}
                    >
                        {post.featuredImage ? (
                            <img
                                src={post.featuredImage}
                                alt={post.title}
                                className="w-full object-cover transition-transform duration-700 group-hover:scale-105"
                                style={{ minHeight: '180px', maxHeight: '400px' }}
                            />
                        ) : (
                            <div className="w-full flex items-center justify-center min-h-[200px]" style={{ background: `linear-gradient(135deg, ${accentColor}10, ${cardBg})` }}>
                                <span className="opacity-30" style={{ color: textColor }}>{t('common.noImage', 'Sin Imagen')}</span>
                            </div>
                        )}

                        {/* Always-visible title bar at bottom */}
                        <div
                            className="absolute bottom-0 left-0 right-0 px-4 pb-3 pt-10"
                            style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.3) 70%, transparent 100%)' }}
                        >
                            <h3 className="text-white font-bold text-sm leading-snug line-clamp-2">
                                {post.title}
                            </h3>
                        </div>

                        {/* Desktop hover: darker overlay */}
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300 pointer-events-none" />
                    </div>
                ))}
            </div>

            {/* Lightbox / Modal — Full-screen image with bottom overlay */}
            {selectedPost && (
                <div
                    className="fixed inset-0 z-[100] animate-fade-in cursor-pointer"
                    style={{ backgroundColor: 'rgba(0,0,0,0.92)' }}
                    onClick={() => setSelectedPost(null)}
                >
                    {/* Close button */}
                    <button
                        onClick={() => setSelectedPost(null)}
                        className="absolute top-5 right-5 z-20 w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white backdrop-blur-md transition-colors"
                    >
                        <X size={20} />
                    </button>

                    {/* Image — centered, max size, preserves aspect */}
                    <div className="absolute inset-0 flex items-center justify-center p-4 pb-44 sm:pb-36">
                        {selectedPost.featuredImage ? (
                            <img
                                src={selectedPost.featuredImage}
                                alt={selectedPost.title}
                                className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
                                onClick={(e) => e.stopPropagation()}
                            />
                        ) : (
                            <div className="text-white/30 text-lg">{t('common.noImage', 'Sin Imagen')}</div>
                        )}
                    </div>

                    {/* Bottom info overlay */}
                    <div
                        className="absolute bottom-0 left-0 right-0 px-6 pb-6 pt-16"
                        style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.6) 60%, transparent 100%)' }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="max-w-3xl mx-auto">
                            <h2 className="text-xl sm:text-2xl font-bold text-white mb-2 font-header leading-snug">
                                {selectedPost.title}
                            </h2>
                            <div className="flex items-center gap-3 mb-3 text-white/60 text-sm">
                                <div className="flex items-center gap-1.5">
                                    <Calendar size={13} />
                                    <span>{new Date(selectedPost.publishedAt || selectedPost.createdAt).toLocaleDateString()}</span>
                                </div>
                                {selectedPost.author && (
                                    <>
                                        <span>·</span>
                                        <span>{selectedPost.author}</span>
                                    </>
                                )}
                            </div>
                            {selectedPost.excerpt && (
                                <p className="text-white/70 text-sm line-clamp-2 mb-4 max-w-2xl">
                                    {selectedPost.excerpt}
                                </p>
                            )}
                            <button
                                onClick={() => {
                                    setSelectedPost(null);
                                    onArticleClick(selectedPost.slug);
                                }}
                                className="px-6 py-2.5 rounded-lg font-semibold text-sm transition-all hover:scale-[1.03] active:scale-[0.97]"
                                style={{ backgroundColor: accentColor, color: '#ffffff' }}
                            >
                                {t('common.readMore', 'Leer artículo completo')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MasonryGallery;

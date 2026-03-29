import React from 'react';
import { User, ChevronRight } from 'lucide-react';
import { CMSPost } from '../../../types';

interface ProfileDirectoryProps {
    posts: CMSPost[];
    backgroundColor?: string;
    textColor?: string;
    accentColor?: string;
    onArticleClick: (slug: string) => void;
}

const ProfileDirectory: React.FC<ProfileDirectoryProps> = ({
    posts,
    backgroundColor = '#ffffff',
    textColor = '#1a1a2e',
    accentColor = '#4f46e5',
    onArticleClick
}) => {
    const mutedText = `color-mix(in srgb, ${textColor} 60%, ${backgroundColor})`;
    const cardBg = `color-mix(in srgb, ${textColor} 5%, ${backgroundColor})`;
    const cardBorder = `color-mix(in srgb, ${textColor} 10%, transparent)`;

    if (posts.length === 0) return null;

    return (
        <div className="w-full relative">
            {/* Vertical Profile Card Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {posts.map((post) => (
                    <div
                        key={post.id}
                        className="group flex flex-col rounded-2xl cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:shadow-xl overflow-hidden"
                        style={{ backgroundColor: cardBg, border: `1px solid ${cardBorder}` }}
                        onClick={() => onArticleClick(post.slug)}
                    >
                        {/* Full Image — vertical card, aspect 4:5 */}
                        <div className="relative w-full overflow-hidden" style={{ aspectRatio: '4 / 5' }}>
                            {post.featuredImage ? (
                                <img
                                    src={post.featuredImage}
                                    alt={post.title}
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                />
                            ) : (
                                <div
                                    className="w-full h-full flex items-center justify-center"
                                    style={{ backgroundColor: `${accentColor}15` }}
                                >
                                    <User size={48} style={{ color: accentColor }} className="opacity-40" />
                                </div>
                            )}
                            {/* Subtle gradient overlay at bottom of image */}
                            <div
                                className="absolute bottom-0 left-0 right-0 h-16 pointer-events-none"
                                style={{ background: `linear-gradient(to top, ${cardBg}, transparent)` }}
                            />
                        </div>

                        {/* Name + Excerpt */}
                        <div className="px-4 py-4 flex items-center gap-2">
                            <div className="flex-1 min-w-0">
                                <h3 className="font-bold text-base truncate mb-1" style={{ color: textColor }}>
                                    {post.title}
                                </h3>
                                {post.excerpt && (
                                    <p className="text-xs line-clamp-2" style={{ color: mutedText }}>
                                        {post.excerpt}
                                    </p>
                                )}
                            </div>
                            <div
                                className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 opacity-0 group-hover:opacity-100 transition-all"
                                style={{ backgroundColor: `${accentColor}10`, color: accentColor }}
                            >
                                <ChevronRight size={16} />
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default ProfileDirectory;

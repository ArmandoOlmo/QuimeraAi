import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Calendar, User, ChevronRight } from 'lucide-react';
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
    const { t } = useTranslation();
    const [selectedProfile, setSelectedProfile] = useState<CMSPost | null>(null);

    const mutedText = `color-mix(in srgb, ${textColor} 60%, ${backgroundColor})`;
    const cardBg = `color-mix(in srgb, ${textColor} 5%, ${backgroundColor})`;
    const cardBorder = `color-mix(in srgb, ${textColor} 10%, transparent)`;

    if (posts.length === 0) return null;

    return (
        <div className="w-full relative">
            {/* Profile Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {posts.map((post) => (
                    <div
                        key={post.id}
                        className="group flex items-center p-4 rounded-2xl cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
                        style={{ backgroundColor: cardBg, border: `1px solid ${cardBorder}` }}
                        onClick={() => setSelectedProfile(post)}
                    >
                        <div className="w-16 h-16 rounded-full overflow-hidden flex-shrink-0 mr-4" style={{ backgroundColor: `${accentColor}20` }}>
                            {post.featuredImage ? (
                                <img
                                    src={post.featuredImage}
                                    alt={post.title}
                                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                    <User size={24} style={{ color: accentColor }} />
                                </div>
                            )}
                        </div>
                        <div className="flex-1 min-w-0">
                            <h3 className="font-bold text-base truncate mb-1" style={{ color: textColor }}>
                                {post.title}
                            </h3>
                            {post.excerpt && (
                                <p className="text-xs truncate" style={{ color: mutedText }}>
                                    {post.excerpt}
                                </p>
                            )}
                        </div>
                        <div className="w-8 h-8 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all -translate-x-4 group-hover:translate-x-0" style={{ backgroundColor: `${accentColor}10`, color: accentColor }}>
                            <ChevronRight size={16} />
                        </div>
                    </div>
                ))}
            </div>

            {/* Side Drawer Overlay */}
            {selectedProfile && (
                <div 
                    className="fixed inset-0 z-[100] flex animate-fade-in"
                    style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
                    onClick={() => setSelectedProfile(null)}
                >
                    {/* Drawer Content */}
                    <div 
                        className="absolute top-0 right-0 h-full w-full sm:w-[500px] max-w-full shadow-2xl flex flex-col animate-slide-in-right overflow-hidden"
                        style={{ backgroundColor }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Drawer Header (Cover/Profile Image) */}
                        <div className="relative h-64 flex-shrink-0 bg-black/5" style={{ borderBottom: `1px solid ${cardBorder}` }}>
                            {selectedProfile.featuredImage ? (
                                <>
                                    <div className="absolute inset-0 z-0">
                                        <img src={selectedProfile.featuredImage} className="w-full h-full object-cover opacity-50 blur-xl" alt="" />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                                    </div>
                                    <div className="relative z-10 w-full h-full flex items-end justify-center pb-8">
                                        <img
                                            src={selectedProfile.featuredImage}
                                            alt={selectedProfile.title}
                                            className="w-32 h-32 rounded-full object-cover border-4 shadow-xl"
                                            style={{ borderColor: backgroundColor }}
                                        />
                                    </div>
                                </>
                            ) : (
                                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-indigo-500/20 to-purple-500/20">
                                    <User size={64} style={{ color: accentColor }} className="opacity-50" />
                                </div>
                            )}

                            {/* Close button */}
                            <button
                                onClick={() => setSelectedProfile(null)}
                                className="absolute top-4 right-4 z-20 w-10 h-10 flex items-center justify-center rounded-full bg-black/20 hover:bg-black/40 text-white backdrop-blur-md transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Profile Info */}
                        <div className="flex-1 overflow-y-auto w-full">
                            <div className="p-8">
                                <div className="text-center mb-6">
                                    <h2 className="text-3xl font-bold mb-2 font-header" style={{ color: textColor }}>
                                        {selectedProfile.title}
                                    </h2>
                                    {selectedProfile.excerpt && (
                                        <p className="text-base font-medium" style={{ color: accentColor }}>
                                            {selectedProfile.excerpt}
                                        </p>
                                    )}
                                </div>

                                <div className="flex items-center justify-center gap-4 mb-8 text-sm" style={{ color: mutedText }}>
                                    <div className="flex items-center gap-1.5">
                                        <Calendar size={14} />
                                        <span>
                                            {new Date(selectedProfile.publishedAt || selectedProfile.createdAt).toLocaleDateString()}
                                        </span>
                                    </div>
                                    {selectedProfile.author && (
                                        <div className="flex items-center gap-1.5 border-l pl-4" style={{ borderColor: cardBorder }}>
                                            <User size={14} />
                                            <span>{selectedProfile.author}</span>
                                        </div>
                                    )}
                                </div>

                                {/* Content */}
                                <div 
                                    className="prose prose-sm max-w-none prose-headings:font-bold pb-20"
                                    style={{ color: textColor }}
                                    dangerouslySetInnerHTML={{ __html: selectedProfile.content }}
                                />
                            </div>
                        </div>

                        {/* Footer Actions */}
                        <div className="absolute pl-8 pr-8 pb-8 bottom-0 w-full pt-4 bg-gradient-to-t from-background to-transparent" style={{ '--tw-gradient-from': `${backgroundColor} 80%` } as React.CSSProperties}>
                            <button
                                onClick={() => {
                                    setSelectedProfile(null);
                                    onArticleClick(selectedProfile.slug);
                                }}
                                className="w-full py-3 rounded-xl font-bold transition-transform hover:-translate-y-0.5"
                                style={{ backgroundColor: accentColor, color: '#ffffff', boxShadow: `0 10px 25px -5px ${accentColor}40` }}
                            >
                                {t('common.viewFullProfile', 'Ver Perfil Completo')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProfileDirectory;

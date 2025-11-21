
import React from 'react';
import { CMSPost, ThemeData } from '../types';
import { ArrowLeft, Calendar, User, Share2 } from 'lucide-react';

interface BlogPostProps {
    post: CMSPost;
    theme: ThemeData;
    onBack: () => void;
    textColor: string;
    backgroundColor: string;
    accentColor: string;
}

const BlogPost: React.FC<BlogPostProps> = ({ post, theme, onBack, textColor, backgroundColor, accentColor }) => {
    
    return (
        <div className="min-h-screen pb-20 animate-fade-in-up" style={{ backgroundColor: backgroundColor, color: textColor }}>
             {/* Hero Section */}
             <div className="relative h-[40vh] md:h-[50vh] overflow-hidden">
                {post.featuredImage ? (
                    <img src={post.featuredImage} alt={post.title} className="w-full h-full object-cover" />
                ) : (
                    <div className="w-full h-full bg-gradient-to-r from-gray-800 to-gray-900" />
                )}
                <div className="absolute inset-0 bg-black/50 flex items-end pb-12 md:pb-16">
                    <div className="container mx-auto px-6 max-w-4xl">
                         <button 
                            onClick={onBack}
                            className="flex items-center text-white/80 hover:text-white mb-6 transition-colors font-medium"
                        >
                            <ArrowLeft size={20} className="mr-2" /> Back to Home
                        </button>
                        <h1 className="text-4xl md:text-6xl font-extrabold text-white leading-tight mb-4 font-header">
                            {post.title}
                        </h1>
                        <div className="flex items-center space-x-6 text-white/80 text-sm">
                            <span className="flex items-center"><Calendar size={14} className="mr-2"/> {new Date(post.updatedAt).toLocaleDateString()}</span>
                            <span className="flex items-center"><User size={14} className="mr-2"/> Admin</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="container mx-auto px-6 max-w-3xl py-12">
                <div 
                    className="prose prose-lg max-w-none font-body"
                    style={{ 
                        color: textColor,
                        '--tw-prose-headings': textColor,
                        '--tw-prose-links': accentColor,
                        '--tw-prose-bold': textColor,
                        '--tw-prose-counters': textColor,
                        '--tw-prose-bullets': textColor,
                        '--tw-prose-quotes': textColor,
                        '--tw-prose-quote-borders': accentColor,
                        '--tw-prose-captions': textColor,
                        '--tw-prose-code': accentColor,
                        '--tw-prose-pre-code': textColor,
                        '--tw-prose-pre-bg': 'rgba(0,0,0,0.2)',
                        '--tw-prose-hr': 'rgba(255,255,255,0.1)',
                    } as any}
                    dangerouslySetInnerHTML={{ __html: post.content }}
                />
                
                <div className="mt-12 pt-8 border-t border-white/10 flex justify-between items-center">
                    <p className="text-sm opacity-70">Share this article</p>
                    <button className="p-2 rounded-full hover:bg-white/10 transition-colors" title="Share">
                        <Share2 size={20} />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default BlogPost;

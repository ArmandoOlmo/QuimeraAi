
import React, { useMemo, useState, useRef, useEffect } from 'react';
import { CMSPost, ThemeData } from '../types';
import { ArrowLeft, Calendar, User, Share2, X, Link2, Check } from 'lucide-react';
import { sanitizeHtml } from '../utils/sanitize';

interface BlogPostProps {
    post: CMSPost;
    theme: ThemeData;
    onBack: () => void;
    textColor: string;
    backgroundColor: string;
    accentColor: string;
}

const BlogPost: React.FC<BlogPostProps> = ({ post, theme, onBack, textColor, backgroundColor, accentColor }) => {
    // SECURITY: Sanitize HTML content to prevent XSS attacks
    const sanitizedContent = useMemo(() => sanitizeHtml(post.content || ''), [post.content]);

    // Share functionality
    const [showShareMenu, setShowShareMenu] = useState(false);
    const [linkCopied, setLinkCopied] = useState(false);
    const shareMenuRef = useRef<HTMLDivElement>(null);

    // Close share menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (shareMenuRef.current && !shareMenuRef.current.contains(event.target as Node)) {
                setShowShareMenu(false);
            }
        };

        if (showShareMenu) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showShareMenu]);

    const getShareUrl = () => typeof window !== 'undefined' ? window.location.href : '';

    const handleShare = async () => {
        const shareData = {
            title: post.title,
            text: post.excerpt || `Check out this article: ${post.title}`,
            url: getShareUrl(),
        };

        // Try native Web Share API first (mobile and some browsers)
        if (navigator.share && navigator.canShare?.(shareData)) {
            try {
                await navigator.share(shareData);
            } catch (err) {
                // User cancelled or error - show menu instead
                if ((err as Error).name !== 'AbortError') {
                    setShowShareMenu(true);
                }
            }
        } else {
            // Show custom share menu
            setShowShareMenu(true);
        }
    };

    const openShareWindow = (shareUrl: string) => {
        // Try to open in a new window/tab
        const newWindow = window.open(shareUrl, '_blank', 'noopener,noreferrer,width=600,height=400');

        // If popup was blocked, try using a link element
        if (!newWindow || newWindow.closed || typeof newWindow.closed === 'undefined') {
            // Create a temporary link and click it
            const link = document.createElement('a');
            link.href = shareUrl;
            link.target = '_blank';
            link.rel = 'noopener noreferrer';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }

        setShowShareMenu(false);
    };

    const shareToTwitter = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        const url = encodeURIComponent(getShareUrl());
        const text = encodeURIComponent(post.title);
        openShareWindow(`https://twitter.com/intent/tweet?url=${url}&text=${text}`);
    };

    const shareToFacebook = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        const url = encodeURIComponent(getShareUrl());
        openShareWindow(`https://www.facebook.com/sharer/sharer.php?u=${url}`);
    };

    const shareToLinkedIn = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        const url = encodeURIComponent(getShareUrl());
        const title = encodeURIComponent(post.title);
        openShareWindow(`https://www.linkedin.com/sharing/share-offsite/?url=${url}`);
    };

    const shareToWhatsApp = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        const shareUrl = getShareUrl();
        const text = encodeURIComponent(`${post.title} - ${shareUrl}`);
        openShareWindow(`https://wa.me/?text=${text}`);
    };

    const copyLink = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        try {
            const url = getShareUrl();

            // Try clipboard API first
            if (navigator.clipboard && navigator.clipboard.writeText) {
                await navigator.clipboard.writeText(url);
            } else {
                // Fallback: create a temporary input
                const input = document.createElement('input');
                input.value = url;
                input.style.position = 'fixed';
                input.style.left = '-9999px';
                document.body.appendChild(input);
                input.select();
                document.execCommand('copy');
                document.body.removeChild(input);
            }

            setLinkCopied(true);
            setTimeout(() => {
                setLinkCopied(false);
                setShowShareMenu(false);
            }, 1500);
        } catch (err) {
            console.error('Failed to copy link:', err);
            // Show fallback - select text for manual copy
            alert(`Copy this link: ${getShareUrl()}`);
        }
    };

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
                        <h1 className="text-4xl md:text-6xl font-extrabold text-white leading-tight mb-4 font-header">
                            {post.title}
                        </h1>
                        <div className="flex items-center space-x-6 text-white/80 text-sm">
                            <span className="flex items-center"><Calendar size={14} className="mr-2" /> {new Date(post.updatedAt).toLocaleDateString()}</span>
                            <span className="flex items-center"><User size={14} className="mr-2" /> Admin</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Back to Home Button - Below Header */}
            <div className="container mx-auto px-6 max-w-4xl pt-6">
                <button
                    onClick={onBack}
                    className="flex items-center hover:opacity-80 mb-6 transition-colors font-medium"
                    style={{ color: textColor }}
                >
                    <ArrowLeft size={20} className="mr-2" /> Back to Home
                </button>
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
                    dangerouslySetInnerHTML={{ __html: sanitizedContent }}
                />

                <div className="mt-12 pt-8 border-t border-white/10 flex justify-between items-center relative">
                    <p className="text-sm opacity-70">Share this article</p>
                    <div className="relative" ref={shareMenuRef}>
                        <button
                            type="button"
                            onClick={handleShare}
                            className="p-2 rounded-full hover:bg-white/10 transition-colors cursor-pointer"
                            title="Share"
                        >
                            <Share2 size={20} />
                        </button>

                        {/* Share Menu Dropdown */}
                        {showShareMenu && (
                            <div
                                className="absolute bottom-full right-0 mb-2 rounded-xl shadow-2xl overflow-hidden z-50 min-w-[200px] animate-fade-in-up"
                                style={{
                                    backgroundColor: backgroundColor,
                                    borderWidth: '1px',
                                    borderStyle: 'solid',
                                    borderColor: `${textColor}20`
                                }}
                            >
                                <div
                                    className="p-3 flex justify-between items-center"
                                    style={{ borderBottom: `1px solid ${textColor}15` }}
                                >
                                    <span className="text-sm font-medium" style={{ color: textColor }}>Share</span>
                                    <button
                                        type="button"
                                        onClick={() => setShowShareMenu(false)}
                                        className="p-1 rounded-full transition-colors cursor-pointer"
                                        style={{ color: `${textColor}80` }}
                                    >
                                        <X size={14} />
                                    </button>
                                </div>
                                <div className="p-2">
                                    {/* Twitter/X */}
                                    <button
                                        type="button"
                                        onClick={shareToTwitter}
                                        className="w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-left cursor-pointer hover:opacity-80"
                                        style={{ color: textColor }}
                                    >
                                        <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
                                            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                                        </svg>
                                        <span className="text-sm">Twitter / X</span>
                                    </button>

                                    {/* Facebook */}
                                    <button
                                        type="button"
                                        onClick={shareToFacebook}
                                        className="w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-left cursor-pointer hover:opacity-80"
                                        style={{ color: textColor }}
                                    >
                                        <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
                                            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                                        </svg>
                                        <span className="text-sm">Facebook</span>
                                    </button>

                                    {/* LinkedIn */}
                                    <button
                                        type="button"
                                        onClick={shareToLinkedIn}
                                        className="w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-left cursor-pointer hover:opacity-80"
                                        style={{ color: textColor }}
                                    >
                                        <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
                                            <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                                        </svg>
                                        <span className="text-sm">LinkedIn</span>
                                    </button>

                                    {/* WhatsApp */}
                                    <button
                                        type="button"
                                        onClick={shareToWhatsApp}
                                        className="w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-left cursor-pointer hover:opacity-80"
                                        style={{ color: textColor }}
                                    >
                                        <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
                                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                                        </svg>
                                        <span className="text-sm">WhatsApp</span>
                                    </button>

                                    <div className="my-2" style={{ borderTop: `1px solid ${textColor}15` }}></div>

                                    {/* Copy Link */}
                                    <button
                                        type="button"
                                        onClick={copyLink}
                                        className="w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-left cursor-pointer hover:opacity-80"
                                        style={{ color: linkCopied ? accentColor : textColor }}
                                    >
                                        {linkCopied ? (
                                            <>
                                                <Check size={16} className="flex-shrink-0" style={{ color: accentColor }} />
                                                <span className="text-sm">Link copied!</span>
                                            </>
                                        ) : (
                                            <>
                                                <Link2 size={16} className="flex-shrink-0" />
                                                <span className="text-sm">Copy link</span>
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BlogPost;

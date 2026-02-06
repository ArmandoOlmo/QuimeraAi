/**
 * PublicBioPage
 * Public-facing bio page viewer - accessible without authentication
 * Route: /bio/:username
 */

import React, { useEffect, useState } from 'react';
import { ExternalLink, Loader2, Link2 } from 'lucide-react';
import { db, collection, query, where, getDocs } from '../firebase';
import type { BioLink, BioProfile, BioTheme } from '../contexts/bioPage';

interface PublicBioPageData {
    id: string;
    username: string;
    profile: BioProfile;
    theme: BioTheme;
    links: BioLink[];
    isPublished: boolean;
}

interface PublicBioPageProps {
    username?: string;
}

const PublicBioPage: React.FC<PublicBioPageProps> = ({ username }) => {
    const [bioPageData, setBioPageData] = useState<PublicBioPageData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Extract username from URL if not passed as prop
    const bioUsername = username || window.location.pathname.split('/bio/')[1];

    useEffect(() => {
        const fetchBioPage = async () => {
            if (!bioUsername) {
                setError('No username provided');
                setIsLoading(false);
                return;
            }

            try {
                // Query the publicBioPages collection by username
                const publicBioRef = collection(db, 'publicBioPages');
                const q = query(publicBioRef, where('username', '==', bioUsername));
                const snapshot = await getDocs(q);

                if (snapshot.empty) {
                    setError('Bio page not found');
                    setIsLoading(false);
                    return;
                }

                const doc = snapshot.docs[0];
                const data = doc.data() as Omit<PublicBioPageData, 'id'>;

                if (!data.isPublished) {
                    setError('This bio page is not published');
                    setIsLoading(false);
                    return;
                }

                setBioPageData({ ...data, id: doc.id });
            } catch (err) {
                console.error('Error fetching bio page:', err);
                setError('Failed to load bio page');
            } finally {
                setIsLoading(false);
            }
        };

        fetchBioPage();
    }, [bioUsername]);

    // Track link click
    const handleLinkClick = (link: BioLink) => {
        // Could add analytics tracking here
        window.open(link.url, '_blank');
    };

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 to-gray-800">
                <div className="flex flex-col items-center gap-3">
                    <Loader2 className="w-10 h-10 animate-spin text-indigo-500" />
                    <p className="text-gray-400 text-sm">Loading...</p>
                </div>
            </div>
        );
    }

    if (error || !bioPageData) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 to-gray-800">
                <div className="text-center">
                    <Link2 className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                    <h1 className="text-2xl font-bold text-white mb-2">Page Not Found</h1>
                    <p className="text-gray-400">{error || 'This bio page does not exist.'}</p>
                </div>
            </div>
        );
    }

    const { profile, theme, links } = bioPageData;

    // Button shape calculations
    const getBorderRadius = () => {
        switch (theme.buttonShape) {
            case 'square': return '4px';
            case 'rounded': return '12px';
            case 'rounder': return '20px';
            case 'pill': return '9999px';
            default: return '12px';
        }
    };

    // Button shadow calculations
    const getButtonShadow = () => {
        switch (theme.buttonShadow) {
            case 'soft': return '0 4px 12px rgba(0,0,0,0.15)';
            case 'strong': return '0 8px 24px rgba(0,0,0,0.25)';
            case 'hard': return '4px 4px 0px rgba(0,0,0,0.3)';
            case 'none':
            default: return 'none';
        }
    };

    // Button style calculations
    const getButtonStyle = () => {
        const baseStyle: React.CSSProperties = {
            borderRadius: getBorderRadius(),
            fontFamily: theme.bodyFont || 'inherit',
            boxShadow: getButtonShadow(),
        };

        const textColor = theme.buttonTextColor || '#ffffff';

        switch (theme.buttonStyle) {
            case 'fill':
                return {
                    ...baseStyle,
                    backgroundColor: theme.buttonColor,
                    color: textColor,
                };
            case 'glass':
                return {
                    ...baseStyle,
                    backgroundColor: `${theme.buttonColor}40`,
                    backdropFilter: 'blur(10px)',
                    WebkitBackdropFilter: 'blur(10px)',
                    border: `1px solid ${theme.buttonColor}60`,
                    color: textColor,
                };
            case 'outline':
                return {
                    ...baseStyle,
                    backgroundColor: 'transparent',
                    border: `2px solid ${theme.buttonColor}`,
                    color: theme.buttonColor,
                };
            case 'soft':
                return {
                    ...baseStyle,
                    backgroundColor: `${theme.buttonColor}20`,
                    color: theme.buttonColor,
                };
            default:
                return {
                    ...baseStyle,
                    backgroundColor: theme.buttonColor,
                    color: textColor,
                };
        }
    };

    // Background style calculations
    const getBackgroundStyle = (): React.CSSProperties => {
        const baseColor = theme.backgroundColor || '#1a1a2e';
        const gradientEndColor = theme.gradientColor || '#0f0f1a';

        switch (theme.backgroundType) {
            case 'gradient':
                return {
                    background: `linear-gradient(135deg, ${baseColor}, ${gradientEndColor})`,
                };
            case 'blur':
                return {
                    background: `linear-gradient(135deg, ${baseColor}cc, ${gradientEndColor}cc)`,
                    backdropFilter: 'blur(20px)',
                };
            case 'pattern': {
                const patternColor = theme.patternColor || theme.buttonColor;
                const patternSize = theme.patternSize || 20;
                const patternType = theme.backgroundPattern || 'dots';

                const patterns: Record<string, { image: string; size: string }> = {
                    dots: {
                        image: `radial-gradient(${patternColor}40 1px, transparent 1px)`,
                        size: `${patternSize}px ${patternSize}px`,
                    },
                    grid: {
                        image: `linear-gradient(${patternColor}20 1px, transparent 1px), linear-gradient(90deg, ${patternColor}20 1px, transparent 1px)`,
                        size: `${patternSize}px ${patternSize}px`,
                    },
                    diagonal: {
                        image: `repeating-linear-gradient(45deg, transparent, transparent ${patternSize / 4}px, ${patternColor}15 ${patternSize / 4}px, ${patternColor}15 ${patternSize / 4 + 1}px)`,
                        size: `${patternSize}px ${patternSize}px`,
                    },
                    waves: {
                        image: `repeating-linear-gradient(0deg, ${patternColor}10 0px, ${patternColor}10 2px, transparent 2px, transparent ${patternSize / 2.5}px)`,
                        size: `100% ${patternSize / 2}px`,
                    },
                };

                const p = patterns[patternType] || patterns.dots;
                return {
                    backgroundColor: baseColor,
                    backgroundImage: p.image,
                    backgroundSize: p.size,
                };
            }
            case 'image':
                return theme.backgroundImage ? {
                    backgroundImage: `url(${theme.backgroundImage})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                } : { backgroundColor: baseColor };
            case 'video':
                // Video handled separately in JSX
                return { backgroundColor: 'transparent' };
            case 'solid':
            default:
                return { backgroundColor: baseColor };
        }
    };

    // Profile size calculations
    const getAvatarSize = () => {
        return theme.profileSize === 'large' ? 'w-32 h-32' : 'w-24 h-24';
    };

    const getTitleSize = () => {
        return theme.profileSize === 'large' ? 'text-3xl' : 'text-2xl';
    };

    const enabledLinks = links.filter(l => l.enabled);

    // Colors from theme
    const titleColor = theme.titleColor || theme.textColor || '#ffffff';
    const bodyColor = theme.bodyColor || theme.textColor || '#ffffff';

    return (
        <div className="min-h-screen relative">
            {/* Video Background */}
            {theme.backgroundType === 'video' && theme.backgroundVideo && (
                <video
                    autoPlay
                    loop
                    muted
                    playsInline
                    className="absolute inset-0 w-full h-full object-cover z-0"
                >
                    <source src={theme.backgroundVideo} type="video/mp4" />
                </video>
            )}

            {/* Main Content */}
            <div
                className="min-h-screen flex items-center justify-center p-4 relative z-10"
                style={getBackgroundStyle()}
            >
                <div className="w-full max-w-md">
                    {/* Profile Section */}
                    {theme.profileLayout === 'hero' ? (
                        // Hero Layout
                        <div className="mb-8">
                            {profile.avatarUrl && (
                                <div
                                    className="w-full h-48 rounded-2xl mb-4 bg-cover bg-center"
                                    style={{ backgroundImage: `url(${profile.avatarUrl})` }}
                                />
                            )}
                            <h1
                                className={`${getTitleSize()} font-bold mb-2`}
                                style={{
                                    fontFamily: theme.titleFont || 'inherit',
                                    color: titleColor
                                }}
                            >
                                {profile.name}
                            </h1>
                            {profile.bio && (
                                <p
                                    className="text-sm opacity-80 max-w-xs"
                                    style={{
                                        fontFamily: theme.bodyFont || 'inherit',
                                        color: bodyColor
                                    }}
                                >
                                    {profile.bio}
                                </p>
                            )}
                        </div>
                    ) : (
                        // Circle Layout (default)
                        <div className="text-center mb-8">
                            {/* Avatar */}
                            {profile.avatarUrl ? (
                                <img
                                    src={profile.avatarUrl}
                                    alt={profile.name}
                                    className={`${getAvatarSize()} rounded-full mx-auto mb-4 object-cover ring-4 ring-white/10`}
                                />
                            ) : (
                                <div
                                    className={`${getAvatarSize()} rounded-full mx-auto mb-4 flex items-center justify-center text-3xl font-bold ring-4 ring-white/10`}
                                    style={{ backgroundColor: theme.buttonColor }}
                                >
                                    {profile.name?.charAt(0) || '?'}
                                </div>
                            )}

                            {/* Name */}
                            <h1
                                className={`${getTitleSize()} font-bold mb-2`}
                                style={{
                                    fontFamily: theme.titleFont || 'inherit',
                                    color: titleColor
                                }}
                            >
                                {profile.name}
                            </h1>

                            {/* Bio */}
                            {profile.bio && (
                                <p
                                    className="text-sm opacity-80 max-w-xs mx-auto"
                                    style={{
                                        fontFamily: theme.bodyFont || 'inherit',
                                        color: bodyColor
                                    }}
                                >
                                    {profile.bio}
                                </p>
                            )}
                        </div>
                    )}

                    {/* Links */}
                    <div className="space-y-3">
                        {enabledLinks.map((link) => (
                            <button
                                key={link.id}
                                onClick={() => handleLinkClick(link)}
                                className="w-full p-4 flex items-center justify-center gap-2 font-medium transition-all hover:scale-[1.02] hover:shadow-lg active:scale-[0.98]"
                                style={getButtonStyle()}
                            >
                                <span>{link.title}</span>
                                <ExternalLink size={16} className="opacity-60" />
                            </button>
                        ))}
                    </div>

                    {/* Footer */}
                    <div className="text-center mt-12 opacity-50">
                        <a
                            href="https://quimera.ai"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs hover:opacity-80 transition-opacity"
                            style={{ color: bodyColor }}
                        >
                            Made with Quimera.ai
                        </a>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PublicBioPage;

/**
 * QuimeraLoader Component
 * Unified loading animation using the app icon.
 * Shows tenant/agency branding when available, falls back to generic icon or Quimera logo.
 * On /preview/ routes, detects tenant branding from URL userId via Firestore.
 */

import React, { useState, useEffect } from 'react';
import { Sparkles } from 'lucide-react';
import { useSafeTenant } from '../../contexts/tenant/TenantContext';

const QUIMERA_LOGO = "https://firebasestorage.googleapis.com/v0/b/quimeraai.firebasestorage.app/o/quimera%2Fquimeralogo.png?alt=media&token=82368c1c-0f63-42b7-831f-72780006f032";

interface QuimeraLoaderProps {
    /** Size of the loader */
    size?: 'sm' | 'md' | 'lg';
    /** Whether to center in full screen */
    fullScreen?: boolean;
    /** Optional loading text */
    text?: string;
    /** Optional className for the wrapper */
    className?: string;
}

const sizeMap = {
    sm: { logo: 'w-8 h-8', container: 'w-10 h-10', halo1: 'w-14 h-14', halo2: 'w-12 h-12', border: 'border', logoSize: 32, iconSize: 'w-4 h-4' },
    md: { logo: 'w-12 h-12', container: 'w-16 h-16', halo1: 'w-24 h-24', halo2: 'w-20 h-20', border: 'border-2', logoSize: 48, iconSize: 'w-6 h-6' },
    lg: { logo: 'w-14 h-14', container: 'w-20 h-20', halo1: 'w-32 h-32', halo2: 'w-24 h-24', border: 'border-2', logoSize: 56, iconSize: 'w-8 h-8' },
};

const QuimeraLoader: React.FC<QuimeraLoaderProps> = ({
    size = 'md',
    fullScreen = false,
    text,
    className = '',
}) => {
    const s = sizeMap[size];
    const tenantContext = useSafeTenant();
    const branding = tenantContext?.currentTenant?.branding;

    // URL-based branding detection for /preview/ routes (no TenantProvider available)
    const [previewBranding, setPreviewBranding] = useState<{ logoUrl?: string; companyName?: string; primaryColor?: string } | null>(null);
    useEffect(() => {
        if (branding) return; // Already have branding from context
        const path = window.location.pathname;
        const match = path.match(/\/preview\/([^/]+)\//);
        if (!match) return;
        const userId = match[1];
        const fetchBranding = async () => {
            try {
                const { db, doc, getDoc } = await import('../../firebase');
                const snap = await getDoc(doc(db, 'tenants', `tenant_${userId}`));
                if (snap.exists()) {
                    const data = snap.data();
                    if (data?.branding?.companyName || data?.branding?.logoUrl) {
                        setPreviewBranding({
                            logoUrl: data.branding.logoUrl,
                            companyName: data.branding.companyName,
                            primaryColor: data.branding.primaryColor,
                        });
                    }
                }
            } catch (e) { /* ignore */ }
        };
        fetchBranding();
    }, [branding]);

    // Merge branding sources: context > preview URL detection
    const effectiveBranding = branding || previewBranding;
    const hasAgencyBranding = !!(effectiveBranding?.companyName || effectiveBranding?.logoUrl);
    const accentColor = (effectiveBranding as any)?.primaryColor || undefined;
    const haloColor = hasAgencyBranding && accentColor ? accentColor : undefined;

    const renderLogo = () => {
        if (effectiveBranding?.logoUrl) {
            return (
                <img
                    src={effectiveBranding.logoUrl}
                    alt="Loading..."
                    className={`${s.logo} object-contain animate-pulse rounded-full`}
                    style={{ animationDuration: '1.5s' }}
                    width={s.logoSize}
                    height={s.logoSize}
                    loading="eager"
                    decoding="sync"
                    fetchPriority="high"
                />
            );
        }
        if (effectiveBranding?.companyName) {
            // Generic Sparkles icon inside a colored circle
            return <Sparkles className={`${s.iconSize} text-white animate-pulse`} style={{ animationDuration: '1.5s' }} />;
        }
        return (
            <img
                src={QUIMERA_LOGO}
                alt="Loading..."
                className={`${s.logo} object-contain animate-pulse`}
                style={{ animationDuration: '1.5s' }}
                width={s.logoSize}
                height={s.logoSize}
                loading="eager"
                decoding="sync"
                fetchPriority="high"
            />
        );
    };

    // Circle styling: for agency with no logo, the circle IS the colored container
    // For agency with logo, the circle has a subtle border
    // For Quimera default, original yellow border
    const circleStyle: React.CSSProperties = {};
    if (hasAgencyBranding && !effectiveBranding?.logoUrl && accentColor) {
        circleStyle.backgroundColor = accentColor;
        circleStyle.borderColor = `${accentColor}80`;
    } else if (haloColor) {
        circleStyle.borderColor = `${haloColor}4D`;
    } else {
        circleStyle.borderColor = 'rgba(250, 204, 21, 0.3)';
    }

    const loader = (
        <div className={`flex flex-col items-center justify-center gap-3 ${className}`}>
            <div className="relative flex items-center justify-center">
                {/* Pulsing halos */}
                <div
                    className={`absolute ${s.halo1} rounded-full animate-ping`}
                    style={{ animationDuration: '2s', backgroundColor: haloColor ? `${haloColor}33` : 'rgba(250, 204, 21, 0.2)' }}
                />
                <div
                    className={`absolute ${s.halo2} rounded-full animate-ping`}
                    style={{ animationDuration: '1.5s', animationDelay: '0.2s', backgroundColor: haloColor ? `${haloColor}4D` : 'rgba(250, 204, 21, 0.3)' }}
                />

                {/* Logo container — always a circle */}
                <div
                    className={`relative z-10 ${s.container} rounded-full bg-editor-panel-bg shadow-2xl flex items-center justify-center ${s.border}`}
                    style={circleStyle}
                >
                    {renderLogo()}
                </div>
            </div>

            {text && (
                <p className="text-editor-text-secondary text-sm animate-pulse">{text}</p>
            )}
        </div>
    );

    if (fullScreen) {
        return (
            <div className="min-h-screen bg-editor-bg flex items-center justify-center">
                {loader}
            </div>
        );
    }

    return loader;
};

export default QuimeraLoader;

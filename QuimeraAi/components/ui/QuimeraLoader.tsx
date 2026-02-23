/**
 * QuimeraLoader Component
 * Unified loading animation.
 * Shows agency branding when tenant context is available,
 * a generic spinner while loading, and Quimera logo as fallback.
 */

import React from 'react';
import { useSafeTenant } from '../../contexts/tenant/TenantContext';

const QUIMERA_LOGO = "https://firebasestorage.googleapis.com/v0/b/quimeraai.firebasestorage.app/o/quimera%2Fquimeralogo.png?alt=media&token=82368c1c-0f63-42b7-831f-72780006f032";

interface QuimeraLoaderProps {
    size?: 'sm' | 'md' | 'lg';
    fullScreen?: boolean;
    text?: string;
    className?: string;
}

const sizeMap = {
    sm: { spinner: 'w-8 h-8', logo: 'w-8 h-8', container: 'w-10 h-10', halo1: 'w-14 h-14', halo2: 'w-12 h-12', border: 'border', logoSize: 32 },
    md: { spinner: 'w-10 h-10', logo: 'w-12 h-12', container: 'w-16 h-16', halo1: 'w-24 h-24', halo2: 'w-20 h-20', border: 'border-2', logoSize: 48 },
    lg: { spinner: 'w-12 h-12', logo: 'w-14 h-14', container: 'w-20 h-20', halo1: 'w-32 h-32', halo2: 'w-24 h-24', border: 'border-2', logoSize: 56 },
};

const QuimeraLoader: React.FC<QuimeraLoaderProps> = ({
    size = 'md',
    fullScreen = false,
    text,
    className = '',
}) => {
    const s = sizeMap[size];
    const tenantContext = useSafeTenant();

    // isLoadingTenant = true means Firestore is still fetching tenant data
    // We must wait until loading is done to know which logo to show
    const isLoading = tenantContext?.isLoadingTenant ?? true;
    const branding = tenantContext?.currentTenant?.branding;
    const agencyLogo = branding?.logoUrl;

    // While loading: show generic spinner. After loaded: show the correct logo.
    const showLogo = !isLoading;
    const logoUrl = agencyLogo || QUIMERA_LOGO;

    const loader = (
        <div className={`flex flex-col items-center justify-center gap-3 ${className}`}>
            <div className="relative flex items-center justify-center">
                {showLogo ? (
                    <>
                        {/* Pulsing halos */}
                        <div
                            className={`absolute ${s.halo1} rounded-full bg-yellow-400/20 animate-ping`}
                            style={{ animationDuration: '2s' }}
                        />
                        <div
                            className={`absolute ${s.halo2} rounded-full bg-yellow-400/30 animate-ping`}
                            style={{ animationDuration: '1.5s', animationDelay: '0.2s' }}
                        />
                        {/* Logo container */}
                        <div className={`relative z-10 ${s.container} rounded-full bg-editor-panel-bg shadow-2xl flex items-center justify-center ${s.border} border-yellow-400/30`}>
                            <img
                                src={logoUrl}
                                alt="Loading..."
                                className={`${s.logo} object-contain animate-pulse ${agencyLogo ? 'rounded-full' : ''}`}
                                style={{ animationDuration: '1.5s' }}
                                width={s.logoSize}
                                height={s.logoSize}
                                loading="eager"
                                decoding="sync"
                                fetchPriority="high"
                            />
                        </div>
                    </>
                ) : (
                    /* Generic spinner while tenant context initializes */
                    <div className={`${s.spinner} border-2 border-white/20 border-t-white/60 rounded-full animate-spin`} />
                )}
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
